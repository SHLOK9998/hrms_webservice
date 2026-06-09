# 🏢 HRMS — Human Resource Management System

A full-stack Human Resource Management System (HRMS) built with **React (Vite)**, **FastAPI**, and **MongoDB**. This project provides a robust solution for tracking employee records, leaves, attendance, payroll, announcements, holidays, and tasks with AI-powered similarity checking.

---

## 📖 Theoretical Foundations & Project Architecture

An HRMS serves as the operational backbone of an organization, bridging the gap between management oversight and employee self-service. The system's design and codebase are built around several core engineering and domain-specific concepts:

### 1. Domain Theory: Employee Lifecycle & Workforce Management
*   **Employee Lifecycle Management:** Digital management of records from onboarding (CRUD operations) to active performance tracking and offboarding.
*   **Time & Attendance Management:** Real-time logging of employee check-in and check-out events to calculate total active hours, monitor late arrivals, and generate average working hours analytics.
*   **Leave Workflow Automation:** A state machine governing time-off requests. It prevents conflicts by keeping track of leave balances and requiring manager/admin approval, converting manual email requests into structured approvals.
*   **Payroll Ledger Processing:** Calculating payroll using base salaries, allowances, and tax/deduction profiles. A final ledger state machine transitions generated slips to `paid` once processed.

### 2. Software Architecture Paradigms
*   **Role-Based Access Control (RBAC):** Users are assigned roles (e.g., `admin` or `employee`) that grant specific permissions:
    *   *Admin Control Plane:* Complete CRUD capability over employees, global holiday planning, company-wide announcements, task assignment controls, and payroll generation.
    *   *Employee Portal:* Self-service dashboard to manage time tracking, submit leave requests, track assigned tasks, and download personal monthly payslips.
*   **Asynchronous I/O Execution:** The FastAPI backend uses Python's `asyncio` loop and MongoDB's asynchronous driver (`Motor`). This ensures the API can handle high volumes of concurrent, non-blocking I/O operations (e.g., logging check-ins, fetching histories) without blocking worker threads.
*   **Strict State Transition Systems:** In workflow automation, operations must follow unidirectional or guarded transitions. For example:
    *   *Leaves:* `pending` → `approved` OR `rejected`.
    *   *Tasks:* `todo` ↔ `in_progress` ↔ `in_development` ↔ `in_review` ↔ `in_staging` → `done`. Once a task is marked `done`, it cannot be reopened to prevent retroactive timeline modifications. Admin users are also prevented from altering employee task stages to maintain developer accountability.

### 3. Natural Language Processing (NLP) & Vector Search
*   **Task Semantic Representation:** To prevent duplicate work, when a user describes a new task, the application converts the combined Title and Description into a 768-dimensional vector embedding using Gemini's `text-embedding-004` model.
*   **Cosine Similarity Matching:** Similarities between the new task vector ($v_1$) and existing task vectors ($v_2$) are measured using Cosine Similarity:
    $$\text{Similarity}(v_1, v_2) = \frac{v_1 \cdot v_2}{\|v_1\| \|v_2\|}$$
    If the cosine similarity score is high (above a $0.5$ threshold), the backend alerts the user with the top 3 most similar tasks before creation.

---

## 📁 Project Structure

The project has been split cleanly into two main components:

```
hrms/
├── backend/           # FastAPI application, database utilities, and API routers
└── frontend/          # React + Vite application and UI components
```

---

## ⚙️ Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **MongoDB** (local installation or [MongoDB Atlas](https://cloud.mongodb.com))
- **Gemini API Key** (optional, for AI task similarity check)

---

## 🚀 Setup & Run

### 1. Start MongoDB

Ensure your local MongoDB instance is running, or prepare your MongoDB Atlas connection string.
```bash
# Start local MongoDB
mongod --dbpath /data/db
```

---

### 2. Backend Setup

