'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import './AttendanceStatus.css'

const ABSENT_BUFFER_MINUTES = 60

const STATUS_META = {
  attended: { color: '#16a34a' },
  absent: { color: '#dc2626' },
  notCheckedIn: { color: '#f59e0b' },
  offToday: { color: '#94a3b8' },
  paid: { color: '#2955a3' },
  sick: { color: '#7c3aed' },
  unpaid: { color: '#b45309' },
}

const FILTER_KEYS = ['all', 'attended', 'absent', 'notCheckedIn', 'offToday', 'paid', 'sick', 'unpaid']

export default function AttendanceStatus() {
  const t = useTranslations('attendanceStatus')
  const [employees, setEmployees] = useState([])
  const [attendedIds, setAttendedIds] = useState(new Set())
  const [leaveByEmployee, setLeaveByEmployee] = useState(new Map())
  const [workStartTime, setWorkStartTime] = useState('10:00')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  async function loadAll() {
    try {
      const [emps, feed, leaves, config] = await Promise.all([
        apiFetch('/api/employees'),
        apiFetch('/api/attendance/live-feed'),
        // optional extras: if one of them fails, the page still shows check-ins
        apiFetch(`/api/leaves?to=${new Date().toISOString()}`).catch(() => []),
        apiFetch('/api/config/plan').catch(() => null),
      ])

      setEmployees(emps.filter((e) => e.isActive))

      const checkedInIds = new Set()
      feed.forEach((item) => {
        item.addresses.forEach((addr) => {
          if (addr.addressType === 'performer_i_went_location' && item.employeeId) {
            checkedInIds.add(String(item.employeeId))
          }
        })
      })
      setAttendedIds(checkedInIds)

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const activeToday = leaves.filter((l) => new Date(l.endDate) >= startOfToday)
      const byEmp = new Map()
      activeToday.forEach((l) => {
        const key = String(l.employee?._id || l.employee)
        byEmp.set(key, l.type)
      })
      setLeaveByEmployee(byEmp)

      const cfg = Array.isArray(config) ? config[0] : config
      if (cfg?.workStartTime) setWorkStartTime(cfg.workStartTime)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 60000)
    return () => clearInterval(interval)
  }, [])

  const todayWeekday = new Date().getDay()

  const isPastAbsentCutoff = useMemo(() => {
    const [h, m] = workStartTime.split(':').map(Number)
    const cutoffMinutes = h * 60 + m + ABSENT_BUFFER_MINUTES
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return nowMinutes > cutoffMinutes
  }, [workStartTime])

  const statusList = useMemo(() => {
    return employees.map((emp) => {
      const key = String(emp._id)
      const leaveType = leaveByEmployee.get(key)
      const workDays = Array.isArray(emp.workDays) && emp.workDays.length > 0 ? emp.workDays : [1, 2, 3, 4, 5]
      const worksToday = workDays.includes(todayWeekday)

      let status
      if (leaveType) status = leaveType // 'paid' | 'sick' | 'unpaid'
      else if (attendedIds.has(key)) status = 'attended'
      else if (!worksToday) status = 'offToday'
      else if (isPastAbsentCutoff) status = 'absent'
      else status = 'notCheckedIn'

      return {
        employeeId: emp._id,
        employeeName: emp.name || `${emp.firstName} ${emp.lastName}`,
        status,
      }
    })
  }, [employees, attendedIds, leaveByEmployee, isPastAbsentCutoff, todayWeekday])

  const visibleList = useMemo(() => {
    let list = filter === 'all' ? statusList : statusList.filter((s) => s.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((s) => s.employeeName.toLowerCase().includes(q))
    }
    return list
  }, [statusList, filter, search])

  const counts = useMemo(() => {
    const c = {}
    FILTER_KEYS.forEach((k) => (c[k] = 0))
    statusList.forEach((s) => {
      c[s.status] = (c[s.status] || 0) + 1
    })
    c.all = statusList.length
    return c
  }, [statusList])

  return (
    <div className="attendance-status">
      <h1>{t('title')}</h1>

      {error && <p className="live-feed-error">{error}</p>}

      <div className="attendance-status-top">
        <div className="attendance-status-filters">
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`attendance-status-filter-btn ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
              style={filter === key ? { background: key === 'all' ? '#1e3a68' : STATUS_META[key].color, borderColor: key === 'all' ? '#1e3a68' : STATUS_META[key].color } : {}}
            >
              {t(`status.${key}`)}
              <span className="attendance-status-count">{counts[key] || 0}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          className="field-input"
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16, width: '100%', maxWidth: 320 }}
        />
      </div>

      <div className="attendance-status-list">
        {visibleList.map((s) => (
          <div key={s.employeeId} className="attendance-status-card">
            <span className="attendance-status-dot" style={{ background: STATUS_META[s.status].color }} />
            <span className="attendance-status-name">{s.employeeName}</span>
            <span className="attendance-status-label" style={{ color: STATUS_META[s.status].color }}>
              {t(`status.${s.status}`)}
            </span>
          </div>
        ))}
        {visibleList.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>{t('empty')}</p>}
      </div>
    </div>
  )
}
