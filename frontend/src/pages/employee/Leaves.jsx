import { useState, useEffect } from 'react'
import { Plus, X, Check, CalendarCheck, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Annual Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave', 'Unpaid Leave']

export default function EmployeeLeaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ leave_type: '', start_date: '', end_date: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)

  const fetch = async () => {
    try {
      const [leavesRes, profileRes] = await Promise.all([
        api.get('/leaves/my'),
        api.get('/employees/me').catch(() => null)
      ])
      setLeaves(leavesRes.data)
      if (profileRes) setProfile(profileRes.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/leaves/', form)
      toast.success('Leave request submitted!')
      setShowModal(false)
      setForm({ leave_type: '', start_date: '', end_date: '', reason: '' })
      fetch()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setSaving(false)
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return
    try {
      await api.delete(`/leaves/${id}`)
      toast.success('Leave cancelled')
      fetch()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const badge = (s) => {
    if (s === 'approved') return <span className="badge-green"><CheckCircle className="w-3 h-3" />Approved</span>
    if (s === 'rejected') return <span className="badge-red"><XCircle className="w-3 h-3" />Rejected</span>
    return <span className="badge-yellow"><Clock className="w-3 h-3" />Pending</span>
  }

  const pending = leaves.filter(l => l.status === 'pending').length
  const approved = leaves.filter(l => l.status === 'approved').length

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Leaves</h1>
          <p className="text-slate-400 mt-1">{pending} pending · {approved} approved</p>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl px-5 py-2 flex flex-col items-center">
              <span className="text-xs text-slate-400 font-medium">Leave Balance</span>
              <span className="text-lg font-bold text-brand-400 font-mono mt-0.5">
                {profile.leave_balance ?? 12.0} days
              </span>
            </div>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaves.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No leave requests yet</p>
          <p className="text-slate-500 text-sm mt-1">Apply for leave using the button above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((l, i) => (
            <div key={l._id} className="card hover:border-slate-600/80 transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{l.leave_type}</span>
                      {badge(l.status)}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{l.start_date} → {l.end_date}</p>
                    <p className="text-sm text-slate-300 mt-1">{l.reason}</p>
                    {l.admin_comment && (
                      <p className="text-xs text-slate-400 mt-1 bg-slate-800/50 px-3 py-1.5 rounded-lg inline-block">
                        Admin note: {l.admin_comment}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{l.created_at?.split('T')[0]}</span>
                  {l.status === 'pending' && (
                    <button onClick={() => handleCancel(l._id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Apply for Leave</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Leave Type</label>
                <select className="input" value={form.leave_type} onChange={set('leave_type')} required>
                  <option value="">Select leave type</option>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input" value={form.start_date} onChange={set('start_date')} required />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" className="input" value={form.end_date} onChange={set('end_date')} required />
                </div>
              </div>
              <div>
                <label className="label">Reason</label>
                <textarea className="input h-24 resize-none" placeholder="Briefly explain the reason for leave..." value={form.reason} onChange={set('reason')} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
