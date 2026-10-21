'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './SalesListing.css'
import { useTranslations } from 'next-intl'

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
  const tu = useTranslations('ui')
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
      setError(tu('k038'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const period = monthValueToPeriod(monthValue)
      const data = await apiFetch(`/api/doctor-entry-items?employee=${employeeId}&period=${encodeURIComponent(period)}`)
      setItems(data.items || [])
      setPharmacy(data.pharmacySales || {})
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function doctorLabel(doctor) {
    if (!doctor) return tu('deletedDoctor')
    return `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || '—'
  }

  const [pharmacy, setPharmacy] = useState({})

  const visibleItems = useMemo(() => {
    if (!drugSearch.trim()) return items
    const q = drugSearch.trim().toLowerCase()
    return items.filter((item) => (item.drug?.name || '').toLowerCase().includes(q))
  }, [items, drugSearch])

  return (
    <div className="sales-listing-page">
      <h1>{tu('k072')}</h1>

      <div className="sales-listing-filters">
        <div className="sales-listing-field">
          <label>{tu('k044')}</label>
          <SearchableSelect
            options={employees}
            value={employeeId}
            onChange={setEmployeeId}
            getLabel={(emp) => emp.name || `${emp.firstName} ${emp.lastName}`}
            placeholder={tu('k045')}
          />
        </div>

        <div className="sales-listing-field">
          <label>{tu('k046')}</label>
          <input
            type="month"
            className="field-date"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </div>

        <button type="button" className="btn" onClick={handleLoad} disabled={loading}>
          <span>{loading ? tu('k003') : tu('k073')}</span>
        </button>

        {loaded && (
          <div className="sales-listing-field" style={{ minWidth: 220 }}>
            <label>{tu('k074')}</label>
            <input
              type="text"
              className="field-input"
              placeholder={tu('k075')}
              value={drugSearch}
              onChange={(e) => setDrugSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loaded && (
        <div className="sales-listing-formulas">
          <strong>{tu('formulasTitle')}</strong>
          <span>{tu('fCoef')}</span>
          <span>{tu('fTotal')}</span>
          <span>{tu('fPlanned')}</span>
          <span>{tu('fDiff')}</span>
          <span>{tu('fCalc')}</span>
        </div>
      )}

      {loaded && (
        <div className="sales-listing-scroll">
          <table className="sales-listing-table">
            <thead>
              <tr>
                <th>{tu('k049')}</th>
                <th>{tu('k076')}</th>
                <th>{tu('k077')}</th>
                <th>{tu('k055')}</th>
                <th>{tu('planCol')}</th>
                <th>{tu('k064')}</th>
                <th>{tu('pharmacyCol')}</th>
                <th>{tu('bonusCol')}</th>
                <th>{tu('k080')}</th>
                <th>{tu('k081')}</th>
                <th>{tu('howCol')}</th>
                <th>{tu('k051')}</th>
                <th>{tu('k057')}</th>
                <th>{tu('k058')}</th>
                <th>{tu('k082')}</th>
                <th>{tu('k083')}</th>
                <th>{tu('k084')}</th>
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
                  <td>{pharmacy[item.drug?._id] != null ? fmt(pharmacy[item.drug?._id]) : '—'}</td>
                  <td>{fmt(item.budget)}</td>
                  <td>{fmtPercent(item.coefficient)}</td>
                  <td>{fmt(item.totalBudget)}</td>
                  <td className="sales-listing-how">{fmt(item.prescription)} × {fmt(item.budget)} ₾ × {fmtPercent(item.coefficient)} = {fmt(item.totalBudget)} ₾</td>
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
                  <td colSpan={17}>{drugSearch ? tu('k085') : tu('k086')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
