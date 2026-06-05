# 🏢 HRMS — Human Resource Management System

A full-stack HRMS built with **React**, **FastAPI**, and **MongoDB**.

---

## 📁 Project Structure

```
hrms/
├── backend/           # FastAPI application
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── schemas.py
│   ├── requirements.txt
│   ├── .env
│   ├── routers/
│   │   ├── auth.py
│   │   ├── employees.py
│   │   ├── leaves.py
│   │   ├── attendance.py
│   │   ├── payroll.py
│   │   └── announcements.py
│   └── utils/
│       └── auth.py
└── frontend/          # React + Vite application
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css
    │   ├── context/AuthContext.jsx
    │   ├── utils/api.js
    │   ├── components/
    │   │   ├── AdminLayout.jsx
    │   │   └── EmployeeLayout.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── admin/
    │       │   ├── Dashboard.jsx
    │       │   ├── Employees.jsx
    │       │   ├── Leaves.jsx
    │       │   ├── Attendance.jsx
    │       │   ├── Payroll.jsx
    │       │   └── Announcements.jsx
    │       └── employee/
    │           ├── Dashboard.jsx
    │           ├── Profile.jsx
    │           ├── Leaves.jsx
    │           ├── Attendance.jsx
    │           └── Payroll.jsx
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── index.html
```

---

## ⚙️ Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **MongoDB** (local or [MongoDB Atlas](https://cloud.mongodb.com))

---

## 🚀 Setup & Run

### 1. Start MongoDB

```bash
# Local MongoDB
mongod --dbpath /data/db

# Or use MongoDB Atlas and update .env with your connection string
```

---

### 2. Backend Setup

```bash
cd hrms/backend

# Create virtual environment
python -m venv venv

# Activate it
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env and update values:
# MONGODB_URL=mongodb://localhost:27017
# SECRET_KEY=your-very-secret-key-here

# Run the server
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

---

### 3. Seed Demo Data (Optional but Recommended)

Run this in a Python shell or script inside the `backend/` folder to create demo users:

```python
# seed.py - run with: python seed.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["hrms_db"]

    # Clear existing
    await db.users.delete_many({})
    await db.employees.delete_many({})

    # Admin user
    await db.users.insert_one({
        "email": "admin@hrms.com",
        "password": pwd_context.hash("admin123"),
        "full_name": "Admin User",
        "role": "admin",
        "created_at": datetime.utcnow(),
        "is_active": True
    })

    # Employee user
    await db.users.insert_one({
        "email": "emp@hrms.com",
        "password": pwd_context.hash("emp123"),
        "full_name": "John Doe",
        "role": "employee",
        "created_at": datetime.utcnow(),
        "is_active": True
    })

    # Employee profile
    await db.employees.insert_one({
        "employee_id": "EMP001",
        "full_name": "John Doe",
        "email": "emp@hrms.com",
        "phone": "+91 98765 43210",
        "department": "Engineering",
        "designation": "Software Engineer",
        "date_of_joining": "2023-01-15",
        "salary": 75000,
        "employment_status": "active",
        "gender": "Male",
        "address": "123 Tech Street, Bangalore",
        "created_at": datetime.utcnow()
    })

    print("✅ Seed data created!")
    print("   Admin: admin@hrms.com / admin123")
    print("   Employee: emp@hrms.com / emp123")
    client.close()

asyncio.run(seed())
```

```bash
cd hrms/backend
python seed.py
```

---

### 4. Frontend Setup

```bash
cd hrms/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## 🔐 Default Credentials

| Role     | Email             | Password  |
|----------|-------------------|-----------|
| Admin    | admin@hrms.com    | admin123  |
| Employee | emp@hrms.com      | emp123    |

---

## ✨ Features

### 👑 Admin Dashboard
- **Dashboard** — Overview stats, charts by department, employee status pie chart, leave summary
- **Employees** — Full CRUD (add, edit, delete), search/filter, status management
- **Leave Management** — Review all requests, approve/reject with comments, filter by status
- **Attendance** — View all records, manually mark attendance, today's summary
- **Payroll** — Generate payroll with breakdown, mark as paid, salary totals
- **Announcements** — Post company-wide notices with priority levels

### 👤 Employee Portal
- **Dashboard** — Personal stats, check-in/check-out, recent leaves, announcements
- **Profile** — View info, edit phone/address/DOB
- **My Leaves** — Apply for leave, track status, cancel pending requests
- **Attendance** — Personal check-in/out, attendance history with stats
- **Payslips** — View salary breakdown per month, total earned

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/employees/` | List all employees (admin) |
| POST | `/api/employees/` | Add employee (admin) |
| GET | `/api/employees/me` | My profile (employee) |
| PUT | `/api/employees/{id}` | Update employee |
| DELETE | `/api/employees/{id}` | Delete employee (admin) |
| GET | `/api/leaves/` | All leave requests (admin) |
| GET | `/api/leaves/my` | My leaves (employee) |
| POST | `/api/leaves/` | Apply for leave |
| PUT | `/api/leaves/{id}` | Approve/reject leave (admin) |
| POST | `/api/attendance/checkin` | Check in |
| POST | `/api/attendance/checkout` | Check out |
| GET | `/api/payroll/my` | My payslips |
| POST | `/api/payroll/` | Generate payroll (admin) |
| GET | `/api/announcements/` | Get announcements |
| POST | `/api/announcements/` | Post announcement (admin) |

Full interactive docs at: `http://localhost:8000/docs`

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6, Tailwind CSS, Recharts, Lucide Icons |
| Backend | FastAPI, Motor (async MongoDB), Pydantic v2 |
| Database | MongoDB |
| Auth | JWT (python-jose), bcrypt (passlib) |
| HTTP Client | Axios |

---

## 🌐 Production Deployment

### Backend (with gunicorn)
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend (build)
```bash
npm run build
# Output in dist/ — deploy to Nginx, Vercel, Netlify, etc.
```

### Update CORS in `main.py`
```python
allow_origins=["https://your-frontend-domain.com"]
```

### Update `.env` for production
```
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net
SECRET_KEY=your-very-long-secure-random-secret-key
```
