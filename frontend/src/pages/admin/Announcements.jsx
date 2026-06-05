import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, X, Check, Megaphone } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' })
  const [saving, setSaving] = useState(false)

  const fetch = async () => {
    try {
      const res = await api.get('/announcements/')
      setAnnouncements(res.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/announcements/', form)
      toast.success('Announcement posted!')
      setShowModal(false)
      setForm({ title: '', content: '', priority: 'normal' })
      fetch()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await api.delete(`/announcements/${id}`)
      toast.success('Deleted')
      fetch()
    } catch { toast.error('Failed') }
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-slate-400 mt-1">Post updates and notices for all employees</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card text-center py-12">
          <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, i) => (
            <div key={ann._id} className="card hover:border-slate-600/80 transition-all animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ann.priority === 'high' ? 'bg-red-500/10 border border-red-500/20' : 'bg-brand-500/10 border border-brand-500/20'}`}>
                    <Bell className={`w-5 h-5 ${ann.priority === 'high' ? 'text-red-400' : 'text-brand-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{ann.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ann.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-600/50 text-slate-400'}`}>
                        {ann.priority}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mt-1">{ann.content}</p>
                    <p className="text-slate-500 text-xs mt-2">By {ann.created_by} · {ann.created_at?.split('T')[0]}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(ann._id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 border border-slate-700 rounded-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">New Announcement</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" placeholder="Announcement title" value={form.title} onChange={set('title')} required />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea className="input h-32 resize-none" placeholder="Write your announcement here..." value={form.content} onChange={set('content')} required />
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={set('priority')}>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
