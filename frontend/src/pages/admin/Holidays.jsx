import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Trash2, X } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const HOLIDAY_TYPES = ['national', 'regional', 'optional', 'company']
const TYPE_COLORS = {
  national: 'badge-blue',
  regional: 'badge-green',
  optional: 'badge-yellow',
  company: 'badge-gray',
}

const getISTDate = () => {
  const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000)
  return new Date(utc + (3600000 * 5.5))
}

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function AdminHolidays() {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', holiday_type: 'national', description: '' })
  const [saving, setSaving] = useState(false)
  const [filterYear, setFilterYear] = useState(getISTDate().getFullYear())

  const fetchHolidays = async () => {
    try {
      const res = await api.get(`/holidays/calendar/${filterYear}`)
      setHolidays(res.data)
    } catch { toast.error('Failed to load holidays') }
    setLoading(false)
  }

  useEffect(() => { fetchHolidays() }, [filterYear])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/holidays/', form)
      toast.success('Holiday added')
      setShowModal(false)
      setForm({ name: '', date: '', holiday_type: 'national', description: '' })
      fetchHolidays()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add holiday')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return
    try {
      await api.delete(`/holidays/${id}`)
      toast.success('Holiday removed')
      setHolidays(prev => prev.filter(h => h._id !== id))
    } catch { toast.error('Failed to delete') }
  }

  // Group by month
  const grouped = holidays.reduce((acc, h) => {
    const month = format(parseLocalDate(h.date), 'MMMM yyyy')
    if (!acc[month]) acc[month] = []
    acc[month].push(h)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Holiday Calendar</h1>
          <p className="text-slate-400 mt-1">Manage company holidays for {filterYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value))}
            className="input !w-32 !py-2"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-3">
        {HOLIDAY_TYPES.map(type => {
          const count = holidays.filter(h => h.holiday_type === type).length
          return (
            <div key={type} className="card !p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{count}</p>
                <p className="text-xs text-slate-400 capitalize">{type}</p>
              </div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No holidays for {filterYear}. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month} className="card !p-0 overflow-hidden">
              <div className="px-5 py-3 bg-slate-800/80 border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300">{month}</h3>
              </div>
              <div className="divide-y divide-slate-700/30">
                {items.map(h => (
                  <div key={h._id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-brand-400">{format(parseLocalDate(h.date), 'dd')}</span>
                        <span className="text-xs text-brand-600">{format(parseLocalDate(h.date), 'EEE')}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{h.name}</p>
                        {h.description && <p className="text-xs text-slate-400 mt-0.5">{h.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={TYPE_COLORS[h.holiday_type] || 'badge-gray'}>{h.holiday_type}</span>
                      <button onClick={() => handleDelete(h._id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Add Holiday</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="label">Holiday Name</label>
                <input className="input" placeholder="e.g. Diwali" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.holiday_type} onChange={e => setForm({ ...form, holiday_type: e.target.value })}>
                  {HOLIDAY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" placeholder="Brief note..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
