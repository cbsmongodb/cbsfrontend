'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './StaffPerformanceReport.css'

const LOCALE_TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }
const localeTag = (locale) => LOCALE_TAG[locale] || 'ka-GE'

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function defaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10)
}

export default function StaffPerformanceReport() {
  const t = useTranslations('reports')
  const locale = useLocale()
  const [mode, setMode] = useState('month')
  const [month, setMonth] = useState(currentMonthValue())
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  const [sections, setSections] = useState([])
  const [groups, setGroups] = useState([])
  const [employees, setEmployees] = useState([])

  const [sectionId, setSectionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOptions() {
      apiFetch('/api/admin/sections').then(setSections).catch(() => setSections([]))
      apiFetch('/api/admin/groups').then(setGroups).catch(() => setGroups([]))
      try {
        const e = await apiFetch('/api/employees')
        setEmployees(e)
      } catch (err) {
        setError(err.message)
      }
    }
    loadOptions()
  }, [])

  async function loadReport(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 25)
      if (mode === 'month') {
        params.set('mode', 'month')
        params.set('month', month)
      } else {
        params.set('mode', 'range')
        if (from) params.set('from', from)
        if (to) params.set('to', to)
      }
      if (sectionId) params.set('section', sectionId)
      if (groupId) params.set('group', groupId)
      if (employeeId) params.set('employee', employeeId)

      const result = await apiFetch(`/api/reports/staff-performance?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isMonthMode = data?.mode === 'month'

  return (
    <div className="staff-performance">
      <h1>{t('staff.title')}</h1>

      <div className="staff-performance-filters">
        <div className="staff-performance-mode-toggle">
          <button
            type="button"
            className={mode === 'month' ? 'active' : ''}
            onClick={() => setMode('month')}
          >{t('staff.byMonth')}</button>
          <button
            type="button"
            className={mode === 'range' ? 'active' : ''}
            onClick={() => setMode('range')}
          >{t('staff.byRange')}</button>
        </div>

        <div className="staff-performance-filters-grid">
          {mode === 'month' ? (
            <div className="staff-performance-field">
              <label>{t('common.month')}</label>
              <input type="month" className="field-input" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="staff-performance-field">
                <label>{t('common.startDate')}</label>
                <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="staff-performance-field">
                <label>{t('common.endDate')}</label>
                <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}

          {sections.length > 0 && (
            <div className="staff-performance-field">
              <label>{t('common.division')}</label>
              <SearchableSelect
                options={sections}
                value={sectionId}
                onChange={(v) => { setSectionId(v); setGroupId('') }}
                getLabel={(o) => o.name}
                placeholder={t('common.all')}
              />
            </div>
          )}

          {groups.length > 0 && (
            <div className="staff-performance-field">
              <label>{t('common.group')}</label>
              <SearchableSelect
                options={groups}
                value={groupId}
                onChange={setGroupId}
                getLabel={(o) => o.name}
                placeholder={t('common.all')}
              />
            </div>
          )}

          <div className="staff-performance-field">
            <label>{t('common.employee')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={t('common.all')}
            />
          </div>

          <button type="button" className="btn staff-performance-search-btn" onClick={() => loadReport(1)} disabled={loading}>
            <span>{loading ? '...' : t('common.search')}</span>
          </button>
        </div>

        {mode === 'range' && (
          <p className="staff-performance-hint">{t('staff.rangeHint')}</p>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="staff-performance-table-wrap">
        <table className="staff-performance-table">
          <thead>
            <tr>
              <th>{t('common.employee')}</th>
              <th>{t('staff.visitsCount')}</th>
              <th>{t('staff.doctorsVisited')}</th>
              <th>{t('staff.paidAmount')}</th>
              {isMonthMode && (
                <>
                  <th>{t('staff.prescriptionAmount')}</th>
                  <th>{t('staff.targetAmount')}</th>
                  <th>{t('staff.salesAmount')}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row.employeeId}>
                <td data-label={t('common.employee')}>{row.employeeName}</td>
                <td data-label={t('staff.visitsCount')}>{row.visits}</td>
                <td data-label={t('staff.doctorsVisited')}>{row.doctorsVisited}</td>
                <td data-label={t('staff.paidAmount')}>{row.totalPaidAmount}</td>
                {isMonthMode && (
                  <>
                    <td data-label={t('staff.prescriptionAmount')}>{row.totalPrescriptionAmount}</td>
                    <td data-label={t('staff.targetAmount')}>{row.targetAmount}</td>
                    <td data-label={t('staff.salesAmount')}>{row.salesAmount}</td>
                  </>
                )}
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={isMonthMode ? 7 : 4}>{t('common.noRecordsFilter')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="staff-performance-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => loadReport(page - 1)}>
            <span>←</span>
          </button>
          <span className="staff-performance-pagination-info">
            {page} / {data.pages}
          </span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => loadReport(page + 1)}>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}