'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './SalesListing.css'

function currentPeriodValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthValueToPeriod(monthValue) {
  const [yyyy, mm] = monthValue.split('-')
  return `${mm}/${yyyy}`
}

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('ka-GE', { maximumFractionDigits: 2 })
}

function fmtPercent(coefficient) {
  if (coefficient == null) return '—'
  return `${fmt(coefficient * 100)}%`
}

export default function SalesListing() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [monthValue, setMonthValue] = useState(currentPeriodValue())
  const [drugSearch, setDrugSearch] = useState('')

  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await apiFetch('/api/employees')
        setEmployees(data)
      } catch (err) {
        setError(err.message)
      }
    }
    loadEmployees()
  }, [])

  async function handleLoad() {
    if (!employeeId) {
      setError('ჯერ აირჩიეთ თანამშრომელი')
      return
    }
    setLoading(true)
    setError('')
    try {
      const period = monthValueToPeriod(monthValue)
      const data = await apiFetch(`/api/doctor-entry-items?employee=${employeeId}&period=${encodeURIComponent(period)}`)
      setItems(data.items || [])
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function doctorLabel(doctor) {
    if (!doctor) return '—'
    return `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || '—'
  }

  const visibleItems = useMemo(() => {
    if (!drugSearch.trim()) return items
    const q = drugSearch.trim().toLowerCase()
    return items.filter((item) => (item.drug?.name || '').toLowerCase().includes(q))
  }, [items, drugSearch])

  return (
    <div className="sales-listing-page">
      <h1>გაყიდვების სია</h1>

      <div className="sales-listing-filters">
        <div className="sales-listing-field">
          <label>თანამშრომელი</label>
          <SearchableSelect
            options={employees}
            value={employeeId}
            onChange={setEmployeeId}
            getLabel={(emp) => emp.name || `${emp.firstName} ${emp.lastName}`}
            placeholder="ჩაწერეთ სახელი..."
          />
        </div>

        <div className="sales-listing-field">
          <label>პერიოდი</label>
          <input
            type="month"
            className="field-date"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </div>

        <button type="button" className="btn" onClick={handleLoad} disabled={loading}>
          <span>{loading ? 'იტვირთება...' : 'ჩვენება'}</span>
        </button>

        {loaded && (
          <div className="sales-listing-field" style={{ minWidth: 220 }}>
            <label>ძებნა წამლის მიხედვით</label>
            <input
              type="text"
              className="field-input"
              placeholder="წამლის სახელი..."
              value={drugSearch}
              onChange={(e) => setDrugSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="sales-listing-scroll">
          <table className="sales-listing-table">
            <thead>
              <tr>
                <th>ექიმი</th>
                <th>წამალი</th>
                <th>ჰოსპიტალი</th>
                <th>ბანკი</th>
                <th>Quota</th>
                <th>Prescription</th>
                <th>Sale</th>
                <th>Budget Rate</th>
                <th>Coefficient</th>
                <th>Total Budget</th>
                <th>Issued Budget</th>
                <th>Planned Budget</th>
                <th>Difference</th>
                <th>Prev. Analysis</th>
                <th>Budget Calc.</th>
                <th>Curr. Analysis</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item._id}>
                  <td>{doctorLabel(item.doctor)}</td>
                  <td>{item.drug?.name || '—'}</td>
                  <td>{item.hospital?.name || '—'}</td>
                  <td>{item.bank || '—'}</td>
                  <td>{fmt(item.quota)}</td>
                  <td>{fmt(item.prescription)}</td>
                  <td>{fmt(item.sale)}</td>
                  <td>{fmt(item.budget)}</td>
                  <td>{fmtPercent(item.coefficient)}</td>
                  <td>{fmt(item.totalBudget)}</td>
                  <td>{fmt(item.issuedBudget)}</td>
                  <td>{fmt(item.plannedBudget)}</td>
                  <td className={item.difference < 0 ? 'negative' : ''}>{fmt(item.difference)}</td>
                  <td>{fmt(item.analysisOfPreviousMonth)}</td>
                  <td className={item.budgetCalculation < 0 ? 'negative' : ''}>{fmt(item.budgetCalculation)}</td>
                  <td>{fmt(item.analysisOfCurrentMonth)}</td>
                </tr>
              ))}
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={16}>{drugSearch ? 'ასეთი წამალი ვერ მოიძებნა' : 'ამ თვეზე ჩანაწერები არ არის'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
