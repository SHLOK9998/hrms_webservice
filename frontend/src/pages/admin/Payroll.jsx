import { useState, useEffect } from 'react'
import { DollarSign, Plus, CheckCircle, X, Check } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function AdminPayroll() {
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ employee_id: '', month: '', year: new Date().getFullYear(), basic_salary: '', allowances: '0', deductions: '0', bonus: '0' })

  const fetch = async () => {
    try {
      const [pay, emp] = await Promise.all([api.get('/payroll/'), api.get('/employees/')])
      setRecords(pay.data)
      setEmployees(emp.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  // Auto-fetch salary when employee is selected
  const handleEmployeeChange = async (empId) => {
    setForm(prev => ({ ...prev, employee_id: empId, basic_salary: '' }))
    if (!empId) return
    try {
      const res = await api.get(`/payroll/salary/${empId}`)
      setForm(prev => ({ ...prev, basic_salary: String(res.data.salary || '') }))
    } catch {
      // If salary fetch fails, just leave it blank
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, basic_salary: parseFloat(form.basic_salary), allowances: parseFloat(form.allowances || 0), deductions: parseFloat(form.deductions || 0), bonus: parseFloat(form.bonus || 0), year: parseInt(form.year) }
      await api.post('/payroll/', payload)
      toast.success('Payroll generated')
      setShowModal(false)
      fetch()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setSaving(false)
  }

  const markPaid = async (id) => {
    try { await api.put(`/payroll/${id}/pay`); toast.success('Marked as paid'); fetch() }
    catch { toast.error('Failed') }
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const totalPaid = records.filter(r => r.status === 'paid').reduce((a, r) => a + (r.net_salary || 0), 0)
  const totalPending = records.filter(r => r.status === 'generated').reduce((a, r) => a + (r.net_salary || 0), 0)

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payroll</h1>
          <p className="text-slate-400 mt-1">Manage employee compensation</p>
        </div>
        <button onClick={() => { setForm({ employee_id: '', month: '', year: new Date().getFullYear(), basic_salary: '', allowances: '0', deductions: '0', bonus: '0' }); setShowModal(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Generate Payroll
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Records', value: records.length, color: 'text-brand-400' },
          { label: 'Total Paid', value: `₹${totalPaid.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Pending Payout', value: `₹${totalPending.toLocaleString()}`, color: 'text-amber-400' },
        ].map((c, i) => (
          <div key={i} className="card">
            <p className="text-sm text-slate-400">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                {['Employee', 'Period', 'Basic', 'Allowances', 'Deductions', 'Bonus', 'Net', 'Status', 'Action'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="table-cell text-center text-slate-500 py-12">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="table-cell text-center text-slate-500 py-12">No payroll records</td></tr>
              ) : records.map(r => (
                <tr key={r._id} className="table-row">
                  <td className="table-cell">
                    <p className="font-medium text-white">{r.employee_name}</p>
                    <p className="text-xs text-slate-500">{r.department}</p>
                  </td>
                  <td className="table-cell font-mono text-slate-300">{r.month} {r.year}</td>
                  <td className="table-cell font-mono">₹{r.basic_salary?.toLocaleString()}</td>
                  <td className="table-cell font-mono text-emerald-400">+₹{r.allowances?.toLocaleString()}</td>
                  <td className="table-cell font-mono text-red-400">-₹{r.deductions?.toLocaleString()}</td>
                  <td className="table-cell font-mono text-amber-400">+₹{r.bonus?.toLocaleString()}</td>
                  <td className="table-cell font-mono font-bold text-white">₹{r.net_salary?.toLocaleString()}</td>
                  <td className="table-cell">
                    {r.status === 'paid' ? <span className="badge-green"><CheckCircle className="w-3 h-3" />Paid</span> : <span className="badge-yellow">Generated</span>}
                  </td>
                  <td className="table-cell">
                    {r.status !== 'paid' && (
                      <button onClick={() => markPaid(r._id)} className="btn-success text-xs py-1.5">
                        <DollarSign className="w-3 h-3" /> Pay
                      </button>
                    )}
                  </td>
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
              <h2 className="text-lg font-semibold text-white">Generate Payroll</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Employee</label>
                <select className="input" value={form.employee_id} onChange={e => handleEmployeeChange(e.target.value)} required>
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e._id} value={e.employee_id}>{e.full_name} — {e.employee_id}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Month</label>
                  <select className="input" value={form.month} onChange={set('month')} required>
                    <option value="">Select month</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <input type="number" className="input" value={form.year} onChange={set('year')} required />
                </div>
              </div>
              {[['Basic Salary (₹)', 'basic_salary'], ['Allowances (₹)', 'allowances'], ['Deductions (₹)', 'deductions'], ['Bonus (₹)', 'bonus']].map(([label, field]) => (
                <div key={field}>
                  <label className="label">{label}{field === 'basic_salary' && form.basic_salary ? <span className="text-emerald-400 ml-2 text-xs">Auto-fetched ✓</span> : ''}</label>
                  <input type="number" min="0" className="input" value={form[field]} onChange={set(field)} required={field === 'basic_salary'} />
                </div>
              ))}
              {form.basic_salary && (
                <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl p-3">
                  <p className="text-sm text-slate-400">Net Salary Preview</p>
                  <p className="text-xl font-bold text-brand-400 font-mono mt-0.5">
                    ₹{(parseFloat(form.basic_salary || 0) + parseFloat(form.allowances || 0) + parseFloat(form.bonus || 0) - parseFloat(form.deductions || 0)).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
