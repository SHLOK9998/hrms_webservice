from fastapi import APIRouter, HTTPException, Depends, status
from utils.timezone import get_current_time, get_current_date
from database import get_database
from schemas import OrganizationWithAdminCreate, OrganizationResponse
from utils.auth import get_current_superadmin, get_password_hash
from bson import ObjectId

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])

def serialize_org(org):
    org["id"] = str(org["_id"])
    # Delete _id to avoid conflict with response model
    if "_id" in org:
        del org["_id"]
    return org

@router.get("/", response_model=list[OrganizationResponse])
async def list_organizations(current_user=Depends(get_current_superadmin)):
    db = get_database()
    orgs = await db.organizations.find().sort("created_at", -1).to_list(100)
    result = []
    for org in orgs:
        org_id = str(org["_id"])
        admin_email = org.get("admin_email")
        if not admin_email:
            # Fallback to query users collection for this tenant's admin
            admin_user = await db.users.find_one({"organization_id": org_id, "role": "admin"})
            if admin_user:
                admin_email = admin_user.get("email")
        
        serialized = serialize_org(org)
        serialized["admin_email"] = admin_email
        result.append(serialized)
    return result

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_organization(data: OrganizationWithAdminCreate, current_user=Depends(get_current_superadmin)):
    db = get_database()
    
    # Check if organization already exists
    existing_org = await db.organizations.find_one({"name": data.name})
    if existing_org:
        raise HTTPException(status_code=400, detail="Organization name already exists")
        
    # Check if admin email already registered in users
    existing_user = await db.users.find_one({"email": data.admin_email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Admin email is already registered")

    # Create Organization
    org_doc = {
        "name": data.name,
        "created_at": get_current_time(),
        "is_active": True,
        "admin_email": data.admin_email
    }
    org_result = await db.organizations.insert_one(org_doc)
    org_id = str(org_result.inserted_id)

    # Create Org Admin User
    user_doc = {
        "email": data.admin_email,
        "password": get_password_hash(data.admin_password),
        "full_name": data.admin_full_name,
        "role": "admin",
        "organization_id": org_id,
        "is_active": True,
        "created_at": get_current_time(),
    }
    user_result = await db.users.insert_one(user_doc)

    # Create Employee Profile for Admin (some views check this)
    emp_doc = {
        "employee_id": "ADMIN001",
        "full_name": data.admin_full_name,
        "email": data.admin_email,
        "phone": "N/A",
        "department": "Administration",
        "designation": "Organization Admin",
        "date_of_joining": get_current_date().isoformat(),
        "salary": 0.0,
        "employment_status": "active",
        "leave_balance": 12.0,
        "organization_id": org_id,
        "created_at": get_current_time(),
        "created_by": str(user_result.inserted_id)
    }
    await db.employees.insert_one(emp_doc)

    return {
        "message": "Organization and admin provisioned successfully",
        "organization_id": org_id,
        "admin_id": str(user_result.inserted_id)
    }

@router.delete("/{org_id}")
async def delete_organization(org_id: str, current_user=Depends(get_current_superadmin)):
    db = get_database()
    
    # Verify organization exists
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    # Cascade-delete all records isolated under this organization_id
    await db.users.delete_many({"organization_id": org_id})
    await db.employees.delete_many({"organization_id": org_id})
    await db.attendance.delete_many({"organization_id": org_id})
    await db.leaves.delete_many({"organization_id": org_id})
    await db.payroll.delete_many({"organization_id": org_id})
    await db.holidays.delete_many({"organization_id": org_id})
    await db.tasks.delete_many({"organization_id": org_id})
    await db.announcements.delete_many({"organization_id": org_id})
    
    # Delete the organization document itself
    await db.organizations.delete_one({"_id": ObjectId(org_id)})
    
    return {"message": "Organization and all associated tenant data deleted successfully"}
