import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import AdminLayout from './components/AdminLayout'
import EmployeeLayout from './components/EmployeeLayout'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminEmployees from './pages/admin/Employees'
import AdminLeaves from './pages/admin/Leaves'
import AdminAttendance from './pages/admin/Attendance'
import AdminPayroll from './pages/admin/Payroll'
import AdminAnnouncements from './pages/admin/Announcements'
import AdminHolidays from './pages/admin/Holidays'
import AdminTasks from './pages/admin/Tasks'

// Employee pages
import EmployeeDashboard from './pages/employee/Dashboard'
import EmployeeProfile from './pages/employee/Profile'
import EmployeeLeaves from './pages/employee/Leaves'
import EmployeeAttendance from './pages/employee/Attendance'
import EmployeePayroll from './pages/employee/Payroll'
import EmployeeHolidays from './pages/employee/Holidays'
import EmployeeTasks from './pages/employee/Tasks'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} /> : <Login />} />
      <Route path="/forgot-password" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} /> : <ForgotPassword />} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="payroll" element={<AdminPayroll />} />
        <Route path="holidays" element={<AdminHolidays />} />
        <Route path="tasks" element={<AdminTasks />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="profile" element={<EmployeeProfile />} />
      </Route>

      <Route path="/employee" element={<ProtectedRoute role="employee"><EmployeeLayout /></ProtectedRoute>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="leaves" element={<EmployeeLeaves />} />
        <Route path="attendance" element={<EmployeeAttendance />} />
        <Route path="payroll" element={<EmployeePayroll />} />
        <Route path="holidays" element={<EmployeeHolidays />} />
        <Route path="tasks" element={<EmployeeTasks />} />
      </Route>

      <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/employee'} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
        success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
      }} />
      <AppRoutes />
    </AuthProvider>
  )
}
