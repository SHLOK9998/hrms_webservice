import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, AlertCircle, Plus, X, Check, Download, Search } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function AdminAttendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [employees, setEmployees] = useState([])
  const [filterEmp, setFilterEmp] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [form, setForm] = useState({ employee_id: '', date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), status: 'present', check_in: '', check_out: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      if (filterEmp) params.set('employee_id', filterEmp)
      if (filterMonth) params.set('month', filterMonth)
      const [att, emp] = await Promise.all([api.get(`/attendance/?${params}`), api.get('/employees/')])
      setRecords(att.data)
      setEmployees(emp.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filterEmp, filterMonth])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/attendance/', form); toast.success('Attendance marked'); setShowModal(false); fetchData() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setSaving(false)
  }

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams()
      if (filterEmp) params.set('employee_id', filterEmp)
      if (filterMonth) params.set('month', filterMonth)
      const res = await api.get(`/attendance/export/excel?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${filterEmp || 'all'}_${filterMonth || 'all'}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Downloaded')
    } catch { toast.error('Export failed') }
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const badge = (s) => {
    const map = {
      present: <span className="badge-green"><CheckCircle className="w-3 h-3" />Present</span>,
      absent: <span className="badge-red"><XCircle className="w-3 h-3" />Absent</span>,
      half_day: <span className="badge-yellow"><AlertCircle className="w-3 h-3" />Half Day</span>,
      on_leave: <span className="badge-blue"><Clock className="w-3 h-3" />On Leave</span>,
    }
    return map[s] || <span className="badge-gray">{s}</span>
  }

  const today = records.filter(r => r.date === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
  const todayPresent = today.filter(r => r.status === 'present').length

  const MONTHS = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    MONTHS.push({ value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleString('en', { month: 'long', year: 'numeric' }) })
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance</h1>
          <p className="text-slate-400 mt-1">Today: {todayPresent} present out of {today.length} marked</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary"><Download className="w-4 h-4" /> Export Excel</button>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Mark Attendance</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input !w-52" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e._id} value={e.employee_id}>{e.full_name} — {e.employee_id}</option>)}
        </select>
        <select className="input !w-52" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">All Months</option>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {(filterEmp || filterMonth) && (
          <button onClick={() => { setFilterEmp(''); setFilterMonth('') }} className="btn-secondary !py-2"><X className="w-4 h-4" /> Clear</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                {['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Notes'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">No attendance records</td></tr>
              ) : records.map(r => (
                <tr key={r._id} className="table-row">
                  <td className="table-cell">
                    <p className="font-medium text-white">{r.employee_name}</p>
                    <p className="text-xs text-slate-500 font-mono">{r.employee_id}</p>
                  </td>
                  <td className="table-cell">{r.date}</td>
                  <td className="table-cell font-mono text-emerald-400">{r.check_in || '—'}</td>
                  <td className="table-cell font-mono text-amber-400">{r.check_out || '—'}</td>
                  <td className="table-cell font-mono text-brand-400">{r.total_hours != null ? `${r.total_hours}h` : '—'}</td>
                  <td className="table-cell">{badge(r.status)}</td>
                  <td className="table-cell text-slate-400">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Mark Attendance</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Employee</label>
                <select className="input" value={form.employee_id} onChange={set('employee_id')} required>
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e._id} value={e.employee_id}>{e.full_name}</option>)}
                </select>
              </div>
              <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={set('date')} required /></div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option value="present">Present</option><option value="absent">Absent</option>
                  <option value="half_day">Half Day</option><option value="on_leave">On Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Check In</label><input type="time" className="input" value={form.check_in} onChange={set('check_in')} /></div>
                <div><label className="label">Check Out</label><input type="time" className="input" value={form.check_out} onChange={set('check_out')} /></div>
              </div>
              <div><label className="label">Notes</label><input className="input" placeholder="Optional notes" value={form.notes} onChange={set('notes')} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
