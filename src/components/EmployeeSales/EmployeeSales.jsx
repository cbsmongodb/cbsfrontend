'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import EmployeeSaleModal from './EmployeeSaleModal'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './EmployeeSales.css'
import { useTranslations, useLocale } from 'next-intl'

const thIcon = { display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }
const IconBox = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#13608f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /><path d="m7.5 5.5 9 5" />
  </svg>
)
const IconMoney = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2f9e6e" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <text x="12" y="16.4" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#2f9e6e" stroke="none">₾</text>
  </svg>
)

const BOXES_HEAD = { ka: 'გაყიდული ყუთები', en: 'Boxes sold', ru: 'Продано упаковок' }
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import MonthPicker from '@/components/MonthPicker/MonthPicker'

export default function EmployeeSales() {
  const tu = useTranslations('ui')
  const tp = useTranslations('plannings')
  const tb = useTranslations('bonusesPage')
  const locale = useLocale()
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState('') // "YYYY-MM" or "" = all months

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    apiFetch('/api/employee-sales/employees').then(setEmployees).catch((err) => setError(err.message))
  }, [])

  async function load(targetPage = 1, size = pageSize, m = month) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', size)
      if (search.trim()) params.set('search', search.trim())
      if (employeeId) params.set('employee', employeeId)
      if (m) params.set('month', m)

      const result = await apiFetch(`/api/employee-sales?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete(id) {
    if (!confirm(tu('k147'))) return
    try {
      await apiFetch(`/api/employee-sales/${id}`, { method: 'DELETE' })
      load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="employee-sales-page">
      {loading && <ReportLoader variant="page" />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><h1>{tu('k148')}</h1>
        <button className="btn" onClick={() => { setEditId(null); setShowModal(true) }}><span>{tu('k149')}</span></button>
      </div>

      <div className="employee-sales-filters">
        <div className="employee-sales-filters-grid">
          <div className="employee-sales-field">
            <label>{tb('month')}</label>
            <MonthPicker value={month} onChange={(m) => { setMonth(m); load(1, pageSize, m) }} />
          </div>
          <div className="employee-sales-field">
            <label>{tu('k044')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={tu('k092')}
            />
          </div>
          <button type="button" className="btn employee-sales-search-btn" onClick={() => load(1)} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : tu('k093')}</span>
          </button>
        </div>
        <input
          type="text"
          className="field-input"
          placeholder={tu('k139')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
          style={{ maxWidth: 280, marginTop: 14 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="employee-sales-table-wrap">
        <table className="employee-sales-table">
          <thead>
            <tr>
              <th>{tu('k096')}</th>
              <th>{tu('k044')}</th>
              <th><span style={thIcon}><IconMoney />{tu('k150')}</span></th>
              <th><span style={thIcon}><IconBox />{BOXES_HEAD[locale] || BOXES_HEAD.ka}</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td data-label={tu('k096')}>{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                <td data-label={tu('k044')}>{row.employeeName}</td>
                <td data-label={tu('k150')}>{row.saleAmount}</td>
                <td data-label={BOXES_HEAD[locale] || BOXES_HEAD.ka}>{(row.saleBoxes || 0).toLocaleString('en-US')}</td>
                <td data-label="">
                  <button className="btn-gray btn-sm" onClick={() => { setEditId(row._id); setShowModal(true) }}><span>{tu('k101')}</span></button>
                  <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(row._id)}>
                    <span>{tu('k069')}</span>
                  </button>
                </td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={5}>{tu('k102')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="employee-sales-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1 || loading} onClick={() => load(1)} title="1">
            <span>«</span>
          </button>
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span className="employee-sales-pagination-info">
            {page} / {data.pages} ({data.total} {tu('k103')}
          </span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages || loading} onClick={() => load(page + 1)}>
            <span>→</span>
          </button>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages || loading} onClick={() => load(data.pages)} title={String(data.pages)}>
            <span>»</span>
          </button>
          <span className="employee-sales-pagination-size">
            {tp('showCount.prefix')}{' '}
            <select
              value={pageSize}
              onChange={(e) => {
                const size = Number(e.target.value)
                setPageSize(size)
                load(1, size)
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>{' '}
            {tp('showCount.suffix')}
          </span>
        </div>
      )}
    
      {showModal && (
        <EmployeeSaleModal
          employees={employees}
          editId={editId}
          onClose={() => { setShowModal(false); setEditId(null) }}
          onSaved={() => load(1)}
        />
      )}
    </div>
  )
}