'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import DrugPickerModal from './DrugPickerModal'
import './DoctorEntryItems.css'
import { useTranslations } from 'next-intl'
import ReportLoader from '@/components/ReportLoader/ReportLoader'

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
    drugs: [],
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
      fromSaved: true,
    })
  }
  return [...byDoctor.values()]
}

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('ka-GE', { maximumFractionDigits: 2 })
}

export default function DoctorEntryItems() {
  const tu = useTranslations('ui')
  const [employees, setEmployees] = useState([])
  const [doctors, setDoctors] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [drugs, setDrugs] = useState([])
  // inactive drugs (e.g. "Zito") can't be picked any more; a line saved earlier
  // with such a drug still shows its name
  const activeDrugs = useMemo(() => drugs.filter((d) => d.isActive !== false), [drugs])
  const drugOptionsFor = (drugId) => {
    if (!drugId || activeDrugs.some((d) => d._id === drugId)) return activeDrugs
    const old = drugs.find((d) => d._id === drugId)
    return old ? [...activeDrugs, old] : activeDrugs
  }

  const [employeeId, setEmployeeId] = useState('')
  const [monthValue, setMonthValue] = useState(currentPeriodValue())
  const [doctorEntries, setDoctorEntries] = useState([emptyDoctorEntry()])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pickerDoctorIndex, setPickerDoctorIndex] = useState(null)
  const [pharmacySales, setPharmacySales] = useState({})
  const [savedByDoctor, setSavedByDoctor] = useState({})
  const [monthBonuses, setMonthBonuses] = useState({})
  const [visitCounts, setVisitCounts] = useState({})

  // completed visits per doctor this month (from the visit plans) -> fills "visits"
  useEffect(() => {
    if (!employeeId) { setVisitCounts({}); return }
    apiFetch(`/api/doctor-entry-items/visit-counts?employee=${employeeId}&period=${encodeURIComponent(monthValueToPeriod(monthValue))}`)
      .then((c) => setVisitCounts(c || {}))
      .catch(() => setVisitCounts({}))
  }, [employeeId, monthValue])

  // doctors already on the form with an empty "visits" get the count too
  useEffect(() => {
    setDoctorEntries((prev) => prev.map((e) =>
      e.doctorId && !String(e.visits || '').trim() && visitCounts[e.doctorId]
        ? { ...e, visits: String(visitCounts[e.doctorId]) }
        : e))
  }, [visitCounts])

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

  // a rep only ever sees themselves in the list -> the employee is filled in
  // automatically and can't be changed (managers still pick from their people)
  const onlySelf = employees.length === 1
  useEffect(() => {
    if (onlySelf && employeeId !== employees[0]._id) setEmployeeId(employees[0]._id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlySelf, employees])

  // auto-load on employee/period change (no button)
  useEffect(() => {
    if (!employeeId) {
      setDoctorEntries([emptyDoctorEntry()])
      setPharmacySales({})
      return
    }
    handleLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, monthValue])

  function bonusFor(row) {
    if (monthBonuses[row.drugId] != null) return monthBonuses[row.drugId]
    const d = drugs.find((x) => x._id === row.drugId)
    return d?.bonus || row.budget || 0
  }

  function rxTotal(drugId) {
    return doctorEntries.reduce((sum, e) => sum + (e.drugs || []).filter((r) => r.drugId === drugId)
      .reduce((a, r) => a + (Number(r.prescription) || 0), 0), 0)
  }

  function drugNameById(id) {
    const d = drugs.find((x) => x._id === id)
    return d ? d.name : ''
  }

  function doctorLabel(doc) {
    return `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || doc.name || '—'
  }

  function selectedDoctor(doctorId) {
    return doctors.find((d) => d._id === doctorId)
  }

  async function handleLoad() {
    if (!employeeId) {
      setError(tu('k038'))
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const period = monthValueToPeriod(monthValue)
      const data = await apiFetch(`/api/doctor-entry-items?employee=${employeeId}&period=${encodeURIComponent(period)}`)
      const loaded = groupItemsIntoDoctorEntries(data.items || [])
      setPharmacySales(data.pharmacySales || {})
      setMonthBonuses(data.bonuses || {})
      setSavedByDoctor(Object.fromEntries(loaded.map((e) => [e.doctorId, e])))
      setDoctorEntries([emptyDoctorEntry()])
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
      const updated = { ...next[index], [field]: value }
      // picking a doctor fills in his hospital automatically (can still be changed)
      if (field === 'doctorId' && value) {
        const saved = savedByDoctor[value]
        if (saved) Object.assign(updated, JSON.parse(JSON.stringify(saved)), { doctorId: value, existing: true })
        else Object.assign(updated, { existing: false, hospitalId: '', visits: '' })
        const d = doctors.find((x) => x._id === value)
        const first = d?.hospitals?.[0]?.hospital || d?.hospitalIds?.[0]
        const h = first?._id || first   // populated hospital object or a plain id
        if (h && !updated.hospitalId) updated.hospitalId = String(h)
        if (!String(updated.visits || '').trim() && visitCounts[value]) updated.visits = String(visitCounts[value])
      }
      next[index] = updated
      return next
    })
  }

  function addDrugs(doctorIndex, drugIds) {
    setDoctorEntries((prev) => {
      const next = [...prev]
      const entry = { ...next[doctorIndex] }
      const existing = new Set((entry.drugs || []).map((r) => r.drugId).filter(Boolean))
      const rows = [...(entry.drugs || [])]
      // drop an initial empty row if present
      const cleaned = rows.filter((r) => r.drugId)
      drugIds.forEach((id) => {
        if (!existing.has(id)) cleaned.push({ ...emptyDrugRow(), drugId: id })
      })
      entry.drugs = cleaned.length > 0 ? cleaned : [emptyDrugRow()]
      next[doctorIndex] = entry
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
      setError(tu('k038'))
      return
    }
    const cleanEntries = doctorEntries
      .filter((e) => e.doctorId)
      .map((e) => ({
        ...e,
        drugs: e.drugs.filter((d) => d.drugId).map((d) => (d.fromSaved ? d : { ...d, sale: undefined, budget: undefined })),
      }))
      .filter((e) => e.drugs.length > 0)

    if (cleanEntries.length === 0) {
      setError(tu('k040'))
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
      setSuccess(tu('k041'))
      setTimeout(() => setSuccess(''), 3000)
      // clear the form for the next employee — keep the period, since a
      // whole batch of employees is usually entered for the same month
      if (onlySelf) {
        handleLoad()
      } else {
        setEmployeeId('')
        setDoctorEntries([emptyDoctorEntry()])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="doctor-entries-page">
      {loading && <ReportLoader variant="page" />}
      <div className="doctor-entries-header">
        <h1>{tu('k042')}</h1>
        <button type="button" className="btn" onClick={handleSave} disabled={saving}>
          <span>{saving ? <span className="btn-spinner" aria-hidden="true" /> : tu('k043')}</span>
        </button>
      </div>

      <div className="doctor-entries-top">
        <div className="doctor-entries-field">
          <label>{tu('k044')}</label>
          {onlySelf ? (
            <input
              type="text"
              className="field-input"
              value={employees[0].name || `${employees[0].firstName || ''} ${employees[0].lastName || ''}`.trim()}
              readOnly
            />
          ) : (
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(emp) => emp.name || `${emp.firstName} ${emp.lastName}`}
              placeholder={tu('k045')}
            />
          )}
        </div>

        <div className="doctor-entries-field">
          <label>{tu('k046')}</label>
          <input
            type="month"
            className="field-date"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </div>


      </div>

      {error && <p className="resource-error">{error}</p>}
      {employeeId && Object.keys(savedByDoctor).length > 0 && (
        <p className="doctor-entries-info">{tu('savedThisMonth', { count: Object.keys(savedByDoctor).length })}</p>
      )}
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
              <strong>{tu('k047')}</strong>
              {entry.existing && <span className="doctor-entry-existing">{tu('alreadySaved')}</span>}
              <button type="button" className="btn-gray btn-sm" onClick={() => removeDoctor(doctorIndex)}>
                <span>{tu('k048')}</span>
              </button>
            </div>

            <div className="doctor-entry-row">
              <div className="doctor-entries-field">
                <label>{tu('k049')}</label>
                <SearchableSelect
                  options={doctors}
                  value={entry.doctorId}
                  onChange={(val) => updateDoctorField(doctorIndex, 'doctorId', val)}
                  getLabel={(d) => doctorLabel(d)}
                  placeholder={tu('k050')}
                />
              </div>

              <div className="doctor-entries-field">
                <label>{tu('k051')}</label>
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
                <label>{tu('k052')}</label>
                <input
                  type="text"
                  className="field-input"
                  value={entry.visits}
                  onChange={(e) => updateDoctorField(doctorIndex, 'visits', e.target.value)}
                />
                {entry.doctorId && visitCounts[entry.doctorId] != null && (
                  <small className="doctor-entry-hint">{tu('visitsFromPlans')}: {visitCounts[entry.doctorId]}</small>
                )}
              </div>

              <div className="doctor-entries-field">
                <label>{tu('k053')}</label>
                <SearchableSelect
                  options={hospitals}
                  value={entry.hospitalId}
                  onChange={(val) => updateDoctorField(doctorIndex, 'hospitalId', val)}
                  getLabel={(h) => h.name}
                  placeholder={tu('k054')}
                />
              </div>

              <div className="doctor-entries-field">
                <label>{tu('k055')}</label>
                <select
                  className="field-select"
                  value={entry.bank}
                  onChange={(e) => updateDoctorField(doctorIndex, 'bank', e.target.value)}
                >
                  <option value="">{tu('k056')}</option>
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
                  <span>{tu('k057')}</span>
                  <strong>{fmt(entry.plannedBudget)}</strong>
                </div>
                <div className="doctor-entry-summary-item">
                  <span>{tu('k058')}</span>
                  <strong className={entry.difference < 0 ? 'negative' : ''}>{fmt(entry.difference)}</strong>
                </div>
                <div className="doctor-entry-summary-item">
                  <span>{tu('k059')}</span>
                  <strong>{fmt(entry.analysisOfPreviousMonth)}</strong>
                </div>
                <div className="doctor-entry-summary-item">
                  <span>{tu('k060')}</span>
                  <strong className={entry.budgetCalculation < 0 ? 'negative' : ''}>{fmt(entry.budgetCalculation)}</strong>
                </div>
              </div>
            )}

            <div className="doctor-entry-drugs">
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{tu('k061')}</div>
              {entry.drugs.map((row, drugIndex) => (
                <div key={drugIndex} className="doctor-entry-drug-row">
                  <SearchableSelect
                    options={drugOptionsFor(row.drugId)}
                    value={row.drugId}
                    onChange={(val) => updateDrugField(doctorIndex, drugIndex, 'drugId', val)}
                    getLabel={(dr) => dr.name}
                    placeholder={tu('k062')}
                  />

                  {row.drugId && (
                    <>
                      <div className="doctor-entry-drug-number">
                        <label>{tu('k063')}</label>
                        <input
                          type="number"
                          className="field-input"
                          value={row.quota}
                          onChange={(e) => updateDrugField(doctorIndex, drugIndex, 'quota', e.target.valueAsNumber || 0)}
                        />
                      </div>
                      <div className="doctor-entry-drug-number">
                        <label>{tu('k064')}</label>
                        <input
                          type="number"
                          className="field-input"
                          value={row.prescription}
                          onChange={(e) => updateDrugField(doctorIndex, drugIndex, 'prescription', e.target.valueAsNumber || 0)}
                        />
                      </div>
                      <div className="doctor-entry-drug-number doctor-entry-bonus">
                        <label>{tu('bonusAuto')}</label>
                        <div className="doctor-entry-bonus-value">{fmt(bonusFor(row))} ₾</div>
                      </div>

                      {(() => {

                        const rx = Number(row.prescription) || 0

                        const bonus = Number(bonusFor(row)) || 0

                        const sum = rxTotal(row.drugId)

                        const real = pharmacySales[row.drugId]

                        const hasReal = real != null && sum > 0

                        const coef = hasReal ? real / sum : (row.fromSaved && row.coefficient != null ? row.coefficient : 0)

                        const pct = fmt(coef * 100)

                        const total = fmt(rx * bonus * coef)

                        return (

                          <div className="doctor-entry-formula">

                            {hasReal ? (

                              <div>{tu('formulaCoef', { real: fmt(real), rx: fmt(sum), pct })}</div>

                            ) : row.fromSaved && row.coefficient != null ? (

                              <div>{tu('savedCoef', { pct })}</div>

                            ) : (

                              <div className="doctor-entry-formula-warn">{tu('noRealSales')}</div>

                            )}

                            {!bonus && <div className="doctor-entry-formula-warn">{tu('noBonus')}</div>}

                            <div className="doctor-entry-formula-main">{tu('formulaBudget', { rx: fmt(rx), bonus: fmt(bonus), pct, total })}</div>

                          </div>

                        )

                      })()}
                    </>
                  )}

                  <button type="button" className="btn-gray btn-sm" onClick={() => removeDrug(doctorIndex, drugIndex)}>
                    <span>{tu('k069')}</span>
                  </button>
                </div>
              ))}

              <button type="button" className="btn-gray btn-sm" onClick={() => setPickerDoctorIndex(doctorIndex)} style={{ marginTop: 8 }}>
                <span>{tu('k070')}</span>
              </button>
            </div>
          </div>
        )
      })}

      <button type="button" className="btn-gray" onClick={addDoctor} style={{ marginTop: 4 }}>
        <span>{tu('k071')}</span>
      </button>
    
      {pickerDoctorIndex !== null && (
        <DrugPickerModal
          drugs={activeDrugs}
          alreadyAddedIds={(doctorEntries[pickerDoctorIndex]?.drugs || []).map((r) => r.drugId).filter(Boolean)}
          onClose={() => setPickerDoctorIndex(null)}
          onConfirm={(ids) => addDrugs(pickerDoctorIndex, ids)}
        />
      )}
    </div>
  )
}
