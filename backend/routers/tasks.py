"""
routers/tasks.py — Task Tracker API (v2)
==========================================
Full task management: kanban board, checklists, attachments, multiple assignees.

Key rules:
  - 6 stages: todo → in_progress → in_development → in_review → in_staging → done
  - Tasks can only move ONE stage forward or backward
  - Once done, a task cannot move back
  - Admin CANNOT change task stage — only view, comment, add attachments/assignees
  - No one can assign a task to an admin user
  - Employees can create and assign tasks just like admin
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import Response
from datetime import datetime, date
from typing import Optional, List
from utils.timezone import get_current_time, get_current_date
from bson import ObjectId
from database import get_database
from schemas import (
    TaskCreate, TaskUpdate, TaskComment, ChecklistCreate,
    ChecklistItemCreate, TaskStatus, STAGE_ORDER,
    TaskCheckSimilarity, TaskSimilarityResponse
)
from utils.auth import get_current_user
from utils.embeddings import get_embedding, cosine_similarity
import uuid
import base64

router = APIRouter(prefix="/api/tasks", tags=["Task Tracker"])

MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024  # 2 MB


def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc


def can_access_task(task, user):
    """Check if user can access this task."""
    if user["role"] == "admin":
        return True
    email = user["email"]
    if task.get("created_by_email") == email:
        return True
    assigned = task.get("assigned_to", [])
    if isinstance(assigned, str):
        assigned = [assigned]
    return email in assigned


def can_change_stage(user):
    """Admin cannot change task stage."""
    return user["role"] != "admin"


async def validate_not_admin(db, emails):
    """Ensure none of the assignees are admin users."""
    for email in emails:
        u = await db.users.find_one({"email": email})
        if u and u.get("role") == "admin":
            raise HTTPException(400, f"Cannot assign task to admin user: {email}")


def validate_stage_transition(current_status, new_status):
    """Only 1 step forward/backward; done is final."""
    if current_status == "done":
        raise HTTPException(400, "Task is done and cannot be moved to any other stage")
    try:
        cur = STAGE_ORDER.index(current_status)
        nxt = STAGE_ORDER.index(new_status)
    except ValueError:
        raise HTTPException(400, "Invalid status value")
    diff = nxt - cur
    if diff not in (1, -1):
        raise HTTPException(
            400,
            f"Task can only move one stage at a time. "
            f"Current: {current_status}, Requested: {new_status}"
        )


def strip_attachment_data(tasks):
    """Remove binary data from attachment list for performance."""
    for t in tasks:
        for att in t.get("attachments", []):
            att.pop("data", None)
    return tasks


# ── List & Filters ────────────────────────────────────────────────────────────

@router.get("/")
async def get_tasks(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    db = get_database()
    query = {}
    if current_user["role"] != "admin":
        query["$or"] = [
            {"assigned_to": current_user["email"]},
            {"created_by_email": current_user["email"]},
        ]
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to and current_user["role"] == "admin":
        query["assigned_to"] = assigned_to
    if project:
        query["project"] = {"$regex": project, "$options": "i"}
    tasks = await db.tasks.find(query).sort("created_at", -1).to_list(500)
    strip_attachment_data(tasks)
    return [serialize(t) for t in tasks]


@router.get("/my")
async def get_my_tasks(current_user=Depends(get_current_user)):
    db = get_database()
    tasks = await db.tasks.find({
        "$or": [
            {"assigned_to": current_user["email"]},
            {"created_by_email": current_user["email"]},
        ]
    }).sort("created_at", -1).to_list(200)
    strip_attachment_data(tasks)
    return [serialize(t) for t in tasks]


@router.get("/stats")
async def get_task_stats(current_user=Depends(get_current_user)):
    db = get_database()
    match = {}
    if current_user["role"] != "admin":
        match = {"$or": [
            {"assigned_to": current_user["email"]},
            {"created_by_email": current_user["email"]},
        ]}
    pipeline = [{"$match": match}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    by_status = await db.tasks.aggregate(pipeline).to_list(10)
    total = await db.tasks.count_documents(match)
    overdue = await db.tasks.count_documents({
        **match,
        "due_date": {"$lt": get_current_date().isoformat()},
        "status": {"$nin": ["done"]},
    })
    return {"by_status": by_status, "total": total, "overdue": overdue}


@router.get("/employees-for-assign")
async def get_employees_for_assign(current_user=Depends(get_current_user)):
    """Return non-admin employees for task assignment dropdowns."""
    db = get_database()
    admin_emails_cursor = db.users.find({"role": "admin"}, {"email": 1})
    admin_emails = [u["email"] async for u in admin_emails_cursor]
    employees = await db.employees.find(
        {"email": {"$nin": admin_emails}}
    ).sort("full_name", 1).to_list(500)
    return [{"email": e["email"], "full_name": e["full_name"],
             "designation": e.get("designation", ""),
             "department": e.get("department", "")} for e in employees]


@router.get("/{task_id}")
async def get_task(task_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    # Strip binary data from attachments but keep metadata
    for att in task.get("attachments", []):
        att.pop("data", None)
    return serialize(task)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/check-similarity", response_model=List[TaskSimilarityResponse])
async def check_task_similarity(data: TaskCheckSimilarity, current_user=Depends(get_current_user)):
    db = get_database()
    text = f"{data.title}\n{data.description or ''}".strip()
    new_vector = await get_embedding(text)
    
    # Fetch all tasks from db that have embeddings
    tasks = await db.tasks.find({"embedding": {"$exists": True}}).to_list(1000)
    
    similarities = []
    for task in tasks:
        sim = cosine_similarity(new_vector, task.get("embedding", []))
        # Return tasks with a similarity > 0.5 (or any similarity) up to top 3
        # In a real similarity check, we return top 3 above a sensible threshold.
        # Cosine similarity is between -1 and 1 (or 0 and 1 for positive space).
        if sim > 0.5:
            similarities.append({
                "id": str(task["_id"]),
                "title": task["title"],
                "description": task.get("description", ""),
                "similarity": sim
            })
    
    similarities.sort(key=lambda x: x["similarity"], reverse=True)
    return similarities[:3]


@router.post("/")
async def create_task(data: TaskCreate, current_user=Depends(get_current_user)):
    """Any authenticated user can create a task."""
    db = get_database()
    if data.assigned_to:
        await validate_not_admin(db, data.assigned_to)

    # Embed task title and description
    text = f"{data.title}\n{data.description or ''}".strip()
    vector = await get_embedding(text)

    doc = {
        **data.model_dump(),
        "status": "todo",
        "embedding": vector,
        "created_by": current_user["full_name"],
        "created_by_email": current_user["email"],
        "created_at": get_current_time(),
        "updated_at": get_current_time(),
        "comments": [],
        "checklists": [],
        "attachments": [],
        "activity": [
            {
                "action": "Task created",
                "by": current_user["full_name"],
                "at": get_current_time().isoformat(),
            }
        ],
    }
    result = await db.tasks.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    # Strip binary data from embedding when returning to save bandwidth, but keep in db
    doc.pop("embedding", None)
    return doc


@router.put("/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")

    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}

    # If updating assignees, validate no admin users
    if "assigned_to" in update_dict:
        await validate_not_admin(db, update_dict["assigned_to"])

    # If updating status, admin cannot and must follow stage rules, and only assignee can update status
    if "status" in update_dict:
        if not can_change_stage(current_user):
            raise HTTPException(403, "Admin cannot change task stage")
        assigned = task.get("assigned_to", [])
        if isinstance(assigned, str):
            assigned = [assigned]
        if current_user["email"] not in assigned:
            raise HTTPException(403, "Only assigned employees can change task stage")
        validate_stage_transition(task["status"], update_dict["status"])

    update_dict["updated_at"] = get_current_time()
    activity_entry = {
        "action": f"Task updated by {current_user['full_name']}",
        "by": current_user["full_name"],
        "at": get_current_time().isoformat(),
    }
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_dict, "$push": {"activity": activity_entry}},
    )
    return {"message": "Task updated successfully"}


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    # Only admin or creator can delete
    if current_user["role"] != "admin" and task.get("created_by_email") != current_user["email"]:
        raise HTTPException(403, "Only admin or task creator can delete")
    await db.tasks.delete_one({"_id": ObjectId(task_id)})
    return {"message": "Task deleted"}


# ── Status Change (Drag & Drop) ──────────────────────────────────────────────

@router.patch("/{task_id}/status")
async def update_task_status(task_id: str, status: TaskStatus, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    if not can_change_stage(current_user):
        raise HTTPException(403, "Admin cannot change task stage")

    assigned = task.get("assigned_to", [])
    if isinstance(assigned, str):
        assigned = [assigned]
    if current_user["email"] not in assigned:
        raise HTTPException(403, "Only assigned employees can change task stage")

    validate_stage_transition(task["status"], status.value)

    activity_entry = {
        "action": f"Status changed from {task['status']} to {status.value}",
        "by": current_user["full_name"],
        "at": get_current_time().isoformat(),
    }
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {"status": status.value, "updated_at": get_current_time()},
            "$push": {"activity": activity_entry},
        },
    )
    return {"message": f"Status updated to {status.value}"}


# ── Comments ──────────────────────────────────────────────────────────────────

@router.get("/{task_id}/comments")
async def get_comments(task_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)}, {"comments": 1})
    if not task:
        raise HTTPException(404, "Task not found")
    return task.get("comments", [])


@router.post("/{task_id}/comments")
async def add_comment(task_id: str, data: TaskComment, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    comment = {
        "id": str(uuid.uuid4()),
        "content": data.content,
        "by": current_user["full_name"],
        "by_email": current_user["email"],
        "at": get_current_time().isoformat(),
    }
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"comments": comment}, "$set": {"updated_at": get_current_time()}},
    )
    return comment


# ── Checklists ────────────────────────────────────────────────────────────────

@router.post("/{task_id}/checklists")
async def add_checklist(task_id: str, data: ChecklistCreate, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    checklist = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "items": [],
        "created_at": get_current_time().isoformat(),
    }
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"checklists": checklist}, "$set": {"updated_at": get_current_time()}},
    )
    return checklist


@router.put("/{task_id}/checklists/{checklist_id}")
async def rename_checklist(task_id: str, checklist_id: str, data: ChecklistCreate, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    await db.tasks.update_one(
        {"_id": ObjectId(task_id), "checklists.id": checklist_id},
        {"$set": {"checklists.$.title": data.title, "updated_at": get_current_time()}},
    )
    return {"message": "Checklist renamed"}


@router.delete("/{task_id}/checklists/{checklist_id}")
async def delete_checklist(task_id: str, checklist_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$pull": {"checklists": {"id": checklist_id}}, "$set": {"updated_at": get_current_time()}},
    )
    return {"message": "Checklist deleted"}


@router.post("/{task_id}/checklists/{checklist_id}/items")
async def add_checklist_item(task_id: str, checklist_id: str, data: ChecklistItemCreate, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    item = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "done": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    checklists = task.get("checklists", [])
    found = False
    for cl in checklists:
        if cl["id"] == checklist_id:
            cl["items"].append(item)
            found = True
            break
    if not found:
        raise HTTPException(404, "Checklist not found")
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"checklists": checklists, "updated_at": datetime.utcnow()}},
    )
    return item


@router.patch("/{task_id}/checklists/{checklist_id}/items/{item_id}")
async def toggle_checklist_item(task_id: str, checklist_id: str, item_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    checklists = task.get("checklists", [])
    for cl in checklists:
        if cl["id"] == checklist_id:
            for it in cl["items"]:
                if it["id"] == item_id:
                    it["done"] = not it["done"]
                    break
            break
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"checklists": checklists, "updated_at": datetime.utcnow()}},
    )
    return {"message": "Item toggled"}


@router.put("/{task_id}/checklists/{checklist_id}/items/{item_id}")
async def rename_checklist_item(task_id: str, checklist_id: str, item_id: str, data: ChecklistItemCreate, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    checklists = task.get("checklists", [])
    for cl in checklists:
        if cl["id"] == checklist_id:
            for it in cl["items"]:
                if it["id"] == item_id:
                    it["title"] = data.title
                    break
            break
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"checklists": checklists, "updated_at": datetime.utcnow()}},
    )
    return {"message": "Item renamed"}


@router.delete("/{task_id}/checklists/{checklist_id}/items/{item_id}")
async def delete_checklist_item(task_id: str, checklist_id: str, item_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    checklists = task.get("checklists", [])
    for cl in checklists:
        if cl["id"] == checklist_id:
            cl["items"] = [it for it in cl["items"] if it["id"] != item_id]
            break
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"checklists": checklists, "updated_at": datetime.utcnow()}},
    )
    return {"message": "Item deleted"}


# ── Attachments (stored in MongoDB, max 2 MB) ────────────────────────────────

@router.post("/{task_id}/attachments")
async def upload_attachment(task_id: str, file: UploadFile = File(...), current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")

    contents = await file.read()
    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(400, "File size exceeds 2 MB limit")

    attachment = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(contents),
        "data": base64.b64encode(contents).decode("utf-8"),
        "uploaded_by": current_user["full_name"],
        "uploaded_by_email": current_user["email"],
        "uploaded_at": datetime.utcnow().isoformat(),
    }
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"attachments": attachment}, "$set": {"updated_at": datetime.utcnow()}},
    )
    # Return without data
    attachment.pop("data")
    return attachment


@router.get("/{task_id}/attachments/{attachment_id}/download")
async def download_attachment(task_id: str, attachment_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    for att in task.get("attachments", []):
        if att["id"] == attachment_id:
            data = base64.b64decode(att["data"])
            return Response(
                content=data,
                media_type=att["content_type"],
                headers={"Content-Disposition": f'attachment; filename="{att["filename"]}"'},
            )
    raise HTTPException(404, "Attachment not found")


@router.delete("/{task_id}/attachments/{attachment_id}")
async def delete_attachment(task_id: str, attachment_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$pull": {"attachments": {"id": attachment_id}}, "$set": {"updated_at": datetime.utcnow()}},
    )
    return {"message": "Attachment deleted"}


# ── Assignees ─────────────────────────────────────────────────────────────────

@router.post("/{task_id}/assignees")
async def add_assignee(task_id: str, email: str = Query(...), current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    await validate_not_admin(db, [email])
    assigned = task.get("assigned_to", [])
    if isinstance(assigned, str):
        assigned = [assigned] if assigned else []
    if email in assigned:
        raise HTTPException(400, "Already assigned")
    activity_entry = {
        "action": f"{email} added as assignee",
        "by": current_user["full_name"],
        "at": get_current_time().isoformat(),
    }
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$push": {"assigned_to": email, "activity": activity_entry},
            "$set": {"updated_at": get_current_time()},
        },
    )
    return {"message": f"{email} added as assignee"}


@router.delete("/{task_id}/assignees/{email}")
async def remove_assignee(task_id: str, email: str, current_user=Depends(get_current_user)):
    db = get_database()
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(404, "Task not found")
    if not can_access_task(task, current_user):
        raise HTTPException(403, "Access denied")
    
    # Assignee dev cannot remove themselves unless they are the creator (assigner) or admin
    if current_user["email"] == email and current_user["role"] != "admin" and task.get("created_by_email") != current_user["email"]:
        raise HTTPException(403, "You cannot remove yourself from this task. Only the assigner or other assignees can remove you.")
    activity_entry = {
        "action": f"{email} removed from assignees",
        "by": current_user["full_name"],
        "at": get_current_time().isoformat(),
    }
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$pull": {"assigned_to": email},
            "$push": {"activity": activity_entry},
            "$set": {"updated_at": get_current_time()},
        },
    )
    return {"message": f"{email} removed from assignees"}
