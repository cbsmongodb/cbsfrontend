'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { useMonthNames } from '@/lib/months'
import './MyLeaveRequestsCard.css'

const TYPES = ['paid', 'unpaid', 'sick']

// Dashboard card for everyone: my own leave requests and what happened to them
export default function MyLeaveRequestsCard() {
  const t = useTranslations('leaveRequests')
  const locale = useLocale()
  const months = useMonthNames()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    const load = () => apiFetch(`/api/leave-requests/mine?year=${new Date().getFullYear()}`)
      .then((d) => setRows((d?.requests || []).filter((r) => r.days?.length && r.status !== 'canceled')))
      .catch(() => setRows([]))
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [])

  if (!rows || rows.length === 0) return null

  const fmt = (k) => { const [, m, d] = String(k).slice(0, 10).split('-').map(Number); return `${d} ${months[m - 1]}` }
  const waiting = rows.filter((r) => r.status === 'pending').length

  return (
    <div className="mlr">
      <div className="mlr-head">
        <h3>
          {t('myRequests')}
          {waiting > 0 && <span className="mlr-waiting">{waiting} {t('waiting')}</span>}
        </h3>
        <Link href={`/${locale}/dashboard/leave-requests`} className="mlr-link">{t('title')} →</Link>
      </div>
      <div className="mlr-list">
        {rows.slice(0, 5).map((r) => {
          const ds = r.days.map((d) => ({ date: String(d.date).slice(0, 10), type: d.type })).sort((a, b) => a.date.localeCompare(b.date))
          const c = { paid: 0, unpaid: 0, sick: 0 }
          ds.forEach((d) => { c[d.type] += 1 })
          const range = ds.length === 1 ? fmt(ds[0].date) : `${fmt(ds[0].date)} – ${fmt(ds[ds.length - 1].date)}`
          const st = r.status || 'approved'
          return (
            <div key={r._id} className={`mlr-item ${st}`}>
              <span className="mlr-icon" aria-hidden="true">{st === 'approved' ? '✓' : st === 'rejected' ? '✕' : '⏳'}</span>
              <div className="mlr-main">
                <strong>{range}</strong>
                <span className="mlr-sub">
                  {ds.length} {t('days')} · {TYPES.filter((k) => c[k]).map((k) => `${t(`types.${k}`)} ${c[k]}`).join(', ')}
                </span>
                {st === 'rejected' && r.decisionNote && <span className="mlr-reason">↳ {r.decisionNote}</span>}
              </div>
              <span className={`mlr-status ${st}`}>{t(`status.${st}`)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
