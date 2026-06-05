from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    employee = "employee"

class EmploymentStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    on_leave = "on_leave"
    terminated = "terminated"

class LeaveStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class AttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"
    on_leave = "on_leave"

class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    in_development = "in_development"
    in_review = "in_review"
    in_staging = "in_staging"
    done = "done"

# Stage order for traversal validation
STAGE_ORDER = ["todo", "in_progress", "in_development", "in_review", "in_staging", "done"]

class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"

class HolidayType(str, Enum):
    national = "national"
    regional = "regional"
    optional = "optional"
    company = "company"

# ── Auth ────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.employee

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    full_name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    employee_id: str
    phone: str
    new_password: str

# ── Employee ────────────────────────────────────────────────────────────────
class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str

class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    email: EmailStr
    password: str
    phone: str
    department: str
    designation: str
    date_of_joining: str
    salary: float
    employment_status: EmploymentStatus = EmploymentStatus.active
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    leave_balance: float = 12.0

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    salary: Optional[float] = None
    employment_status: Optional[EmploymentStatus] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    leave_balance: Optional[float] = None

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None

# ── Leave ────────────────────────────────────────────────────────────────────
class LeaveCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class LeaveUpdate(BaseModel):
    status: LeaveStatus
    admin_comment: Optional[str] = None

# ── Attendance ───────────────────────────────────────────────────────────────
class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    status: AttendanceStatus
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    notes: Optional[str] = None

# ── Payroll ──────────────────────────────────────────────────────────────────
class PayrollCreate(BaseModel):
    employee_id: str
    month: str
    year: int
    basic_salary: float
    allowances: float = 0
    deductions: float = 0
    bonus: float = 0

# ── Announcement ─────────────────────────────────────────────────────────────
class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"

# ── Holiday ──────────────────────────────────────────────────────────────────
class HolidayCreate(BaseModel):
    name: str
    date: str          # ISO date string "YYYY-MM-DD"
    holiday_type: HolidayType = HolidayType.national
    description: Optional[str] = None

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    holiday_type: Optional[HolidayType] = None
    description: Optional[str] = None

# ── Task Tracker ─────────────────────────────────────────────────────────────
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: List[str] = []      # list of employee emails
    due_date: Optional[str] = None
    priority: TaskPriority = TaskPriority.medium
    project: Optional[str] = None
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[List[str]] = None
    due_date: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    project: Optional[str] = None
    tags: Optional[List[str]] = None

class TaskComment(BaseModel):
    content: str

class ChecklistCreate(BaseModel):
    title: str

class ChecklistItemCreate(BaseModel):
    title: str

class TaskCheckSimilarity(BaseModel):
    title: str
    description: Optional[str] = None

class TaskSimilarityResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    similarity: float

