'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { useMonthNames } from '@/lib/months'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './PrescriptionsReport.css'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import ReportLoader from '@/components/ReportLoader/ReportLoader'

const pad2 = (n) => String(n).padStart(2, '0')
function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
const PAGE_SIZE = 100
const fmt = (n) => Number(n || 0).toLocaleString('en-US')

export default function PrescriptionsReport() {
  const t = useTranslations('reports')
  const months = useMonthNames()

  const [employees, setEmployees] = useState([])
  const [from, setFrom] = useState(currentMonth())
  const [to, setTo] = useState(currentMonth())
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState(0)

  // a representative sees only their own prescriptions -> no employee filter, just their name
  const [me, setMe] = useState(null)
  useEffect(() => {
    try { setMe(JSON.parse(localStorage.getItem('employee') || 'null')) } catch { /* ignore */ }
  }, [])
  const isRep = (me?.role?.name || '').toLowerCase().trim() === 'representative' || employees.length === 1

  useEffect(() => {
    apiFetch('/api/employees?lite=1').then(setEmployees).catch(() => {})
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadReport() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (employeeId) params.set('employee', employeeId)
      const data = await apiFetch(`/api/reports/prescriptions?${params}`)
      setRows(Array.isArray(data) ? data : [])
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.employeeName, r.doctorName, r.doctorNumber, r.hospitalName, r.drugName]
        .some((v) => String(v || '').toLowerCase().includes(q))
    )
  }, [rows, search])

  const totals = useMemo(() => {
    let prescribed = 0
    let sold = 0
    const doctors = new Set()
    visibleRows.forEach((r) => {
      prescribed += r.prescription || 0
      sold += r.sale || 0
      if (r.doctorNumber || r.doctorName) doctors.add(r.doctorNumber || r.doctorName)
    })
    return {
      prescribed,
      sold,
      fulfillment: prescribed ? Math.round((sold / prescribed) * 100) : 0,
      doctors: doctors.size,
    }
  }, [visibleRows])

  useEffect(() => { setPage(0) }, [search, rows])
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = useMemo(
    () => visibleRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [visibleRows, safePage]
  )
  const goTo = (p) => {
    setPage(Math.max(0, Math.min(pageCount - 1, p)))
    document.querySelector('.rx-report-table-scroll')?.scrollTo({ top: 0 })
  }

  const pager = visibleRows.length > 0 ? (
        <div className="rx-pager">
          <span className="rx-pager-info">
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, visibleRows.length)} / {fmt(visibleRows.length)}
          </span>
          {pageCount > 1 && <div className="rx-pager-buttons">
            <button type="button" onClick={() => goTo(0)} disabled={safePage === 0}>«</button>
            <button type="button" onClick={() => goTo(safePage - 1)} disabled={safePage === 0}>‹</button>
            {Array.from({ length: pageCount }, (_, i) => i)
              .filter((i) => i === 0 || i === pageCount - 1 || Math.abs(i - safePage) <= 2)
              .map((i, idx, arr) => (
                <span key={i} className="rx-pager-group">
                  {idx > 0 && i - arr[idx - 1] > 1 && <span className="rx-pager-dots">…</span>}
                  <button type="button" className={i === safePage ? 'active' : ''} onClick={() => goTo(i)}>{i + 1}</button>
                </span>
              ))}
            <button type="button" onClick={() => goTo(safePage + 1)} disabled={safePage >= pageCount - 1}>›</button>
            <button type="button" onClick={() => goTo(pageCount - 1)} disabled={safePage >= pageCount - 1}>»</button>
          </div>}
        </div>
  ) : null

  const monthLabel = (m) => {
    const [y, mo] = String(m || '').split('-')
    return mo ? `${months[Number(mo) - 1]} ${y}` : m
  }

  return (
    <div className="rx-report">
      <div className="report-title-row">
        <h1>{t('prescriptions.title')}</h1>
        <ExcelExportButton title={t('prescriptions.title')} build={() => ({
          headers: [t('common.month'), t('common.employee'), t('common.doctor'), t('common.hospital'), t('prescriptions.drug'), t('prescriptions.prescribed'), t('prescriptions.sold'), '%'],
          rows: visibleRows.map((r) => [
            monthLabel(r.month),
            r.employeeName || '—',
            [r.doctorName, r.doctorNumber].filter(Boolean).join(' ') || '—',
            r.hospitalName || '—',
            r.drugName || '—',
            { value: r.prescription || 0, kind: 'number' },
            { value: r.sale || 0, kind: 'number' },
            { value: r.prescription ? (r.sale || 0) / r.prescription : 0, kind: 'pct' },
          ]),
        })} />
        {loading && <ReportLoader />}
      </div>
      <p className="rx-report-subtitle">{t('prescriptions.subtitle')}</p>

      <div className="rx-report-filters-card">
        <div className="rx-report-filters-grid">
          <div className="rx-report-field">
            <label>{t('prescriptions.fromMonth')}</label>
            <input type="month" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="rx-report-field">
            <label>{t('prescriptions.toMonth')}</label>
            <input type="month" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="rx-report-field">
            <label>{t('common.employee')}</label>
            {isRep ? (
              <input
                type="text"
                className="field-input"
                value={me ? (me.name || `${me.firstName || ''} ${me.lastName || ''}`.trim()) : ''}
                readOnly
              />
            ) : (
              <SearchableSelect
                options={employees}
                value={employeeId}
                onChange={setEmployeeId}
                getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
                placeholder={t('common.all')}
              />
            )}
          </div>
          <div className="rx-report-field rx-report-field-wide">
            <label>{t('common.search')}</label>
            <input
              type="text"
              className="field-input"
              placeholder={t('prescriptions.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="rx-report-search-btn" onClick={loadReport} disabled={loading}>
            {loading ? <span className="rx-spinner" /> : t('common.search')}
          </button>
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="rx-report-kpis">
          <div className="rx-report-kpi rx-kpi-blue">
            <span>{t('prescriptions.prescribed')}</span>
            <strong>{fmt(totals.prescribed)}</strong>
          </div>
          <div className="rx-report-kpi rx-kpi-green">
            <span>{t('prescriptions.sold')}</span>
            <strong>{fmt(totals.sold)}</strong>
          </div>
          <div className="rx-report-kpi rx-kpi-amber">
            <span>{t('prescriptions.fulfillment')}</span>
            <strong>{totals.fulfillment}%</strong>
            <div className="rx-progress"><i style={{ width: `${Math.min(totals.fulfillment, 100)}%` }} /></div>
          </div>
          <div className="rx-report-kpi rx-kpi-violet">
            <span>{t('prescriptions.doctors')}</span>
            <strong>{fmt(totals.doctors)}</strong>
          </div>
        </div>
      )}

      {loaded && pager}

      <div className="rx-report-table-scroll">
        <table className="rx-report-table">
          <thead>
            <tr>
              <th>{t('common.month')}</th>
              <th>{t('common.employee')}</th>
              <th>{t('common.doctor')}</th>
              <th>{t('common.hospital')}</th>
              <th>{t('prescriptions.drug')}</th>
              <th className="num">{t('prescriptions.prescribed')}</th>
              <th className="num">{t('prescriptions.sold')}</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const pct = r.prescription ? Math.round(((r.sale || 0) / r.prescription) * 100) : 0
              return (
                <tr key={r._id}>
                  <td>{monthLabel(r.month)}</td>
                  <td>{r.employeeName || '—'}</td>
                  <td>
                    {r.doctorName || '—'}
                    {r.doctorNumber && <div className="rx-report-muted">{r.doctorNumber}</div>}
                  </td>
                  <td>{r.hospitalName || '—'}</td>
                  <td>{r.drugName || '—'}</td>
                  <td className="num">{fmt(r.prescription)}</td>
                  <td className="num">{fmt(r.sale)}</td>
                  <td className="num"><span className={`rx-pct ${pct >= 100 ? 'rx-good' : pct < 50 ? 'rx-bad' : 'rx-mid'}`}>{pct}%</span></td>
                </tr>
              )
            })}
            {loaded && visibleRows.length === 0 && (
              <tr>
                <td colSpan={8}>{t('common.noRecords')}</td>
              </tr>
            )}
          </tbody>
          {visibleRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5}>{t('common.totalCount', { n: visibleRows.length })}</td>
                <td className="num">{fmt(totals.prescribed)}</td>
                <td className="num">{fmt(totals.sold)}</td>
                <td className="num">{totals.fulfillment}%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pager}
    </div>
  )
}
