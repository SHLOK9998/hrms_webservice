from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None
db = None

async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    # Drop old single-tenant unique indexes to avoid conflicts
    for coll_name, idx_name in [
        ("employees", "employee_id_1"),
        ("attendance", "employee_id_1_date_1"),
        ("holidays", "date_1")
    ]:
        try:
            await db[coll_name].drop_index(idx_name)
        except Exception:
            pass

    # Create indexes for performance and uniqueness
    await db.organizations.create_index("name", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("organization_id")
    await db.employees.create_index([("organization_id", 1), ("employee_id", 1)], unique=True)
    await db.employees.create_index("email", unique=True)
    await db.attendance.create_index([("organization_id", 1), ("employee_id", 1), ("date", 1)], unique=True)
    await db.leaves.create_index([("organization_id", 1), ("employee_email", 1), ("status", 1)])
    await db.payroll.create_index([("organization_id", 1), ("employee_id", 1), ("month", 1), ("year", 1)])
    await db.holidays.create_index([("organization_id", 1), ("date", 1)], unique=True)
    await db.tasks.create_index([("organization_id", 1), ("assigned_to", 1), ("status", 1)])
    await db.tasks.create_index([("organization_id", 1), ("created_at", 1)])
    await db.announcements.create_index([("organization_id", 1), ("created_at", -1)])
    print(f"Connected to MongoDB and set up multi-tenant indexes: {settings.DATABASE_NAME}")

    # Seed default superadmin if not present
    superadmin = await db.users.find_one({"role": "superadmin"})
    if not superadmin:
        from passlib.context import CryptContext
        from datetime import datetime
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        await db.users.insert_one({
            "email": settings.SUPERADMIN_EMAIL,
            "password": pwd_context.hash(settings.SUPERADMIN_PASSWORD),
            "full_name": "Platform Superadmin",
            "role": "superadmin",
            "organization_id": None,
            "is_active": True,
            "created_at": datetime.utcnow(),
        })
        print(f"[Database] Seeded default superadmin: {settings.SUPERADMIN_EMAIL}")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

def get_database():
    return db
