"""
HRMS Backend — Application Entry Point
=======================================
Human Resource Management System with MongoDB backend.

Features:
  - Employee management (CRUD, departments, profiles)
  - Authentication (JWT-based, email/password)
  - Attendance tracking (check-in/check-out, history, stats)
  - Leave management (apply, approve, reject, cancel)
  - Payroll processing (generate, mark paid, history)
  - Announcements (admin creates, all employees view)
  - Holiday calendar (admin manages, all view)
  - Task tracker (create, assign, status, comments, subtasks)

API base URL: /api
Interactive docs: /docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from contextlib import asynccontextmanager
from database import connect_to_mongo, close_mongo_connection
from routers import auth, employees, leaves, attendance, payroll, announcements, holidays, tasks, organizations
from utils.scheduler import start_leave_increment_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    # Start periodic leave increment scheduler
    scheduler_task = asyncio.create_task(start_leave_increment_scheduler())
    yield
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    await close_mongo_connection()

app = FastAPI(
    title="HRMS API",
    description="Human Resource Management System API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(leaves.router)
app.include_router(attendance.router)
app.include_router(payroll.router)
app.include_router(announcements.router)
app.include_router(holidays.router)    # NEW — holiday calendar
app.include_router(tasks.router)       # NEW — task tracker
app.include_router(organizations.router)

@app.get("/")
async def root():
    return {"message": "HRMS API v2.0 is running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