1. Navigate to the backend directory, set up your virtual environment, and install dependencies:
   ```bash
   cd hrms/backend
   python -m venv venv
   
   # Activate virtual environment
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the `backend` directory and add your configurations:
   ```env
   MONGODB_URL=mongodb://localhost:27017
   SECRET_KEY=your-secure-jwt-secret-key-here
   GEMINI_API_KEY=your-gemini-api-key-here  # Optional: enables task similarity checks
   ```

3. Run the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *   API Endpoint: **http://localhost:8000**
   *   Swagger Documentation: **http://localhost:8000/docs**

---

### 3. Seed Demo Data

A database seed script is provided to automatically create default Admin and Employee accounts, along with corresponding profiles.

To load the demo data, navigate to the `backend` directory and run:
```bash
python seed.py
```

---

### 4. Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd hrms/frontend
   npm install
   ```

2. Start the Vite local development server:
   ```bash
   npm run dev
   ```
   *   Frontend App: **http://localhost:3000** (or http://localhost:5173 depending on configuration)

---

## 🔐 Default Credentials

Use these credentials after running the seed script to log into the application:

| Role     | Email             | Password  |
|----------|-------------------|-----------|
| **Admin**    | `admin@hrms.com`    | `admin123`  |
| **Employee** | `emp@hrms.com`      | `emp123`    |

---

## ✨ Features

### 👑 Admin Dashboard
- **Overview Analytics:** Charts displaying employee distribution by department, leave summaries, and attendance states.
- **Employee Directory (CRUD):** Manage the complete employee database, update positions, departments, salaries, and account status.
- **Leave Request Management:** Review employee leaves, with options to approve or reject requests alongside custom administrative comments.
- **Payroll Generation:** Generate monthly payroll ledgers showing base salary, deductions, net pay, and mark payouts as completed.
- **Announcements Broadcast:** Publish global organization-wide notices with priority levels (Low, Medium, High).
- **Holiday Calendar Control:** Administer the corporate calendar by adding, editing, or removing company-wide holidays.

### 👤 Employee Portal
- **Dashboard & Self-Check-in:** Real-time tracking of work check-in/out times.
- **Time & Attendance Analytics:** Personal check-in history, including an **Average Working Hours** chart to monitor personal productivity trends.
- **Leave Submissions:** Submit leave requests, view pending reviews, track leave balances, or cancel pending requests.
- **My Payslips:** View and download historical monthly salary sheets.
- **Holiday Schedule:** View global company holiday calendars and countdowns to upcoming holidays.
- **Task Management (Kanban Board):**
  - Track tasks assigned to the employee across 6 sequential stages.
  - Subtask checklists (create, toggle, delete items).
  - Write comments and log activity histories on specific tasks.
  - Upload task attachments up to 2MB (stored as base64 in MongoDB).
  - **AI Task Similarity:** Scans task title & description against existing entries using Gemini embeddings to suggest duplicates before creating new tasks.

---

## 🔌 API Endpoints

### Authentication & Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Login and retrieve a JWT |
| `GET` | `/api/employees/` | List all employees (Admin only) |
| `POST` | `/api/employees/` | Onboard new employee (Admin only) |
| `GET` | `/api/employees/me` | Retrieve current authenticated employee profile |
| `PUT` | `/api/employees/{id}` | Update employee profile details |
| `DELETE` | `/api/employees/{id}` | Remove an employee profile (Admin only) |

