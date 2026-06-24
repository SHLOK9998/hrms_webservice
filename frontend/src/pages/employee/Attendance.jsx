import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, LogIn, LogOut } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function EmployeeAttendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [attLoading, setAttLoading] = useState(false)
  const [todayAtt, setTodayAtt] = useState(null)

  const fetch = async () => {
    try {
      const res = await api.get('/attendance/my')
      setRecords(res.data)
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      setTodayAtt(res.data.find(r => r.date === today) || null)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleCheckIn = async () => {
    setAttLoading(true)
    try { await api.post('/attendance/checkin'); toast.success('Checked in!'); fetch() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setAttLoading(false)
  }

  const handleCheckOut = async () => {
    setAttLoading(true)
    try { await api.post('/attendance/checkout'); toast.success('Checked out!'); fetch() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setAttLoading(false)
  }


  const badge = (s) => {
    const map = {
      present: 'badge-green', absent: 'badge-red', half_day: 'badge-yellow', on_leave: 'badge-blue'
    }
    return <span className={map[s] || 'badge-gray'}>{s?.replace('_', ' ')}</span>
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">My Attendance</h1>
        <p className="text-slate-400 mt-1">Track your daily attendance</p>
      </div>

      {/* Today's status */}
      <div className="card border-brand-500/20">
        <h3 className="font-semibold text-white mb-4">Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}</h3>
        <div className="flex items-center gap-4 flex-wrap">
          {!todayAtt ? (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-slate-600 animate-pulse" />
              <span className="text-slate-400">Not checked in yet</span>
              <button onClick={handleCheckIn} disabled={attLoading} className="btn-success">
                {attLoading ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                Check In Now
              </button>
            </div>
          ) : !todayAtt.check_out ? (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-medium">Currently checked in</span>
              </div>
              <div className="text-slate-400 text-sm font-mono">Since {todayAtt.check_in}</div>
              <button onClick={handleCheckOut} disabled={attLoading} className="btn-danger">
                {attLoading ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <LogOut className="w-4 h-4" />}
                Check Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Day completed</span>
              </div>
              <div className="text-sm font-mono text-slate-400">
                In: <span className="text-emerald-400">{todayAtt.check_in}</span>
                {' · '}
                Out: <span className="text-amber-400">{todayAtt.check_out}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Attendance History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                {['Date', 'Day', 'Check In', 'Check Out', 'Status'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="table-cell text-center text-slate-500 py-12">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="table-cell text-center text-slate-500 py-12">No records</td></tr>
              ) : records.map((r, i) => {
                const d = new Date(r.date)
                return (
                  <tr key={i} className="table-row">
                    <td className="table-cell font-mono">{r.date}</td>
                    <td className="table-cell text-slate-400">{d.toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })}</td>
                    <td className="table-cell font-mono text-emerald-400">{r.check_in || '—'}</td>
                    <td className="table-cell font-mono text-amber-400">{r.check_out || '—'}</td>
                    <td className="table-cell">{badge(r.status)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
