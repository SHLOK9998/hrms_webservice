from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None
db = None

async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    # Create indexes for performance
    await db.users.create_index("email", unique=True)
    await db.employees.create_index("employee_id", unique=True)
    await db.employees.create_index("email", unique=True)
    await db.attendance.create_index([("employee_id", 1), ("date", 1)], unique=True)
    await db.leaves.create_index([("employee_email", 1), ("status", 1)])
    await db.payroll.create_index([("employee_id", 1), ("month", 1), ("year", 1)])
    await db.holidays.create_index("date", unique=True)
    await db.tasks.create_index([("assigned_to", 1), ("status", 1)])
    await db.tasks.create_index("created_at")
    print(f"Connected to MongoDB: {settings.DATABASE_NAME}")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")

def get_database():
    return db
