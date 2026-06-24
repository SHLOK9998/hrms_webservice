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
        email = leave.get("employee_email")
        leave_type = leave.get("leave_type", "leave")
        
        if leave_type == "leave":
            days = calculate_leave_days(leave.get("start_date"), leave.get("end_date"))
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
        
        elif leave_type == "missing_checkout" and new_status == "approved":
            # Process missing checkout logic
            date_str = leave["start_date"].split("T")[0]
            raw_time = leave.get("missing_checkout_time") or "18:00:00"
            if len(raw_time.split(":")) == 2:
                raw_time = f"{raw_time}:00"
                
            attendance_rec = await db.attendance.find_one({
                "employee_email": email,
                "date": date_str,
                "organization_id": current_user["organization_id"]
            })
            
            if attendance_rec:
                # Update existing attendance record
                try:
                    check_in_time = datetime.strptime(attendance_rec["check_in"], "%H:%M:%S")
                    check_out_time = datetime.strptime(raw_time, "%H:%M:%S")
                    delta = check_out_time - check_in_time
                    total_hours = round(delta.total_seconds() / 3600, 2)
                    if total_hours < 0:
                        total_hours = 0.0
                except Exception:
                    total_hours = 0.0
                
                await db.attendance.update_one(
                    {"_id": attendance_rec["_id"]},
                    {"$set": {
                        "check_out": raw_time,
                        "total_hours": total_hours,
                        "updated_at": get_current_time()
                    }}
                )
            else:
                # Create a new attendance record (default checkin at "09:00:00")
                employee = await db.employees.find_one({
                    "email": email,
                    "organization_id": current_user["organization_id"]
                })
                if employee:
                    check_in_str = "09:00:00"
                    try:
                        check_in_time = datetime.strptime(check_in_str, "%H:%M:%S")
                        check_out_time = datetime.strptime(raw_time, "%H:%M:%S")
                        delta = check_out_time - check_in_time
                        total_hours = round(delta.total_seconds() / 3600, 2)
                        if total_hours < 0:
                            total_hours = 0.0
                    except Exception:
                        total_hours = 0.0
                        
                    new_rec = {
                        "employee_id": employee["employee_id"],
                        "employee_name": employee["full_name"],
                        "employee_email": email,
                        "department": employee.get("department", ""),
                        "date": date_str,
                        "check_in": check_in_str,
                        "check_out": raw_time,
                        "total_hours": total_hours,
                        "status": "present",
                        "organization_id": current_user["organization_id"],
                        "created_at": get_current_time(),
                    }
                    await db.attendance.insert_one(new_rec)
            
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
