import { useState, useEffect } from 'react'
import { Clock, TrendingUp, Calendar, AlertCircle, ArrowUpRight } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function EmployeeAverageHours() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get('/attendance/my')
        setAttendance(res.data)
      } catch {
        toast.error('Failed to load attendance hours')
      } finally {
        setLoading(false)
      }
    }
    fetchAttendance()
  }, [])

  // Filter records that have valid hours
  const activeRecords = attendance.filter(r => r.total_hours !== null && r.total_hours !== undefined)
  const totalHours = activeRecords.reduce((sum, r) => sum + r.total_hours, 0)
  const avgHours = activeRecords.length > 0 ? (totalHours / activeRecords.length).toFixed(2) : '0.00'
  const presentDays = attendance.filter(r => r.status === 'present').length

  // Calculate target progress (assuming standard 8-hour workday)
  const getProgressWidth = (hours) => {
    if (!hours) return '0%'
    const percentage = Math.min((hours / 8) * 100, 100)
    return `${percentage}%`
  }

  const getProgressColor = (hours) => {
    if (!hours) return 'bg-slate-600'
    if (hours >= 8) return 'bg-emerald-500'
    if (hours >= 4) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Average Working Hours</h1>
        <p className="text-slate-400 mt-1">Track your daily working hours and time logs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Average Daily Hours', value: `${avgHours} hrs`, icon: Clock, color: 'text-brand-400', desc: 'Average active hours per check-in' },
          { label: 'Total Hours Worked', value: `${totalHours.toFixed(1)} hrs`, icon: TrendingUp, color: 'text-emerald-400', desc: 'Cumulative logged hours' },
          { label: 'Present Days', value: presentDays, icon: Calendar, color: 'text-purple-400', desc: 'Total successful check-ins' },
        ].map((c, i) => (
          <div key={i} className="card hover:border-slate-600/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{c.label}</p>
                <p className="text-2xl font-bold font-mono text-white mt-0.5">{c.value}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{c.desc}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : attendance.length === 0 ? (
        <div className="card text-center py-12 flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No work hours logged yet</p>
          <p className="text-xs text-slate-500 mt-1">Your hours will populate once you check-in and check-out</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Daily Time Logs</h2>
            <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 border border-slate-700 rounded-lg">
              Standard Shift: 8.00 hrs
            </span>
          </div>

          <div className="space-y-3">
            {attendance.map((r, i) => (
              <div
                key={r._id}
                className="card hover:border-slate-600/80 transition-all animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">
                        {new Date(r.date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-base font-bold text-white leading-none">
                        {new Date(r.date).getDate()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {new Date(r.date).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span>In: <strong className="text-slate-300">{r.check_in || '--'}</strong></span>
                        <span>•</span>
                        <span>Out: <strong className="text-slate-300">{r.check_out || 'Pending'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto text-left sm:text-right min-w-[200px] flex flex-col justify-end">
                    <div className="flex items-center justify-between sm:justify-end gap-2 mb-2">
                      <span className="text-xs text-slate-400">Shift Logged:</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        {r.total_hours !== null && r.total_hours !== undefined ? `${r.total_hours.toFixed(2)} hrs` : 'Active'}
                      </span>
                    </div>
                    
                    {r.total_hours !== null && r.total_hours !== undefined && (
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(r.total_hours)}`}
                          style={{ width: getProgressWidth(r.total_hours) }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
