import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, CalendarCheck, Clock,
  DollarSign, LogOut, ChevronRight, Users2, CalendarDays, CheckSquare,
  ArrowLeftRight
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/employee', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employee/attendance', label: 'Attendance', icon: Clock },
  { to: '/employee/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/employee/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/employee/holidays', label: 'Holidays', icon: CalendarDays },
  { to: '/employee/payroll', label: 'Payslips', icon: DollarSign },
  { to: '/employee/leaves', label: 'My Leaves', icon: CalendarCheck },
]

export default function EmployeeLayout() {
  const { user, logout, toggleViewMode } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  const handleToggle = () => {
    const nextMode = toggleViewMode()
    navigate(nextMode === 'admin' ? '/admin' : '/employee')
  }

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

        {/* Role Switcher (Admin Only) */}
        {user?.role === 'admin' && (
          <div className="px-3 py-3 border-b border-slate-800/60 bg-slate-900/40">
            <button
              onClick={handleToggle}
              title="Switch to Admin View"
              className={`flex items-center gap-3 w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all duration-200 font-medium text-xs shadow-lg shadow-emerald-500/5 cursor-pointer ${collapsed ? 'justify-center px-0' : 'px-3 text-left'}`}
            >
              <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">Switch to Admin View</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Back to Manager Panel</span>
                </div>
              )}
            </button>
          </div>
        )}

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
