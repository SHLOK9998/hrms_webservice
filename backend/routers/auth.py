from fastapi import APIRouter, HTTPException, status, Depends
from utils.timezone import get_current_time
from database import get_database
from schemas import UserCreate, UserLogin, Token, ChangePasswordRequest, ForgotPasswordRequest
from utils.auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    db = get_database()
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role.value,
        "organization_id": getattr(user_data, "organization_id", None),
        "created_at": get_current_time(),
        "is_active": True,
    }
    result = await db.users.insert_one(user_doc)
    return {"message": "User registered successfully", "id": str(result.inserted_id)}

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    db = get_database()
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    org_id = user.get("organization_id")
    if org_id and not isinstance(org_id, str):
        org_id = str(org_id)

    token = create_access_token({
        "sub": user["email"],
        "role": user["role"],
        "organization_id": org_id
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": str(user["_id"]),
        "full_name": user["full_name"],
        "organization_id": org_id,
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
    }

@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    db = get_database()
    if not verify_password(data.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    hashed_password = get_password_hash(data.new_password)
    await db.users.update_one({"email": current_user["email"]}, {"$set": {"password": hashed_password}})
    return {"message": "Password updated successfully"}

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    db = get_database()
    employee = await db.employees.find_one({
        "email": data.email,
        "employee_id": data.employee_id,
        "phone": data.phone
    })
    if not employee:
        raise HTTPException(status_code=400, detail="Verification details do not match our records")
    
    hashed_password = get_password_hash(data.new_password)
    result = await db.users.update_one({"email": data.email}, {"$set": {"password": hashed_password}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User account not found")
        
    return {"message": "Password updated successfully"}
