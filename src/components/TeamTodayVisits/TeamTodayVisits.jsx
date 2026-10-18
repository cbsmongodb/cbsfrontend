'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import './TeamTodayVisits.css'

const name = (e) => e?.name || `${e?.firstName || ''} ${e?.lastName || ''}`.trim() || '—'
const place = (p) => p.hospital?.name || p.pharmacy?.pharmacyName || '—'
const STATUS_CLASS = { planned: 'planned', i_went: 'onsite', i_left: 'done', completed: 'done', canceled: 'canceled' }
const ORDER = { i_went: 0, planned: 1, i_left: 2, completed: 2, canceled: 3 }

// Dashboard card for managers: today's visits of the whole team, grouped by person
export default function TeamTodayVisits() {
  const t = useTranslations('teamToday')
  const locale = useLocale()
  const [plans, setPlans] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)

  async function load() {
    try {
      const from = new Date(); from.setHours(0, 0, 0, 0)
      const to = new Date(); to.setHours(23, 59, 59, 999)
      const params = new URLSearchParams({ period_from: from.toISOString(), period_to: to.toISOString() })
      const [p, e] = await Promise.all([
        apiFetch(`/api/plannings?${params}`),
        apiFetch('/api/employees').catch(() => []),
      ])
      setPlans(Array.isArray(p) ? p : [])
      setTeam(Array.isArray(e) ? e : [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  const counts = useMemo(() => {
    const c = { total: 0, onsite: 0, planned: 0, done: 0, canceled: 0 }
    plans.forEach((p) => {
      const k = STATUS_CLASS[p.status]
      if (k === 'canceled') c.canceled++
      else { c.total++; if (k) c[k]++ }
    })
    return c
  }, [plans])

  const people = useMemo(() => {
    const byId = new Map()
    plans.forEach((p) => {
      const id = String(p.performer?._id || p.performer || '')
      if (!byId.has(id)) byId.set(id, { id, name: name(p.performer), visits: [] })
      byId.get(id).visits.push(p)
    })
    let list = [...byId.values()].map((x) => {
      x.visits.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9))
      const active = x.visits.filter((v) => v.status !== 'canceled')
      x.done = active.filter((v) => STATUS_CLASS[v.status] === 'done').length
      x.total = active.length
      x.onsite = active.some((v) => v.status === 'i_went')
      return x
    })
    if (onlyOpen) list = list.filter((x) => x.done < x.total)
    return list.sort((a, b) => (b.onsite - a.onsite) || (a.done / (a.total || 1) - b.done / (b.total || 1)) || a.name.localeCompare(b.name))
  }, [plans, onlyOpen])

  // field people of the team who have nothing planned today
  const idle = useMemo(() => {
    const busy = new Set(plans.map((p) => String(p.performer?._id || p.performer || '')))
    return team.filter((e) => e.isActive !== false && e.employeeType === 'field' && !busy.has(String(e._id)))
  }, [team, plans])

  const time = (d) => (d && !(new Date(d).getUTCHours() === 0 && new Date(d).getUTCMinutes() === 0) ? new Date(d).toLocaleTimeString(locale === 'ka' ? 'ka-GE' : locale, { hour: '2-digit', minute: '2-digit' }) : '')

  return (
    <div className="ttv">
      <div className="ttv-head">
        <h3>{t('title')}</h3>
        <Link href={`/${locale}/dashboard/team-status`} className="ttv-link">{t('viewAll')} →</Link>
      </div>

      <div className="ttv-summary">
        <div className="ttv-chip"><strong>{counts.total}</strong><span>{t('total')}</span></div>
        <div className="ttv-chip onsite"><strong>{counts.onsite}</strong><span>{t('onSite')}</span></div>
        <div className="ttv-chip planned"><strong>{counts.planned}</strong><span>{t('notStarted')}</span></div>
        <div className="ttv-chip done"><strong>{counts.done}</strong><span>{t('done')}</span></div>
        <div className="ttv-chip canceled"><strong>{counts.canceled}</strong><span>{t('canceled')}</span></div>
      </div>

      <label className="ttv-filter">
        <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
        <span>{t('onlyOpen')}</span>
      </label>

      {error && <p className="resource-error">{error}</p>}
      {loading && <p className="ttv-empty"><span className="btn-spinner" aria-hidden="true" /></p>}
      {!loading && people.length === 0 && <p className="ttv-empty">{t('noPlans')}</p>}

      <div className="ttv-list">
        {people.map((x) => (
          <div key={x.id} className="ttv-person">
            <div className="ttv-person-head">
              <span className={`ttv-dot ${x.onsite ? 'onsite' : x.done === x.total && x.total ? 'done' : 'planned'}`} />
              <span className="ttv-name">{x.name}</span>
              <span className="ttv-progress">{x.done}/{x.total}</span>
              <div className="ttv-bar"><i style={{ width: `${x.total ? (x.done / x.total) * 100 : 0}%` }} /></div>
            </div>
            <ul className="ttv-visits">
              {x.visits.map((v) => (
                <li key={v._id} className={v.status === 'canceled' ? 'is-canceled' : ''}>
                  <span className="ttv-place">{place(v)}</span>
                  <span className="ttv-time">{time(v.period)}</span>
                  <span className={`ttv-badge ${STATUS_CLASS[v.status] || 'planned'}`}>{t(`status.${v.status}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {!loading && idle.length > 0 && (
        <div className="ttv-idle">
          <span className="ttv-idle-title">{t('nothingPlanned')} ({idle.length}):</span>
          <span className="ttv-idle-names">{idle.map((e) => name(e)).join(', ')}</span>
        </div>
      )}
    </div>
  )
}
