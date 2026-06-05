import { useState, useEffect } from 'react'
import {
  Clock, CalendarCheck, DollarSign, Bell, LogIn, LogOut,
  CheckSquare, CalendarDays, TrendingUp, AlertCircle
} from 'lucide-react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns'

const STATUS_COLORS = {
  todo: 'text-slate-400',
  in_progress: 'text-blue-400',
  in_development: 'text-purple-400',
  in_review: 'text-amber-400',
  in_staging: 'text-cyan-400',
  done: 'text-emerald-400',
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState({ checked_in: false, checked_out: false, record: null })
  const [leaves, setLeaves] = useState([])
  const [avgHours, setAvgHours] = useState('0.00')
  const [announcements, setAnnouncements] = useState([])
  const [tasks, setTasks] = useState([])
  const [upcomingHolidays, setUpcomingHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [approvedLeaveDays, setApprovedLeaveDays] = useState(0)
  const today = startOfDay(new Date())

  const fetchAll = async () => {
    try {
      const [attRes, lvRes, attHistoryRes, annRes, taskRes, holRes, profRes] = await Promise.all([
        api.get('/attendance/today/status').catch(() => ({ data: { checked_in: false, checked_out: false, record: null } })),
        api.get('/leaves/my'),
        api.get('/attendance/my').catch(() => ({ data: [] })),
        api.get('/announcements/'),
        api.get('/tasks/my'),
        api.get('/holidays/upcoming?limit=3'),
        api.get('/employees/me').catch(() => null),
      ])
      setAttendance(attRes.data)
      setLeaves(lvRes.data.slice(0, 5))

      const attHistory = attHistoryRes.data || []
      const activeRecords = attHistory.filter(r => r.total_hours !== null && r.total_hours !== undefined)
      const totalHours = activeRecords.reduce((sum, r) => sum + r.total_hours, 0)
      const computedAvg = activeRecords.length > 0 ? (totalHours / activeRecords.length).toFixed(2) : '0.00'
      setAvgHours(computedAvg)

      setAnnouncements(annRes.data.slice(0, 3))
      setTasks(taskRes.data.slice(0, 5))
      setUpcomingHolidays(holRes.data)
      if (profRes) setProfile(profRes.data)

      // Calculate approved leave days from the full list
      if (lvRes.data) {
        const approvedDays = lvRes.data
          .filter(l => l.status === 'approved')
          .reduce((sum, l) => {
            try {
              const start = parseISO(l.start_date)
              const end = parseISO(l.end_date)
              return sum + differenceInDays(end, start) + 1
            } catch {
              return sum + 1
            }
          }, 0)
        setApprovedLeaveDays(approvedDays)
      }
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleCheckIn = async () => {
    setActionLoading(true)
    try {
      await api.post('/attendance/checkin')
      toast.success('Checked in successfully!')
      fetchAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Check-in failed') }
    setActionLoading(false)
  }

  const handleCheckOut = async () => {
    setActionLoading(true)
    try {
      const res = await api.post('/attendance/checkout')
      toast.success(`Checked out! Total: ${res.data.total_hours}h`)
      fetchAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Check-out failed') }
    setActionLoading(false)
  }

  const getLeaveBalance = () => {
    return profile?.leave_balance ?? 12.0
  }

  const activeTasks = tasks.filter(t => t.status !== 'done').length
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    return parseISO(t.due_date) < today
  }).length

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Hello, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-400 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Attendance Card */}
      <div className="card border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${attendance.checked_in ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-700/50 border-slate-600'}`}>
              <Clock className={`w-6 h-6 ${attendance.checked_in ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-white font-semibold">Today's Attendance</p>
              {attendance.checked_in ? (
                <p className="text-sm text-slate-400 mt-0.5">
                  Checked in at <span className="text-emerald-400 font-medium">{attendance.record?.check_in}</span>
                  {attendance.record?.check_out && <> · Out at <span className="text-slate-300 font-medium">{attendance.record?.check_out}</span></>}
                  {attendance.record?.total_hours && <> · <span className="text-brand-400 font-medium">{attendance.record?.total_hours}h total</span></>}
                </p>
              ) : (
                <p className="text-sm text-slate-500 mt-0.5">You haven't checked in yet</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {!attendance.checked_in && (
              <button onClick={handleCheckIn} disabled={actionLoading} className="btn-primary bg-emerald-600 hover:bg-emerald-500">
                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn className="w-4 h-4" /> Check In</>}
              </button>
            )}
            {attendance.checked_in && !attendance.checked_out && (
              <button onClick={handleCheckOut} disabled={actionLoading} className="btn-secondary border border-slate-600">
                {actionLoading ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" /> : <><LogOut className="w-4 h-4" /> Check Out</>}
              </button>
            )}
            {attendance.checked_out && (
              <span className="badge-green">Completed for today ✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Leave Balance', value: `${getLeaveBalance()} `, icon: CalendarCheck, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Active Tasks', value: activeTasks, icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Overdue Tasks', value: overdueTasks, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { label: 'Avg Work Hours', value: `${avgHours} `, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ].map((card, i) => (
          <div key={i} className={`stat-card border ${card.border}`}>
            <div className={`w-11 h-11 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-blue-400" /> My Tasks
          </h3>
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-sm">No tasks assigned to you.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => {
                const overdue = t.due_date && t.status !== 'done' && parseISO(t.due_date) < today
                return (
                  <div key={t._id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/40 hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'done' ? 'bg-emerald-400' :
                          t.status === 'in_progress' ? 'bg-blue-400' :
                            t.status === 'in_review' ? 'bg-amber-400' : 'bg-slate-500'
                        }`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${overdue ? 'text-red-300' : 'text-white'}`}>{t.title}</p>
                        {t.project && <p className="text-xs text-slate-500">{t.project}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {overdue && <span className="text-xs text-red-400">Overdue</span>}
                      {t.due_date && !overdue && <span className="text-xs text-slate-500">{format(parseISO(t.due_date), 'dd MMM')}</span>}
                      <span className={`text-xs font-medium capitalize ${STATUS_COLORS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-5">
          {/* Upcoming Holidays */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-400" /> Upcoming Holidays
            </h3>
            {upcomingHolidays.length === 0 ? (
              <p className="text-slate-500 text-xs">No upcoming holidays.</p>
            ) : (
              <div className="space-y-2">
                {upcomingHolidays.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-400">{format(parseISO(h.date), 'dd')}</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{h.name}</p>
                      <p className="text-xs text-slate-500">{format(parseISO(h.date), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-400" /> Announcements
            </h3>
            {announcements.length === 0 ? (
              <p className="text-slate-500 text-xs">No announcements.</p>
            ) : (
              <div className="space-y-2">
                {announcements.map((a, i) => (
                  <div key={i} className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
                    <p className="text-xs font-medium text-white leading-snug">{a.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.created_by}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
