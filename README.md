# 🏢 HRMS — Multi-Tenant Human Resource Management System

A production-ready, full-stack Multi-Tenant Human Resource Management System (HRMS) built with **React (Vite)**, **FastAPI (Python)**, and **MongoDB**. This project provides a robust, strictly isolated solution for multiple organizations to manage employee directories, attendance tracking, leaves, payroll, holiday planners, announcements, and task boards with AI-powered similarity checking.

---

## 📖 Theoretical Foundations & Project Architecture

An HRMS serves as the operational backbone of an organization, bridging the gap between management oversight and employee self-service. The system's design and codebase are built around several core engineering and domain-specific concepts:

### 1. Multi-Tenant Database Architecture (Shared Database, Shared Schema)
Data isolation is enforced at the query level. Every document in the database (with the exception of global platform organizations) is strictly associated with a tenant via an `organization_id` field.
*   **Query-Level Isolation:** Every database read, write, update, and delete operation automatically applies an `organization_id` filter derived directly from the authenticated user's JWT payload.
*   **Compound Indexes:** High-performance compound indexes are constructed with `organization_id` as the primary key prefix (e.g., `(organization_id, employee_id)`) to guarantee quick queries and enforce tenant-scoped uniqueness constraints.

### 2. Domain Theory: Employee Lifecycle & Workplace Management
*   **Employee Lifecycle Management:** Digital management of records from onboarding (CRUD operations) to active performance tracking and offboarding.
*   **Time & Attendance Management:** Real-time logging of employee check-in and check-out events to calculate total active hours, monitor late arrivals, and generate average working hours analytics.
*   **Leave Workflow Automation:** A state machine governing time-off requests. It prevents conflicts by keeping track of leave balances and requiring manager/admin approval, converting manual time-off requests into structured approvals.
*   **Payroll Ledger Processing:** Calculating payroll using base salaries, allowances, and tax/deduction profiles. A final ledger state machine transitions generated slips to `paid` once processed.

### 3. Three-Tier Role-Based Access Control (RBAC)
Users are assigned roles that determine their workspace access scope:
*   **Superadmin (Platform Owner):** No organization association (`organization_id` is null). Has exclusive permission to list, provision, and delete tenant organizations and their respective administrators.
*   **Admin (Tenant Administrator):** Has complete CRUD capability over their specific organization's employees, global holiday planning, company-wide announcements, task assignment controls, and payroll generation.
*   **Employee (Tenant Employee):** Accesses a self-service portal to log work check-in/out times, submit leave requests, track assigned tasks, and download personal monthly payslips.

### 4. Natural Language Processing (NLP) & Vector Search
*   **Task Semantic Representation:** To prevent duplicate work, when a user describes a new task, the application converts the combined Title and Description into a 768-dimensional vector embedding using Gemini's `text-embedding-004` model.
*   **Cosine Similarity Matching:** Similarities between the new task vector ($v_1$) and existing task vectors ($v_2$) are measured using Cosine Similarity:
    $$\text{Similarity}(v_1, v_2) = \frac{v_1 \cdot v_2}{\|v_1\| \|v_2\|}$$
    If the cosine similarity score is high (above a $0.5$ threshold), the backend alerts the user with the top 3 most similar tasks before creation.

---

## 📁 Project Structure

The project is split into two main components:

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

2. Create a `.env` file in the `backend` directory and add your configurations. **Note:** Choose secure credentials for the platform superadmin:
   ```env
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=hrms_db
   SECRET_KEY=your-secure-jwt-secret-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   GEMINI_API_KEY=your-gemini-api-key-here  # Optional
   SUPERADMIN_EMAIL=your-superadmin-email@domain.com
   SUPERADMIN_PASSWORD=your-secure-superadmin-password
   ```

3. Run the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *   API Endpoint: **http://localhost:8000**
   *   Swagger Documentation: **http://localhost:8000/docs**

On startup, the system will automatically seed the configured superadmin user if it does not already exist in the database.

---

