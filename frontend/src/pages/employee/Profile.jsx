import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Edit2, Check, X } from 'lucide-react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function EmployeeProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: '', address: '', date_of_birth: '' })
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return toast.error('New passwords do not match')
    }
    setChangingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      toast.success('Password updated successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  const fetch = async () => {
    try {
      const res = await api.get('/employees/me')
      setProfile(res.data)
      setForm({ phone: res.data.phone || '', address: res.data.address || '', date_of_birth: res.data.date_of_birth || '' })
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/employees/${profile._id}`, form)
      toast.success('Profile updated!')
      setEditing(false)
      fetch()
    } catch { toast.error('Failed to update') }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return (
    <div className="p-6 text-center">
      <p className="text-slate-400">Profile not found. Please contact your admin.</p>
    </div>
  )

  const info = [
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Phone, label: 'Phone', value: profile.phone || 'Not set' },
    { icon: Briefcase, label: 'Employee ID', value: profile.employee_id },
    { icon: Calendar, label: 'Joined', value: profile.date_of_joining },
    { icon: MapPin, label: 'Address', value: profile.address || 'Not set' },
    { icon: Calendar, label: 'Date of Birth', value: profile.date_of_birth || 'Not set' },
  ]

  const statusColor = { active: 'badge-green', inactive: 'badge-gray', on_leave: 'badge-yellow', terminated: 'badge-red' }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-slate-400 mt-1">Your personal and employment information</p>
      </div>

      {/* Profile header */}
      <div className="card">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="w-20 h-20 rounded-2xl bg-emerald-600/20 border-2 border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-emerald-400">{profile.full_name?.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold text-white">{profile.full_name}</h2>
                <p className="text-slate-400">{profile.designation}</p>
                <p className="text-slate-500 text-sm">{profile.department}</p>
              </div>
              <span className={statusColor[profile.employment_status] || 'badge-gray'}>{profile.employment_status?.replace('_', ' ')}</span>
            </div>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2">
                <p className="text-xs text-slate-400">Monthly Salary</p>
                <p className="text-lg font-bold text-emerald-400 font-mono">₹{profile.salary?.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2">
                <p className="text-xs text-slate-400">Gender</p>
                <p className="text-sm font-medium text-white">{profile.gender || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Personal Information</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary py-2 text-sm">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-secondary py-2 text-sm">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary py-2 text-sm">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Street, City, State" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {info.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm text-slate-200 mt-0.5 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input text-sm"
              placeholder="Current Password"
              value={passwordForm.current_password}
              onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input text-sm"
              placeholder="New Password"
              value={passwordForm.new_password}
              onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              className="input text-sm"
              placeholder="Confirm Password"
              value={passwordForm.confirm_password}
              onChange={e => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
              required
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="btn-primary py-3 px-6 h-[46px] justify-center"
          >
            {changingPassword ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Update'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
