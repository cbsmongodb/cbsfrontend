'use client'

import { useEffect, useState, Fragment } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import './Analytics.css'

function BreakdownTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="analytics-breakdown-tooltip">
      <div className="analytics-breakdown-tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="analytics-breakdown-tooltip-row">
          <span className="analytics-breakdown-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}</span>
          <strong>{Number(p.value).toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

function coefficientLevel(pct) {
  if (pct >= 80) return 'high'
  if (pct >= 40) return 'mid'
  return 'low'
}

function DrugBreakdownTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className="analytics-breakdown-empty">ამ პერიოდში წამლის მონაცემი არ არის</p>
  }

  const totalPrescription = rows.reduce((s, d) => s + (d.prescriptionAmount || 0), 0)
  const totalSales = rows.reduce((s, d) => s + (d.salesAmount || 0), 0)
  const totalPayable = rows.reduce((s, d) => s + (d.payableAmount || 0), 0)
  const chartHeight = Math.max(rows.length * 40, 140)

  return (
    <div className="analytics-breakdown-panel">
      <div className="analytics-breakdown-kpis">
        <div className="analytics-breakdown-kpi">
          <span className="analytics-breakdown-kpi-label">დანიშნულება</span>
          <span className="analytics-breakdown-kpi-value">{fmtMoney(totalPrescription)}</span>
        </div>
        <div className="analytics-breakdown-kpi">
          <span className="analytics-breakdown-kpi-label">გაყიდვა</span>
          <span className="analytics-breakdown-kpi-value">{fmtMoney(totalSales)}</span>
        </div>
        <div className="analytics-breakdown-kpi">
          <span className="analytics-breakdown-kpi-label">გადასახდელი</span>
          <span className="analytics-breakdown-kpi-value">{fmtMoney(totalPayable)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <RBarChart data={rows} margin={{ top: 4, right: 12, bottom: 60, left: 4 }} barCategoryGap="32%" barGap={3}>
          <defs>
            <linearGradient id="breakdownSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3f74d6" />
              <stop offset="100%" stopColor="#2f9e6e" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e5e8ee" />
          <XAxis
            dataKey="drugName"
            tick={{ fontSize: 10.5, fontWeight: 600, fill: '#5b6b82' }}
            axisLine={false}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={70}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
          <Tooltip content={<BreakdownTooltip />} cursor={{ fill: 'rgba(63, 116, 214, 0.05)' }} />
          <Legend verticalAlign="top" align="left" height={24} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10.5, fontWeight: 600, color: '#5b6b82' }} />
          <Bar dataKey="prescriptionAmount" name="დანიშნულება" fill="#c3cad4" radius={[5, 5, 0, 0]} maxBarSize={22} />
          <Bar dataKey="salesAmount" name="გაყიდვა" fill="url(#breakdownSalesGradient)" radius={[5, 5, 0, 0]} maxBarSize={22} />
        </RBarChart>
      </ResponsiveContainer>

      <div className="analytics-breakdown-chips">
        {rows.map((d, i) => (
          <div className="analytics-breakdown-chip" key={i}>
            <span className="analytics-breakdown-chip-name">{d.drugName}</span>
            <span className={`analytics-coef-badge analytics-coef-${coefficientLevel(d.coefficient)}`}>{d.coefficient}%</span>
            {d.bonus > 0 && <span className="analytics-breakdown-chip-bonus">ბონუსი {fmtMoney(d.bonus)}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function currentMonthRange() {
  const d = new Date()
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

function fmtMoney(n) {
  const num = Number(n) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Analytics() {
  const defaults = currentMonthRange()

  const [expandedRows, setExpandedRows] = useState(new Set())
  const [doctors, setDoctors] = useState([])
  const [employees, setEmployees] = useState([])
  const [sections, setSections] = useState([])
  const [groups, setGroups] = useState([])

  const [search, setSearch] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [fromDate, setFromDate] = useState(defaults.from)
  const [toDate, setToDate] = useState(defaults.to)

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
      if (search.trim()) params.set('search', search.trim())
      if (doctorId) params.set('doctor', doctorId)
      if (employeeId) params.set('employee', employeeId)
      if (sectionId) params.set('section', sectionId)
      if (groupId) params.set('group', groupId)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const result = await apiFetch(`/api/analytics?${params}`)
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

  return (
    <div className="analytics-page">
      <h1>ანალიტიკა (Analytics)</h1>

      <div className="analytics-filters">
        <div className="analytics-filters-grid">
          <div className="analytics-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="analytics-field">
            <label>ბოლო თარიღი</label>
            <input type="date" className="field-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="analytics-field">
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
          <div className="analytics-field">
            <label>ჯგუფი</label>
            <SearchableSelect
              options={groups}
              value={groupId}
              onChange={setGroupId}
              getLabel={(o) => o.name}
              placeholder="ყველა"
            />
          </div>
          <div className="analytics-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <div className="analytics-field">
            <label>ექიმი</label>
            <SearchableSelect
              options={doctors}
              value={doctorId}
              onChange={setDoctorId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn analytics-search-btn" onClick={() => load(1)} disabled={loading}>
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
          style={{ maxWidth: 300, marginTop: 14 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr className="analytics-group-row">
              <th rowSpan={2}></th>
              <th rowSpan={2}>თარიღი</th>
              <th rowSpan={2}>თანამშრომელი</th>
              <th rowSpan={2}>ექიმი</th>
              <th rowSpan={2}>ვიზიტები</th>
              <th colSpan={2} className="analytics-group-target">სამიზნე</th>
              <th colSpan={2} className="analytics-group-prescription">დანიშნულება</th>
              <th colSpan={2} className="analytics-group-sales">გაყიდვა</th>
              <th rowSpan={2}>გადასახდელი</th>
              <th rowSpan={2}>გადახდილი</th>
              <th rowSpan={2}>დელტა</th>
            </tr>
            <tr>
              <th className="analytics-group-target">თანხა</th>
              <th className="analytics-group-target">ყუთი</th>
              <th className="analytics-group-prescription">თანხა</th>
              <th className="analytics-group-prescription">ყუთი</th>
              <th className="analytics-group-sales">თანხა</th>
              <th className="analytics-group-sales">ყუთი</th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => {
              const isExpanded = expandedRows.has(row._id)
              function toggleExpand() {
                setExpandedRows((prev) => {
                  const next = new Set(prev)
                  if (next.has(row._id)) next.delete(row._id)
                  else next.add(row._id)
                  return next
                })
              }
              return (
                <Fragment key={row._id}>
                  <tr>
                    <td>
                      <button type="button" className="analytics-expand-btn" onClick={toggleExpand}>
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                    <td data-label="თარიღი">{row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}</td>
                    <td data-label="თანამშრომელი">{row.employeeName}</td>
                    <td data-label="ექიმი" className={row.doctorIsBudgeted ? 'analytics-doctor-budgeted' : ''}>
                      {row.doctorName}
                    </td>
                    <td data-label="ვიზიტები" className="analytics-num">{row.visits}</td>
                    <td data-label="სამიზნე თანხა" className="analytics-num analytics-group-target">{fmtMoney(row.targetAmount)}</td>
                    <td data-label="სამიზნე ყუთი" className="analytics-num analytics-group-target">{row.targetBoxes}</td>
                    <td data-label="დანიშნულების თანხა" className="analytics-num analytics-group-prescription">{fmtMoney(row.prescriptionAmount)}</td>
                    <td data-label="დანიშნულების ყუთი" className="analytics-num analytics-group-prescription">{row.prescriptionBoxes}</td>
                    <td data-label="გაყიდვის თანხა" className="analytics-num analytics-group-sales">{fmtMoney(row.salesAmount)}</td>
                    <td data-label="გაყიდვის ყუთი" className="analytics-num analytics-group-sales">{row.saleBoxes}</td>
                    <td data-label="გადასახდელი" className="analytics-num">{fmtMoney(row.payableAmount)}</td>
                    <td data-label="გადახდილი" className="analytics-num">{fmtMoney(row.paidAmount)}</td>
                    <td data-label="დელტა" className={`analytics-num ${row.deltaAmount < 0 ? 'analytics-delta-negative' : 'analytics-delta-positive'}`}>
                      {row.deltaAmount < 0 ? `(${fmtMoney(Math.abs(row.deltaAmount))})` : fmtMoney(row.deltaAmount)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="analytics-breakdown-row">
                      <td colSpan={14}>
                        <DrugBreakdownTable rows={row.drugBreakdown} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={14}>ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="analytics-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span className="analytics-pagination-info">
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
