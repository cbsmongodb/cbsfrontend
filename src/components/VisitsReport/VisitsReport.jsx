'use client'

// Visits list: who visited where, when and which doctors — by day / month / period,
// division, employee and status. Grouped by day, then by employee.
import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import MonthSelect from '@/components/MonthSelect/MonthSelect'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import '@/components/ExcelExportButton/ExcelExportButton.css'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import '@/components/ReimbursementReport/ReimbursementReport.css'
import './VisitsReport.css'

const TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }
const pad2 = (n) => String(n).padStart(2, '0')
const dayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const today = () => dayKey(new Date())
const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return { from: `${ym}-01`, to: `${ym}-${pad2(new Date(y, m, 0).getDate())}` }
}
// Georgian local day of a visit
const localDay = (iso) => dayKey(new Date(iso))
const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')
const minutesBetween = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)) : null)

const STATUS_CLASS = { completed: 'done', i_left: 'done', i_went: 'inprogress', planned: 'planned', canceled: 'canceled' }

export default function VisitsReport() {
  const t = useTranslations('reports')
  const v = (k, o) => t(`visits.${k}`, o)
  const locale = useLocale()
  const tag = TAG[locale] || TAG.ka

  const [mode, setMode] = useState('day') // day | month | range
  const [day, setDay] = useState(today())
  const [month, setMonth] = useState(today().slice(0, 7))
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [divisionId, setDivisionId] = useState('')
  const [divisions, setDivisions] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [employees, setEmployees] = useState([])
  const [status, setStatus] = useState('') // '' | done | planned | canceled
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState({}) // collapsed employee blocks

  const range = useMemo(() => {
    if (mode === 'day') return { from: day, to: day }
    if (mode === 'month') return monthRange(month)
    return { from, to }
  }, [mode, day, month, from, to])

  useEffect(() => {
    apiFetch('/api/reports/visits/divisions').then(setDivisions).catch(() => {})
    apiFetch('/api/employees?lite=1').then((e) => setEmployees(Array.isArray(e) ? e : e?.items || [])).catch(() => {})
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(over = {}) {
    const r = { ...range, divisionId, employeeId, status, ...over }
    if (!r.from || !r.to || r.from > r.to) { setError(v('badRange')); return }
    setLoading(true)
    setError('')
    try {
      const p = new URLSearchParams({ from: r.from, to: r.to })
      if (r.divisionId) p.set('division', r.divisionId)
      if (r.employeeId) p.set('employee', r.employeeId)
      if (r.status) p.set('status', r.status)
      setData(await apiFetch(`/api/reports/visits?${p}`))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // text search (place, doctor, employee)
  const visits = useMemo(() => {
    const list = data?.visits || []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((x) => [x.employeeName, x.place, x.divisionName, ...x.doctors.map((d) => `${d.name} ${d.profile}`)]
      .some((s) => (s || '').toLowerCase().includes(q)))
  }, [data, search])

  // day -> employee -> visits (newest day first, visits by time)
  const days = useMemo(() => {
    const byDay = new Map()
    for (const x of visits) {
      const k = localDay(x.iWentAt || x.date)
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
          .sort((a, b) => b.visits.length - a.visits.length || a.name.localeCompare(b.name)),
        count: [...emps.values()].reduce((s, e) => s + e.visits.length, 0),
      }))
  }, [visits])

  const stats = useMemo(() => {
    const done = visits.filter((x) => STATUS_CLASS[x.status] === 'done' || STATUS_CLASS[x.status] === 'inprogress').length
    const doctors = new Set(visits.flatMap((x) => x.doctors.map((d) => d.name)))
    return {
      total: visits.length,
      done,
      people: new Set(visits.map((x) => String(x.employeeId))).size,
      doctors: doctors.size,
      places: new Set(visits.map((x) => x.place).filter(Boolean)).size,
    }
  }, [visits])

  const dayTitle = (k) => {
    const [y, m, d] = k.split('-').map(Number)
    const s = new Date(y, m - 1, d).toLocaleDateString(tag, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const statusLabel = (s) => v(`status_${s}`)
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  function buildExcel() {
    const headers = [t('common.date'), t('common.employee'), t('common.division'), v('place'), v('doctors'), v('went'), v('left'), v('duration'), v('statusCol'), v('comment')]
    const rows = days.flatMap((d) => d.employees.flatMap((e) => e.visits.map((x) => [
      `${d.key.slice(8)}.${d.key.slice(5, 7)}.${d.key.slice(0, 4)}`,
      x.employeeName, x.divisionName, x.place,
      x.doctors.map((dd) => (dd.profile ? `${dd.name} (${dd.profile})` : dd.name)).join(', '),
      hhmm(x.iWentAt), hhmm(x.iLeftAt),
      minutesBetween(x.iWentAt, x.iLeftAt) != null ? `${minutesBetween(x.iWentAt, x.iLeftAt)} ${v('min')}` : '',
      statusLabel(x.status), x.comment,
    ])))
    return { headers, rows }
  }

  const periodText = range.from === range.to ? dayTitle(range.from) : `${range.from.split('-').reverse().join('.')} – ${range.to.split('-').reverse().join('.')}`

  return (
    <div className="reimbursement-report visits-report">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{v('title')}</h1>
          <ExcelExportButton title={`${v('title')} — ${periodText}`} fileName={`${v('title')} ${range.from}_${range.to}`} build={buildExcel} />
          {loading && <ReportLoader />}
        </div>
        <p className="vr-subtitle">{v('subtitle')}</p>
      </div>

      <div className="reimbursement-filters-card">
        <div className="vr-modes" role="tablist">
          {['day', 'month', 'range'].map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} className={`vr-chip ${mode === m ? 'is-active' : ''}`} onClick={() => setMode(m)}>
              {v(`mode_${m}`)}
            </button>
          ))}
        </div>
        <div className="reimbursement-filters-grid">
          {mode === 'day' && (
            <div className="reimbursement-field">
              <label>{t('common.date')}</label>
              <div className="vr-day-picker">
                <button type="button" className="vr-step" aria-label="-1" onClick={() => { const d = new Date(day); d.setDate(d.getDate() - 1); const k = dayKey(d); setDay(k); load({ from: k, to: k }) }}>‹</button>
                <input type="date" className="field-input" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
                <button type="button" className="vr-step" aria-label="+1" onClick={() => { const d = new Date(day); d.setDate(d.getDate() + 1); const k = dayKey(d); setDay(k); load({ from: k, to: k }) }}>›</button>
              </div>
            </div>
          )}
          {mode === 'month' && (
            <div className="reimbursement-field">
              <label>{t('common.month')}</label>
              <MonthSelect value={month} onChange={setMonth} />
            </div>
          )}
          {mode === 'range' && (
            <>
              <div className="reimbursement-field">
                <label>{t('common.startDate')}</label>
                <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="reimbursement-field">
                <label>{t('common.endDate')}</label>
                <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="reimbursement-field">
            <label>{t('common.employee')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim()}
              placeholder={t('common.all')}
            />
          </div>
          <div className="reimbursement-field">
            <label>{v('statusCol')}</label>
            <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('common.all')}</option>
              <option value="done">{v('filter_done')}</option>
              <option value="planned">{v('filter_planned')}</option>
              <option value="canceled">{v('filter_canceled')}</option>
            </select>
          </div>
          <button type="button" className="btn reimbursement-search-btn" onClick={() => load()} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : t('common.search')}</span>
          </button>
        </div>
        {divisions.length > 0 && (
          <div className="vr-division-chips" role="tablist" aria-label={t('common.division')}>
            <span className="vr-chips-label">{t('common.division')}:</span>
            {[{ _id: '', name: t('common.all') }, ...divisions].map((d) => (
              <button
                key={d._id || 'all'}
                type="button"
                role="tab"
                aria-selected={divisionId === d._id}
                className={`vr-chip ${divisionId === d._id ? 'is-active' : ''}`}
                onClick={() => { setDivisionId(d._id); load({ divisionId: d._id }) }}
                disabled={loading}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
        <div className="vr-search">
          <input type="search" className="field-input" placeholder={v('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      {data && (
        <div className="vr-summary">
          <div className="vr-sum vr-sum-main"><b>{stats.total}</b><span>{v('kpiVisits')}</span></div>
          <div className="vr-sum"><b>{stats.done}</b><span>{v('kpiDone')}</span></div>
          <div className="vr-sum"><b>{stats.people}</b><span>{v('kpiPeople')}</span></div>
          <div className="vr-sum"><b>{stats.doctors}</b><span>{v('kpiDoctors')}</span></div>
          <div className="vr-sum"><b>{stats.places}</b><span>{v('kpiPlaces')}</span></div>
        </div>
      )}

      {data && days.length === 0 && !loading && <p className="vr-empty">{v('empty')}</p>}

      {days.map((d) => (
        <section className="vr-day" key={d.key}>
          <header className="vr-day-head">
            <h3>{dayTitle(d.key)}</h3>
            <span className="vr-day-count">{d.count} {v('visitsShort')} · {d.employees.length} {v('peopleShort')}</span>
          </header>
          <div className="vr-emps">
            {d.employees.map((e) => {
              const k = `${d.key}_${e.id}`
              const collapsed = !!open[k]
              const first = e.visits.find((x) => x.iWentAt)?.iWentAt
              const lastLeft = [...e.visits].reverse().find((x) => x.iLeftAt)?.iLeftAt
              return (
                <article className="vr-emp" key={k}>
                  <button type="button" className="vr-emp-head" onClick={() => toggle(k)} aria-expanded={!collapsed}>
                    <span className="vr-avatar" aria-hidden="true">{(e.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}</span>
                    <span className="vr-emp-name">
                      <strong>{e.name}</strong>
                      {e.division && <em>{e.division}</em>}
                    </span>
                    <span className="vr-emp-meta">
                      {first && <span>{hhmm(first)}{lastLeft ? ` – ${hhmm(lastLeft)}` : ''}</span>}
                      <span className="vr-pill">{e.visits.length} {v('visitsShort')}</span>
                      <span className={`vr-caret ${collapsed ? '' : 'is-open'}`} aria-hidden="true">▾</span>
                    </span>
                  </button>
                  {!collapsed && (
                    <ol className="vr-timeline">
                      {e.visits.map((x) => {
                        const mins = minutesBetween(x.iWentAt, x.iLeftAt)
                        return (
                          <li key={x._id} className={`vr-visit is-${STATUS_CLASS[x.status] || 'planned'}`}>
                            <div className="vr-time" title={`${v('went')} ${hhmm(x.iWentAt) || '—'} · ${v('left')} ${hhmm(x.iLeftAt) || '—'}`}>
                              <b>{hhmm(x.iWentAt) || '—'}</b>
                              <span>– {hhmm(x.iLeftAt) || '…'}</span>
                              {mins != null && <i>{mins} {v('min')}</i>}
                            </div>
                            <div className="vr-body">
                              <div className="vr-place">
                                <span className={`vr-place-icon ${x.placeType}`} aria-hidden="true">{x.placeType === 'pharmacy' ? '℞' : '✚'}</span>
                                <strong>{x.place || '—'}</strong>
                                <span className={`vr-status is-${STATUS_CLASS[x.status] || 'planned'}`}>{statusLabel(x.status)}</span>
                              </div>
                              {x.doctors.length > 0 && (
                                <div className="vr-doctors">
                                  {x.doctors.map((dd, i) => (
                                    <span className="vr-doctor" key={i}>{dd.name}{dd.profile && <small>{dd.profile}</small>}</span>
                                  ))}
                                </div>
                              )}
                              {x.comment && <p className="vr-comment">{x.comment}</p>}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
