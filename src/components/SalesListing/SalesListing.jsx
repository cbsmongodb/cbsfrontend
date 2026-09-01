'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
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
  const [editValues, setEditValues] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)

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

  function itemsToEditValues(list) {
    const map = {}
    for (const item of list) {
      map[item._id] = {
        quota: item.quota || 0,
        prescription: item.prescription || 0,
        sale: item.sale || 0,
        budget: item.budget || 0,
        issuedBudget: item.issuedBudget || 0,
      }
    }
    return map
  }

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
      const list = data.items || []
      setItems(list)
      setEditValues(itemsToEditValues(list))
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

  function updateEditField(itemId, field, value) {
    setEditValues((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }))
  }

  async function handleSaveRow(itemId) {
    setSavingId(itemId)
    setSavedId(null)
    setError('')
    try {
      const values = editValues[itemId]
      const updated = await apiFetch(`/api/doctor-entry-items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      })
      setItems((prev) => prev.map((it) => (it._id === itemId ? { ...it, ...updated } : it)))
      setEditValues((prev) => ({
        ...prev,
        [itemId]: {
          quota: updated.quota || 0,
          prescription: updated.prescription || 0,
          sale: updated.sale || 0,
          budget: updated.budget || 0,
          issuedBudget: updated.issuedBudget || 0,
        },
      }))
      setSavedId(itemId)
      setTimeout(() => setSavedId((cur) => (cur === itemId ? null : cur)), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
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
          <select className="field-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">აირჩიეთ თანამშრომელი...</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name || `${emp.firstName} ${emp.lastName}`}
              </option>
            ))}
          </select>
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
                <th>Quota</th>
                <th>Prescription</th>
                <th>Sale</th>
                <th>Budget Rate</th>
                <th>Issued Budget</th>
                <th>Coefficient</th>
                <th>Total Budget</th>
                <th>Planned Budget</th>
                <th>Difference</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const vals = editValues[item._id] || {}
                return (
                  <tr key={item._id}>
                    <td>{doctorLabel(item.doctor)}</td>
                    <td>{item.drug?.name || '—'}</td>
                    <td>{item.hospital?.name || '—'}</td>
                    <td>
                      <input
                        type="number"
                        className="sales-listing-edit-input"
                        value={vals.quota ?? 0}
                        onChange={(e) => updateEditField(item._id, 'quota', e.target.valueAsNumber || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sales-listing-edit-input"
                        value={vals.prescription ?? 0}
                        onChange={(e) => updateEditField(item._id, 'prescription', e.target.valueAsNumber || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sales-listing-edit-input"
                        value={vals.sale ?? 0}
                        onChange={(e) => updateEditField(item._id, 'sale', e.target.valueAsNumber || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sales-listing-edit-input"
                        value={vals.budget ?? 0}
                        onChange={(e) => updateEditField(item._id, 'budget', e.target.valueAsNumber || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="sales-listing-edit-input"
                        value={vals.issuedBudget ?? 0}
                        onChange={(e) => updateEditField(item._id, 'issuedBudget', e.target.valueAsNumber || 0)}
                      />
                    </td>
                    <td>{fmtPercent(item.coefficient)}</td>
                    <td>{fmt(item.totalBudget)}</td>
                    <td>{fmt(item.plannedBudget)}</td>
                    <td className={item.difference < 0 ? 'negative' : ''}>{fmt(item.difference)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-gray btn-sm"
                        onClick={() => handleSaveRow(item._id)}
                        disabled={savingId === item._id}
                      >
                        <span>
                          {savingId === item._id ? '...' : savedId === item._id ? '✓' : 'შენახვა'}
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={13}>{drugSearch ? 'ასეთი წამალი ვერ მოიძებნა' : 'ამ თვეზე ჩანაწერები არ არის'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
