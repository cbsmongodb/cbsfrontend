'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import '../PrescriptionEdit/PrescriptionEdit.css'
import './BudgetNew.css'

export default function BudgetNew() {
  const { locale } = useParams()
  const router = useRouter()

  const [employees, setEmployees] = useState([])
  const [doctors, setDoctors] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [isActive, setIsActive] = useState(true)

  const [paidAmount, setPaidAmount] = useState('0')
  const [computed, setComputed] = useState({
    advanceAmount: 0,
    salesAmount: 0,
    targetAmount: 0,
    prescriptionAmt: 0,
    payableAmt: 0,
  })
  const [computing, setComputing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch('/api/employees'), apiFetch('/api/doctors')])
      .then(([e, d]) => {
        setEmployees(e)
        setDoctors(d)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!employeeId || !doctorId || !date) return
    setComputing(true)
    setError('')
    const params = new URLSearchParams({ employee: employeeId, doctor: doctorId, date })
    apiFetch(`/api/budgets/compute-amounts?${params}`)
      .then(setComputed)
      .catch((err) => setError(err.message))
      .finally(() => setComputing(false))
  }, [employeeId, doctorId, date])

  async function handleCreate() {
    if (!employeeId || !doctorId) {
      setError('Employee-ც და Doctor-ც სავალდებულოა')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiFetch('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          employee: employeeId,
          doctor: doctorId,
          date,
          isActive,
          paidAmount: parseFloat(paidAmount) || 0,
          advanceAmount: computed.advanceAmount,
          salesAmount: computed.salesAmount,
          targetAmount: computed.targetAmount,
          prescriptionAmt: computed.prescriptionAmt,
          payableAmt: computed.payableAmt,
        }),
      })
      router.push(`/${locale}/dashboard/budgets`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="prescedit-page">
      <div className="prescedit-card">
        <div className="prescedit-card-header">
          <h1>Create Budget</h1>
          <div className="prescedit-header-actions">
            <button type="button" className="btn" onClick={handleCreate} disabled={saving}>
              <span>{saving ? '...' : 'Save'}</span>
            </button>
            <button type="button" className="btn-gray" onClick={() => router.push(`/${locale}/dashboard/budgets`)}>
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {error && <p className="resource-error">{error}</p>}

        <div className="prescedit-fields">
          <div className="prescedit-field">
            <label>Date</label>
            <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="prescedit-field">
            <label>Employee</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="აირჩიეთ..."
            />
          </div>
          <div className="prescedit-field">
            <label>Doctor</label>
            <SearchableSelect
              options={doctors}
              value={doctorId}
              onChange={setDoctorId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="აირჩიეთ..."
            />
          </div>
        </div>

        <div className="prescedit-fields budgetnew-amounts-row">
          <div className="prescedit-field">
            <label>Paid Amount</label>
            <div className="budgetnew-amount-input">
              <input
                type="number"
                className="field-input"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
              <span className="budgetnew-check">✓</span>
            </div>
          </div>
          <div className="prescedit-field">
            <label>Delta Amount</label>
            <div className="budgetnew-amount-readonly">
              {computing ? '...' : computed.advanceAmount}
            </div>
          </div>
          <div className="prescedit-field">
            <label>Sales Amount</label>
            <div className="budgetnew-amount-readonly budgetnew-amount-ok">
              {computing ? '...' : computed.salesAmount}
              <span className="budgetnew-check">✓</span>
            </div>
          </div>
        </div>

        <div className="prescedit-fields budgetnew-amounts-row">
          <div className="prescedit-field">
            <label>Target Amount</label>
            <div className="budgetnew-amount-readonly budgetnew-amount-ok">
              {computing ? '...' : computed.targetAmount}
              <span className="budgetnew-check">✓</span>
            </div>
          </div>
          <div className="prescedit-field">
            <label>Prescription Amount</label>
            <div className="budgetnew-amount-readonly budgetnew-amount-ok">
              {computing ? '...' : computed.prescriptionAmt}
              <span className="budgetnew-check">✓</span>
            </div>
          </div>
          <div className="prescedit-field">
            <label>Payable Amount</label>
            <div className="budgetnew-amount-readonly budgetnew-amount-ok">
              {computing ? '...' : computed.payableAmt}
              <span className="budgetnew-check">✓</span>
            </div>
          </div>
        </div>

        <label className="prescedit-status-toggle">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className={`prescedit-toggle-track ${isActive ? 'on' : ''}`}>
            <span className="prescedit-toggle-thumb" />
          </span>
          Status
        </label>
      </div>
    </div>
  )
}
