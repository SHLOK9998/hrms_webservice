import { useState, useEffect } from 'react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { Building2, Plus, Users, Shield, Server, ArrowRight, Loader2, Trash2 } from 'lucide-react'

export default function SuperadminDashboard() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [form, setForm] = useState({
    name: '',
    admin_full_name: '',
    admin_email: '',
    admin_password: ''
  })

  useEffect(() => {
    fetchOrgs()
  }, [])

  const fetchOrgs = async () => {
    try {
      setLoading(true)
      const res = await api.get('/organizations/')
      setOrganizations(res.data)
    } catch (err) {
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/organizations/', form)
      toast.success('Organization & admin provisioned successfully!')
      setModalOpen(false)
      setForm({
        name: '',
        admin_full_name: '',
        admin_email: '',
        admin_password: ''
      })
      fetchOrgs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Provisioning failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?\n\nThis will PERMANENTLY remove the organization and ALL associated users, employees, leaves, attendance, payroll, tasks, and announcements.\n\nThis action cannot be undone.`)) {
      try {
        await api.delete(`/organizations/${id}`)
        toast.success('Organization and all associated data deleted successfully')
        fetchOrgs()
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to delete organization')
      }
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Platform Management</h1>
          <p className="text-slate-400 mt-1">Provision and manage tenant organizations and system configurations.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start md:self-auto px-5 py-3 glow-brand"
        >
          <Plus className="w-5 h-5" />
          <span>Provision Tenant</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card glow-brand flex items-center gap-4">
          <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-2xl">
            <Building2 className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Tenants</p>
            <p className="text-2xl font-bold text-white mt-0.5">{organizations.length}</p>
          </div>
        </div>

        <div className="card glow-success flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Active Tenants</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {organizations.filter(o => o.is_active).length}
            </p>
          </div>
        </div>

        <div className="card glow-brand flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <Server className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Platform Status</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card overflow-hidden">
        <h2 className="text-xl font-bold text-white mb-6">Registered Organizations</h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
            <p className="text-sm font-medium">Loading tenants database...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No organizations provisioned</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Get started by provisioning the first tenant and assigning an organization admin.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-6 px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Add first tenant
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold text-left uppercase tracking-wider">
                  <th className="pb-4">Name</th>
                  <th className="pb-4">Admin Email</th>
                  <th className="pb-4">Tenant ID</th>
                  <th className="pb-4">Created Date</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {organizations.map((org) => (
                  <tr key={org.id} className="text-slate-300 text-sm hover:bg-slate-800/10 transition-colors">
                    <td className="py-4 font-semibold text-white">{org.name}</td>
                    <td className="py-4 text-slate-400 font-medium">{org.admin_email || 'N/A'}</td>
                    <td className="py-4 font-mono text-xs text-slate-500">{org.id}</td>
                    <td className="py-4">{new Date(org.created_at).toLocaleDateString()}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        org.is_active 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${org.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Delete Tenant Organization"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provisioning Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg card glow-brand animate-scale-in relative border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-2">Provision Tenant Organization</h2>
            <p className="text-slate-400 text-sm mb-6">
              Create a new isolated HR database workspace and its first administrative user.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Organization Name</label>
                <input
                  className="input"
                  placeholder="Acme Corp"
                  value={form.name}
                  onChange={handleInputChange('name')}
                  required
                />
              </div>

              <div className="border-t border-slate-800 my-6 pt-4">
                <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-4">
                  Tenant Admin Administrator Account
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Admin Full Name</label>
                    <input
                      className="input"
                      placeholder="Jane Doe"
                      value={form.admin_full_name}
                      onChange={handleInputChange('admin_full_name')}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="label">Admin Email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="admin@acme.com"
                      value={form.admin_email}
                      onChange={handleInputChange('admin_email')}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Admin Password</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••••"
                      value={form.admin_password}
                      onChange={handleInputChange('admin_password')}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2.5 text-sm glow-brand flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <span>Provision Tenant</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
