'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './DoctorEntryItems.css'

const BANKS = ['BOG', 'TBC', 'Liberty', 'Cash', 'Pharmacy']

function currentPeriodValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthValueToPeriod(monthValue) {
  const [yyyy, mm] = monthValue.split('-')
  return `${mm}/${yyyy}`
}

function emptyDrugRow() {
  return {
    drugId: '',
    quota: 0,
    prescription: 0,
    sale: 0,
    budget: 0,
    coefficient: null,
    totalBudget: null,
  }
}

function emptyDoctorEntry() {
  return {
    doctorId: '',
    hospitalId: '',
    bank: '',
    visits: '',
    issuedBudget: 0,
    plannedBudget: null,
    difference: null,
    analysisOfPreviousMonth: null,
    budgetCalculation: null,
    analysisOfCurrentMonth: null,
    drugs: [emptyDrugRow()],
  }
}

function groupItemsIntoDoctorEntries(items) {
  const byDoctor = new Map()
  for (const item of items) {
    const docId = item.doctor?._id
    if (!docId) continue
    if (!byDoctor.has(docId)) {
      byDoctor.set(docId, {
        doctorId: docId,
        hospitalId: item.hospital?._id || '',
        bank: item.bank || '',
        visits: item.visits || '',
        issuedBudget: item.issuedBudget || 0,
        plannedBudget: item.plannedBudget ?? null,
        difference: item.difference ?? null,
        analysisOfPreviousMonth: item.analysisOfPreviousMonth ?? null,
        budgetCalculation: item.budgetCalculation ?? null,
        analysisOfCurrentMonth: item.analysisOfCurrentMonth ?? null,
        drugs: [],
      })
    }
    byDoctor.get(docId).drugs.push({
      drugId: item.drug?._id || '',
      quota: item.quota || 0,
      prescription: item.prescription || 0,
      sale: item.sale || 0,
      budget: item.budget || 0,
      coefficient: item.coefficient ?? null,
      totalBudget: item.totalBudget ?? null,
    })
  }
  return [...byDoctor.values()]
}

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('ka-GE', { maximumFractionDigits: 2 })
}

