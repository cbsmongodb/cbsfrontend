'use client'

// Visits list: where each employee had COMPLETED visits on each day, and from when to when.
// Filters: start / end date and division. One row per employee per day.
import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import '@/components/ExcelExportButton/ExcelExportButton.css'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import '@/components/ReimbursementReport/ReimbursementReport.css'
import './VisitsReport.css'

const TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }
const pad2 = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const today = () => dayKey(new Date())
const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
const minutesBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)) : null)

export default function VisitsReport() {
  const t = useTranslations('reports')
  const v = (k, o) => t(`visits.${k}`, o)
  const locale = useLocale()
  const tag = TAG[locale] || TAG.ka

  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [divisionId, setDivisionId] = useState('')
  const [divisions, setDivisions] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/reports/visits/divisions').then(setDivisions).catch(() => {})
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(over = {}) {
    const r = { from, to, divisionId, ...over }
    if (!r.from || !r.to || r.from > r.to) { setError(v('badRange')); return }
    setLoading(true)
    setError('')
    try {
      const p = new URLSearchParams({ from: r.from, to: r.to })
      if (r.divisionId) p.set('division', r.divisionId)
      setData(await apiFetch(`/api/reports/visits?${p}`))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // day -> employee -> visits (newest day first, visits by time)
  const days = useMemo(() => {
    const byDay = new Map()
    for (const x of data?.visits || []) {
      const k = dayKey(new Date(x.iWentAt || x.date))
      if (!byDay.has(k)) byDay.set(k, new Map())
      const emps = byDay.get(k)
      const ek = String(x.employeeId)
      if (!emps.has(ek)) emps.set(ek, { id: ek, name: x.employeeName, division: x.divisionName, visits: [] })
      emps.get(ek).visits.push(x)
    }
    return [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, emps]) => ({
        key: k,
        employees: [...emps.values()]
          .map((e) => ({ ...e, visits: e.visits.sort((a, b) => new Date(a.iWentAt || a.date) - new Date(b.iWentAt || b.date)) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        count: [...emps.values()].reduce((s, e) => s + e.visits.length, 0),
      }))
  }, [data])

  const dayTitle = (k) => {
    const [y, m, d] = k.split('-').map(Number)
    const s = new Date(y, m - 1, d).toLocaleDateString(tag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const ddmmyyyy = (k) => k.split('-').reverse().join('.')

  function buildExcel() {
    const headers = [t('common.date'), t('common.employee'), t('common.division'), v('place'), v('went'), v('left'), v('duration')]
    const rows = days.flatMap((d) => d.employees.flatMap((e) => e.visits.map((x) => {
      const mins = minutesBetween(x.iWentAt, x.iLeftAt)
      return [ddmmyyyy(d.key), e.name, e.division, x.place, hhmm(x.iWentAt), hhmm(x.iLeftAt), mins != null ? `${mins} ${v('min')}` : '']
    })))
    return { headers, rows }
  }

  return (
    <div className="reimbursement-report visits-report">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{v('title')}</h1>
          <ExcelExportButton title={`${v('title')} — ${ddmmyyyy(from)}${from !== to ? ` – ${ddmmyyyy(to)}` : ''}`} fileName={`${v('title')} ${from}_${to}`} build={buildExcel} />
          {loading && <ReportLoader />}
        </div>
      </div>

      <div className="reimbursement-filters-card">
        <div className="reimbursement-filters-grid">
          <div className="reimbursement-field">
            <label>{t('common.startDate')}</label>
            <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="reimbursement-field">
            <label>{t('common.endDate')}</label>
            <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn reimbursement-search-btn" onClick={() => load()} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : t('common.search')}</span>
          </button>
        </div>
        {divisions.length > 0 && (
          <div className="vr-division-chips" role="tablist" aria-label={t('common.division')}>
            <span className="vr-chips-label">{t('common.division')}:</span>
            {(divisions.length > 1 ? [{ _id: '', name: t('common.all') }, ...divisions] : divisions).map((d) => (
              <button
                key={d._id || 'all'}
                type="button"
                role="tab"
                aria-selected={divisionId === d._id || divisions.length === 1}
                className={`vr-chip ${divisionId === d._id || divisions.length === 1 ? 'is-active' : ''}`}
                onClick={() => { setDivisionId(d._id); load({ divisionId: d._id }) }}
                disabled={loading}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}
      {data && days.length === 0 && !loading && <p className="vr-empty">{v('empty')}</p>}

      {days.map((d) => (
        <section className="vr-day" key={d.key}>
          <header className="vr-day-head">
            <h3>{dayTitle(d.key)}</h3>
            <span className="vr-day-count">{d.count} {v('visitsShort')} · {d.employees.length} {v('peopleShort')}</span>
          </header>
          <div className="vr-emps">
            {d.employees.map((e) => (
              <article className="vr-row" key={`${d.key}_${e.id}`}>
                <div className="vr-row-who">
                  <span className="vr-avatar" aria-hidden="true">{(e.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <span className="vr-emp-name">
                    <strong>{e.name}</strong>
                    {e.division && <em>{e.division}</em>}
                    <span className="vr-emp-meta"><span className="vr-pill">{e.visits.length} {v('visitsShort')}</span></span>
                  </span>
                </div>
                <ol className="vr-strip">
                  {e.visits.map((x) => {
                    const mins = minutesBetween(x.iWentAt, x.iLeftAt)
                    return (
                      <li key={x._id} className="vr-tile">
                        <div className="vr-tile-top">
                          <span className="vr-tile-time"><b>{hhmm(x.iWentAt) || '—'}</b> – {hhmm(x.iLeftAt) || '…'}</span>
                          {mins != null && <i>{mins} {v('min')}</i>}
                        </div>
                        <div className="vr-place">
                          <span className={`vr-place-icon ${x.placeType}`} aria-hidden="true">{x.placeType === 'pharmacy' ? '℞' : '✚'}</span>
                          <strong>{x.place || '—'}</strong>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
