import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Check, Users } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const EMPTY = { employee_id: '', full_name: '', email: '', password: '', phone: '', department: '', designation: '', date_of_joining: '', salary: '', employment_status: 'active', gender: '', address: '', leave_balance: '12', role: 'employee' }

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEmp, setEditEmp] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    try {
      const res = await api.get('/employees/')
      setEmployees(res.data)
      setFiltered(res.data)
    } catch { toast.error('Failed to load employees') }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(employees.filter(e =>
      e.full_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.employee_id?.toLowerCase().includes(q)
    ))
  }, [search, employees])

  const openAdd = () => { setForm(EMPTY); setEditEmp(null); setShowModal(true) }
  const openEdit = (emp) => {
    setForm({ ...EMPTY, ...emp, salary: emp.salary?.toString() || '', leave_balance: emp.leave_balance?.toString() || '12', role: emp.role || 'employee' })
    setEditEmp(emp)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        salary: parseFloat(form.salary),
        leave_balance: form.leave_balance ? parseFloat(form.leave_balance) : 12.0
      }
      if (editEmp) {
        const { password, ...updatePayload } = payload
        await api.put(`/employees/${editEmp._id}`, updatePayload)
        toast.success('Employee updated')
      } else {
        await api.post('/employees/', payload)
        toast.success('Employee created')
      }
      setShowModal(false)
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return
    try {
      await api.delete(`/employees/${id}`)
      toast.success('Employee deleted')
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const statusBadge = (s) => {
    const map = { active: 'badge-green', inactive: 'badge-gray', on_leave: 'badge-yellow', terminated: 'badge-red' }
    return <span className={map[s] || 'badge-gray'}>{s?.replace('_', ' ')}</span>
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-slate-400 mt-1">{employees.length} total employees</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-11" placeholder="Search by name, email, department..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                {['Employee', 'Department', 'Designation', 'Salary', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">No employees found</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp._id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-brand-400">{emp.full_name?.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{emp.full_name}</p>
                          {emp.role === 'admin' && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{emp.department}</td>
                  <td className="table-cell">{emp.designation}</td>
                  <td className="table-cell font-mono text-emerald-400">₹{emp.salary?.toLocaleString()}</td>
                  <td className="table-cell">{emp.date_of_joining}</td>
                  <td className="table-cell">{statusBadge(emp.employment_status)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-brand-600/20 text-slate-400 hover:text-brand-400 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(emp._id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">{editEmp ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ['Employee ID', 'employee_id', 'text', 'EMP001'],
                ['Full Name', 'full_name', 'text', 'John Doe'],
                ['Email', 'email', 'email', 'john@company.com'],
                ...(!editEmp ? [['Password', 'password', 'password', '••••••••']] : []),
                ['Phone', 'phone', 'text', '+91 98765 43210'],
                ['Department', 'department', 'text', 'Engineering'],
                ['Designation', 'designation', 'text', 'Software Engineer'],
                ['Date of Joining', 'date_of_joining', 'date', ''],
                ['Salary (₹)', 'salary', 'number', '50000'],
                ['Leave Balance (Days)', 'leave_balance', 'number', '12'],
              ].map(([label, field, type, ph]) => (
                <div key={field}>
                  <label className="label">{label}</label>
                  <input type={type} className="input" placeholder={ph} value={form[field] || ''} onChange={set(field)}
                    required={['employee_id','full_name','email','password','department','designation','date_of_joining','salary'].includes(field)} />
                </div>
              ))}
              <div>
                <label className="label">Gender</label>
                <select className="input" value={form.gender} onChange={set('gender')}>
                  <option value="">Select gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.employment_status} onChange={set('employment_status')}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role || 'employee'} onChange={set('role')} required>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input className="input" placeholder="123 Street, City, State" value={form.address} onChange={set('address')} />
              </div>
              <div className="sm:col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : editEmp ? 'Update' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
