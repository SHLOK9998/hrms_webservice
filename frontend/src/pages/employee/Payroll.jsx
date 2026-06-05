import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function EmployeePayroll() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/payroll/my')
        setRecords(res.data)
      } catch { toast.error('Failed to load payroll') }
      setLoading(false)
    }
    fetch()
  }, [])

  const totalEarned = records.filter(r => r.status === 'paid').reduce((a, r) => a + (r.net_salary || 0), 0)
  const latest = records[0]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">My Payslips</h1>
        <p className="text-slate-400 mt-1">View your salary and payment history</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Latest Net Pay', value: latest ? `₹${latest.net_salary?.toLocaleString()}` : '—', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Total Earned', value: `₹${totalEarned.toLocaleString()}`, icon: TrendingUp, color: 'text-brand-400' },
          { label: 'Payslips', value: records.length, icon: CheckCircle, color: 'text-purple-400' },
        ].map((c, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3 mb-1">
              <c.icon className={`w-5 h-5 ${c.color}`} />
              <p className="text-sm text-slate-400">{c.label}</p>
            </div>
            <p className={`text-2xl font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No payslips yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r, i) => (
            <div key={r._id} className="card hover:border-slate-600/80 transition-all animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-white">{r.month} {r.year}</h3>
                    {r.status === 'paid' ? (
                      <span className="badge-green"><CheckCircle className="w-3 h-3" />Paid</span>
                    ) : (
                      <span className="badge-yellow"><Clock className="w-3 h-3" />Pending</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Basic Salary', value: r.basic_salary, color: 'text-white' },
                      { label: 'Allowances', value: `+${r.allowances}`, color: 'text-emerald-400' },
                      { label: 'Deductions', value: `-${r.deductions}`, color: 'text-red-400' },
                      { label: 'Bonus', value: `+${r.bonus}`, color: 'text-amber-400' },
                    ].map((item, j) => (
                      <div key={j} className="bg-slate-800/50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className={`text-sm font-semibold font-mono ${item.color}`}>₹{Math.abs(parseFloat(item.value?.toString().replace(/[+\-]/, ''))).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Net Salary</p>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">₹{r.net_salary?.toLocaleString()}</p>
                  {r.paid_at && <p className="text-xs text-slate-500 mt-1">Paid on {r.paid_at?.split('T')[0]}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
