'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './EmployeeAccounts.css'

export default function EmployeeAccounts() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/employees').then(setEmployees).catch((err) => setError(err.message))
  }, [])

  async function load(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 100)
      if (search.trim()) params.set('search', search.trim())
      if (employeeId) params.set('employee', employeeId)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const result = await apiFetch(`/api/employee-accounts?${params}`)
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
    if (!confirm('წაშალოთ ეს ჩანაწერი?')) return
    try {
      await apiFetch(`/api/employee-accounts/${id}`, { method: 'DELETE' })
      load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="employee-accounts-page">
      <h1>თანამშრომლების ანგარიშები (Employee Accounts)</h1>

      <div className="employee-accounts-filters">
        <div className="employee-accounts-filters-grid">
          <div className="employee-accounts-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="employee-accounts-field">
            <label>ბოლო თარიღი</label>
            <input type="date" className="field-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="employee-accounts-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn employee-accounts-search-btn" onClick={() => load(1)} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>
        <input
          type="text"
          className="field-input"
          placeholder="ძებნა თანამშრომლის სახელით..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
          style={{ maxWidth: 280, marginTop: 14 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="employee-accounts-table-wrap">
        <table className="employee-accounts-table">
          <thead>
            <tr>
              <th>თარიღი</th>
              <th>თანამშრომელი</th>
              <th>სამიზნე თანხა</th>
              <th>გაყიდვა</th>
              <th>მიღწეული %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td data-label="თარიღი">{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                <td data-label="თანამშრომელი">{row.employeeName}</td>
                <td data-label="სამიზნე თანხა">{row.targetAmount}</td>
                <td data-label="გაყიდვა">{row.sale}</td>
                <td data-label="მიღწეული %">{row.percentAchieved}%</td>
                <td data-label="">
                  <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(row._id)}>
                    <span>წაშლა</span>
                  </button>
                </td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={6}>ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="employee-accounts-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span className="employee-accounts-pagination-info">
            {page} / {data.pages} ({data.total} სულ)
          </span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => load(page + 1)}>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}
