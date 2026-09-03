'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './ReimbursementReport.css'

function toInputDate(d) {
  return d.toISOString().slice(0, 10)
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
  const [employees, setEmployees] = useState([])

  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
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
      <h1>ტრანსპორტის ანაზღაურების რეპორტი</h1>

      <div className="reimbursement-filters-card">
        <div className="reimbursement-filters-grid">
          <div className="reimbursement-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="reimbursement-field">
            <label>ბოლო ვადა</label>
            <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="reimbursement-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn reimbursement-search-btn" onClick={loadReport} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>

        <input
          type="text"
          className="field-input"
          placeholder="ძიება (თანამშრომელი, რეგიონი)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginTop: 12, width: '100%', maxWidth: 320 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="reimbursement-summary">
          <div className="reimbursement-summary-item highlight">
            <span>{totals.totalAmount.toLocaleString('ka-GE')} ₾</span>
            <label>ჯამური ანაზღაურება</label>
          </div>
          <div className="reimbursement-summary-item">
            <span>{totals.rows}</span>
            <label>ჩანაწერი</label>
          </div>
          <div className="reimbursement-summary-item">
            <span>{totals.uniqueEmployees}</span>
            <label>თანამშრომელი</label>
          </div>
        </div>
      )}

      <div className="reimbursement-table-scroll">
        <table className="reimbursement-table">
          <thead>
            <tr>
              <th>პერიოდი</th>
              <th>შემსრულებელი</th>
              <th>რეგიონი</th>
              <th>ანაზღაურების თანხა</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.date).toLocaleDateString('ka-GE')}</td>
                <td>{r.employeeName}</td>
                <td>{r.regionName}</td>
                <td className="reimbursement-amount">{r.amount} ₾</td>
              </tr>
            ))}
            {loaded && visibleRows.length === 0 && (
              <tr>
                <td colSpan={4}>ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
