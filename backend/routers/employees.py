from fastapi import APIRouter, HTTPException, Depends
from utils.timezone import get_current_time, get_current_date
from bson import ObjectId
from database import get_database
from schemas import EmployeeCreate, EmployeeUpdate, ProfileUpdate
from utils.auth import get_current_admin, get_current_user, get_password_hash

router = APIRouter(prefix="/api/employees", tags=["Employees"])

def serialize_employee(emp):
    emp["_id"] = str(emp["_id"])
    return emp

@router.get("/")
async def get_all_employees(current_user=Depends(get_current_admin)):
    db = get_database()
    employees = await db.employees.find().sort("full_name", 1).to_list(1000)
    return [serialize_employee(e) for e in employees]

@router.get("/stats")
async def get_employee_stats(current_user=Depends(get_current_admin)):
    db = get_database()
    total = await db.employees.count_documents({})
    active = await db.employees.count_documents({"employment_status": "active"})
    on_leave = await db.employees.count_documents({"employment_status": "on_leave"})
    terminated = await db.employees.count_documents({"employment_status": "terminated"})
    departments = await db.employees.distinct("department")
    # Count employees who checked in today
    today = get_current_date().isoformat()
    checked_in_today = await db.attendance.count_documents({"date": today})
    return {
        "total": total,
        "active": active,
        "on_leave": on_leave,
        "terminated": terminated,
        "departments": len(departments),
        "department_list": departments,
        "checked_in_today": checked_in_today,
    }

@router.get("/me")
async def get_my_profile(current_user=Depends(get_current_user)):
    db = get_database()
    employee = await db.employees.find_one({"email": current_user["email"]})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return serialize_employee(employee)

@router.put("/me")
async def update_my_profile(update_data: ProfileUpdate, current_user=Depends(get_current_user)):
    db = get_database()
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No data to update")
    update_dict["updated_at"] = get_current_time()
    result = await db.employees.update_one({"email": current_user["email"]}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Profile updated successfully"}

@router.get("/department/summary")
async def get_department_summary(current_user=Depends(get_current_admin)):
    db = get_database()
    pipeline = [
        {"$group": {"_id": "$department", "count": {"$sum": 1}, "avg_salary": {"$avg": "$salary"}}},
        {"$sort": {"count": -1}}
    ]
    result = await db.employees.aggregate(pipeline).to_list(100)
    return result

@router.get("/{employee_id}")
async def get_employee(employee_id: str, current_user=Depends(get_current_user)):
    db = get_database()
    try:
        emp = await db.employees.find_one({"_id": ObjectId(employee_id)})
    except Exception:
        emp = await db.employees.find_one({"employee_id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if current_user["role"] != "admin" and emp.get("email") != current_user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return serialize_employee(emp)

@router.post("/")
async def create_employee(employee_data: EmployeeCreate, current_user=Depends(get_current_admin)):
    db = get_database()
    existing = await db.employees.find_one({"$or": [
        {"employee_id": employee_data.employee_id},
        {"email": employee_data.email}
    ]})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID or email already exists")

    # Check users collection as well
    existing_user = await db.users.find_one({"email": employee_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already used by another user account")

    # Create user first
    user_doc = {
        "email": employee_data.email,
        "password": get_password_hash(employee_data.password),
        "full_name": employee_data.full_name,
        "role": "employee",
        "created_at": get_current_time(),
        "is_active": True,
    }
    await db.users.insert_one(user_doc)

    # Insert employee profile without the password field
    emp_doc = employee_data.model_dump()
    if "password" in emp_doc:
        del emp_doc["password"]
    emp_doc["created_at"] = get_current_time()
    emp_doc["created_by"] = current_user["_id"]
    result = await db.employees.insert_one(emp_doc)
    emp_doc["_id"] = str(result.inserted_id)
    return emp_doc

@router.put("/{employee_id}")
async def update_employee(employee_id: str, update_data: EmployeeUpdate, current_user=Depends(get_current_admin)):
    db = get_database()
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No data to update")
    update_dict["updated_at"] = get_current_time()

    # Find the employee first to get their current email
    try:
        emp = await db.employees.find_one({"_id": ObjectId(employee_id)})
    except Exception:
        emp = await db.employees.find_one({"employee_id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    old_email = emp.get("email")

    try:
        result = await db.employees.update_one({"_id": emp["_id"]}, {"$set": update_dict})
    except Exception:
        result = await db.employees.update_one({"employee_id": employee_id}, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Update in users collection
    user_updates = {}
    if "full_name" in update_dict:
        user_updates["full_name"] = update_dict["full_name"]
    if "email" in update_dict:
        user_updates["email"] = update_dict["email"]
    
    if user_updates and old_email:
        await db.users.update_one({"email": old_email}, {"$set": user_updates})

    return {"message": "Employee updated successfully"}

@router.delete("/{employee_id}")
async def delete_employee(employee_id: str, current_user=Depends(get_current_admin)):
    db = get_database()
    try:
        emp = await db.employees.find_one({"_id": ObjectId(employee_id)})
    except Exception:
        emp = await db.employees.find_one({"employee_id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    email = emp.get("email")

    try:
        result = await db.employees.delete_one({"_id": emp["_id"]})
    except Exception:
        result = await db.employees.delete_one({"employee_id": employee_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Delete user corresponding to this employee
    if email:
        await db.users.delete_one({"email": email})

    return {"message": "Employee deleted successfully"}