### 3. Frontend Setup

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd hrms/frontend
   npm install
   ```

2. Start the Vite local development server:
   ```bash
   npm run dev
   ```
   *   Frontend App: **http://localhost:3000**

---

## ✨ Features

### 👑 Superadmin Control Plane (Platform Level)
- **Tenant Provisioning:** Provision new tenant organizations and their primary admin account in a single atomic transaction.
- **Tenant Management:** View the list of registered organizations, their created dates, status, and admin email.
- **Cascade Deletion:** Permanently delete tenant organizations along with all their isolated data (employees, tasks, leaves, attendance, payroll) to prevent orphan records.

### 🏢 Tenant Admin Dashboard
- **Overview Analytics:** Charts displaying employee distribution by department, leave summaries, and attendance states.
- **Employee Directory (CRUD):** Manage the complete employee database, update positions, departments, salaries, and account status with uniqueness validation.
- **Leave Request Management:** Review employee leaves, with options to approve or reject requests alongside custom administrative comments.
- **Payroll Generation:** Generate monthly payroll ledgers showing base salary, deductions, net pay, and mark payouts as completed.
- **Announcements Broadcast:** Publish global organization-wide notices with priority levels (Low, Medium, High).
- **Holiday Calendar Control:** Administer the corporate calendar by adding, editing, or removing company-wide holidays.

### 👤 Tenant Employee Portal
- **Dashboard & Self-Check-in:** Real-time tracking of work check-in/out times.
- **Time & Attendance Analytics:** Personal check-in history, including an **Average Working Hours** chart to monitor productivity trends.
- **Leave Submissions:** Submit leave requests, view pending reviews, track leave balances, or cancel pending requests.
- **My Payslips:** View and download historical monthly salary sheets.
- **Holiday Schedule:** View company holiday calendars and countdowns to upcoming holidays.
- **Task Management (Kanban Board):**
  - Track tasks assigned to the employee across 6 sequential stages.
  - Subtask checklists (create, toggle, delete items).
  - Write comments and log activity histories on specific tasks.
  - Upload task attachments up to 2MB (stored as base64 in MongoDB).
  - **AI Task Similarity:** Scans task title & description against existing entries using Gemini embeddings to suggest duplicates before creating new tasks.

---

## 🔌 Core API Endpoints

### Tenant Organization Management (Superadmin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/organizations/` | List all registered organizations |
| `POST` | `/api/organizations/` | Provision a new organization & admin account |
| `DELETE` | `/api/organizations/{org_id}` | Cascade-delete organization and all tenant data |

### Authentication & Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login and retrieve a JWT |
| `GET` | `/api/employees/` | List all employees (Admin only) |
| `POST` | `/api/employees/` | Onboard new employee (Admin only) |
| `GET` | `/api/employees/me` | Retrieve current authenticated employee profile |
| `PUT` | `/api/employees/{id}` | Update employee profile details |
| `DELETE` | `/api/employees/{id}` | Remove an employee profile (Admin only) |

### Task Board Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks/` | Fetch all tasks (supports status, priority, and assignee filters) |
| `GET` | `/api/tasks/my` | Retrieve tasks assigned to or created by logged-in employee |
| `POST` | `/api/tasks/` | Create a new task (automatically generates embeddings) |
| `POST` | `/api/tasks/check-similarity` | Fetch top 3 tasks matching similarity thresholds |
| `PUT` | `/api/tasks/{task_id}` | Edit task properties, assignees, and checklist structures |
| `PATCH` | `/api/tasks/{task_id}/status` | Move a task stage (guards forward/backward transitions) |

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, React Router v6, Vanilla CSS, Recharts, Lucide Icons, Axios |
| **Backend** | FastAPI, Motor (Async MongoDB), Pydantic v2, Python-jose (JWT), Bcrypt |
| **Database** | MongoDB |
| **Integrations** | Gemini Developer API (`text-embedding-004`) |

---

## 📬 Contact

Created by: **Shlok Panchal**

*   **LinkedIn:** [linkedin.com/in/panchalshlok](https://www.linkedin.com/in/panchalshlok)
*   **Email:** shlokpanchal1812@gmail.com
