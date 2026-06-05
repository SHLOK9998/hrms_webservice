"""
routers/holidays.py — Holiday Calendar API
==========================================
Admin manages the company holiday calendar. All authenticated users can view holidays.

Endpoints:
  GET    /api/holidays/         — List all holidays (any authenticated user)
  GET    /api/holidays/upcoming — Next N upcoming holidays
  POST   /api/holidays/         — Admin adds a holiday
  PUT    /api/holidays/{id}     — Admin updates a holiday
  DELETE /api/holidays/{id}     — Admin removes a holiday
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, date
from utils.timezone import get_current_time, get_current_date
from bson import ObjectId
from database import get_database
from schemas import HolidayCreate, HolidayUpdate
from utils.auth import get_current_admin, get_current_user

router = APIRouter(prefix="/api/holidays", tags=["Holidays"])

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("/")
async def get_holidays(current_user=Depends(get_current_user)):
    db = get_database()
    holidays = await db.holidays.find().sort("date", 1).to_list(500)
    return [serialize(h) for h in holidays]

@router.get("/upcoming")
async def get_upcoming_holidays(limit: int = 5, current_user=Depends(get_current_user)):
    db = get_database()
    today = get_current_date().isoformat()
    holidays = await db.holidays.find({"date": {"$gte": today}}).sort("date", 1).to_list(limit)
    return [serialize(h) for h in holidays]

@router.get("/calendar/{year}")
async def get_holidays_for_year(year: int, current_user=Depends(get_current_user)):
    db = get_database()
    holidays = await db.holidays.find(
        {"date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}}
    ).sort("date", 1).to_list(500)
    return [serialize(h) for h in holidays]

@router.post("/")
async def create_holiday(data: HolidayCreate, current_user=Depends(get_current_admin)):
    db = get_database()
    existing = await db.holidays.find_one({"date": data.date})
    if existing:
        raise HTTPException(status_code=400, detail="A holiday already exists on this date")
    doc = {
        **data.model_dump(),
        "created_by": current_user["full_name"],
        "created_at": get_current_time(),
    }
    result = await db.holidays.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.put("/{holiday_id}")
async def update_holiday(holiday_id: str, data: HolidayUpdate, current_user=Depends(get_current_admin)):
    db = get_database()
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No data to update")
    update_dict["updated_at"] = get_current_time()
    result = await db.holidays.update_one({"_id": ObjectId(holiday_id)}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return {"message": "Holiday updated successfully"}

@router.delete("/{holiday_id}")
async def delete_holiday(holiday_id: str, current_user=Depends(get_current_admin)):
    db = get_database()
    result = await db.holidays.delete_one({"_id": ObjectId(holiday_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return {"message": "Holiday deleted successfully"}
