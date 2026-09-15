'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './DoctorTargets.css'

export default function DoctorTargets() {
  const [doctors, setDoctors] = useState([])
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch('/api/doctors'), apiFetch('/api/employees')])
      .then(([d, e]) => {
        setDoctors(d)
        setEmployees(e)
      })
      .catch((err) => setError(err.message))
  }, [])

  async function load(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 100)
      if (search.trim()) params.set('search', search.trim())
      if (doctorId) params.set('doctor', doctorId)
      if (employeeId) params.set('employee', employeeId)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const result = await apiFetch(`/api/doctor-targets?${params}`)
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
    if (!confirm('წაშალოთ ეს სამიზნე?')) return
    try {
      await apiFetch(`/api/doctor-targets/${id}`, { method: 'DELETE' })
      load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="doctor-targets-page">
      <h1>ექიმების სამიზნეები (Doctor Target)</h1>

      <div className="doctor-targets-filters">
        <div className="doctor-targets-filters-grid">
          <div className="doctor-targets-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="doctor-targets-field">
            <label>ბოლო თარიღი</label>
            <input type="date" className="field-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="doctor-targets-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <div className="doctor-targets-field">
            <label>ექიმი</label>
            <SearchableSelect
              options={doctors}
              value={doctorId}
              onChange={setDoctorId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn doctor-targets-search-btn" onClick={() => load(1)} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>
        <input
          type="text"
          className="field-input"
          placeholder="ძებნა ექიმის ან თანამშრომლის სახელით..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
          style={{ maxWidth: 280, marginTop: 14 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="doctor-targets-table-wrap">
        <table className="doctor-targets-table">
          <thead>
            <tr>
              <th>თარიღი</th>
              <th>ექიმი</th>
              <th>თანამშრომელი</th>
              <th>სამიზნე თანხა</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td data-label="თარიღი">{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                <td data-label="ექიმი">{row.doctorName}</td>
                <td data-label="თანამშრომელი">{row.employeeName}</td>
                <td data-label="სამიზნე თანხა">{row.targetAmount}</td>
                <td data-label="">
                  <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(row._id)}>
                    <span>წაშლა</span>
                  </button>
                </td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={5}>ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="doctor-targets-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span className="doctor-targets-pagination-info">
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
