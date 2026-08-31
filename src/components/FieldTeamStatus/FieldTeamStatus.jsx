'use client'

import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import './FieldTeamStatus.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function buildVisits(items) {
  const byGroup = new Map()
  items.forEach((item) => {
    item.addresses.forEach((addr) => {
      if (addr.lat == null || addr.lng == null) return
      if (!byGroup.has(item.groupKey)) byGroup.set(item.groupKey, [])
      byGroup.get(item.groupKey).push({
        employeeId: item.employeeId,
        hospitalName: item.hospitalName,
        type: addr.addressType === 'performer_i_went_location' ? 'checkin' : 'checkout',
        time: addr.time,
      })
    })
  })

  const visits = []
  byGroup.forEach((groupEvents) => {
    const checkin = groupEvents.find((e) => e.type === 'checkin')
    const checkout = groupEvents.find((e) => e.type === 'checkout')
    if (!checkin) return
    visits.push({
      employeeId: checkin.employeeId,
      hospitalName: checkin.hospitalName,
      checkinTime: checkin.time,
      checkoutTime: checkout?.time || null,
      isOpen: !checkout,
    })
  })
  return visits
}

function formatSince(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 60) return `${minutes} წთ`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} სთ ${m} წთ` : `${h} სთ`
}

const STATUS_FILTERS = [
  { key: 'all', label: 'ყველა' },
  { key: 'onField', label: '🟢 ველზეა' },
  { key: 'notCheckedIn', label: '⚪ ჯერ არ დაჩექინებულა' },
  { key: 'done', label: '✓ დღეს დაასრულა' },
]

export default function FieldTeamStatus() {
  const [employees, setEmployees] = useState([])
  const [visits, setVisits] = useState([])
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [, forceTick] = useState(0)

  async function loadFeed() {
    try {
      const items = await apiFetch('/api/attendance/live-feed')
      setVisits(buildVisits(items))
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadEmployees() {
    try {
      const data = await apiFetch('/api/employees')
      setEmployees(data.filter((e) => e.isActive && e.employeeType === 'field'))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadFeed()
    loadEmployees()
    const interval = setInterval(loadFeed, 60000)

    let socket
    if (API_URL) {
      socket = io(API_URL, { transports: ['websocket'] })
      socket.on('attendance:new', () => loadFeed())
    }

    return () => {
      clearInterval(interval)
      if (socket) socket.disconnect()
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 60000)
    return () => clearInterval(tick)
  }, [])

  const teamStatus = useMemo(() => {
    const byEmployee = new Map()
    visits.forEach((v) => {
      const key = String(v.employeeId)
      if (!byEmployee.has(key)) byEmployee.set(key, [])
      byEmployee.get(key).push(v)
    })

    return employees.map((emp) => {
      const empVisits = byEmployee.get(String(emp._id)) || []
      const openVisit = empVisits.find((v) => v.isOpen)

      let status = 'notCheckedIn'
      if (openVisit) status = 'onField'
      else if (empVisits.length > 0) status = 'done'

      return {
        employeeId: emp._id,
        employeeName: emp.name || `${emp.firstName} ${emp.lastName}`,
        status,
        hospitalName: openVisit?.hospitalName,
        checkinTime: openVisit?.checkinTime,
        visitCount: empVisits.length,
      }
    })
  }, [employees, visits])

  const visibleTeamStatus = useMemo(() => {
    if (statusFilter === 'all') return teamStatus
    return teamStatus.filter((t) => t.status === statusFilter)
  }, [teamStatus, statusFilter])

  const statusCounts = useMemo(() => {
    const counts = { onField: 0, notCheckedIn: 0, done: 0 }
    teamStatus.forEach((t) => counts[t.status]++)
    return counts
  }, [teamStatus])

  return (
    <div className="field-team-status">
      <h1>საველე გუნდის სტატუსი</h1>

      {error && <p className="live-feed-error">{error}</p>}

      <div className="team-status-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`team-status-filter-btn ${statusFilter === f.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
            {f.key !== 'all' && <span className="team-status-count">{statusCounts[f.key]}</span>}
          </button>
        ))}
      </div>

      <div className="team-status-list">
        {visibleTeamStatus.map((t) => (
          <div key={t.employeeId} className={`team-status-card status-${t.status}`}>
            <span className={`team-status-dot status-${t.status}`} />
            <div className="team-status-info">
              <div className="team-status-name">{t.employeeName}</div>
              {t.status === 'onField' && (
                <div className="team-status-detail">
                  {t.hospitalName} · {formatSince(t.checkinTime)}-ია იქ
                </div>
              )}
              {t.status === 'done' && (
                <div className="team-status-detail">დღეს {t.visitCount} ვიზიტი</div>
              )}
              {t.status === 'notCheckedIn' && (
                <div className="team-status-detail muted">ჯერ არ დაჩექინებულა</div>
              )}
            </div>
          </div>
        ))}
        {visibleTeamStatus.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>ამ ფილტრში არავინ არის</p>
        )}
      </div>
    </div>
  )
}
