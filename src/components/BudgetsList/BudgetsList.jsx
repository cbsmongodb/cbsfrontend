'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './BudgetsList.css'

function fmtMoney(n) {
  const num = Number(n) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BudgetsList() {
  const [doctors, setDoctors] = useState([])
  const [employees, setEmployees] = useState([])
  const [sections, setSections] = useState([])
  const [groups, setGroups] = useState([])

  const [search, setSearch] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/api/doctors'),
      apiFetch('/api/employees'),
      apiFetch('/api/admin/sections'),
      apiFetch('/api/admin/groups'),
    ])
      .then(([d, e, s, g]) => {
        setDoctors(d)
        setEmployees(e)
        setSections(s)
        setGroups(g)
      })
      .catch((err) => setError(err.message))
  }, [])

  async function load(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 50)
      params.set('isActive', showInactive ? 'false' : 'true')
      if (search.trim()) params.set('search', search.trim())
      if (doctorId) params.set('doctor', doctorId)
      if (employeeId) params.set('employee', employeeId)
      if (sectionId) params.set('section', sectionId)
      if (groupId) params.set('group', groupId)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const result = await apiFetch(`/api/budgets-list?${params}`)
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

  async function handleToggleActive(id) {
    try {
      await apiFetch(`/api/budgets-list/${id}/toggle-active`, { method: 'PUT' })
      load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('წაშალოთ ეს ბიუჯეტის ჩანაწერი?')) return
    try {
      await apiFetch(`/api/budgets-list/${id}`, { method: 'DELETE' })
      load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="budgets-list-page">
      <h1>ბიუჯეტები (Budgets)</h1>

      <div className="budgets-list-filters">
        <div className="budgets-list-filters-grid">
          <div className="budgets-list-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="budgets-list-field">
            <label>ბოლო თარიღი</label>
            <input type="date" className="field-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="budgets-list-field">
            <label>დივიზიონი</label>
            <SearchableSelect
              options={sections}
              value={sectionId}
              onChange={(v) => {
                setSectionId(v)
                setGroupId('')
              }}
              getLabel={(o) => o.name}
              placeholder="ყველა"
            />
          </div>
          <div className="budgets-list-field">
            <label>ჯგუფი</label>
            <SearchableSelect
              options={groups}
              value={groupId}
              onChange={setGroupId}
              getLabel={(o) => o.name}
              placeholder="ყველა"
            />
          </div>
          <div className="budgets-list-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <div className="budgets-list-field">
            <label>ექიმი</label>
            <SearchableSelect
              options={doctors}
              value={doctorId}
              onChange={setDoctorId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn budgets-list-search-btn" onClick={() => load(1)} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>
        <div className="budgets-list-quicksearch-row">
          <input
            type="text"
            className="field-input"
            placeholder="ძებნა ექიმის, თანამშრომლის ან ექიმის ნომრით..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
          />
          <label className="budgets-list-inactive-toggle">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            არააქტიურების ჩვენება
          </label>
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="budgets-list-table-wrap">
        <table className="budgets-list-table">
          <thead>
            <tr>
              <th>თარიღი</th>
              <th>ექიმი</th>
              <th>პროფილი</th>
              <th>ნომერი</th>
              <th>ჰოსპიტალი</th>
              <th>თანამშრომელი</th>
              <th>დივიზიონი</th>
              <th>ჯგუფი</th>
              <th>რეგიონი</th>
              <th>გადასახდელი</th>
              <th>გადახდილი</th>
              <th>ავანსი</th>
              <th>სამიზნე</th>
              <th>დანიშნულება</th>
              <th>გაყიდვა</th>
              <th>აქტიური</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td data-label="თარიღი">{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                <td data-label="ექიმი" className={row.doctorIsBudgeted ? 'budgets-list-doctor-budgeted' : ''}>
                  {row.doctorName}
                </td>
                <td data-label="პროფილი">{row.profileName}</td>
                <td data-label="ნომერი">{row.uniqueNumber}</td>
                <td data-label="ჰოსპიტალი" className="budgets-list-hospitals">{row.hospitals}</td>
                <td data-label="თანამშრომელი">{row.employeeName}</td>
                <td data-label="დივიზიონი">{row.sectionName}</td>
                <td data-label="ჯგუფი">{row.groupName}</td>
                <td data-label="რეგიონი">{row.regionName}</td>
                <td data-label="გადასახდელი" className="budgets-list-num">{fmtMoney(row.payableAmt)}</td>
                <td data-label="გადახდილი" className="budgets-list-num budgets-list-paid">{fmtMoney(row.paidAmount)}</td>
                <td data-label="ავანსი" className="budgets-list-num">{fmtMoney(row.advanceAmount)}</td>
                <td data-label="სამიზნე" className="budgets-list-num">{fmtMoney(row.targetAmount)}</td>
                <td data-label="დანიშნულება" className="budgets-list-num">{fmtMoney(row.prescriptionAmt)}</td>
                <td data-label="გაყიდვა" className="budgets-list-num budgets-list-sales">{fmtMoney(row.salesAmount)}</td>
                <td data-label="აქტიური">
                  <button
                    type="button"
                    className={`budgets-list-active-toggle ${row.isActive ? 'is-on' : ''}`}
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
                <td colSpan={17}>ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="budgets-list-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span className="budgets-list-pagination-info">
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
