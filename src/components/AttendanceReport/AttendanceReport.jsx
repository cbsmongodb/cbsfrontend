'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './AttendanceReport.css'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
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

const STATUS_LABELS = {
  ontime: 'ontime',
  late_checkin: 'late_checkin',
  early_checkout: 'early_checkout',
}

const STATUS_COLORS = {
  ontime: '#16a34a',
  late_checkin: '#dc2626',
  early_checkout: '#f59e0b',
}

const TYPE_LABELS = {
  checkin: 'checkin',
  checkout: 'checkout',
}

export default function AttendanceReport() {
  const t = useTranslations('reports')
  const locale = useLocale()
  const [employees, setEmployees] = useState([])

  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [employeeId, setEmployeeId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadOptions() {
      try {
        const e = await apiFetch('/api/employees?lite=1')
        setEmployees(e)
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
      const data = await apiFetch(`/api/reports/attendances?${params}`)
      setRows(data)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const visibleRows = useMemo(() => {
    let list = rows
    if (statusFilter) list = list.filter((r) => r.attendanceStatus === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) => r.employeeName.toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, statusFilter, search])

  // show 100 rows at a time — thousands of table rows at once freeze the browser
  const PAGE = 100
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [visibleRows])
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = visibleRows.slice(safePage * PAGE, safePage * PAGE + PAGE)
  const fmtTime = (v) => new Date(v).toLocaleString(localeTag(locale), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const typeText = (r) => (TYPE_LABELS[r.attendanceType] ? t(`attendance.${TYPE_LABELS[r.attendanceType]}`) : r.attendanceType)
  const statusText = (r) => (STATUS_LABELS[r.attendanceStatus] ? t(`attendance.${STATUS_LABELS[r.attendanceStatus]}`) : r.attendanceStatus)
  const pager = pageCount > 1 ? (
    <div className="att-pagination">
      <button type="button" onClick={() => setPage(0)} disabled={safePage === 0}>«</button>
      <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 0}>‹</button>
      <span>{safePage * PAGE + 1}–{Math.min((safePage + 1) * PAGE, visibleRows.length)} / {visibleRows.length.toLocaleString('en-US')}</span>
      <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1}>›</button>
      <button type="button" onClick={() => setPage(pageCount - 1)} disabled={safePage >= pageCount - 1}>»</button>
    </div>
  ) : null

  const statusCounts = useMemo(() => {
    const c = { ontime: 0, late_checkin: 0, early_checkout: 0 }
    rows.forEach((r) => {
      if (c[r.attendanceStatus] != null) c[r.attendanceStatus]++
    })
    return c
  }, [rows])

  return (
    <div className="attendance-report">
      <div className="report-title-row">
        <h1>{t('attendance.title')}</h1>
        <ExcelExportButton title={t('attendance.title')} build={() => ({
            headers: [t('common.employee'), t('attendance.time'), t('attendance.type'), t('attendance.address'), t('attendance.status')],
            rows: visibleRows.map((r) => [r.employeeName, fmtTime(r.attendanceTime), typeText(r), r.address || '—', statusText(r)]),
          })} />
        {loading && <ReportLoader />}
      </div>

      <div className="attendance-report-filters-card">
        <div className="attendance-report-filters-grid">
          <div className="attendance-report-field">
            <label>{t('common.startDate')}</label>
            <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="attendance-report-field">
            <label>{t('common.endDate')}</label>
            <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="attendance-report-field">
            <label>{t('common.employee')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={t('common.all')}
            />
          </div>
          <button type="button" className="btn attendance-report-search-btn" onClick={loadReport} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : t('common.search')}</span>
          </button>
        </div>

        <input
          type="text"
          className="field-input"
          placeholder={t('attendance.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginTop: 12, width: '100%', maxWidth: 320 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="attendance-report-filters-pills">
          <button
            type="button"
            className={`attendance-report-pill ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            {t('common.all')} <span>{rows.length}</span>
          </button>
          {Object.keys(STATUS_LABELS).map((key) => (
            <button
              key={key}
              type="button"
              className={`attendance-report-pill ${statusFilter === key ? 'active' : ''}`}
              onClick={() => setStatusFilter(key)}
              style={statusFilter === key ? { background: STATUS_COLORS[key], borderColor: STATUS_COLORS[key] } : {}}
            >
              {t(`attendance.${STATUS_LABELS[key]}`)} <span>{statusCounts[key] || 0}</span>
            </button>
          ))}
        </div>
      )}

      {loaded && pager}

      <div className="attendance-report-table-scroll">
        <table className="attendance-report-table">
          <thead>
            <tr>
              <th>{t('common.employee')}</th>
              <th>{t('attendance.time')}</th>
              <th>{t('attendance.type')}</th>
              <th>{t('attendance.address')}</th>
              <th>{t('attendance.status')}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r._id}>
                <td>{r.employeeName}</td>
                <td>{fmtTime(r.attendanceTime)}</td>
                <td>{typeText(r)}</td>
                <td>{r.address || '—'}</td>
                <td>
                  <span className="attendance-report-status-badge" style={{ color: STATUS_COLORS[r.attendanceStatus] }}>
                    {STATUS_LABELS[r.attendanceStatus] ? t(`attendance.${STATUS_LABELS[r.attendanceStatus]}`) : r.attendanceStatus}
                  </span>
                </td>
              </tr>
            ))}
            {loaded && visibleRows.length === 0 && (
              <tr>
                <td colSpan={5}>{t('common.noRecords')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loaded && pager}
    </div>
  )
}