### Attendance & Leaves
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/attendance/checkin` | Register work check-in time |
| `POST` | `/api/attendance/checkout` | Register work check-out time |
| `GET` | `/api/leaves/` | List all leave requests (Admin only) |
| `GET` | `/api/leaves/my` | View logged-in employee's leave history |
| `POST` | `/api/leaves/` | Submit a new leave request |
| `PUT` | `/api/leaves/{id}` | Approve or reject a leave request (Admin only) |

### Payroll, Holidays & Announcements
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payroll/` | Generate monthly payroll lists (Admin only) |
| `GET` | `/api/payroll/my` | View personal payroll ledger history |
| `GET` | `/api/announcements/` | Fetch current active announcements |
| `POST` | `/api/announcements/` | Publish new announcements (Admin only) |
| `GET` | `/api/holidays/` | Fetch all scheduled company holidays |
| `GET` | `/api/holidays/upcoming` | Fetch next upcoming holidays |
| `POST` | `/api/holidays/` | Schedule a new holiday (Admin only) |
| `PUT` | `/api/holidays/{holiday_id}` | Edit holiday details (Admin only) |
| `DELETE` | `/api/holidays/{holiday_id}` | Delete a scheduled holiday (Admin only) |

### Task Board Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks/` | Fetch all tasks (supports status, priority, project, and assignee filters) |
| `GET` | `/api/tasks/my` | Retrieve tasks assigned to or created by logged-in employee |
| `GET` | `/api/tasks/stats` | Retrieve overall task status counters and overdue limits |
| `POST` | `/api/tasks/` | Create a new task (automatically generates title & description embeddings) |
| `POST` | `/api/tasks/check-similarity` | Fetch top 3 tasks matching similarity thresholds |
| `PUT` | `/api/tasks/{task_id}` | Edit task properties, assignees, and checklist structures |
| `PATCH` | `/api/tasks/{task_id}/status` | Move a task stage (guards single forward/backward transitions) |
| `DELETE` | `/api/tasks/{task_id}` | Delete a task (Task Creator or Admin only) |
| `POST` | `/api/tasks/{task_id}/comments` | Submit feedback comments to a task |
| `POST` | `/api/tasks/{task_id}/attachments` | Upload a task attachment file (Max size 2MB) |
| `GET` | `/api/tasks/{task_id}/attachments/{attachment_id}/download` | Download attachment data |

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, React Router v6, Tailwind CSS, Recharts, Lucide Icons, Axios |
| **Backend** | FastAPI, Motor (Async MongoDB), Pydantic v2, Python-jose (JWT), Bcrypt |
| **Database** | MongoDB |
| **Integrations** | Gemini Developer API (`text-embedding-004`) |

---

## 🌐 Production Deployment

### Backend (Gunicorn + Uvicorn)
For high-concurrency production setups, wrap the FastAPI application in a Gunicorn runner:
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend Optimization
Compile the optimized production bundle for static hosting:
```bash
npm run build
# Deploy the generated dist/ folder to Nginx, Netlify, Vercel, or AWS S3
```

### Production Security
1. **Restrict CORS:** In `main.py`, restrict `allow_origins` to your production frontend domain.
2. **Update Environment Variable Defaults:** Ensure your production `.env` utilizes MongoDB Atlas connection strings over TLS (`mongodb+srv://`) and a long, high-entropy cryptographic `SECRET_KEY`.

---

## 🎯 Target Audience & Use Cases

This system is valuable for:
*   **HR Managers & Admins:** Tracking employee directories, managing leave approvals, broadcasting company announcements, scheduling holidays, and processing monthly payrolls at a glance.
*   **Employees:** Tracking daily attendance (check-in/check-out), monitoring task items on a Kanban board, analyzing average working hours, and viewing personal payslips.
*   **Project Managers & Leads:** Organizing tasks, assigning resources, and tracking subtask checklists without administrative overhead.
*   **Developers & Students:** Learning full-stack development with FastAPI, asynchronous MongoDB (Motor), React (Vite), and AI integration (Gemini vector embeddings).

## 📬 Contact

Created by: **Shlok Panchal**

*   **LinkedIn:** [linkedin.com/in/panchalshlok](https://www.linkedin.com/in/panchalshlok)
*   **Email:** shlokpanchal1812@gmail.com

⭐ If you found this useful, please star the repo!
```bash
git clone https://github.com/SHLOK9998/hrms_webservice.git
```
