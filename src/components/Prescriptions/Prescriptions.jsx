'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './Prescriptions.css'

export default function Prescriptions() {
  const [employees, setEmployees] = useState([])
  const [doctors, setDoctors] = useState([])

  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOptions() {
      try {
        const [e, d] = await Promise.all([apiFetch('/api/employees'), apiFetch('/api/doctors')])
        setEmployees(e)
        setDoctors(d)
      } catch (err) {
        setError(err.message)
      }
    }
    loadOptions()
  }, [])

  async function loadPrescriptions(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 25)
      params.set('isActive', showInactive ? 'false' : 'true')
      if (search.trim()) params.set('search', search.trim())
      if (employeeId) params.set('employee', employeeId)
      if (doctorId) params.set('doctor', doctorId)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const result = await apiFetch(`/api/prescriptions?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrescriptions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleToggleActive(id) {
    try {
      await apiFetch(`/api/prescriptions/${id}/toggle-active`, { method: 'PUT' })
      loadPrescriptions(page)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('წაშალოთ ეს დანიშნულება?')) return
    try {
      await apiFetch(`/api/prescriptions/${id}`, { method: 'DELETE' })
      loadPrescriptions(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="prescriptions-page">
      <h1>დანიშნულებები (Prescriptions)</h1>

      <div className="prescriptions-filters">
        <div className="prescriptions-filters-grid">
          <div className="prescriptions-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="prescriptions-field">
            <label>ბოლო თარიღი</label>
            <input type="date" className="field-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="prescriptions-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <div className="prescriptions-field">
            <label>ექიმი</label>
            <SearchableSelect
              options={doctors}
              value={doctorId}
              onChange={setDoctorId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn prescriptions-search-btn" onClick={() => loadPrescriptions(1)} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>

        <div className="prescriptions-quicksearch-row">
          <input
            type="text"
            className="field-input"
            placeholder="ძებნა თანამშრომლის, ექიმის ან წამლის სახელით..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPrescriptions(1)}
          />
          <label className="prescriptions-inactive-toggle">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked)
              }}
            />
            არააქტიურების ჩვენება
          </label>
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="prescriptions-table-wrap">
        <table className="prescriptions-table">
          <thead>
            <tr>
              <th>#</th>
              <th>თარიღი</th>
              <th>ექიმი</th>
              <th>თანამშრომელი</th>
              <th>წამალი</th>
              <th>სულ ყუთი</th>
              <th>აქტიური</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td data-label="#">{row._id.slice(-6)}</td>
                <td data-label="თარიღი">{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                <td data-label="ექიმი" className={row.doctorIsBudgeted ? 'prescriptions-doctor-budgeted' : ''}>
                  {row.doctorName}
                </td>
                <td data-label="თანამშრომელი">{row.employeeName}</td>
                <td data-label="წამალი" className="prescriptions-drug-cell">{row.drugDetails || '—'}</td>
                <td data-label="სულ ყუთი">{row.totalBoxes}</td>
                <td data-label="აქტიური">
                  <button
                    type="button"
                    className={`prescriptions-active-toggle ${row.isActive ? 'is-on' : ''}`}
                    onClick={() => handleToggleActive(row._id)}
                    title={row.isActive ? 'გამორთვა' : 'ჩართვა'}
                  >
                    <span />
                  </button>
                </td>
                <td data-label="">
                  <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(row._id)}>
                    <span>წაშლა</span>
                  </button>
                </td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={8}>ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="prescriptions-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => loadPrescriptions(page - 1)}>
            <span>←</span>
          </button>
          <span className="prescriptions-pagination-info">
            {page} / {data.pages} ({data.total} სულ)
          </span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => loadPrescriptions(page + 1)}>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}