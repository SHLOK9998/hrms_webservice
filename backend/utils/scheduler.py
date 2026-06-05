import asyncio
from utils.timezone import get_current_time
from database import get_database

async def check_and_increment_leaves():
    db = get_database()
    if db is None:
        return
    
    # Get current year-month (e.g. "2026-06")
    current_month = get_current_time().strftime("%Y-%m")
    
    # Check if this job has already run for the current month
    job_record = await db.system_jobs.find_one({"job_name": "monthly_leave_increment"})
    
    if job_record and job_record.get("last_run_month") == current_month:
        # Already run for this month
        return
    
    print(f"[Scheduler] Running monthly leave increment for {current_month}...")
    
    # 1. Migrate any active employees who don't have leave_balance
    await db.employees.update_many(
        {"leave_balance": {"$exists": False}},
        {"$set": {"leave_balance": 12.0}}
    )
    
    # 2. Increment leave_balance by 1.0 for all active employees
    result = await db.employees.update_many(
        {"employment_status": "active"},
        {"$inc": {"leave_balance": 1.0}}
    )
    
    print(f"[Scheduler] Incremented leaves for {result.modified_count} active employees.")
    
    # 3. Log or update the job run record
    await db.system_jobs.update_one(
        {"job_name": "monthly_leave_increment"},
        {
            "$set": {
                "last_run_month": current_month,
                "updated_at": get_current_time()
            }
        },
        upsert=True
    )
    print(f"[Scheduler] Monthly leave increment job completed successfully.")

async def start_leave_increment_scheduler():
    # Wait 5 seconds after startup to ensure mongo connection is fully ready
    await asyncio.sleep(5)
    while True:
        try:
            await check_and_increment_leaves()
        except Exception as e:
            print(f"[Scheduler] Error running leave increment job: {e}")
        # Run check every hour
        await asyncio.sleep(3600)
