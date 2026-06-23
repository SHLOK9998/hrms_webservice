import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, CalendarCheck, Clock,
  DollarSign, LogOut, ChevronRight, Users2, CalendarDays, CheckSquare
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employee/attendance', label: 'Attendance', icon: Clock },
  { to: '/employee/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/employee/holidays', label: 'Holidays', icon: CalendarDays },
  { to: '/employee/payroll', label: 'Payslips', icon: DollarSign },
  { to: '/employee/leaves', label: 'My Leaves', icon: CalendarCheck },
]

export default function EmployeeLayout() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      <aside className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 flex flex-col bg-surface-900 border-r border-slate-800 flex-shrink-0`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                <Users2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm truncate max-w-[140px]" title={user?.organization_name || "HRMS"}>
                  {user?.organization_name || "HRMS"}
                </p>
                <p className="text-xs text-slate-500">Employee Portal</p>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 transition-colors">
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + My Profile button */}
        <div className="p-3 border-t border-slate-800">
          {!collapsed && (
            <button
              onClick={() => navigate('/employee/profile')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-slate-800/50 mb-2 hover:bg-slate-700/60 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-emerald-400">
                  {user?.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => navigate('/employee/profile')}
              className="flex items-center justify-center w-full p-2.5 rounded-xl bg-slate-800/50 mb-2 hover:bg-slate-700/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-xs font-semibold text-emerald-400">
                  {user?.full_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </button>
          )}
          <button onClick={logout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium ${collapsed ? 'justify-center' : ''}`}>
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
