from fastapi import APIRouter, HTTPException, Depends
from utils.timezone import get_current_time
from bson import ObjectId
from database import get_database
from schemas import AnnouncementCreate
from utils.auth import get_current_admin, get_current_user

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("/")
async def get_announcements(current_user=Depends(get_current_user)):
    db = get_database()
    announcements = await db.announcements.find().sort("created_at", -1).to_list(50)
    return [serialize(a) for a in announcements]

@router.post("/")
async def create_announcement(data: AnnouncementCreate, current_user=Depends(get_current_admin)):
    db = get_database()
    doc = {
        **data.model_dump(),
        "created_by": current_user["full_name"],
        "created_at": get_current_time(),
    }
    result = await db.announcements.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.delete("/{announcement_id}")
async def delete_announcement(announcement_id: str, current_user=Depends(get_current_admin)):
    db = get_database()
    result = await db.announcements.delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Deleted successfully"}
