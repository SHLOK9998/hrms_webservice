import { useState, useEffect } from 'react'
import { Users, CalendarCheck, Clock, DollarSign, TrendingUp, UserCheck, CheckSquare, CalendarDays, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import { format, isAfter, parseISO } from 'date-fns'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, active: 0, on_leave: 0, departments: 0 })
  const [leaveStats, setLeaveStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [taskStats, setTaskStats] = useState({ total: 0, overdue: 0, by_status: [] })
  const [deptData, setDeptData] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [upcomingHolidays, setUpcomingHolidays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [empStats, lvStats, depts, ann, tStats, holidays] = await Promise.all([
          api.get('/employees/stats'),
          api.get('/leaves/stats/summary'),
          api.get('/employees/department/summary'),
          api.get('/announcements/'),
          api.get('/tasks/stats'),
          api.get('/holidays/upcoming?limit=4'),
        ])
        setStats(empStats.data)
        setLeaveStats(lvStats.data)
        setDeptData(depts.data.map(d => ({ name: d._id || 'N/A', employees: d.count, avg_salary: Math.round(d.avg_salary || 0) })))
        setAnnouncements(ann.data.slice(0, 3))
        setTaskStats(tStats.data)
        setUpcomingHolidays(holidays.data)
      } catch {}
      setLoading(false)
    }
    fetchAll()
  }, [])

  const pieData = [
    { name: 'Active', value: stats.active },
    { name: 'On Leave', value: stats.on_leave },
    { name: 'Other', value: Math.max(0, stats.total - stats.active - stats.on_leave) },
  ]

  const statCards = [
    { label: 'Total Employees', value: stats.total, icon: Users, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
    { label: 'Active Today', value: stats.checked_in_today || 0, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Pending Leaves', value: leaveStats.pending, icon: CalendarCheck, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Tasks Overdue', value: taskStats.overdue || 0, icon: CheckSquare, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  ]

  const priorityColors = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-slate-400', urgent: 'text-red-500' }
  const holidayTypeColors = { national: 'badge-blue', regional: 'badge-green', optional: 'badge-yellow', company: 'badge-gray' }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Good morning, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-400 mt-1">Here's what's happening with your organization today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`stat-card border ${card.border}`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`w-12 h-12 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-sm text-slate-400 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-white mb-4">Department Headcount</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} />
              <Bar dataKey="employees" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Employee Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-brand-400" /> Latest Announcements
          </h3>
          <div className="space-y-3">
            {announcements.length === 0 && <p className="text-slate-500 text-sm">No announcements yet.</p>}
            {announcements.map((a, i) => (
              <div key={i} className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white leading-snug">{a.title}</p>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${a.priority === 'high' ? 'bg-red-500/20 text-red-400' : a.priority === 'urgent' ? 'bg-red-600/30 text-red-300' : 'bg-slate-700 text-slate-400'}`}>
                    {a.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{a.created_by}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-400" /> Upcoming Holidays
          </h3>
          <div className="space-y-3">
            {upcomingHolidays.length === 0 && <p className="text-slate-500 text-sm">No upcoming holidays.</p>}
            {upcomingHolidays.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-400">{format(parseISO(h.date), 'dd')}</span>
                  <span className="text-xs text-emerald-600">{format(parseISO(h.date), 'MMM')}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{h.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{h.holiday_type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Summary */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-purple-400" /> Task Overview
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Total Tasks', value: taskStats.total, color: 'text-white' },
              { label: 'Overdue', value: taskStats.overdue, color: 'text-red-400' },
              ...(taskStats.by_status || []).map(s => ({
                label: s._id?.replace('_', ' ') || 'Unknown',
                value: s.count,
                color: s._id === 'done' ? 'text-emerald-400' : s._id === 'in_progress' ? 'text-blue-400' : 'text-slate-400',
              }))
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
                <span className="text-sm text-slate-400 capitalize">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
