'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import './BudgetAllotment.css'

function fmtMoney(n) {
  const num = Number(n) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function BudgetAllotment() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/employees')
      .then(setEmployees)
      .catch((err) => setError(err.message))
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (employeeId) params.set('employee_id', employeeId)
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      const result = await apiFetch(`/api/budgets/allotment?${params}`)
      setData(result)
      if (!employeeId) setEmployeeId('') // keep as-is; server defaulted to logged-in employee
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredDocs = (data?.docs || []).filter(
    (row) => !search || row.doctorName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="budgetallot-page">
      <h1>Budget Allotment</h1>

      {error && <p className="resource-error">{error}</p>}

      <div className="budgetallot-kpi-row">
        <div className="budgetallot-kpi-card">
          <span className="budgetallot-kpi-value">{data ? fmtMoney(data.totalPaidAmount) : '0'}</span>
          <span className="budgetallot-kpi-label">Total Paid Amount</span>
        </div>
        <div className="budgetallot-kpi-card">
          <span className="budgetallot-kpi-value">{data ? fmtMoney(data.totalTargetAmount) : '0'}</span>
          <span className="budgetallot-kpi-label">Total Target Amount</span>
        </div>
        <div className="budgetallot-kpi-card">
          <span className="budgetallot-kpi-value">{data ? fmtMoney(data.totalSalesAmount) : '0'}</span>
          <span className="budgetallot-kpi-label">Total Sales Amount</span>
        </div>
        <div className="budgetallot-kpi-card">
          <span className="budgetallot-kpi-value">{data ? fmtMoney(data.totalPrescriptionAmount) : '0'}</span>
          <span className="budgetallot-kpi-label">Prescription Amount</span>
        </div>
      </div>

      <div className="budgetallot-filters">
        <div className="budgetallot-field">
          <label>Start Date</label>
          <input type="date" className="field-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="budgetallot-field">
          <label>End Date</label>
          <input type="date" className="field-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="budgetallot-field budgetallot-field-grow">
          <label>Employee</label>
          <SearchableSelect
            options={employees}
            value={employeeId}
            onChange={setEmployeeId}
            getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
            placeholder="ჩემი ანგარიში"
          />
        </div>
        <button type="button" className="btn budgetallot-submit-btn" onClick={load} disabled={loading}>
          <span>{loading ? '...' : 'Submit'}</span>
        </button>
      </div>

      <div className="budgetallot-chart-card">
        {data?.chartData?.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(data.chartData.length * 42, 200)}>
            <RBarChart data={data.chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="allotBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3f74d6" />
                  <stop offset="100%" stopColor="#2f9e6e" />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} stroke="#eceef2" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fontWeight: 600, fill: '#0f2744' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" name="Paid Amount" fill="url(#allotBarGradient)" radius={[0, 8, 8, 0]} maxBarSize={22} />
            </RBarChart>
          </ResponsiveContainer>
        ) : (
          <p className="budgetallot-no-chart">No data available for chart.</p>
        )}
      </div>

      <h3 className="budgetallot-table-title">Employee Budgets of {data?.employeeName || '...'}:</h3>

      <input
        type="text"
        className="field-input budgetallot-search"
        placeholder="ძებნა ექიმის სახელით..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="budgetallot-table-wrap">
        <table className="budgetallot-table">
          <thead>
            <tr>
              <th>Budget ID</th>
              <th>Date</th>
              <th>Doctor</th>
              <th>Doctor ID</th>
              <th>Paid Amount</th>
              <th>Advance Amount</th>
              <th>Sales Amount</th>
              <th>Delta Amount</th>
              <th>Target Amount</th>
              <th>Prescription Amount</th>
              <th>Is Active</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((row) => (
              <tr key={row._id}>
                <td>{row._id.slice(-6)}</td>
                <td>{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                <td>{row.doctorName}</td>
                <td>{row.doctorUniqueNumber}</td>
                <td>{fmtMoney(row.paidAmount)}</td>
                <td>{fmtMoney(row.advanceAmount)}</td>
                <td>{fmtMoney(row.salesAmount)}</td>
                <td>{fmtMoney(row.deltaAmount)}</td>
                <td>{fmtMoney(row.targetAmount)}</td>
                <td>{fmtMoney(row.prescriptionAmt)}</td>
                <td>{row.isActive ? '✓' : '✕'}</td>
              </tr>
            ))}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={11}>No data available in table</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="budgetallot-showing">
        Showing {filteredDocs.length ? 1 : 0} to {filteredDocs.length} of {filteredDocs.length} entries
      </p>
    </div>
  )
}
