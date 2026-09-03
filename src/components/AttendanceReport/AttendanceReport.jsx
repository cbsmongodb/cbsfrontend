'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './AttendanceReport.css'

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

const STATUS_LABELS = {
  ontime: 'დროულად',
  late_checkin: 'გვიანი ჩექინი',
  early_checkout: 'ადრეული ჩექაუთი',
}

const STATUS_COLORS = {
  ontime: '#16a34a',
  late_checkin: '#dc2626',
  early_checkout: '#f59e0b',
}

const TYPE_LABELS = {
  checkin: 'ჩექინი',
  checkout: 'ჩექაუთი',
}

export default function AttendanceReport() {
  const [employees, setEmployees] = useState([])

  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [employeeId, setEmployeeId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
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
      const data = await apiFetch(`/api/reports/attendances?${params}`)
      setRows(data)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const visibleRows = useMemo(() => {
    let list = rows
    if (statusFilter) list = list.filter((r) => r.attendanceStatus === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) => r.employeeName.toLowerCase().includes(q) || (r.address || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, statusFilter, search])

  const statusCounts = useMemo(() => {
    const c = { ontime: 0, late_checkin: 0, early_checkout: 0 }
    rows.forEach((r) => {
      if (c[r.attendanceStatus] != null) c[r.attendanceStatus]++
    })
    return c
  }, [rows])

  return (
    <div className="attendance-report">
      <h1>დასწრების რეპორტი</h1>

      <div className="attendance-report-filters-card">
        <div className="attendance-report-filters-grid">
          <div className="attendance-report-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="attendance-report-field">
            <label>ბოლო ვადა</label>
            <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="attendance-report-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn attendance-report-search-btn" onClick={loadReport} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>

        <input
          type="text"
          className="field-input"
          placeholder="ძიება (თანამშრომელი, მისამართი)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginTop: 12, width: '100%', maxWidth: 320 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="attendance-report-filters-pills">
          <button
            type="button"
            className={`attendance-report-pill ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            ყველა <span>{rows.length}</span>
          </button>
          {Object.keys(STATUS_LABELS).map((key) => (
            <button
              key={key}
              type="button"
              className={`attendance-report-pill ${statusFilter === key ? 'active' : ''}`}
              onClick={() => setStatusFilter(key)}
              style={statusFilter === key ? { background: STATUS_COLORS[key], borderColor: STATUS_COLORS[key] } : {}}
            >
              {STATUS_LABELS[key]} <span>{statusCounts[key] || 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="attendance-report-table-scroll">
        <table className="attendance-report-table">
          <thead>
            <tr>
              <th>თანამშრომელი</th>
              <th>დასწრების დრო</th>
              <th>ტიპი</th>
              <th>მისამართი</th>
              <th>სტატუსი</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => (
              <tr key={r._id}>
                <td>{r.employeeName}</td>
                <td>{new Date(r.attendanceTime).toLocaleString('ka-GE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>{TYPE_LABELS[r.attendanceType] || r.attendanceType}</td>
                <td>{r.address || '—'}</td>
                <td>
                  <span className="attendance-report-status-badge" style={{ color: STATUS_COLORS[r.attendanceStatus] }}>
                    {STATUS_LABELS[r.attendanceStatus] || r.attendanceStatus}
                  </span>
                </td>
              </tr>
            ))}
            {loaded && visibleRows.length === 0 && (
              <tr>
                <td colSpan={5}>ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
