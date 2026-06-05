from fastapi import APIRouter, HTTPException, Depends
from utils.timezone import get_current_time
from bson import ObjectId
from database import get_database
from schemas import PayrollCreate
from utils.auth import get_current_admin, get_current_user

router = APIRouter(prefix="/api/payroll", tags=["Payroll"])

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("/")
async def get_all_payroll(current_user=Depends(get_current_admin)):
    db = get_database()
    records = await db.payroll.find().sort("created_at", -1).to_list(1000)
    return [serialize(r) for r in records]

@router.get("/my")
async def get_my_payroll(current_user=Depends(get_current_user)):
    db = get_database()
    employee = await db.employees.find_one({"email": current_user["email"]})
    if not employee:
        return []
    records = await db.payroll.find({"employee_id": employee["employee_id"]}).sort("created_at", -1).to_list(100)
    return [serialize(r) for r in records]

@router.post("/")
async def create_payroll(data: PayrollCreate, current_user=Depends(get_current_admin)):
    db = get_database()
    existing = await db.payroll.find_one({"employee_id": data.employee_id, "month": data.month, "year": data.year})
    if existing:
        raise HTTPException(status_code=400, detail="Payroll already generated for this period")
    employee = await db.employees.find_one({"employee_id": data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    net_salary = data.basic_salary + data.allowances + data.bonus - data.deductions
    record = {
        **data.model_dump(),
        "employee_name": employee["full_name"],
        "employee_email": employee["email"],
        "department": employee["department"],
        "net_salary": net_salary,
        "status": "generated",
        "created_at": get_current_time(),
        "created_by": current_user["full_name"],
    }
    result = await db.payroll.insert_one(record)
    record["_id"] = str(result.inserted_id)
    return record

@router.put("/{payroll_id}/pay")
async def mark_paid(payroll_id: str, current_user=Depends(get_current_admin)):
    db = get_database()
    result = await db.payroll.update_one(
        {"_id": ObjectId(payroll_id)},
        {"$set": {"status": "paid", "paid_at": get_current_time(), "paid_by": current_user["full_name"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return {"message": "Marked as paid"}

@router.get("/salary/{employee_id}")
async def get_employee_salary(employee_id: str, current_user=Depends(get_current_admin)):
    """Return the basic salary of an employee for payroll auto-fill."""
    db = get_database()
    employee = await db.employees.find_one({"employee_id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"employee_id": employee_id, "salary": employee.get("salary", 0)}

@router.get("/stats/summary")
async def get_payroll_stats(current_user=Depends(get_current_admin)):
    db = get_database()
    pipeline = [
        {"$group": {"_id": None, "total_paid": {"$sum": "$net_salary"}, "count": {"$sum": 1}}}
    ]
    result = await db.payroll.aggregate(pipeline).to_list(1)
    return result[0] if result else {"total_paid": 0, "count": 0}
