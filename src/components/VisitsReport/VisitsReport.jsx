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
  const PAGE = 30
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/reports/visits/divisions').then(setDivisions).catch(() => {})
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const query = (r) => {
    const p = new URLSearchParams({ from: r.from, to: r.to })
    if (r.divisionId) p.set('division', r.divisionId)
    return p
  }

  async function load(over = {}) {
    const r = { from, to, divisionId, page: 1, ...over }
    if (!r.from || !r.to || r.from > r.to) { setError(v('badRange')); return }
    setLoading(true)
    setError('')
    try {
      const p = query(r)
      p.set('page', r.page)
      p.set('limit', PAGE)
      setData(await apiFetch(`/api/reports/visits?${p}`))
      if (over.page) window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // the page's rows (one employee on one day, already sorted by the server) grouped by day
  const toDays = (rows) => {
    const out = []
    for (const r of rows || []) {
      let d = out[out.length - 1]
      if (!d || d.key !== r.day) { d = { key: r.day, employees: [], count: 0 }; out.push(d) }
      d.employees.push({ id: String(r.employeeId), name: r.employeeName, division: r.divisionName, visits: r.visits })
      d.count += r.visits.length
    }
    return out
  }
  const days = useMemo(() => toDays(data?.rows), [data])

  const dayTitle = (k) => {
    const [y, m, d] = k.split('-').map(Number)
    const s = new Date(y, m - 1, d).toLocaleDateString(tag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const ddmmyyyy = (k) => k.split('-').reverse().join('.')
  // 108 -> "1 სთ 48 წთ", 37 -> "37 წთ", 120 -> "2 სთ"
  const dur = (m) => {
    const h = Math.floor(m / 60), r = m % 60
    if (!h) return `${r} ${v('min')}`
    return r ? `${h} ${v('hour')} ${r} ${v('min')}` : `${h} ${v('hour')}`
  }

  async function buildExcel() {
    const p = query({ from, to, divisionId })
    p.set('all', '1')
    const full = await apiFetch(`/api/reports/visits?${p}`)
    const allDays = toDays(full.rows)
    const headers = [t('common.date'), t('common.employee'), t('common.division'), v('place'), v('went'), v('left'), v('duration')]
    const rows = allDays.flatMap((d) => d.employees.flatMap((e) => e.visits.map((x) => {
      const mins = minutesBetween(x.iWentAt, x.iLeftAt)
      return [ddmmyyyy(d.key), e.name, e.division, x.place, hhmm(x.iWentAt), hhmm(x.iLeftAt), mins != null ? dur(mins) : '']
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
          <div className="vr-emps">
            {d.employees.map((e) => (
              <article className="vr-row" key={`${d.key}_${e.id}`}>
                <div className="vr-row-who">
                  <span className="vr-avatar" aria-hidden="true">{(e.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <span className="vr-emp-name">
                    <span className="vr-row-date">{ddmmyyyy(d.key)} · {(() => { const [y, m, dd] = d.key.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString(tag, { weekday: 'long' }) })()}</span>
                    <strong>{e.name}</strong>
                    <em>{e.division ? `${e.division} · ` : ''}{e.visits.length} {v('visitsShort')}</em>
                  </span>
                </div>
                <ol className="vr-strip">
                  {e.visits.map((x) => {
                    const mins = minutesBetween(x.iWentAt, x.iLeftAt)
                    return (
                      <li key={x._id} className="vr-tile">
                        <div className="vr-tile-top">
                          <span className="vr-tile-time"><b>{hhmm(x.iWentAt) || '—'}</b> – {hhmm(x.iLeftAt) || '…'}</span>
                          {mins != null && <i>{dur(mins)}</i>}
                        </div>
                        <div className="vr-place">
                          <span className={`vr-place-icon ${x.placeType}`} aria-hidden="true">{x.placeType === 'pharmacy' ? '℞' : '✚'}</span>
                          <strong title={x.place}>{x.place || '—'}</strong>
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

      {data && data.pages > 1 && (
        <div className="reimb-pagination">
          <button type="button" onClick={() => load({ page: 1 })} disabled={loading || data.page <= 1}>«</button>
          <button type="button" onClick={() => load({ page: data.page - 1 })} disabled={loading || data.page <= 1}>‹</button>
          <span>{(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} / {data.total}</span>
          <button type="button" onClick={() => load({ page: data.page + 1 })} disabled={loading || data.page >= data.pages}>›</button>
          <button type="button" onClick={() => load({ page: data.pages })} disabled={loading || data.page >= data.pages}>»</button>
        </div>
      )}
    </div>
  )
}
