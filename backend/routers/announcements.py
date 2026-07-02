from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response
from utils.timezone import get_current_time
from bson import ObjectId
from database import get_database
from schemas import AnnouncementCreate
from utils.auth import get_current_admin, get_current_tenant_user
import uuid
import base64

MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

@router.get("/")
async def get_announcements(current_user=Depends(get_current_tenant_user)):
    db = get_database()
    announcements = await db.announcements.find({"organization_id": current_user["organization_id"]}).sort("created_at", -1).to_list(50)
    return [serialize(a) for a in announcements]

@router.post("/")
async def create_announcement(data: AnnouncementCreate, current_user=Depends(get_current_admin)):
    db = get_database()
    doc = {
        **data.model_dump(),
        "created_by": current_user["full_name"],
        "organization_id": current_user["organization_id"],
        "created_at": get_current_time(),
    }
    result = await db.announcements.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.delete("/{announcement_id}")
async def delete_announcement(announcement_id: str, current_user=Depends(get_current_admin)):
    db = get_database()
    result = await db.announcements.delete_one({
        "_id": ObjectId(announcement_id),
        "organization_id": current_user["organization_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Deleted successfully"}


@router.post("/{announcement_id}/attachment")
async def upload_announcement_attachment(announcement_id: str, file: UploadFile = File(...), current_user=Depends(get_current_admin)):
    db = get_database()
    ann = await db.announcements.find_one({"_id": ObjectId(announcement_id), "organization_id": current_user["organization_id"]})
    if not ann:
        raise HTTPException(404, "Announcement not found")
    
    contents = await file.read()
    if len(contents) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(400, "File size exceeds 2 MB limit")
    
    attachment = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size": len(contents),
        "data": base64.b64encode(contents).decode("utf-8"),
        "uploaded_at": get_current_time().isoformat(),
    }
    await db.announcements.update_one(
        {"_id": ObjectId(announcement_id)},
        {"$set": {"attachment": attachment}}
    )
    return {"message": "Attachment uploaded successfully"}


@router.get("/{announcement_id}/attachment/download")
async def download_announcement_attachment(announcement_id: str, current_user=Depends(get_current_tenant_user)):
    db = get_database()
    ann = await db.announcements.find_one({"_id": ObjectId(announcement_id), "organization_id": current_user["organization_id"]})
    if not ann or "attachment" not in ann:
        raise HTTPException(404, "Attachment not found")
    att = ann["attachment"]
    data = base64.b64decode(att["data"])
    return Response(
        content=data,
        media_type=att["content_type"],
        headers={"Content-Disposition": f'attachment; filename="{att["filename"]}"'},
    )
