import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'

const TYPE_COLORS = {
  national: 'badge-blue',
  regional: 'badge-green',
  optional: 'badge-yellow',
  company: 'badge-gray',
}

const TYPE_BG = {
  national: 'bg-blue-500/10 border-blue-500/20',
  regional: 'bg-emerald-500/10 border-emerald-500/20',
  optional: 'bg-amber-500/10 border-amber-500/20',
  company: 'bg-slate-500/10 border-slate-500/20',
}

export default function EmployeeHolidays() {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const today = startOfDay(new Date())

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/holidays/calendar/${year}`)
        setHolidays(res.data)
      } catch { toast.error('Failed to load holidays') }
      setLoading(false)
    }
    fetch()
  }, [year])

  const upcoming = holidays.filter(h => !isBefore(parseISO(h.date), today))
  const past = holidays.filter(h => isBefore(parseISO(h.date), today))

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Holiday Calendar</h1>
          <p className="text-slate-400 mt-1">{holidays.length} holidays in {year}</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-900 border border-slate-700 rounded-xl px-3 py-2">
          <button onClick={() => setYear(y => y - 1)} className="text-slate-400 hover:text-white transition-colors p-1">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold text-sm px-2">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="text-slate-400 hover:text-white transition-colors p-1">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {['national', 'regional', 'optional', 'company'].map(type => {
          const count = holidays.filter(h => h.holiday_type === type).length
          return (
            <div key={type} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${TYPE_BG[type]}`}>
              <span className="text-sm font-medium text-white capitalize">{type}</span>
              <span className="text-xs text-slate-400">{count}</span>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : holidays.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No holidays listed for {year}.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Upcoming ({upcoming.length})</h3>
            {upcoming.length === 0 && <p className="text-slate-500 text-sm">No more holidays this year.</p>}
            {upcoming.map(h => (
              <div key={h._id} className="card !p-4 flex items-center gap-4 hover:border-slate-600 transition-all">
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border ${TYPE_BG[h.holiday_type]}`}>
                  <span className="text-lg font-bold text-white">{format(parseISO(h.date), 'dd')}</span>
                  <span className="text-xs text-slate-400">{format(parseISO(h.date), 'MMM')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{h.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{format(parseISO(h.date), 'EEEE, MMMM d yyyy')}</p>
                  {h.description && <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>}
                </div>
                <span className={`flex-shrink-0 ${TYPE_COLORS[h.holiday_type] || 'badge-gray'}`}>{h.holiday_type}</span>
              </div>
            ))}
          </div>

          {/* Past */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Past ({past.length})</h3>
            {past.length === 0 && <p className="text-slate-500 text-sm">No past holidays.</p>}
            {[...past].reverse().map(h => (
              <div key={h._id} className="card !p-4 flex items-center gap-4 opacity-60 hover:opacity-80 transition-all">
                <div className="w-14 h-14 rounded-xl bg-slate-700/40 border border-slate-700 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-slate-400">{format(parseISO(h.date), 'dd')}</span>
                  <span className="text-xs text-slate-600">{format(parseISO(h.date), 'MMM')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-300">{h.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{format(parseISO(h.date), 'EEEE, MMMM d yyyy')}</p>
                </div>
                <span className={`flex-shrink-0 ${TYPE_COLORS[h.holiday_type] || 'badge-gray'} opacity-60`}>{h.holiday_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
