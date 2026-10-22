'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch, apiDownload } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './ReimbursementReport.css'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import '@/components/ExcelExportButton/ExcelExportButton.css'

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

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadOptions() {
      try {
        const e = await apiFetch('/api/employees')
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
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (employeeId) params.set('employee', employeeId)
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

  return (
    <div className="reimbursement-report">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{t('reimbursement.title')}</h1>
          <ExcelExportButton title={t('reimbursement.title')} tableSelector=".reimbursement-table" />
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

      <div className="reimbursement-table-scroll">
        <table className="reimbursement-table">
          <thead>
            <tr>
              <th>{t('reimbursement.period')}</th>
              <th>{t('reimbursement.performer')}</th>
              <th>{t('reimbursement.region')}</th>
              <th>{t('reimbursement.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.date).toLocaleDateString(localeTag(locale))}</td>
                <td>{r.employeeName}</td>
                <td>{r.regionName}</td>
                <td className="reimbursement-amount">{r.amount} ₾</td>
              </tr>
            ))}
            {loaded && visibleRows.length === 0 && (
              <tr>
                <td colSpan={4}>{t('common.noRecords')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
