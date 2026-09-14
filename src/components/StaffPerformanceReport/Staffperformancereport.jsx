'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './StaffPerformanceReport.css'

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function defaultFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10)
}

export default function StaffPerformanceReport() {
  const [mode, setMode] = useState('month')
  const [month, setMonth] = useState(currentMonthValue())
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  const [sections, setSections] = useState([])
  const [groups, setGroups] = useState([])
  const [employees, setEmployees] = useState([])

  const [sectionId, setSectionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOptions() {
      try {
        const [s, g, e] = await Promise.all([
          apiFetch('/api/admin/sections'),
          apiFetch('/api/admin/groups'),
          apiFetch('/api/employees'),
        ])
        setSections(s)
        setGroups(g)
        setEmployees(e)
      } catch (err) {
        setError(err.message)
      }
    }
    loadOptions()
  }, [])

  async function loadReport(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 25)
      if (mode === 'month') {
        params.set('mode', 'month')
        params.set('month', month)
      } else {
        params.set('mode', 'range')
        if (from) params.set('from', from)
        if (to) params.set('to', to)
      }
      if (sectionId) params.set('section', sectionId)
      if (groupId) params.set('group', groupId)
      if (employeeId) params.set('employee', employeeId)

      const result = await apiFetch(`/api/reports/staff-performance?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isMonthMode = data?.mode === 'month'

  return (
    <div className="staff-performance">
      <h1>თანამშრომელთა შესრულება</h1>

      <div className="staff-performance-filters">
        <div className="staff-performance-mode-toggle">
          <button
            type="button"
            className={mode === 'month' ? 'active' : ''}
            onClick={() => setMode('month')}
          >
            თვის მიხედვით
          </button>
          <button
            type="button"
            className={mode === 'range' ? 'active' : ''}
            onClick={() => setMode('range')}
          >
            პერიოდის მიხედვით
          </button>
        </div>

        <div className="staff-performance-filters-grid">
          {mode === 'month' ? (
            <div className="staff-performance-field">
              <label>თვე</label>
              <input type="month" className="field-input" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="staff-performance-field">
                <label>საწყისი თარიღი</label>
                <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="staff-performance-field">
                <label>ბოლო თარიღი</label>
                <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}

          <div className="staff-performance-field">
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

          <div className="staff-performance-field">
            <label>ჯგუფი</label>
            <SearchableSelect
              options={groups}
              value={groupId}
              onChange={setGroupId}
              getLabel={(o) => o.name}
              placeholder="ყველა"
            />
          </div>

          <div className="staff-performance-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>

          <button type="button" className="btn staff-performance-search-btn" onClick={() => loadReport(1)} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>

        {mode === 'range' && (
          <p className="staff-performance-hint">
            პერიოდის რეჟიმში ფინანსური სვეტები (დანიშნულების, სამიზნისა და გაყიდვების თანხა) არ ჩანს — ეს მონაცემები მხოლოდ მთელი თვისთვისაა ხელმისაწვდომი.
          </p>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="staff-performance-table-wrap">
        <table className="staff-performance-table">
          <thead>
            <tr>
              <th>თანამშრომელი</th>
              <th>ვიზიტების რაოდენობა</th>
              <th>მონახულებული ექიმები</th>
              <th>გადახდილი თანხა</th>
              {isMonthMode && (
                <>
                  <th>დანიშნულების თანხა</th>
                  <th>სამიზნე თანხა</th>
                  <th>გაყიდვების თანხა</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row.employeeId}>
                <td data-label="თანამშრომელი">{row.employeeName}</td>
                <td data-label="ვიზიტების რაოდენობა">{row.visits}</td>
                <td data-label="მონახულებული ექიმები">{row.doctorsVisited}</td>
                <td data-label="გადახდილი თანხა">{row.totalPaidAmount}</td>
                {isMonthMode && (
                  <>
                    <td data-label="დანიშნულების თანხა">{row.totalPrescriptionAmount}</td>
                    <td data-label="სამიზნე თანხა">{row.targetAmount}</td>
                    <td data-label="გაყიდვების თანხა">{row.salesAmount}</td>
                  </>
                )}
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={isMonthMode ? 7 : 4}>ამ ფილტრით ჩანაწერები არ მოიძებნა</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="staff-performance-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => loadReport(page - 1)}>
            <span>←</span>
          </button>
          <span className="staff-performance-pagination-info">
            {page} / {data.pages}
          </span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => loadReport(page + 1)}>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}