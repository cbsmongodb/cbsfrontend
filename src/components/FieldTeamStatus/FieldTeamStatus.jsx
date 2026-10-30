'use client'

// team-status-v5
import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import './FieldTeamStatus.css'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function stepIndexForStatus(status) {
  if (status === 'planned') return 0
  if (status === 'i_went') return 1
  if (status === 'i_left' || status === 'completed') return 2
  return -1
}

function performerName(plan) {
  return plan.performer?.name || `${plan.performer?.firstName || ''} ${plan.performer?.lastName || ''}`.trim() || '—'
}

function placeName(plan) {
  return plan.hospital?.name || plan.pharmacy?.pharmacyName || '—'
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length || name === '—') return '?'
  return ((parts[0][0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

function statusKey(status) {
  if (status === 'i_went') return 'onsite'
  if (status === 'planned') return 'planned'
  if (status === 'i_left' || status === 'completed') return 'done'
  if (status === 'canceled') return 'canceled'
  return 'planned'
}

const STATUS_LABEL = { planned: 'k127', onsite: 'k128', done: 'k129', canceled: 'k132' }

function planTime(plan) {
  if (!plan.period) return ''
  const d = new Date(plan.period)
  if (Number.isNaN(d.getTime())) return ''
  const hh = d.getHours()
  const mm = d.getMinutes()
  if (hh === 0 && mm === 0) return ''
  // date-only plans are stored at UTC midnight (04:00 here)
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return ''
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const SCHEME_ORDER = ['division1', 'division2', 'division3', 'gold', 'office', 'warehouse']
const SCHEME_NAMES = {
  ka: { division1: 'დივიზიონი I', division2: 'დივიზიონი II', division3: 'დივიზიონი III', gold: 'მენეჯმენტი', office: 'ოფისი', warehouse: 'საწყობი' },
  en: { division1: 'Division I', division2: 'Division II', division3: 'Division III', gold: 'Management', office: 'Office', warehouse: 'Warehouse' },
  ru: { division1: 'Дивизион I', division2: 'Дивизион II', division3: 'Дивизион III', gold: 'Руководство', office: 'Офис', warehouse: 'Склад' },
}

export default function FieldTeamStatus() {
  const tu = useTranslations('ui')
  const { locale } = useParams() || {}
  const dateLocale = locale === 'ka' ? 'ka-GE' : locale === 'ru' ? 'ru-RU' : 'en-GB'
  const [plans, setPlans] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [schemes, setSchemes] = useState({})
  const names = SCHEME_NAMES[locale] || SCHEME_NAMES.en

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
      setPlans(Array.isArray(data) ? data : data?.items || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoaded(true)
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

  // each employee's division colour (same as their own dashboard)
  useEffect(() => {
    const missing = [...new Set(plans.map((p) => p.performer?._id).filter(Boolean))].filter((id) => !schemes[id])
    if (!missing.length) return
    let off = false
    apiFetch('/api/employees/me/theme/batch', { method: 'POST', body: JSON.stringify({ ids: missing }) })
      .then((data) => {
        if (!off && data && typeof data === 'object') setSchemes((prev) => ({ ...prev, ...data }))
      })
      .catch(() => {})
    return () => {
      off = true
    }
  }, [plans]) // eslint-disable-line react-hooks/exhaustive-deps

  const schemeOf = (plan) => schemes[plan.performer?._id]?.scheme || 'office'

  const counts = useMemo(() => {
    const c = { total: 0, onSite: 0, planned: 0, done: 0, canceled: 0 }
    plans.forEach((p) => {
      if (p.status === 'canceled') {
        c.canceled++
        return
      }
      c.total++
      if (p.status === 'i_went') c.onSite++
      else if (p.status === 'planned') c.planned++
      else if (p.status === 'i_left' || p.status === 'completed') c.done++
    })
    return c
  }, [plans])

  const visiblePlans = useMemo(() => {
    let list = plans
    if (statusFilter === 'notDone') {
      list = list.filter((p) => p.status === 'planned' || p.status === 'i_went')
    } else if (statusFilter === 'completed') {
      list = list.filter((p) => p.status === 'completed' || p.status === 'i_left')
    } else if (statusFilter) {
      list = list.filter((p) => p.status === statusFilter)
    } else {
      list = list.filter((p) => p.status !== 'canceled')
    }
    if (search.trim()) {
      const words = search.trim().toLowerCase().split(/\s+/)
      list = list.filter((p) => {
        const hay = `${performerName(p)} ${placeName(p)}`.toLowerCase()
        return words.every((w) => hay.includes(w))
      })
    }
    const order = { i_went: 0, planned: 1, i_left: 2, completed: 2, canceled: 3 }
    return [...list].sort(
      (a, b) =>
        (order[a.status] ?? 4) - (order[b.status] ?? 4) ||
        (new Date(a.period).getTime() || 0) - (new Date(b.period).getTime() || 0) ||
        performerName(a).localeCompare(performerName(b))
    )
  }, [plans, statusFilter, search])


  const chips = [
    { key: '', label: tu('k092'), n: counts.total, cls: 'all' },
    { key: 'notDone', label: tu('k134'), n: counts.planned + counts.onSite, cls: 'notdone' },
    { key: 'i_went', label: tu('k128'), n: counts.onSite, cls: 'onsite' },
    { key: 'planned', label: tu('k127'), n: counts.planned, cls: 'planned' },
    { key: 'completed', label: tu('k129'), n: counts.done, cls: 'done' },
    { key: 'canceled', label: tu('k132'), n: counts.canceled, cls: 'canceled' },
  ]

  const STEPS = ['k127', 'k128', 'k129']

  return (
    <div className="field-team-status ts5">
      <div className="ts5-top">
        <div className="ts5-title">
          <h1>{tu('k130')}</h1>
          <span className="ts5-date">
            <span className="ts5-live" aria-hidden="true" />
            {new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', weekday: 'long' })}
          </span>
        </div>
        <label className="ts5-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder={tu('k133')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="ts5-chips" role="tablist">
        {chips.map((c) => (
          <button
            key={c.key || 'all'}
            type="button"
            role="tab"
            aria-selected={statusFilter === c.key}
            className={`ts5-chip ${c.cls} ${statusFilter === c.key ? 'active' : ''}`}
            onClick={() => setStatusFilter(c.key)}
          >
            <i aria-hidden="true" />
            {c.label}
            <b>{c.n}</b>
          </button>
        ))}
      </div>

      {error && <p className="live-feed-error">{error}</p>}

      <div className="ts5-list">
        {visiblePlans.map((plan) => {
          const sk = statusKey(plan.status)
          const idx = stepIndexForStatus(plan.status)
          const sc = schemeOf(plan)
          const name = performerName(plan)
          const place = placeName(plan)
          const time = planTime(plan)
          const isPharmacy = plan.pharmacy && !plan.hospital
          const docs = (plan.doctors || []).map((d) => `${d.firstName || ''} ${d.lastName || ''}`.trim()).filter(Boolean)
          const fill = idx <= 0 ? 0 : idx === 1 ? 50 : 100
          return (
            <article key={plan._id} className={`ts5-row sc-${sc} ${sk}`}>
              <div className="ts5-avatar" aria-hidden="true">{initials(name)}</div>

              <div className="ts5-info">
                <div className="ts5-line1">
                  <span className="ts5-name">{name}</span>
                  <span className="ts5-tag">{names[sc]}</span>
                  {time && <span className="ts5-time">{time}</span>}
                </div>
                <div className="ts5-line2">
                  <span className={`ts5-place ${place === '—' ? 'empty' : ''}`}>
                    {isPharmacy ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M10 11h4M12 9v4" /></svg>
                    )}
                    <span>{place === '—' ? tu('noPlace') : place}</span>
                  </span>
                  {docs.length > 0 && (
                    <span className="ts5-docs" title={docs.join(', ')}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /></svg>
                      <span>
                        {docs.slice(0, 2).join(', ')}
                        {docs.length > 2 && <b> +{docs.length - 2}</b>}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {sk === 'canceled' ? (
                <div className="ts5-canceled">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg>
                  {tu('k132')}
                </div>
              ) : (
                <div className="ts5-track" style={{ '--fill': `${fill}%` }}>
                  <div className="ts5-rail"><span /></div>
                  <ol>
                    {STEPS.map((label, i) => {
                      const state = i < idx || (i === idx && idx === 2) ? 'done' : i === idx ? 'current' : 'todo'
                      return (
                        <li key={label} className={state}>
                          <span className="ts5-node">
                            {state === 'done' ? (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                            ) : (
                              <i />
                            )}
                          </span>
                          <span className="ts5-step-label">{tu(label)}</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {loaded && visiblePlans.length === 0 && <div className="ts5-empty">{tu('k135')}</div>}
      {!loaded && <div className="ts5-empty">…</div>}
    </div>
  )
}
