'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { useMonthNames } from '@/lib/months'
import './LeaveApprovalsCard.css'

const TYPES = ['paid', 'unpaid', 'sick']
const name = (e) => (e ? `${e.firstName || ''} ${e.lastName || ''}`.trim() : '—')

// Dashboard card for approvers (admin / director): leave requests waiting for a decision.
// Everyone else gets 403 from the API -> the card simply does not show.
export default function LeaveApprovalsCard() {
  const t = useTranslations('leaveRequests')
  const locale = useLocale()
  const months = useMonthNames()
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    try { setRows(await apiFetch('/api/leave-requests/pending')) } catch { setRows(false) }
  }
  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  if (!rows) return null // not an approver (or still loading)

  const fmt = (k) => { const [, m, d] = String(k).slice(0, 10).split('-').map(Number); return `${d} ${months[m - 1]}` }
  const days = (r) => (r.days?.length ? r.days.map((d) => ({ date: String(d.date).slice(0, 10), type: d.type })) : [])

  async function decide(r, action) {
    let note = ''
    if (action === 'reject') {
      const v = window.prompt(t('rejectReason'), '')
      if (v === null) return
      note = v
    }
    setBusy(r._id); setError('')
    try {
      await apiFetch(`/api/leave-requests/${r._id}/${action}`, { method: 'POST', body: JSON.stringify({ note }) })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="lac">
      <div className="lac-head">
        <h3>
          {t('tabs.approvals')}
          {rows.length > 0 && <span className="lac-count">{rows.length}</span>}
        </h3>
        <Link href={`/${locale}/dashboard/leave-requests`} className="lac-link">{t('title')} →</Link>
      </div>
      {error && <p className="resource-error">{error}</p>}
      {rows.length === 0 && <p className="lac-empty">✓ {t('noPending')}</p>}
      <div className="lac-list">
        {rows.slice(0, 6).map((r) => {
          const ds = days(r)
          const c = { paid: 0, unpaid: 0, sick: 0 }
          ds.forEach((d) => { c[d.type] += 1 })
          const range = ds.length ? (ds.length === 1 ? fmt(ds[0].date) : `${fmt(ds[0].date)} – ${fmt(ds[ds.length - 1].date)}`) : '—'
          return (
            <div key={r._id} className="lac-item">
              <div className="lac-main">
                <strong>{name(r.employee)}</strong>
                <span className="lac-range">{range} · {ds.length} {t('days')}</span>
                <span className="lac-chips">
                  {TYPES.filter((k) => c[k]).map((k) => <span key={k} className={`lac-chip ${k}`}>{t(`types.${k}`)} · {c[k]}</span>)}
                </span>
                {r.note && <span className="lac-note">“{r.note}”</span>}
              </div>
              <div className="lac-actions">
                <button type="button" className="lac-btn ok" disabled={busy === r._id} onClick={() => decide(r, 'approve')}>
                  {busy === r._id ? <span className="btn-spinner" aria-hidden="true" /> : `✓ ${t('approve')}`}
                </button>
                <button type="button" className="lac-btn no" disabled={busy === r._id} onClick={() => decide(r, 'reject')}>✕ {t('reject')}</button>
              </div>
            </div>
          )
        })}
      </div>
      {rows.length > 6 && <Link href={`/${locale}/dashboard/leave-requests`} className="lac-more">+{rows.length - 6} →</Link>}
    </div>
  )
}
