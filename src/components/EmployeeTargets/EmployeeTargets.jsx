'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './EmployeeTargets.css'
import EmployeeTargetModal from './EmployeeTargetModal'
import { useTranslations } from 'next-intl'
import ReportLoader from '@/components/ReportLoader/ReportLoader'

// add / edit / delete buttons only when the role really allows it
function readPerms() {
  try {
    const emp = JSON.parse(localStorage.getItem('employee') || 'null')
    if (emp?.role?.name?.toLowerCase() === 'admin') {
      return { add: true, update: true, delete: true }
    }
    const p = emp?.role?.privileges?.employee_targets || {}
    return { add: p.add === 1, update: p.update === 1, delete: p.delete === 1 }
  } catch {
    return { add: false, update: false, delete: false }
  }
}

export default function EmployeeTargets() {
  const tu = useTranslations('ui')
  const tp = useTranslations('plannings')
  const tm = useTranslations('enteredRx')
  // oneMonthFilter: pick one month instead of from / to dates
  const nowD = new Date()
  const [month, setMonth] = useState(
    `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}`
  )
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)

  const [perms, setPerms] = useState({ add: false, update: false, delete: false })
  useEffect(() => {
    setPerms(readPerms())
    apiFetch('/api/auth/me')
      .then((fresh) => {
        if (!fresh?.role) return
        try {
          const base = JSON.parse(localStorage.getItem('employee') || '{}') || {}
          localStorage.setItem('employee', JSON.stringify({ ...base, role: fresh.role }))
        } catch { /* ignore */ }
        setPerms(readPerms())
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiFetch('/api/employees?lite=1').then(setEmployees).catch((err) => setError(err.message))
  }, [])

  async function load(targetPage = 1, size = pageSize) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', size)
      if (search.trim()) params.set('search', search.trim())
      if (employeeId) params.set('employee', employeeId)
      if (month) params.set('month', month)

      const result = await apiFetch(`/api/employee-targets?${params}`)
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
    if (!confirm(tu('k136'))) return
    try {
      await apiFetch(`/api/employee-targets/${id}`, { method: 'DELETE' })
      load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="employee-targets-page">
      {loading && <ReportLoader variant="page" />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><h1>{tu('k137')}</h1>
        {perms.add && <button className="btn" onClick={() => { setEditId(null); setShowModal(true) }}><span>{tu('k138')}</span></button>}
      </div>

      <div className="employee-targets-filters">
        <div className="employee-targets-filters-grid">
          <div className="employee-targets-field">
            <label>{tm('month')}</label>
            <input type="month" className="field-input" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="employee-targets-field">
            <label>{tu('k044')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={tu('k092')}
            />
          </div>
          <button type="button" className="btn employee-targets-search-btn" onClick={() => load(1)} disabled={loading}>
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

      <div className="employee-targets-table-wrap">
        <table className="employee-targets-table">
          <thead>
            <tr>
              <th>{tu('k096')}</th>
              <th>{tu('k044')}</th>
              <th>{tu('k140')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td data-label={tu('k096')}>{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                <td data-label={tu('k044')}>{row.employeeName}</td>
                <td data-label={tu('k140')}>{row.targetAmount}</td>
                <td data-label="">
                  {perms.update && (
                    <button className="btn-gray btn-sm" onClick={() => { setEditId(row._id); setShowModal(true) }}>
                      <span>{tu('k101')}</span>
                    </button>
                  )}
                  {perms.delete && (
                    <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(row._id)}>
                      <span>{tu('k069')}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={4}>{tu('k102')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="employee-targets-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1 || loading} onClick={() => load(1)} title="1">
            <span>«</span>
          </button>
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span className="employee-targets-pagination-info">
            {page} / {data.pages} ({data.total} {tu('k103')}
          </span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages || loading} onClick={() => load(page + 1)}>
            <span>→</span>
          </button>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages || loading} onClick={() => load(data.pages)} title={String(data.pages)}>
            <span>»</span>
          </button>
          <span className="employee-targets-pagination-size">
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
        <EmployeeTargetModal
          employees={employees}
          editId={editId}
          onClose={() => { setShowModal(false); setEditId(null) }}
          onSaved={() => load(1)}
        />
      )}
    </div>
  )
}