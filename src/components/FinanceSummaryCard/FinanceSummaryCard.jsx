'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { useMonthNames } from '@/lib/months'
import './FinanceSummaryCard.css'

const money = (n) => `₾${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

// Finance manager's dashboard: sales, what doctors are owed, what was paid
export default function FinanceSummaryCard() {
  const t = useTranslations('finance')
  const locale = useLocale()
  const months = useMonthNames()
  const now = new Date()
  const [month, setMonth] = useState(ym(now))
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null); setError('')
    apiFetch(`/api/finance/summary?month=${month}`).then(setData).catch((e) => setError(e.message))
  }, [month])

  const options = [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { value: ym(d), label: `${months[d.getMonth()]} ${d.getFullYear()}` }
  })

  const s = data?.sales, b = data?.budget
  const trend = s && s.previousAmount > 0 ? ((s.amount - s.previousAmount) / s.previousAmount) * 100 : null
  const paidPct = b && b.planned > 0 ? Math.min(100, (b.issued / b.planned) * 100) : 0

  return (
    <div className="fin">
      <div className="fin-head">
        <h3>{t('title')}</h3>
        <div className="fin-months">
          {options.map((o) => (
            <button key={o.value} type="button" className={month === o.value ? 'active' : ''} onClick={() => setMonth(o.value)}>{o.label}</button>
          ))}
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}
      {!data && !error && <p className="fin-muted"><span className="btn-spinner" aria-hidden="true" /></p>}

      {data && (
        <>
          <div className="fin-cards">
            <div className="fin-card sales">
              <span>{t('sales')}</span>
              <strong>{money(s.amount)}</strong>
              <em>
                {s.boxes.toLocaleString('en-US')} {t('boxes')}
                {trend !== null && <b className={trend >= 0 ? 'up' : 'down'}> {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%</b>}
              </em>
            </div>
            <div className="fin-card planned">
              <span>{t('planned')}</span>
              <strong>{money(b.planned)}</strong>
              <em>{b.doctors} {t('doctors')}</em>
            </div>
            <div className="fin-card issued">
              <span>{t('issued')}</span>
              <strong>{money(b.issued)}</strong>
              <em>{paidPct.toFixed(0)}% {t('ofPlanned')}</em>
            </div>
            <div className="fin-card owed">
              <span>{t('owed')}</span>
              <strong>{money(b.owed)}</strong>
              <em>{b.unpaidDoctors} {t('unpaidDoctors')}</em>
            </div>
            <div className="fin-card payments">
              <span>{t('payments')}</span>
              <strong>{money(data.payments.amount)}</strong>
              <em>{data.payments.count} {t('records')}</em>
            </div>
          </div>

          <div className="fin-progress">
            <div className="fin-progress-label">
              <span>{t('paidOfPlanned')}</span>
              <strong>{money(b.issued)} / {money(b.planned)}</strong>
            </div>
            <div className="fin-bar"><i style={{ width: `${paidPct}%` }} /></div>
            {b.overpaid > 0 && <p className="fin-muted">{t('overpaid')}: {money(b.overpaid)}</p>}
          </div>

          <div className="fin-grid">
            <div className="fin-panel">
              <h4>{t('topDebts')}</h4>
              {data.topDebts.length === 0 ? (
                <p className="fin-ok">✓ {t('noDebts')}</p>
              ) : (
                <table className="fin-table">
                  <thead>
                    <tr><th>{t('doctor')}</th><th>{t('rep')}</th><th className="num">{t('planned')}</th><th className="num">{t('issued')}</th><th className="num">{t('owed')}</th></tr>
                  </thead>
                  <tbody>
                    {data.topDebts.map((d, i) => (
                      <tr key={i}>
                        <td>{d.doctor}</td>
                        <td className="fin-muted-cell">{d.employee}</td>
                        <td className="num">{money(d.planned)}</td>
                        <td className="num">{money(d.issued)}</td>
                        <td className="num owed">{money(d.owed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Link href={`/${locale}/dashboard/sales-listing`} className="fin-link">{t('allDetails')} →</Link>
            </div>

            <div className="fin-panel">
              <h4>{t('byBank')}</h4>
              {b.byBank.length === 0 ? (
                <p className="fin-muted">{t('nothingPaid')}</p>
              ) : (
                <ul className="fin-banks">
                  {b.byBank.map((x) => (
                    <li key={x.bank}>
                      <span>{x.bank}</span>
                      <div className="fin-bank-bar"><i style={{ width: `${b.issued ? (x.amount / b.issued) * 100 : 0}%` }} /></div>
                      <strong>{money(x.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