export default function DoctorEntryItems() {
  const [employees, setEmployees] = useState([])
  const [doctors, setDoctors] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [drugs, setDrugs] = useState([])

  const [employeeId, setEmployeeId] = useState('')
  const [monthValue, setMonthValue] = useState(currentPeriodValue())
  const [doctorEntries, setDoctorEntries] = useState([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadOptions() {
      try {
        const [e, d, h, dr] = await Promise.all([
          apiFetch('/api/employees'),
          apiFetch('/api/doctors'),
          apiFetch('/api/hospitals'),
          apiFetch('/api/drugs'),
        ])
        setEmployees(e)
        setDoctors(d)
        setHospitals(h)
        setDrugs(dr)
      } catch (err) {
        setError(err.message)
      }
    }
    loadOptions()
  }, [])

  function doctorLabel(doc) {
    return `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || doc.name || 'უცნობი'
  }

  function selectedDoctor(doctorId) {
    return doctors.find((d) => d._id === doctorId)
  }

  async function handleLoad() {
    if (!employeeId) {
      setError('ჯერ აირჩიეთ თანამშრომელი')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const period = monthValueToPeriod(monthValue)
      const data = await apiFetch(`/api/doctor-entry-items?employee=${employeeId}&period=${encodeURIComponent(period)}`)
      const loaded = groupItemsIntoDoctorEntries(data.items || [])
      setDoctorEntries(loaded.length > 0 ? loaded : [emptyDoctorEntry()])
      if (loaded.length === 0) setSuccess('ამ თვეზე ჩანაწერები ჯერ არ არსებობს — შეგიძლიათ ახლიდან შეავსოთ')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function addDoctor() {
    setDoctorEntries((prev) => [...prev, emptyDoctorEntry()])
  }

  function removeDoctor(index) {
    setDoctorEntries((prev) => prev.filter((_, i) => i !== index))
  }

  function updateDoctorField(index, field, value) {
    setDoctorEntries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addDrug(doctorIndex) {
    setDoctorEntries((prev) => {
      const next = [...prev]
      next[doctorIndex] = {
        ...next[doctorIndex],
        drugs: [...next[doctorIndex].drugs, emptyDrugRow()],
      }
      return next
    })
  }

  function removeDrug(doctorIndex, drugIndex) {
    setDoctorEntries((prev) => {
      const next = [...prev]
      next[doctorIndex] = {
        ...next[doctorIndex],
        drugs: next[doctorIndex].drugs.filter((_, i) => i !== drugIndex),
      }
      return next
    })
  }

  function updateDrugField(doctorIndex, drugIndex, field, value) {
    setDoctorEntries((prev) => {
      const next = [...prev]
      const drugsCopy = [...next[doctorIndex].drugs]
      drugsCopy[drugIndex] = { ...drugsCopy[drugIndex], [field]: value }
      next[doctorIndex] = { ...next[doctorIndex], drugs: drugsCopy }
      return next
    })
  }

  async function handleSave() {
    if (!employeeId) {
      setError('ჯერ აირჩიეთ თანამშრომელი')
      return
    }
    const cleanEntries = doctorEntries
      .filter((e) => e.doctorId)
      .map((e) => ({
        ...e,
        drugs: e.drugs.filter((d) => d.drugId),
      }))
      .filter((e) => e.drugs.length > 0)

    if (cleanEntries.length === 0) {
      setError('ჯერ აირჩიეთ მინიმუმ ერთი ექიმი და ერთი წამალი')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const period = monthValueToPeriod(monthValue)
      const result = await apiFetch('/api/doctor-entry-items/submit', {
        method: 'POST',
        body: JSON.stringify({ employee: employeeId, period, doctorEntries: cleanEntries }),
      })
      // the backend returns the recalculated items (coefficient, totalBudget,
      // plannedBudget, difference, etc.) — use them to refresh the computed
      // fields immediately, without needing a separate "load"
      setSuccess('შენახულია')
      setTimeout(() => setSuccess(''), 3000)
      // clear the form for the next employee — keep the period, since a
      // whole batch of employees is usually entered for the same month
      setEmployeeId('')
      setDoctorEntries([emptyDoctorEntry()])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="doctor-entries-page">
      <div className="doctor-entries-header">
        <h1>გაყიდვების შეყვანა</h1>
        <button type="button" className="btn" onClick={handleSave} disabled={saving}>
          <span>{saving ? '...' : 'შენახვა'}</span>
        </button>
      </div>

      <div className="doctor-entries-top">
        <div className="doctor-entries-field">
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

        <div className="doctor-entries-field">
          <label>პერიოდი</label>
          <input
            type="month"
            className="field-date"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </div>

        <button type="button" className="btn-gray" onClick={handleLoad} disabled={loading}>
          <span>{loading ? 'იტვირთება...' : 'ჩატვირთვა'}</span>
        </button>
      </div>

      {error && <p className="resource-error">{error}</p>}
      {success && (
        <div className="doctor-entries-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {success}
        </div>
      )}

      {doctorEntries.map((entry, doctorIndex) => {
        const doc = selectedDoctor(entry.doctorId)
        const hasComputedSummary = entry.plannedBudget != null
        return (
          <div key={doctorIndex} className="doctor-entry-card">
            <div className="doctor-entry-card-header">
              <strong>ექიმის ჩანაწერი</strong>
              <button type="button" className="btn-gray btn-sm" onClick={() => removeDoctor(doctorIndex)}>
                <span>ექიმის მოშორება</span>
              </button>
            </div>

            <div className="doctor-entry-row">
              <div className="doctor-entries-field">
                <label>ექიმი</label>
                <select
                  className="field-select"
                  value={entry.doctorId}
                  onChange={(e) => updateDoctorField(doctorIndex, 'doctorId', e.target.value)}
                >
                  <option value="">აირჩიეთ ექიმი...</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {doctorLabel(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doctor-entries-field">
                <label>Issued Budget</label>
                <input
                  type="number"
                  className="field-input"
                  value={entry.issuedBudget}
                  onChange={(e) => updateDoctorField(doctorIndex, 'issuedBudget', e.target.valueAsNumber || 0)}
                />
              </div>

              <div className="doctor-entries-field">
                <label>ID</label>
                <input type="text" className="field-input" value={doc?.uniqueNumber || ''} readOnly disabled />
              </div>
            </div>

            <div className="doctor-entry-row">
              <div className="doctor-entries-field">
                <label>ვიზიტები</label>
                <input
                  type="text"
                  className="field-input"
                  value={entry.visits}
                  onChange={(e) => updateDoctorField(doctorIndex, 'visits', e.target.value)}
                />
              </div>

              <div className="doctor-entries-field">
                <label>კლინიკა</label>
                <select
                  className="field-select"
                  value={entry.hospitalId}
                  onChange={(e) => updateDoctorField(doctorIndex, 'hospitalId', e.target.value)}
                >
                  <option value="">აირჩიეთ კლინიკა...</option>
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="doctor-entries-field">
                <label>ბანკი</label>
                <select
                  className="field-select"
                  value={entry.bank}
                  onChange={(e) => updateDoctorField(doctorIndex, 'bank', e.target.value)}
                >
                  <option value="">აირჩიეთ ბანკი...</option>
                  {BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasComputedSummary && (
              <div className="doctor-entry-summary">
                <div className="doctor-entry-summary-item">
                  <span>Planned Budget</span>
                  <strong>{fmt(entry.plannedBudget)}</strong>
                </div>
                <div className="doctor-entry-summary-item">
                  <span>Difference</span>
                  <strong className={entry.difference < 0 ? 'negative' : ''}>{fmt(entry.difference)}</strong>
                </div>
                <div className="doctor-entry-summary-item">
                  <span>წინა თვის ანალიზი</span>
                  <strong>{fmt(entry.analysisOfPreviousMonth)}</strong>
                </div>
                <div className="doctor-entry-summary-item">
                  <span>Budget Calculation</span>
                  <strong className={entry.budgetCalculation < 0 ? 'negative' : ''}>{fmt(entry.budgetCalculation)}</strong>
                </div>
              </div>
            )}

            <div className="doctor-entry-drugs">
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>წამლები</div>
              {entry.drugs.map((row, drugIndex) => (
                <div key={drugIndex} className="doctor-entry-drug-row">
                  <select
                    className="field-select"
                    value={row.drugId}
                    onChange={(e) => updateDrugField(doctorIndex, drugIndex, 'drugId', e.target.value)}
                  >
                    <option value="">აირჩიეთ წამალი...</option>
                    {drugs.map((dr) => (
                      <option key={dr._id} value={dr._id}>
                        {dr.name}
                      </option>
                    ))}
                  </select>

                  {row.drugId && (
                    <>
                      <div className="doctor-entry-drug-number">
                        <label>Quota</label>
                        <input
                          type="number"
                          className="field-input"
                          value={row.quota}
                          onChange={(e) => updateDrugField(doctorIndex, drugIndex, 'quota', e.target.valueAsNumber || 0)}
                        />
                      </div>
                      <div className="doctor-entry-drug-number">
                        <label>Prescription</label>
                        <input
                          type="number"
                          className="field-input"
                          value={row.prescription}
                          onChange={(e) => updateDrugField(doctorIndex, drugIndex, 'prescription', e.target.valueAsNumber || 0)}
                        />
                      </div>
                      <div className="doctor-entry-drug-number">
                        <label>Sale</label>
                        <input
                          type="number"
                          className="field-input"
                          value={row.sale}
                          onChange={(e) => updateDrugField(doctorIndex, drugIndex, 'sale', e.target.valueAsNumber || 0)}
                        />
                      </div>
                      <div className="doctor-entry-drug-number">
                        <label>Budget</label>
                        <input
                          type="number"
                          className="field-input"
                          value={row.budget}
                          onChange={(e) => updateDrugField(doctorIndex, drugIndex, 'budget', e.target.valueAsNumber || 0)}
                        />
                      </div>

                      {row.totalBudget != null && (
                        <div className="doctor-entry-drug-computed">
                          <span>Coeff: {fmt(row.coefficient != null ? row.coefficient * 100 : null)}%</span>
                          <span>Total: {fmt(row.totalBudget)}</span>
                        </div>
                      )}
                    </>
                  )}

                  <button type="button" className="btn-gray btn-sm" onClick={() => removeDrug(doctorIndex, drugIndex)}>
                    <span>წაშლა</span>
                  </button>
                </div>
              ))}

              <button type="button" className="btn-gray btn-sm" onClick={() => addDrug(doctorIndex)} style={{ marginTop: 8 }}>
                <span>+ წამლის დამატება</span>
              </button>
            </div>
          </div>
        )
      })}

      <button type="button" className="btn-gray" onClick={addDoctor} style={{ marginTop: 4 }}>
        <span>+ ექიმის დამატება</span>
      </button>
    </div>
  )
}
