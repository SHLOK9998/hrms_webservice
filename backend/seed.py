"""
seed.py — Seed script for HRMS MongoDB database
================================================
Run once to populate initial data:
  - 1 admin user
  - 1 employee user
  - 1 employee profile
  - Sample holidays (Indian calendar 2025-2026)
  - Sample announcements
  - Sample tasks

Usage:
    python seed.py
"""
import asyncio
from utils.timezone import get_current_time
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "hrms_db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    print("🌱 Seeding HRMS database...")

    # ── Users ─────────────────────────────────────────────────────────────────
    await db.users.delete_many({})
    await db.users.insert_many([
        {
            "email": "admin@company.com",
            "password": pwd_context.hash("Admin@123"),
            "full_name": "Admin User",
            "role": "admin",
            "is_active": True,
            "created_at": get_current_time(),
        },
        {
            "email": "john.doe@company.com",
            "password": pwd_context.hash("Employee@123"),
            "full_name": "John Doe",
            "role": "employee",
            "is_active": True,
            "created_at": get_current_time(),
        },
    ])
    print("  ✓ Users seeded (admin@company.com / Admin@123 | john.doe@company.com / Employee@123)")

    # ── Employees ─────────────────────────────────────────────────────────────
    await db.employees.delete_many({})
    await db.employees.insert_one({
        "employee_id": "EMP001",
        "full_name": "John Doe",
        "email": "john.doe@company.com",
        "phone": "+91-9876543210",
        "department": "Engineering",
        "designation": "Software Engineer",
        "date_of_joining": "2024-01-15",
        "salary": 75000,
        "employment_status": "active",
        "leave_balance": 12.0,
        "date_of_birth": "1995-06-20",
        "gender": "Male",
        "address": "123 Tech Street, Bangalore",
        "created_at": get_current_time(),
    })
    print("  ✓ Employee profile seeded")

    # ── Holidays ──────────────────────────────────────────────────────────────
    await db.holidays.delete_many({})
    holidays = [
        {"name": "New Year's Day", "date": "2025-01-01", "holiday_type": "national"},
        {"name": "Republic Day", "date": "2025-01-26", "holiday_type": "national"},
        {"name": "Holi", "date": "2025-03-14", "holiday_type": "national"},
        {"name": "Good Friday", "date": "2025-04-18", "holiday_type": "national"},
        {"name": "Eid ul-Fitr", "date": "2025-03-31", "holiday_type": "national"},
        {"name": "Ambedkar Jayanti", "date": "2025-04-14", "holiday_type": "national"},
        {"name": "Labour Day", "date": "2025-05-01", "holiday_type": "national"},
        {"name": "Independence Day", "date": "2025-08-15", "holiday_type": "national"},
        {"name": "Janmashtami", "date": "2025-08-16", "holiday_type": "national"},
        {"name": "Gandhi Jayanti", "date": "2025-10-02", "holiday_type": "national"},
        {"name": "Dussehra", "date": "2025-10-03", "holiday_type": "national"},
        {"name": "Diwali", "date": "2025-10-20", "holiday_type": "national"},
        {"name": "Christmas Day", "date": "2025-12-25", "holiday_type": "national"},
        # Company holidays
        {"name": "Company Foundation Day", "date": "2025-07-01", "holiday_type": "company", "description": "Annual company celebration"},
        {"name": "Team Outing", "date": "2025-09-15", "holiday_type": "company", "description": "Annual team outing"},
        # 2026
        {"name": "New Year's Day", "date": "2026-01-01", "holiday_type": "national"},
        {"name": "Republic Day", "date": "2026-01-26", "holiday_type": "national"},
        {"name": "Holi", "date": "2026-03-03", "holiday_type": "national"},
        {"name": "Independence Day", "date": "2026-08-15", "holiday_type": "national"},
        {"name": "Gandhi Jayanti", "date": "2026-10-02", "holiday_type": "national"},
        {"name": "Diwali", "date": "2026-11-08", "holiday_type": "national"},
        {"name": "Christmas Day", "date": "2026-12-25", "holiday_type": "national"},
    ]
    for h in holidays:
        h["created_by"] = "System"
        h["created_at"] = get_current_time()
    await db.holidays.insert_many(holidays)
    print(f"  ✓ {len(holidays)} holidays seeded")

    # ── Announcements ─────────────────────────────────────────────────────────
    await db.announcements.delete_many({})
    await db.announcements.insert_many([
        {
            "title": "Welcome to the new HRMS system!",
            "content": "We have upgraded our HR management system. Please explore all the new features.",
            "priority": "high",
            "created_by": "Admin User",
            "created_at": get_current_time(),
        },
        {
            "title": "Q2 Performance Reviews scheduled",
            "content": "Performance reviews for Q2 will be conducted in July. Please prepare your self-assessment.",
            "priority": "normal",
            "created_by": "Admin User",
            "created_at": get_current_time(),
        },
    ])
    print("  ✓ Announcements seeded")

    # ── Sample Task ───────────────────────────────────────────────────────────
    await db.tasks.delete_many({})
    await db.tasks.insert_one({
        "title": "Set up development environment",
        "description": "Install all required tools and configure the local development environment",
        "assigned_to": "john.doe@company.com",
        "due_date": "2025-08-01",
        "priority": "high",
        "project": "Onboarding",
        "tags": ["setup", "dev"],
        "status": "todo",
        "created_by": "Admin User",
        "created_by_email": "admin@company.com",
        "created_at": get_current_time(),
        "updated_at": get_current_time(),
        "comments": [],
        "subtasks": [
            {"id": "st-001", "title": "Install Node.js and npm", "done": False, "created_at": get_current_time().isoformat()},
            {"id": "st-002", "title": "Install Python 3.10+", "done": False, "created_at": get_current_time().isoformat()},
            {"id": "st-003", "title": "Clone project repository", "done": False, "created_at": get_current_time().isoformat()},
        ],
        "activity": [
            {"action": "Task created", "by": "Admin User", "at": get_current_time().isoformat()}
        ],
    })
    print("  ✓ Sample task seeded")

    client.close()
    print("\n✅ Seeding complete!")
    print("\nLogin credentials:")
    print("  Admin    → admin@company.com    / Admin@123")
    print("  Employee → john.doe@company.com / Employee@123")

if __name__ == "__main__":
    asyncio.run(seed())
