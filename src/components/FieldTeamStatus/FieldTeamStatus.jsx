'use client'

import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import './FieldTeamStatus.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const STEPS = [
  { key: 'planned', label: 'დაგეგმილია' },
  { key: 'i_went', label: 'ადგილზეა' },
  { key: 'i_left', label: 'შესრულებულია' },
]

function stepIndexForStatus(status) {
  if (status === 'planned') return 0
  if (status === 'i_went') return 1
  if (status === 'i_left' || status === 'completed') return 2
  return -1
}

function performerName(plan) {
  return plan.performer?.name || `${plan.performer?.firstName || ''} ${plan.performer?.lastName || ''}`.trim() || 'უცნობი'
}

function placeName(plan) {
  return plan.hospital?.name || plan.pharmacy?.pharmacyName || '—'
}

export default function FieldTeamStatus() {
  const [plans, setPlans] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  async function loadPlans() {
    try {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)
      const params = new URLSearchParams({
        period_from: startOfDay.toISOString(),
        period_to: endOfDay.toISOString(),
      })
      const data = await apiFetch(`/api/plannings?${params}`)
      setPlans(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadPlans()
    const interval = setInterval(loadPlans, 60000)

    let socket
    if (API_URL) {
      socket = io(API_URL, { transports: ['websocket'] })
      socket.on('attendance:new', () => loadPlans())
    }

    return () => {
      clearInterval(interval)
      if (socket) socket.disconnect()
    }
  }, [])

  const sortedPlans = useMemo(() => {
    let list = plans.filter((p) => p.status !== 'canceled')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => performerName(p).toLowerCase().includes(q))
    }
    // on-site first, then planned, then completed
    const order = { i_went: 0, planned: 1, i_left: 2, completed: 2 }
    return [...list].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3))
  }, [plans, search])

  const canceledPlans = useMemo(() => plans.filter((p) => p.status === 'canceled'), [plans])

  const counts = useMemo(() => {
    const c = { total: sortedPlans.length, onSite: 0, planned: 0, done: 0 }
    sortedPlans.forEach((p) => {
      if (p.status === 'i_went') c.onSite++
      else if (p.status === 'planned') c.planned++
      else if (p.status === 'i_left' || p.status === 'completed') c.done++
    })
    return c
  }, [sortedPlans])

  return (
    <div className="field-team-status">
      <h1>საველე გუნდის სტატუსი</h1>

      {error && <p className="live-feed-error">{error}</p>}

      <div className="team-status-summary">
        <div className="team-status-summary-item">
          <span>{counts.total}</span>
          <label>დღევანდელი ვიზიტი</label>
        </div>
        <div className="team-status-summary-item onsite">
          <span>{counts.onSite}</span>
          <label>ადგილზეა</label>
        </div>
        <div className="team-status-summary-item planned">
          <span>{counts.planned}</span>
          <label>დაგეგმილია</label>
        </div>
        <div className="team-status-summary-item done">
          <span>{counts.done}</span>
          <label>შესრულებულია</label>
        </div>
      </div>

      <input
        type="text"
        className="field-input"
        placeholder="თანამშრომლის ძებნა..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: '100%', maxWidth: 320 }}
      />

      <div className="tracker-list">
        {sortedPlans.map((plan) => {
          const currentIndex = stepIndexForStatus(plan.status)
          return (
            <div key={plan._id} className="tracker-card">
              <div className="tracker-card-header">
                <span className="tracker-name">{performerName(plan)}</span>
                <span className="tracker-place">{placeName(plan)}</span>
              </div>
              <div className="tracker">
                {STEPS.map((step, i) => (
                  <div key={step.key} className="tracker-step-wrap">
                    <div className={`tracker-step ${i <= currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}>
                      <div className="tracker-circle">{i < currentIndex ? '✓' : i + 1}</div>
                      <div className="tracker-label">{step.label}</div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`tracker-line ${i < currentIndex ? 'filled' : ''}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {sortedPlans.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>დღეს ვიზიტი დაგეგმილი არავის ჰყავს</p>
        )}
      </div>

      {canceledPlans.length > 0 && (
        <div className="tracker-canceled-section">
          <h3>გაუქმებული ვიზიტები ({canceledPlans.length})</h3>
          <div className="tracker-canceled-list">
            {canceledPlans.map((plan) => (
              <div key={plan._id} className="tracker-canceled-row">
                <span>{performerName(plan)}</span>
                <span>{placeName(plan)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
