'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './EfficiencyReport.css'

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

export default function EfficiencyReport() {
  const [employees, setEmployees] = useState([])
  const [hospitals, setHospitals] = useState([])

  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())
  const [employeeId, setEmployeeId] = useState('')
  const [hospitalId, setHospitalId] = useState('')
  const [search, setSearch] = useState('')

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadOptions() {
      try {
        const [e, h] = await Promise.all([
          apiFetch('/api/employees'),
          apiFetch('/api/hospitals'),
        ])
        setEmployees(e)
        setHospitals(h)
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
      if (hospitalId) params.set('hospital', hospitalId)
      const data = await apiFetch(`/api/plannings/reports/efficiency?${params}`)
      setGroups(data)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const visibleGroups = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.trim().toLowerCase()
    return groups.filter(
      (g) =>
        g.employeeName.toLowerCase().includes(q) ||
        g.placeName.toLowerCase().includes(q) ||
        g.doctors.some((d) => d.name.toLowerCase().includes(q))
    )
  }, [groups, search])

  const totals = useMemo(() => {
    const totalVisits = visibleGroups.reduce((sum, g) => sum + g.visitCount, 0)
    const uniqueEmployees = new Set(visibleGroups.map((g) => g.employeeName)).size
    const uniqueHospitals = new Set(visibleGroups.map((g) => g.placeName)).size
    return { totalVisits, uniqueEmployees, uniqueHospitals, rows: visibleGroups.length }
  }, [visibleGroups])

  return (
    <div className="efficiency-report">
      <h1>თანამშრომელთა ეფექტურობა</h1>

      <div className="efficiency-filters-card">
        <div className="efficiency-filters-grid">
          <div className="efficiency-field">
            <label>საწყისი თარიღი</label>
            <input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="efficiency-field">
            <label>ბოლო ვადა</label>
            <input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="efficiency-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>
          <div className="efficiency-field">
            <label>ჰოსპიტალი</label>
            <SearchableSelect
              options={hospitals}
              value={hospitalId}
              onChange={setHospitalId}
              getLabel={(o) => o.name}
              placeholder="ყველა"
            />
          </div>
          <button type="button" className="btn efficiency-search-btn" onClick={loadReport} disabled={loading}>
            <span>{loading ? '...' : 'ძებნა'}</span>
          </button>
        </div>

        <input
          type="text"
          className="field-input"
          placeholder="ძიება (თანამშრომელი, ჰოსპიტალი, ექიმი)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginTop: 12, width: '100%', maxWidth: 360 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="efficiency-summary">
          <div className="efficiency-summary-item">
            <span>{totals.rows}</span>
            <label>ვიზიტის ჯგუფი</label>
          </div>
          <div className="efficiency-summary-item">
            <span>{totals.totalVisits}</span>
            <label>ნანახი ექიმი, სულ</label>
          </div>
          <div className="efficiency-summary-item">
            <span>{totals.uniqueEmployees}</span>
            <label>თანამშრომელი</label>
          </div>
          <div className="efficiency-summary-item">
            <span>{totals.uniqueHospitals}</span>
            <label>ჰოსპიტალი</label>
          </div>
        </div>
      )}

      <div className="efficiency-list">
        {visibleGroups.map((g, i) => (
          <div key={i} className="efficiency-card">
            <div className="efficiency-card-header">
              <div className="efficiency-card-date">
                {new Date(g.date).toLocaleDateString('ka-GE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              <div className="efficiency-card-title">
                <span className="efficiency-employee">{g.employeeName}</span>
                <span className="efficiency-arrow">→</span>
                <span className="efficiency-place">{g.placeName}</span>
              </div>
              <span className="efficiency-visit-badge">{g.visitCount} ექიმი</span>
            </div>
            <div className="efficiency-doctor-chips">
              {g.doctors.map((d, j) => (
                <span key={j} className="efficiency-doctor-chip">
                  {d.name}
                  {d.profile && <span className="efficiency-doctor-profile">{d.profile}</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
        {loaded && visibleGroups.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>ამ ფილტრით ჩანაწერები არ მოიძებნა</p>
        )}
      </div>
    </div>
  )
}
