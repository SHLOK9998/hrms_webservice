import { useState, useEffect, useRef } from 'react'
import { CheckSquare, Plus, X, Search, MessageSquare, Trash2, Eye, Paperclip, Users, Download, ChevronDown, ChevronRight, Circle, CheckCircle2, Upload, AlertTriangle } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { format, parseISO, isAfter } from 'date-fns'
import { useAuth } from '../../context/AuthContext'

const STAGES = [
  { key: 'todo', label: 'To Do', dot: 'bg-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { key: 'in_development', label: 'In Development', dot: 'bg-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { key: 'in_review', label: 'In Review', dot: 'bg-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { key: 'in_staging', label: 'In Staging', dot: 'bg-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { key: 'done', label: 'Done', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
]
const PRIORITY_CONFIG = {
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
  urgent: { color: 'text-red-400', bg: 'bg-red-500/10' },
}

const getAvatarColor = (email) => {
  const colors = [
    'bg-blue-600/30 text-blue-300 border-blue-500/30',
    'bg-purple-600/30 text-purple-300 border-purple-500/30',
    'bg-emerald-600/30 text-emerald-300 border-emerald-500/30',
    'bg-amber-600/30 text-amber-300 border-amber-500/30',
    'bg-cyan-600/30 text-cyan-300 border-cyan-500/30',
    'bg-rose-600/30 text-rose-300 border-rose-500/30',
    'bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
  ]
  if (!email) return colors[0]
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

const getInitials = (email) => {
  if (!email) return '?'
  const parts = email.split('@')[0].split('.')
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

const AssigneeAvatars = ({ emails }) => {
  const list = Array.isArray(emails) ? emails : (emails ? [emails] : [])
  if (list.length === 0) return null
  return (
    <div className="flex -space-x-1.5 overflow-hidden">
      {list.map((email) => (
        <div
          key={email}
          title={email}
          className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 uppercase ${getAvatarColor(email)}`}
        >
          {getInitials(email)}
        </div>
      ))}
    </div>
  )
}

export default function AdminTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('board')
  const [assignableEmps, setAssignableEmps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [comment, setComment] = useState('')
  const [clTitle, setClTitle] = useState('')
  const [clItemTitle, setClItemTitle] = useState({})
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assigned_to: [], due_date: '', priority: 'medium', project: '', tags: [] })
  const [dragOver, setDragOver] = useState(null)
  const [fileToAttach, setFileToAttach] = useState(null)
  const fileRef = useRef(null)
  const detailFileRef = useRef(null)

  const [showExtensionForm, setShowExtensionForm] = useState(false)
  const [extDate, setExtDate] = useState('')
  const [extReason, setExtReason] = useState('')
  const [submittingExtension, setSubmittingExtension] = useState(false)

  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [descText, setDescText] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)

  const [similarTasks, setSimilarTasks] = useState([])
  const [showSimilarityWarning, setShowSimilarityWarning] = useState(false)
  const [checkingSimilarity, setCheckingSimilarity] = useState(false)

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/')
      setTasks(res.data)
    } catch { toast.error('Failed to load tasks') }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
    api.get('/tasks/employees-for-assign').then(r => setAssignableEmps(r.data)).catch(() => {})
  }, [])

  const refreshSelected = async (id) => {
    try {
      const res = await api.get(`/tasks/${id}`)
      setSelected(res.data)
    } catch {}
  }

  // Admin cannot drag — this is view only for status changes
  const handleDragStart = (e) => { e.preventDefault() }

  const saveTaskDirectly = async (taskForm, attachedFile) => {
    setSaving(true)
    try {
      const res = await api.post('/tasks/', taskForm)
      if (attachedFile) {
        if (attachedFile.size > 2 * 1024 * 1024) {
          toast.error('File exceeds 2 MB limit. Task was created without attachment.')
        } else {
          const fd = new FormData()
          fd.append('file', attachedFile)
          await api.post(`/tasks/${res.data._id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }
      }
      toast.success('Task created successfully')
      setShowCreate(false)
      setShowSimilarityWarning(false)
      setSimilarTasks([])
      setForm({ title: '', description: '', assigned_to: [], due_date: '', priority: 'medium', project: '', tags: [] })
      setFileToAttach(null)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCheckingSimilarity(true)
    try {
      const checkRes = await api.post('/tasks/check-similarity', {
        title: form.title,
        description: form.description
      })
      if (checkRes.data && checkRes.data.length > 0) {
        setSimilarTasks(checkRes.data)
        setShowSimilarityWarning(true)
      } else {
        await saveTaskDirectly(form, fileToAttach)
      }
    } catch (err) {
      console.error('Similarity check failed:', err)
      await saveTaskDirectly(form, fileToAttach)
    } finally {
      setCheckingSimilarity(false)
    }
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      toast.success('Task deleted')
      setTasks(prev => prev.filter(t => t._id !== taskId))
      if (selected?._id === taskId) setSelected(null)
    } catch { toast.error('Failed') }
  }

  const handleAddComment = async () => {
    if (!comment.trim() || !selected) return
    try {
      const res = await api.post(`/tasks/${selected._id}/comments`, { content: comment })
      setSelected(prev => ({ ...prev, comments: [...(prev.comments || []), res.data] }))
      setComment('')
    } catch { toast.error('Failed') }
  }

  const handleAddChecklist = async () => {
    if (!clTitle.trim() || !selected) return
    try {
      const res = await api.post(`/tasks/${selected._id}/checklists`, { title: clTitle })
      setSelected(prev => ({ ...prev, checklists: [...(prev.checklists || []), res.data] }))
      setClTitle('')
    } catch { toast.error('Failed') }
  }

  const handleDeleteChecklist = async (clId) => {
    try {
      await api.delete(`/tasks/${selected._id}/checklists/${clId}`)
      setSelected(prev => ({ ...prev, checklists: prev.checklists.filter(c => c.id !== clId) }))
    } catch { toast.error('Failed') }
  }

  const handleAddClItem = async (clId) => {
    const title = clItemTitle[clId]
    if (!title?.trim()) return
    try {
      const res = await api.post(`/tasks/${selected._id}/checklists/${clId}/items`, { title })
      setSelected(prev => ({
        ...prev,
        checklists: prev.checklists.map(c => c.id === clId ? { ...c, items: [...c.items, res.data] } : c)
      }))
      setClItemTitle(prev => ({ ...prev, [clId]: '' }))
    } catch { toast.error('Failed') }
  }

  const handleToggleClItem = async (clId, itemId) => {
    try {
      await api.patch(`/tasks/${selected._id}/checklists/${clId}/items/${itemId}`)
      setSelected(prev => ({
        ...prev,
        checklists: prev.checklists.map(c => c.id === clId ? {
          ...c, items: c.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it)
        } : c)
      }))
    } catch { toast.error('Failed') }
  }

  const handleDeleteClItem = async (clId, itemId) => {
    try {
      await api.delete(`/tasks/${selected._id}/checklists/${clId}/items/${itemId}`)
      setSelected(prev => ({
        ...prev,
        checklists: prev.checklists.map(c => c.id === clId ? {
          ...c, items: c.items.filter(it => it.id !== itemId)
        } : c)
      }))
    } catch { toast.error('Failed') }
  }

  const handleUploadAttachment = async (taskId, file) => {
    if (file.size > 2 * 1024 * 1024) { toast.error('File must be under 2 MB'); return }
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post(`/tasks/${taskId}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (selected?._id === taskId) {
        setSelected(prev => ({ ...prev, attachments: [...(prev.attachments || []), res.data] }))
      }
      toast.success('Uploaded')
    } catch (err) { toast.error(err.response?.data?.detail || 'Upload failed') }
  }

  const handleDeleteAttachment = async (attId) => {
    try {
      await api.delete(`/tasks/${selected._id}/attachments/${attId}`)
      setSelected(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attId) }))
    } catch { toast.error('Failed') }
  }

  const handleAddAssignee = async (email) => {
    try {
      await api.post(`/tasks/${selected._id}/assignees?email=${email}`)
      refreshSelected(selected._id)
      fetchTasks()
      toast.success('Assignee added')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const handleRemoveAssignee = async (email) => {
    try {
      await api.delete(`/tasks/${selected._id}/assignees/${email}`)
      refreshSelected(selected._id)
      fetchTasks()
    } catch { toast.error('Failed') }
  }

  const handleExtensionSubmit = async () => {
    if (!extDate || !extReason.trim() || !selected) {
      return toast.error('Please fill in both the date and the reason')
    }
    if (selected.due_date) {
      const currentDue = selected.due_date.split('T')[0]
      const requestedDue = extDate.split('T')[0]
      if (requestedDue <= currentDue) {
        return toast.error('Requested date must be after the current due date')
      }
    }
    setSubmittingExtension(true)
    try {
      const res = await api.post(`/tasks/${selected._id}/extension-request`, {
        requested_date: extDate,
        reason: extReason,
      })
      toast.success('Extension request submitted!')
      setShowExtensionForm(false)
      refreshSelected(selected._id)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit request')
    } finally {
      setSubmittingExtension(false)
    }
  }

  const handleExtensionRespond = async (action) => {
    if (!selected) return
    try {
      await api.post(`/tasks/${selected._id}/extension-respond`, { action })
      toast.success(`Extension request ${action}ed successfully!`)
      refreshSelected(selected._id)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to respond to request')
    }
  }

  const handleSaveDescription = async () => {
    if (!selected) return
    setSavingDesc(true)
    try {
      await api.put(`/tasks/${selected._id}`, { description: descText })
      toast.success('Description updated')
      setIsEditingDesc(false)
      refreshSelected(selected._id)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update description')
    } finally {
      setSavingDesc(false)
    }
  }

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const isOverdue = (task) => task.due_date && task.status !== 'done' && !isAfter(parseISO(task.due_date), new Date())

  const pendingRequests = tasks.filter(t => t.extension_request && t.extension_request.status === 'pending')

  const toggleAssignee = (email) => {
    setForm(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(email)
        ? prev.assigned_to.filter(e => e !== email)
        : [...prev.assigned_to, email]
    }))
  }

  const isAssignee = selected && (Array.isArray(selected.assigned_to)
    ? selected.assigned_to.includes(user?.email)
    : selected.assigned_to === user?.email);
  const isAssigner = selected && (selected.created_by_email === user?.email || selected.created_by === user?.email);
  const isAdmin = user?.role === 'admin';
  const canUpdateDesc = selected && selected.status !== 'done' && (isAdmin || isAssignee || isAssigner);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Tracker</h1>
          <p className="text-slate-400 mt-1">Kanban board — admin view (read-only stages)</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Task</button>
      </div>

      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('board')} 
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'board' ? 'border-brand-500 text-brand-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Active Boards
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'history' ? 'border-brand-500 text-brand-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Task History
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input !pl-9" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {activeTab === 'history' ? (
        <div className="card p-0 overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  {['Task Title', 'Project', 'Priority', 'Completed Date', 'Assignees', 'Action'].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.filter(t => t.status === 'done').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-cell text-center text-slate-500 py-12">
                      No completed tasks found.
                    </td>
                  </tr>
                ) : (
                  filtered.filter(t => t.status === 'done').map(task => {
                    const assignees = Array.isArray(task.assigned_to) ? task.assigned_to : (task.assigned_to ? [task.assigned_to] : [])
                    const compDate = task.updated_at || task.due_date || task.created_at
                    return (
                      <tr key={task._id} className="table-row">
                        <td className="table-cell">
                          <p className="font-semibold text-white cursor-pointer hover:text-brand-400 transition-colors"
                            onClick={() => { setSelected(null); setTimeout(() => refreshSelected(task._id), 50) }}>
                            {task.title}
                          </p>
                        </td>
                        <td className="table-cell text-slate-300">
                          {task.project ? <span className="badge-gray">{task.project}</span> : '—'}
                        </td>
                        <td className="table-cell">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${PRIORITY_CONFIG[task.priority]?.bg} ${PRIORITY_CONFIG[task.priority]?.color}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="table-cell text-slate-400">
                          {compDate ? format(parseISO(compDate), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="table-cell">
                          <AssigneeAvatars emails={task.assigned_to} />
                        </td>
                        <td className="table-cell">
                          <button
                            onClick={() => { setSelected(null); setTimeout(() => refreshSelected(task._id), 50) }}
                            className="btn-secondary !py-1 !px-3 text-xs"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Pending Extension Requests Section (Only visible when there are pending requests) */}
          {pendingRequests.length > 0 && (
            <div className="bg-surface-900/40 border border-amber-500/20 rounded-2xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-lg font-bold text-white">Pending Due Date Extension Requests</h2>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map(task => {
                  const req = task.extension_request;
                  return (
                    <div key={task._id} className="card !p-4 border border-slate-700/50 bg-slate-800/40 hover:border-slate-600 transition-all flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-semibold text-white truncate" title={task.title}>{task.title}</h3>
                          {task.project && <span className="text-[10px] font-medium px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full">{task.project}</span>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Current Due</span>
                            <span className="text-slate-300 font-medium">
                              {task.due_date ? format(parseISO(task.due_date), 'dd MMM yyyy') : 'No Date'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Proposed Due</span>
                            <span className="text-amber-400 font-semibold">
                              {req.requested_date ? format(parseISO(req.requested_date), 'dd MMM yyyy') : ''}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase tracking-wider">Reason</span>
                          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 bg-slate-900/20 p-2 rounded-lg border border-slate-800/30 whitespace-pre-wrap" title={req.reason}>
                            {req.reason}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-700/30">
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>By: {req.requested_by_name || req.requested_by}</span>
                          <span>{req.requested_at ? format(parseISO(req.requested_at), 'dd MMM') : ''}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await api.post(`/tasks/${task._id}/extension-respond`, { action: 'approve' });
                                toast.success('Approved successfully');
                                fetchTasks();
                                if (selected?._id === task._id) refreshSelected(task._id);
                              } catch (err) {
                                toast.error(err.response?.data?.detail || 'Failed');
                              }
                            }}
                            className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 hover:border-emerald-500/40 transition-all text-center"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.post(`/tasks/${task._id}/extension-respond`, { action: 'reject' });
                                toast.success('Rejected successfully');
                                fetchTasks();
                                if (selected?._id === task._id) refreshSelected(task._id);
                              } catch (err) {
                                toast.error(err.response?.data?.detail || 'Failed');
                              }
                            }}
                            className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-red-600/20 text-red-400 border border-red-500/20 hover:bg-red-600/30 hover:border-red-500/40 transition-all text-center"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ minHeight: '60vh' }}>
            {STAGES.map(stage => {
              const stageTasks = filtered.filter(t => {
                if (stage.key === 'done') return false
                return t.status === stage.key
              })
              return (
                <div key={stage.key} className={`w-full rounded-2xl border ${stage.border} ${stage.bg} p-4 flex flex-col`}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <span className="text-sm font-semibold text-white">{stage.label}</span>
                    <span className="text-xs text-slate-500 ml-auto">{stageTasks.length}</span>
                  </div>
                  <div className="space-y-2.5 min-h-[100px]">
                    {stageTasks.map(task => {
                      const overdue = isOverdue(task)
                      const assignees = Array.isArray(task.assigned_to) ? task.assigned_to : (task.assigned_to ? [task.assigned_to] : [])
                      return (
                        <div key={task._id}
                          onClick={() => { setSelected(null); setTimeout(() => refreshSelected(task._id), 50) }}
                          className={`card !p-3 cursor-pointer hover:border-slate-500 transition-all ${overdue ? 'border-red-500/40' : ''}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${PRIORITY_CONFIG[task.priority]?.bg} ${PRIORITY_CONFIG[task.priority]?.color}`}>{task.priority}</span>
                            <div className="flex items-center gap-1.5">
                              <AssigneeAvatars emails={task.assigned_to} />
                              <button onClick={e => { e.stopPropagation(); handleDelete(task._id) }} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          <p className={`text-sm font-semibold mb-1 ${overdue ? 'text-red-300' : 'text-white'}`}>{task.title}</p>
                          {task.project && <p className="text-xs text-brand-400 mb-1">{task.project}</p>}
                          {overdue && <span className="text-xs text-red-400">⚠ Overdue</span>}
                          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                            <span>{task.due_date ? format(parseISO(task.due_date), 'dd MMM') : ''}</span>
                            <div className="flex items-center gap-2">
                              {assignees.length > 0 && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{assignees.length}</span>}
                              {(task.comments || []).length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{task.comments.length}</span>}
                              {(task.attachments || []).length > 0 && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{task.attachments.length}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Create Task</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input !h-20 resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Assign To (multiple)</label>
                <div className="max-h-32 overflow-y-auto border border-slate-700 rounded-xl p-2 space-y-1">
                  {assignableEmps.map(emp => (
                    <label key={emp.email} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700/40 cursor-pointer text-sm">
                      <input type="checkbox" checked={form.assigned_to.includes(emp.email)} onChange={() => toggleAssignee(emp.email)} className="accent-brand-500" />
                      <span className="text-slate-300">{emp.full_name}</span>
                      <span className="text-xs text-slate-500 ml-auto">{emp.designation}</span>
                    </label>
                  ))}
                  {assignableEmps.length === 0 && <p className="text-xs text-slate-500 p-2">No employees found</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Project</label>
                <input className="input" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} />
              </div>
              <div>
                <label className="label">Attachment (optional, max 2MB)</label>
                <input type="file" className="input file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20" 
                  onChange={e => setFileToAttach(e.target.files[0] || null)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setFileToAttach(null) }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving || checkingSimilarity} className="btn-primary flex-1 justify-center">
                  {saving || checkingSimilarity ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Similarity Warning Modal */}
      {showSimilarityWarning && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-900 border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-slide-up space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Similar Tasks Detected</h3>
                <p className="text-sm text-slate-400 mt-1">We found similar task(s) in the workspace. Please review them before deciding to assign anyway.</p>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {similarTasks.map((t) => (
                <div key={t.id} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-3 hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-semibold text-white">{t.title}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      {(t.similarity * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-300 bg-slate-900/40 p-2 rounded-lg border border-slate-800/50 whitespace-pre-wrap">{t.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-700/30">
                    {t.project && (
                      <div>
                        <span className="text-slate-500">Project:</span> <span className="text-brand-400 font-medium">{t.project}</span>
                      </div>
                    )}
                    {t.priority && (
                      <div>
                        <span className="text-slate-500">Priority:</span> <span className="text-slate-300 font-medium capitalize">{t.priority}</span>
                      </div>
                    )}
                    {t.due_date && (
                      <div>
                        <span className="text-slate-500">Due Date:</span> <span className="text-slate-300 font-medium">{t.due_date}</span>
                      </div>
                    )}
                    {t.created_by && (
                      <div>
                        <span className="text-slate-500">Created By:</span> <span className="text-slate-300 font-medium">{t.created_by}</span>
                      </div>
                    )}
                    {t.assigned_to && t.assigned_to.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Assignees:</span> <span className="text-slate-300 font-medium">{t.assigned_to.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSimilarityWarning(false)
                  setSimilarTasks([])
                }}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel Task
              </button>
              <button
                type="button"
                onClick={() => saveTaskDirectly(form, fileToAttach)}
                disabled={saving}
                className="btn-primary bg-amber-600 hover:bg-amber-500 flex-1 justify-center border border-amber-500/30"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Assign Anyway'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Request Modal */}
      {showExtensionForm && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Request Due Date Extension</h2>
              <button onClick={() => setShowExtensionForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">
                Requesting extension for task: <span className="text-white font-semibold">{selected.title}</span>
              </p>
              <div>
                <label className="label">Proposed Due Date *</label>
                <input
                  type="date"
                  className="input"
                  value={extDate}
                  onChange={e => setExtDate(e.target.value)}
                  min={selected.due_date ? new Date(new Date(selected.due_date).getTime() + 24*60*60*1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="label">Reason *</label>
                <textarea
                  className="input !h-24 resize-none"
                  placeholder="Describe why you need more time for this task..."
                  value={extReason}
                  onChange={e => setExtReason(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExtensionForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  type="button"
                  onClick={handleExtensionSubmit}
                  disabled={submittingExtension}
                  className="btn-primary flex-1 justify-center"
                >
                  {submittingExtension ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Side Panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-50">
          <div className="bg-surface-900 border-l border-slate-700 h-full w-full max-w-md shadow-2xl overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-surface-900 z-10">
              <h2 className="text-base font-bold text-white truncate pr-4">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white flex-shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Status</p>
                  <span className="text-white text-xs font-medium capitalize">{selected.status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Priority</p>
                  <span className={`capitalize font-medium text-xs ${PRIORITY_CONFIG[selected.priority]?.color}`}>{selected.priority}</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Due Date</p>
                  <p className="text-white font-medium text-xs">{selected.due_date ? format(parseISO(selected.due_date), 'dd MMM yyyy') : '—'}</p>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Created By</p>
                  <p className="text-white font-medium text-xs truncate">{selected.created_by}</p>
                </div>
              </div>
              {/* Description Section with Inline Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">Description</p>
                  {canUpdateDesc && !isEditingDesc && (
                    <button
                      onClick={() => {
                        setDescText(selected.description || '')
                        setIsEditingDesc(true)
                      }}
                      className="text-[11px] text-brand-400 hover:text-brand-300 font-medium px-2 py-0.5 rounded hover:bg-brand-500/10 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      className="input !h-24 resize-none text-sm w-full"
                      value={descText}
                      onChange={e => setDescText(e.target.value)}
                      placeholder="Add description..."
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsEditingDesc(false)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDescription}
                        disabled={savingDesc}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-all"
                      >
                        {savingDesc ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 bg-slate-800/60 rounded-xl p-3 whitespace-pre-wrap">
                    {selected.description || <span className="text-slate-500 italic">No description provided</span>}
                  </p>
                )}
              </div>

              {/* Assignees */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Assignees</p>
                <div className="space-y-1.5">
                  {(Array.isArray(selected.assigned_to) ? selected.assigned_to : []).map(email => (
                    <div key={email} className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg">
                      <span className="text-sm text-slate-300 truncate">{email}</span>
                      {selected.status !== 'done' && (
                        <button onClick={() => handleRemoveAssignee(email)} className="text-slate-500 hover:text-red-400 p-1"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
                {selected.status !== 'done' && (
                  <select className="input !py-2 text-sm mt-2" defaultValue="" onChange={e => { if (e.target.value) { handleAddAssignee(e.target.value); e.target.value = '' } }}>
                    <option value="">Add assignee...</option>
                    {assignableEmps.filter(emp => !(Array.isArray(selected.assigned_to) ? selected.assigned_to : []).includes(emp.email)).map(emp => (
                      <option key={emp.email} value={emp.email}>{emp.full_name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Attachments */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Attachments ({(selected.attachments || []).length})</p>
                <div className="space-y-1.5">
                  {(selected.attachments || []).map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-300 truncate">{att.filename}</span>
                        <span className="text-xs text-slate-600">{(att.size / 1024).toFixed(0)}KB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={`${api.defaults.baseURL}/tasks/${selected._id}/attachments/${att.id}/download`} target="_blank" className="p-1 text-slate-400 hover:text-brand-400"><Download className="w-3.5 h-3.5" /></a>
                        {selected.status !== 'done' && (
                          <button onClick={() => handleDeleteAttachment(att.id)} className="p-1 text-slate-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {selected.status !== 'done' && (
                  <>
                    <input ref={detailFileRef} type="file" className="hidden" onChange={e => { if (e.target.files[0]) handleUploadAttachment(selected._id, e.target.files[0]); e.target.value = '' }} />
                    <button onClick={() => detailFileRef.current?.click()} className="btn-secondary !py-2 text-sm mt-2 w-full justify-center"><Upload className="w-3.5 h-3.5" /> Upload (max 2MB)</button>
                  </>
                )}
              </div>

              {/* Checklists */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Checklists</p>
                {(selected.checklists || []).map(cl => (
                  <div key={cl.id} className="mb-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{cl.title}</span>
                      {selected.status !== 'done' && isAssignee && (
                        <button onClick={() => handleDeleteChecklist(cl.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {(cl.items || []).map(it => (
                        <div key={it.id} className="flex items-center gap-2 group">
                          <button onClick={() => selected.status !== 'done' && isAssignee && handleToggleClItem(cl.id, it.id)} className="flex-shrink-0" disabled={selected.status === 'done' || !isAssignee}>
                            {it.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-500" />}
                          </button>
                          <span className={`text-sm flex-1 ${it.done ? 'line-through text-slate-500' : 'text-slate-300'}`}>{it.title}</span>
                          {selected.status !== 'done' && isAssignee && (
                            <button onClick={() => handleDeleteClItem(cl.id, it.id)} className="p-0.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    {selected.status !== 'done' && isAssignee && (
                      <div className="flex gap-2 mt-2">
                        <input className="input !py-1.5 text-sm" placeholder="Add item..." value={clItemTitle[cl.id] || ''} onChange={e => setClItemTitle(prev => ({ ...prev, [cl.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddClItem(cl.id))} />
                        <button onClick={() => handleAddClItem(cl.id)} className="btn-secondary !py-1.5 !px-2"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                ))}
                {selected.status !== 'done' && isAssignee && (
                  <div className="flex gap-2">
                    <input className="input !py-2 text-sm" placeholder="New checklist name..." value={clTitle} onChange={e => setClTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddChecklist())} />
                    <button onClick={handleAddChecklist} className="btn-secondary !py-2 !px-3"><Plus className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Comments ({(selected.comments || []).length})</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {(selected.comments || []).map(c => (
                    <div key={c.id} className="p-3 bg-slate-800/60 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-brand-400">{c.by}</span>
                        <span className="text-xs text-slate-600">{c.at ? format(parseISO(c.at), 'dd MMM') : ''}</span>
                      </div>
                      <p className="text-sm text-slate-300">{c.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input className="input !py-2 text-sm" placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddComment())} />
                  <button onClick={handleAddComment} className="btn-secondary !py-2 !px-3"><MessageSquare className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Due Date Extension Request */}
              {selected.status !== 'done' && (!selected.extension_request || selected.extension_request.status !== 'pending') && (
                <div className="border-t border-slate-700/50 pt-4 mt-2">
                  <p className="text-xs text-slate-500 mb-2">Due Date Extension</p>
                  <button
                    onClick={() => {
                      setExtDate(selected.due_date ? selected.due_date.split('T')[0] : '')
                      setExtReason('')
                      setShowExtensionForm(true)
                    }}
                    className="btn-secondary !py-2 text-xs w-full justify-center"
                  >
                    Request Extension
                  </button>
                </div>
              )}

              {/* Activity */}
              {(selected.activity || []).length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Activity</p>
                  <div className="space-y-1.5">
                    {[...(selected.activity || [])].reverse().slice(0, 8).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                        <span>{a.action}</span><span className="text-slate-700">·</span><span>{a.by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
