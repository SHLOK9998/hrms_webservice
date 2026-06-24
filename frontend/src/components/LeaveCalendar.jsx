import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Search, User, Laptop, Coffee, Info } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'

const getISTDate = () => {
  const utc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000)
  return new Date(utc + (3600000 * 5.5))
}

export default function LeaveCalendar() {
  const [calendarDate, setCalendarDate] = useState(getISTDate())
  const [approvedLeaves, setApprovedLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(getISTDate())

  const fetchCalendarData = async () => {
    try {
      const res = await api.get('/leaves/calendar/approved')
      setApprovedLeaves(res.data || [])
    } catch (err) {
      console.error('Error fetching calendar data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendarData()
  }, [])

  const prevMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = getISTDate()
    setCalendarDate(today)
    setSelectedDate(today)
  }

  // Filter leaves based on search query
  const filteredLeaves = approvedLeaves.filter(l => 
    l.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDayOfWeek = startOfMonth.getDay()

  const blanks = Array(startDayOfWeek).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const totalCells = [...blanks, ...days]

  const toLocalDateString = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const todayStr = toLocalDateString(getISTDate())
  const selectedDateStr = toLocalDateString(selectedDate)

  // Leaves on selected date
  const leavesOnSelectedDate = filteredLeaves.filter(l => {
    const start = l.start_date.split('T')[0]
    const end = l.end_date.split('T')[0]
    return selectedDateStr >= start && selectedDateStr <= end
  })

  // Leaves this month
  const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
  const leavesThisMonth = filteredLeaves.filter(l => {
    const start = l.start_date.split('T')[0]
    const end = l.end_date.split('T')[0]
    return (start <= monthEndStr && end >= monthStartStr)
  })

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand-400" /> Leave & WFH Calendar
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            See who is on leave or working from home at a glance
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-slate-800 border border-slate-700/60 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-brand-500/80 w-48 sm:w-60 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white rounded-xl border border-slate-700/40 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400">Loading calendar schedules...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main calendar grid (3 columns on large screens) */}
          <div className="xl:col-span-3 card">
            {/* Month header & navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white font-mono">
                {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Week days header */}
            <div className="grid grid-cols-7 gap-2 text-center mb-3 text-xs font-semibold text-slate-400 border-b border-slate-800 pb-3">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                <div key={d} className="hidden sm:block">{d}</div>
              ))}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="sm:hidden">{d}</div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-2">
              {totalCells.map((cell, index) => {
                if (cell === null) {
                  return (
                    <div
                      key={`blank-${index}`}
                      className="min-h-[100px] bg-slate-900/10 rounded-xl border border-transparent"
                    />
                  )
                }

                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell).padStart(2, '0')}`
                const isCurrentDay = dStr === todayStr
                const isSelected = dStr === selectedDateStr

                const dayLeaves = dayLeavesFilter(filteredLeaves, dStr)

                return (
                  <div
                    key={`day-${cell}`}
                    onClick={() => setSelectedDate(new Date(year, month, cell))}
                    className={`min-h-[100px] p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-500/10 border-brand-500 text-white ring-1 ring-brand-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : isCurrentDay
                          ? 'bg-slate-800/80 border-brand-500/50 text-white'
                          : 'bg-slate-800/30 border-slate-700/40 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${
                        isSelected 
                          ? 'text-brand-400' 
                          : isCurrentDay 
                            ? 'text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded-md' 
                            : 'text-slate-400'
                      }`}>
                        {cell}
                      </span>
                      {dayLeaves.length > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                          {dayLeaves.length}
                        </span>
                      )}
                    </div>

                    {/* Miniature entries inside the cell */}
                    <div className="mt-2 space-y-1 flex-1 overflow-y-auto max-h-[60px] scrollbar-thin">
                      {dayLeaves.map(l => (
                        <div
                          key={l._id}
                          className={`text-[9px] px-1.5 py-0.5 rounded-md truncate font-semibold border ${
                            l.leave_type === 'wfh'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                              : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                          }`}
                          title={`${l.employee_name} (${l.leave_type === 'wfh' ? 'WFH' : 'Leave'})`}
                        >
                          {l.employee_name.split(' ')[0]} ({l.leave_type === 'wfh' ? 'WFH' : 'L'})
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Details Sidebar / Panel */}
          <div className="space-y-6">
            {/* Selected Date Details */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white border-b border-slate-850 pb-3 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-400" />
                Schedule for {format(selectedDate, 'dd MMMM yyyy')}
              </h3>

              {leavesOnSelectedDate.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto mb-3">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-500">No leaves or WFH scheduled for this date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leavesOnSelectedDate.map(l => (
                    <div
                      key={l._id}
                      className={`p-3 rounded-xl border ${
                        l.leave_type === 'wfh'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-blue-500/5 border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            l.leave_type === 'wfh' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {l.leave_type === 'wfh' ? <Laptop className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{l.employee_name}</p>
                            <p className="text-[10px] text-slate-400 uppercase mt-0.5 tracking-wider font-semibold">
                              {l.leave_type === 'wfh' ? 'Work From Home' : 'On Leave'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/40 text-[10px] text-slate-400 space-y-1">
                        <p className="font-mono">
                          <span className="text-slate-500">Period:</span> {format(parseLocalDate(l.start_date), 'dd MMM')} - {format(parseLocalDate(l.end_date), 'dd MMM yyyy')}
                        </p>
                        {l.reason && (
                          <p className="italic bg-slate-900/30 p-1.5 rounded border border-slate-850 mt-1">
                            &ldquo;{l.reason}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick list: Monthly Out/WFH */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white border-b border-slate-850 pb-3 mb-4">
                This Month's Summary ({calendarDate.toLocaleString('default', { month: 'short' })})
              </h3>
              {leavesThisMonth.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No leave entries this month.</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {leavesThisMonth.map(l => (
                    <div
                      key={l._id}
                      onClick={() => setSelectedDate(parseLocalDate(l.start_date))}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-650 cursor-pointer transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">{l.employee_name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {format(parseLocalDate(l.start_date), 'dd MMM')} - {format(parseLocalDate(l.end_date), 'dd MMM')}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize flex-shrink-0 ${
                        l.leave_type === 'wfh'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                      }`}>
                        {l.leave_type === 'wfh' ? 'WFH' : 'Leave'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function dayLeavesFilter(list, dStr) {
  return list.filter(l => {
    const start = l.start_date.split('T')[0]
    const end = l.end_date.split('T')[0]
    return dStr >= start && dStr <= end
  })
}

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(year, month - 1, day)
}
