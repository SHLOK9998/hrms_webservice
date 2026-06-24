import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, CalendarCheck, DollarSign, Bell, LogIn, LogOut,
  CheckSquare, CalendarDays, TrendingUp, AlertCircle, X, ChevronDown, ChevronUp
} from 'lucide-react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { format, differenceInDays, startOfDay } from 'date-fns'

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
  const navigate = useNavigate()
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
  
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false)
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState(null)
  
  const getISTDate = () => {
    const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000)
    return new Date(utc + (3600000 * 5.5))
  }

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date()
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const today = startOfDay(getISTDate())

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      return format(parseLocalDate(dateStr), 'MMMM d, yyyy')
    } catch {
      return dateStr.split('T')[0]
    }
  }

  const handleViewAnnouncement = (annId) => {
    setExpandedAnnouncementId(annId)
    setShowAnnouncementsModal(true)
  }

  const handleViewAllAnnouncements = () => {
    setExpandedAnnouncementId(null)
    setShowAnnouncementsModal(true)
  }

  const toggleAnnouncementExpand = (annId) => {
    setExpandedAnnouncementId(prev => prev === annId ? null : annId)
  }

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

      setAnnouncements(annRes.data || [])
      setTasks(taskRes.data.slice(0, 5))
      setUpcomingHolidays(holRes.data)
      if (profRes) setProfile(profRes.data)

      // Calculate approved leave days from the full list
      if (lvRes.data) {
        const approvedDays = lvRes.data
          .filter(l => l.status === 'approved')
          .reduce((sum, l) => {
            try {
              const start = parseLocalDate(l.start_date)
              const end = parseLocalDate(l.end_date)
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
    return parseLocalDate(t.due_date) < today
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
        <p className="text-slate-400 mt-1">{user?.organization_name ? `${user.organization_name} · ` : ''}{format(getISTDate(), 'EEEE, MMMM d, yyyy')}</p>
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
          { label: 'Leave Balance', value: `${getLeaveBalance()} `, icon: CalendarCheck, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', path: '/employee/leaves' },
          { label: 'Active Tasks', value: activeTasks, icon: CheckSquare, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', path: '/employee/tasks' },
          { label: 'Overdue Tasks', value: overdueTasks, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', path: '/employee/tasks' },
          { label: 'Avg Work Hours', value: `${avgHours} `, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', path: null },
        ].map((card, i) => (
          <div
            key={i}
            onClick={() => card.path && navigate(card.path)}
            className={`stat-card border ${card.border} ${card.path ? 'cursor-pointer hover:border-slate-500 hover:bg-slate-800/30 transition-all duration-200' : ''}`}
          >
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
          <div className="flex items-center justify-between mb-4">
            <h3 onClick={() => navigate('/employee/tasks')} className="text-base font-semibold text-white flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors">
              <CheckSquare className="w-4 h-4 text-blue-400" /> My Tasks
            </h3>
            <button onClick={() => navigate('/employee/tasks')} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
              View All
            </button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-sm">No tasks assigned to you.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => {
                const overdue = t.due_date && t.status !== 'done' && parseLocalDate(t.due_date) < today
                return (
                  <div key={t._id} onClick={() => navigate('/employee/tasks')} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/40 hover:border-slate-500 cursor-pointer transition-colors">
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
                      {t.due_date && !overdue && <span className="text-xs text-slate-500">{format(parseLocalDate(t.due_date), 'dd MMM')}</span>}
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
            <div className="flex items-center justify-between mb-3">
              <h3 onClick={() => navigate('/employee/holidays')} className="text-sm font-semibold text-white flex items-center gap-2 cursor-pointer hover:text-emerald-400 transition-colors">
                <CalendarDays className="w-4 h-4 text-emerald-400" /> Upcoming Holidays
              </h3>
              <button onClick={() => navigate('/employee/holidays')} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
                View All
              </button>
            </div>
            {upcomingHolidays.length === 0 ? (
              <p className="text-slate-500 text-xs">No upcoming holidays.</p>
            ) : (
              <div className="space-y-2">
                {upcomingHolidays.map((h, i) => (
                  <div key={i} onClick={() => navigate('/employee/holidays')} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-colors">
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
            <div className="flex items-center justify-between mb-3">
              <h3 
                onClick={handleViewAllAnnouncements} 
                className="text-sm font-semibold text-white flex items-center gap-2 cursor-pointer hover:text-brand-400 transition-colors"
              >
                <Bell className="w-4 h-4 text-brand-400" /> Announcements
              </h3>
              <button 
                onClick={handleViewAllAnnouncements} 
                className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>
            {announcements.length === 0 ? (
              <p className="text-slate-500 text-xs">No announcements.</p>
            ) : (
              <div className="space-y-2">
                {announcements.slice(0, 3).map((a) => (
                  <div
                    key={a._id}
                    onClick={() => handleViewAnnouncement(a._id)}
                    className="p-2.5 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/50 hover:border-brand-500/40 rounded-lg cursor-pointer transition-all duration-250 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-white leading-snug truncate group-hover:text-brand-400 transition-colors flex-1">{a.title}</p>
                      {a.priority === 'high' && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex-shrink-0">
                          High
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-800/30">
                      <p className="text-[10px] text-slate-500">By {a.created_by}</p>
                      <p className="text-[10px] text-slate-500">{a.created_at ? format(parseISO(a.created_at), 'dd MMM') : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Announcements Modal */}
      {showAnnouncementsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-xl flex flex-col max-h-[85vh] shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-400" />
                <h2 className="text-lg font-semibold text-white">Announcements</h2>
              </div>
              <button 
                onClick={() => setShowAnnouncementsModal(false)} 
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {announcements.length === 0 ? (
                <div className="text-center py-10">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No announcements yet</p>
                </div>
              ) : (
                announcements.map((a) => {
                  const isExpanded = expandedAnnouncementId === a._id
                  return (
                  <div 
                    key={a._id} 
                    className={`border rounded-xl transition-all duration-200 ${isExpanded ? 'border-slate-600 bg-slate-800/40' : 'border-slate-800 bg-slate-800/20 hover:border-slate-700/80'}`}
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => toggleAnnouncementExpand(a._id)}
                      className="w-full flex items-center justify-between p-4 text-left gap-3 focus:outline-none cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white text-sm truncate">{a.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-700 text-slate-400'}`}>
                            {a.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          By {a.created_by} · {formatDate(a.created_at)}
                        </p>
                      </div>
                      <div className="text-slate-400 flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    
                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-800/60">
                        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{a.content}</p>
                      </div>
                    )}
                  </div>
                )
              }))}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowAnnouncementsModal(false)} 
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
