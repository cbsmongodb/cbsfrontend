'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch, apiDownload } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './ReimbursementReport.css'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import '@/components/ExcelExportButton/ExcelExportButton.css'
import ReportLoader from '@/components/ReportLoader/ReportLoader'

const LOCALE_TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }
const localeTag = (locale) => LOCALE_TAG[locale] || 'ka-GE'

const pad2 = (n) => String(n).padStart(2, '0')
function toInputDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function defaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return toInputDate(d)
}

function defaultTo() {
  return toInputDate(new Date())
}

export default function ReimbursementReport() {
  const t = useTranslations('reports')
  const locale = useLocale()
  const [employees, setEmployees] = useState([])

  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [divisions, setDivisions] = useState([])
  const [view, setView] = useState('details') // details | employees
  const [page, setPage] = useState(0)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadOptions() {
      try {
        const e = await apiFetch('/api/employees?lite=1')
        setEmployees(e)
        apiFetch('/api/reports/reimbursement/divisions').then(setDivisions).catch(() => {})
      } catch (err) {
        setError(err.message)
      }
    }
    loadOptions()
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadReport() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      // empty dates would mean "the whole history" -> fall back to the last 7 days
      const f = from || defaultFrom()
      const tt = to || defaultTo()
      if (!from) setFrom(f)
      if (!to) setTo(tt)
      params.set('from', f)
      params.set('to', tt)
      if (employeeId) params.set('employee', employeeId)
      if (divisionId) params.set('division', divisionId)
      const data = await apiFetch(`/api/reports/reimbursement?${params}`)
      setRows(data)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (employeeId) params.set('employee', employeeId)
      await apiDownload(`/api/reports/reimbursement/export?${params}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  const visibleRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter(
      (r) => r.employeeName.toLowerCase().includes(q) || r.regionName.toLowerCase().includes(q)
    )
  }, [rows, search])

  const totals = useMemo(() => {
    const totalAmount = visibleRows.reduce((sum, r) => sum + (r.amount || 0), 0)
    const uniqueEmployees = new Set(visibleRows.map((r) => r.employeeName)).size
    return { totalAmount, uniqueEmployees, rows: visibleRows.length }
  }, [visibleRows])

  // one line per person: total for the whole period
  const byEmployee = useMemo(() => {
    const m = new Map()
    visibleRows.forEach((r) => {
      const k = r.employeeId || r.employeeName
      if (!m.has(k)) m.set(k, { employeeName: r.employeeName, days: 0, amount: 0, regions: new Set(), first: r.date, last: r.date })
      const x = m.get(k)
      x.days += 1
      x.amount += r.amount || 0
      if (r.regionName) x.regions.add(r.regionName)
      if (new Date(r.date) < new Date(x.first)) x.first = r.date
      if (new Date(r.date) > new Date(x.last)) x.last = r.date
    })
    return [...m.values()].sort((a, b) => b.amount - a.amount || a.employeeName.localeCompare(b.employeeName))
  }, [visibleRows])

  // pages of 50
  const PAGE = 50
  // sorting by a column (click the header)
  const [sort, setSort] = useState({ key: '', dir: 'asc' })
  useEffect(() => { setSort({ key: '', dir: 'asc' }) }, [view])
  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'amount' || key === 'days' || key === 'date' ? 'desc' : 'asc' }))
    setPage(0)
  }
  const sortValue = (r, key) => {
    if (key === 'date') return new Date(r.date).getTime()
    if (key === 'regions') return [...(r.regions || [])].join(', ')
    return r[key]
  }
  const baseList = view === 'employees' ? byEmployee : visibleRows
  const list = !sort.key ? baseList : [...baseList].sort((a, b) => {
    const x = sortValue(a, sort.key), y = sortValue(b, sort.key)
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'ka')
    return sort.dir === 'asc' ? c : -c
  })
  const sortTh = (key, label) => (
    <th className="reimb-sortable" data-sort={sort.key === key ? sort.dir : 'none'} onClick={() => toggleSort(key)}>{label}</th>
  )
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = list.slice(safePage * PAGE, safePage * PAGE + PAGE)
  useEffect(() => { setPage(0) }, [rows, search, view])

  return (
    <div className="reimbursement-report">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{t('reimbursement.title')}</h1>
          <ExcelExportButton title={t('reimbursement.title')} tableSelector=".reimbursement-table" pages={pageCount} currentPage={safePage + 1} goToPage={(n) => setPage(n - 1)} />
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
          <div className="reimbursement-field">
            <label>{t('common.employee')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={t('common.all')}
            />
          </div>
          <div className="reimbursement-field">
            <label>{t('reimbursement.division')}</label>
            <select className="field-input" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
              <option value="">{t('reimbursement.allDivisions')}</option>
              {divisions.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <button type="button" className="btn reimbursement-search-btn" onClick={loadReport} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : t('common.search')}</span>
          </button>
        </div>

        <input
          type="text"
          className="field-input"
          placeholder={t('reimbursement.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginTop: 12, width: '100%', maxWidth: 320 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="reimbursement-summary">
          <div className="reimbursement-summary-item highlight">
            <span>{totals.totalAmount.toLocaleString(localeTag(locale))} ₾</span>
            <label>{t('reimbursement.total')}</label>
          </div>
          <div className="reimbursement-summary-item">
            <span>{totals.rows}</span>
            <label>{t('reimbursement.records')}</label>
          </div>
          <div className="reimbursement-summary-item">
            <span>{totals.uniqueEmployees}</span>
            <label>{t('common.employee')}</label>
          </div>
        </div>
      )}

      {loaded && (
        <div className="reimb-view-toggle" role="tablist">
          <button type="button" className={view === 'details' ? 'active' : ''} onClick={() => setView('details')}>{t('reimbursement.viewDetails')}</button>
          <button type="button" className={view === 'employees' ? 'active' : ''} onClick={() => setView('employees')}>{t('reimbursement.viewByEmployee')}</button>
        </div>
      )}

      <div className="reimbursement-table-scroll">
        {view === 'details' ? (
          <table className="reimbursement-table">
            <thead>
              <tr>
                {sortTh('date', t('reimbursement.period'))}
                {sortTh('employeeName', t('reimbursement.performer'))}
                {sortTh('regionName', t('reimbursement.region'))}
                {sortTh('amount', t('reimbursement.amount'))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                  <td>{r.employeeName}</td>
                  <td>{r.regionName}</td>
                  <td className="reimbursement-amount">{r.amount} ₾</td>
                </tr>
              ))}
              {loaded && pageRows.length === 0 && (
                <tr><td colSpan={4}>{t('common.noRecords')}</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="reimbursement-table">
            <thead>
              <tr>
                {sortTh('employeeName', t('reimbursement.performer'))}
                {sortTh('regions', t('reimbursement.regions'))}
                {sortTh('days', t('reimbursement.days'))}
                <th>{t('reimbursement.fromTo')}</th>
                {sortTh('amount', t('reimbursement.totalToPay'))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={i}>
                  <td className="reimb-strong">{r.employeeName}</td>
                  <td>{[...r.regions].join(', ')}</td>
                  <td>{r.days}</td>
                  <td>{new Date(r.first).toLocaleDateString('en-GB')} – {new Date(r.last).toLocaleDateString('en-GB')}</td>
                  <td className="reimbursement-amount reimb-strong">{r.amount.toLocaleString('en-US')} ₾</td>
                </tr>
              ))}
              {loaded && pageRows.length === 0 && (
                <tr><td colSpan={5}>{t('common.noRecords')}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {pageCount > 1 && (
        <div className="reimb-pagination">
          <button type="button" onClick={() => setPage(0)} disabled={safePage === 0}>«</button>
          <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 0}>‹</button>
          <span>{safePage * PAGE + 1}–{Math.min((safePage + 1) * PAGE, list.length)} / {list.length}</span>
          <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1}>›</button>
          <button type="button" onClick={() => setPage(pageCount - 1)} disabled={safePage >= pageCount - 1}>»</button>
        </div>
      )}
    </div>
  )
}
