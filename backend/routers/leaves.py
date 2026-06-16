from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from utils.timezone import get_current_time
from bson import ObjectId
from database import get_database
from schemas import LeaveCreate, LeaveUpdate
from utils.auth import get_current_admin, get_current_tenant_user

router = APIRouter(prefix="/api/leaves", tags=["Leaves"])

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("/")
async def get_all_leaves(current_user=Depends(get_current_admin)):
    db = get_database()
    leaves = await db.leaves.find({"organization_id": current_user["organization_id"]}).sort("created_at", -1).to_list(1000)
    return [serialize(l) for l in leaves]

@router.get("/my")
async def get_my_leaves(current_user=Depends(get_current_tenant_user)):
    db = get_database()
    leaves = await db.leaves.find({
        "employee_email": current_user["email"],
        "organization_id": current_user["organization_id"]
    }).sort("created_at", -1).to_list(100)
    return [serialize(l) for l in leaves]

@router.get("/pending")
async def get_pending_leaves(current_user=Depends(get_current_admin)):
    db = get_database()
    leaves = await db.leaves.find({
        "status": "pending",
        "organization_id": current_user["organization_id"]
    }).sort("created_at", -1).to_list(100)
    return [serialize(l) for l in leaves]

@router.get("/stats/summary")
async def get_leave_stats(current_user=Depends(get_current_admin)):
    db = get_database()
    org_filter = {"organization_id": current_user["organization_id"]}
    total = await db.leaves.count_documents(org_filter)
    pending = await db.leaves.count_documents({**org_filter, "status": "pending"})
    approved = await db.leaves.count_documents({**org_filter, "status": "approved"})
    rejected = await db.leaves.count_documents({**org_filter, "status": "rejected"})
    return {"total": total, "pending": pending, "approved": approved, "rejected": rejected}

@router.post("/")
async def apply_leave(leave_data: LeaveCreate, current_user=Depends(get_current_tenant_user)):
    db = get_database()
    employee = await db.employees.find_one({"email": current_user["email"], "organization_id": current_user["organization_id"]})
    leave_doc = {
        **leave_data.model_dump(),
        "employee_email": current_user["email"],
        "employee_name": current_user["full_name"],
        "employee_id": employee["employee_id"] if employee else "N/A",
        "department": employee["department"] if employee else "N/A",
        "status": "pending",
        "organization_id": current_user["organization_id"],
        "created_at": get_current_time(),
        "admin_comment": None,
    }
    result = await db.leaves.insert_one(leave_doc)
    leave_doc["_id"] = str(result.inserted_id)
    return leave_doc

def calculate_leave_days(start_date: str, end_date: str) -> float:
    try:
        start = datetime.strptime(start_date.split("T")[0], "%Y-%m-%d")
        end = datetime.strptime(end_date.split("T")[0], "%Y-%m-%d")
        return float((end - start).days + 1)
    except Exception:
        return 1.0

@router.put("/{leave_id}")
async def update_leave_status(leave_id: str, update_data: LeaveUpdate, current_user=Depends(get_current_admin)):
    db = get_database()
    leave = await db.leaves.find_one({"_id": ObjectId(leave_id), "organization_id": current_user["organization_id"]})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
        
    old_status = leave.get("status")
    new_status = update_data.status.value
    
    update_dict = {
        "status": new_status,
        "admin_comment": update_data.admin_comment,
        "reviewed_by": current_user["full_name"],
        "reviewed_at": get_current_time(),
    }
    result = await db.leaves.update_one(
        {"_id": ObjectId(leave_id), "organization_id": current_user["organization_id"]},
        {"$set": update_dict}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave not found")
        
    if old_status != new_status:
        days = calculate_leave_days(leave.get("start_date"), leave.get("end_date"))
        email = leave.get("employee_email")
        
        if new_status == "approved":
            # Deduct days
            await db.employees.update_one(
                {"email": email, "organization_id": current_user["organization_id"]},
                {"$inc": {"leave_balance": -days}}
            )
        elif old_status == "approved" and new_status != "approved":
            # Restore days
            await db.employees.update_one(
                {"email": email, "organization_id": current_user["organization_id"]},
                {"$inc": {"leave_balance": days}}
            )
            
    return {"message": f"Leave {update_data.status.value} successfully"}

@router.delete("/{leave_id}")
async def cancel_leave(leave_id: str, current_user=Depends(get_current_tenant_user)):
    db = get_database()
    leave = await db.leaves.find_one({"_id": ObjectId(leave_id), "organization_id": current_user["organization_id"]})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if current_user["role"] != "admin" and leave["employee_email"] != current_user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if leave["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending leaves can be cancelled")
    await db.leaves.delete_one({"_id": ObjectId(leave_id), "organization_id": current_user["organization_id"]})
    return {"message": "Leave cancelled"}
