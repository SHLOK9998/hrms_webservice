import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Filter, Search, Edit2, X, Check } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [commentModal, setCommentModal] = useState(null)
  const [comment, setComment] = useState('')

  // New Tab & Employee Balance State
  const [activeTab, setActiveTab] = useState('requests')
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [newBalance, setNewBalance] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetch = async () => {
    try {
      const res = await api.get('/leaves/')
      setLeaves(res.data)
    } catch { toast.error('Failed to load leaves') }
    setLoading(false)
  }

  const fetchEmployees = async () => {
    setEmployeesLoading(true)
    try {
      const res = await api.get('/employees/')
      setEmployees(res.data)
    } catch {
      toast.error('Failed to load employees')
    }
    setEmployeesLoading(false)
  }

  useEffect(() => {
    fetch()
  }, [])

  useEffect(() => {
    if (activeTab === 'balances') {
      fetchEmployees()
    }
  }, [activeTab])

  const handleAction = async (id, status) => {
    try {
      await api.put(`/leaves/${id}`, { status, admin_comment: comment })
      toast.success(`Leave ${status}`)
      setCommentModal(null)
      setComment('')
      fetch()
    } catch { toast.error('Failed to update') }
  }

  const handleUpdateBalance = async (e) => {
    e.preventDefault()
    if (!editingEmployee) return
    setUpdating(true)
    try {
      await api.put(`/employees/${editingEmployee._id}`, {
        leave_balance: parseFloat(newBalance)
      })
      toast.success('Leave balance updated successfully')
      setEditingEmployee(null)
      fetchEmployees()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update leave balance')
    }
    setUpdating(false)
  }

  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter)

  const filteredEmployees = employees.filter(e =>
    e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const badge = (s) => {
    if (s === 'approved') return <span className="badge-green"><CheckCircle className="w-3 h-3" />Approved</span>
    if (s === 'rejected') return <span className="badge-red"><XCircle className="w-3 h-3" />Rejected</span>
    return <span className="badge-yellow"><Clock className="w-3 h-3" />Pending</span>
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Leave Management</h1>
        <p className="text-slate-400 mt-1">Review and manage employee leave requests and balances</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${activeTab === 'requests' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${activeTab === 'balances' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          Leave Balances
        </button>
      </div>

      {activeTab === 'requests' ? (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
                {f}
                <span className="ml-2 text-xs opacity-70">
                  {f === 'all' ? leaves.length : leaves.filter(l => l.status === f).length}
                </span>
              </button>
            ))}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    {['Employee', 'Type', 'Duration', 'Reason', 'Applied', 'Status', 'Actions'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="table-cell text-center text-slate-500 py-12">No leave requests found</td></tr>
                  ) : filtered.map(leave => (
                    <tr key={leave._id} className="table-row">
                      <td className="table-cell">
                        <p className="font-medium text-white">{leave.employee_name}</p>
                        <p className="text-xs text-slate-500">{leave.department}</p>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          leave.leave_type === 'leave' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          leave.leave_type === 'wfh' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          'bg-purple-500/10 border-purple-500/20 text-purple-400'
                        }`}>
                          {leave.leave_type === 'leave' ? 'Leave' : leave.leave_type === 'wfh' ? 'WFH' : 'Missing Checkout'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {leave.leave_type === 'missing_checkout' ? (
                          <>
                            <p className="text-white text-xs">{leave.start_date}</p>
                            <p className="text-slate-500 text-xs">Time: {leave.missing_checkout_time}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-white text-xs">{leave.start_date}</p>
                            <p className="text-slate-500 text-xs">to {leave.end_date}</p>
                          </>
                        )}
                      </td>
                      <td className="table-cell max-w-xs">
                        <p className="text-slate-300 text-sm truncate">{leave.reason}</p>
                        {leave.admin_comment && <p className="text-xs text-slate-500 truncate">Note: {leave.admin_comment}</p>}
                      </td>
                      <td className="table-cell text-xs text-slate-400">{leave.created_at?.split('T')[0]}</td>
                      <td className="table-cell">{badge(leave.status)}</td>
                      <td className="table-cell">
                        {leave.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setCommentModal({ id: leave._id, action: 'approved' })}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => setCommentModal({ id: leave._id, action: 'rejected' })}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-11" placeholder="Search employees by name, email, department..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          {/* Leave Balances Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    {['Employee', 'Department', 'Designation', 'Leave Balance', 'Actions'].map(h => (
                      <th key={h} className="table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeesLoading ? (
                    <tr><td colSpan={5} className="table-cell text-center text-slate-500 py-12">Loading...</td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan={5} className="table-cell text-center text-slate-500 py-12">No employees found</td></tr>
                  ) : filteredEmployees.map(emp => {
                    const balance = emp.leave_balance ?? 12.0;
                    let colorClass = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
                    if (balance <= 3.0) {
                      colorClass = "text-rose-400 bg-rose-500/10 border border-rose-500/20";
                    } else if (balance <= 8.0) {
                      colorClass = "text-amber-400 bg-amber-500/10 border border-amber-500/20";
                    }
                    return (
                      <tr key={emp._id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-brand-400">{emp.full_name?.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-white">{emp.full_name}</p>
                              <p className="text-xs text-slate-500">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">{emp.department}</td>
                        <td className="table-cell">{emp.designation}</td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold font-mono ${colorClass}`}>
                            {balance} days
                          </span>
                        </td>
                        <td className="table-cell">
                          <button onClick={() => { setEditingEmployee(emp); setNewBalance(balance.toString()); }}
                            className="p-1.5 rounded-lg hover:bg-brand-600/20 text-slate-400 hover:text-brand-400 transition-colors flex items-center gap-1.5 text-xs font-medium">
                            <Edit2 className="w-4 h-4" /> Edit Balance
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md animate-slide-up">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-1">
                {commentModal.action === 'approved' ? '✅ Approve Leave' : '❌ Reject Leave'}
              </h3>
              <p className="text-slate-400 text-sm mb-4">Add an optional comment for the employee</p>
              <textarea className="input h-24 resize-none" placeholder="Add a comment (optional)..."
                value={comment} onChange={e => setComment(e.target.value)} />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setCommentModal(null); setComment('') }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={() => handleAction(commentModal.id, commentModal.action)}
                  className={`flex-1 justify-center flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-all ${commentModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}>
                  Confirm {commentModal.action === 'approved' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balance Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Edit Leave Balance</h2>
              <button onClick={() => setEditingEmployee(null)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateBalance} className="p-6 space-y-4">
              <div>
                <p className="text-slate-300 text-sm">Update leave balance for <span className="text-white font-semibold">{editingEmployee.full_name}</span> ({editingEmployee.employee_id})</p>
              </div>
              <div>
                <label className="label">Leave Balance (days)</label>
                <input type="number" step="0.5" className="input" value={newBalance} onChange={e => setNewBalance(e.target.value)} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingEmployee(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={updating} className="btn-primary flex-1 justify-center">
                  {updating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
