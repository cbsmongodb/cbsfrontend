'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import '../PrescriptionEdit/PrescriptionEdit.css'
import './BudgetNew.css'
import { useTranslations } from 'next-intl'

export default function BudgetNew() {
  const tu = useTranslations('ui')
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
    Promise.all([apiFetch('/api/employees?lite=1'), apiFetch('/api/doctors?lite=1')])
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

  function goBack() {
    if (window.history.length > 1) router.back()
    else router.push(`/${locale}/dashboard/budgets-list`)
  }

  async function handleCreate() {
    if (!employeeId || !doctorId) {
      setError(tu('k104'))
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
      goBack()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="prescedit-page">
      <div className="prescedit-card">
        <div className="prescedit-card-header">
          <h1>{tu('k175')}</h1>
          <div className="prescedit-header-actions">
            <button type="button" className="btn" onClick={handleCreate} disabled={saving}>
              <span>{saving ? <span className="btn-spinner" aria-hidden="true" /> : 'Save'}</span>
            </button>
            <button type="button" className="btn-gray" onClick={goBack}>
              <span>{tu('k106')}</span>
            </button>
          </div>
        </div>

        {error && <p className="resource-error">{error}</p>}

        <div className="prescedit-fields">
          <div className="prescedit-field budgetnew-input-field">
            <label>{tu('k176')}</label>
            <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="prescedit-field budgetnew-input-field">
            <label>{tu('k108')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={tu('k109')}
            />
          </div>
          <div className="prescedit-field budgetnew-input-field">
            <label>{tu('k110')}</label>
            <SearchableSelect
              options={doctors}
              value={doctorId}
              onChange={setDoctorId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={tu('k109')}
            />
          </div>
        </div>

        <div className="prescedit-fields budgetnew-amounts-row">
          <div className="prescedit-field budgetnew-input-field">
            <label>{tu('k177')}</label>
            <div className="budgetnew-amount-input">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                className="field-input budgetnew-paid-input"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="prescedit-field budgetnew-auto-field">
            <label>{tu('k178')}</label>
            <div className="budgetnew-amount-readonly">
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : computed.advanceAmount}
              <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
          </div>
          <div className="prescedit-field budgetnew-auto-field">
            <label>{tu('k179')}</label>
            <div className="budgetnew-amount-readonly">
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : computed.salesAmount}
              <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
          </div>
        </div>

        <div className="prescedit-fields budgetnew-amounts-row">
          <div className="prescedit-field budgetnew-auto-field">
            <label>{tu('k180')}</label>
            <div className="budgetnew-amount-readonly">
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : computed.targetAmount}
              <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
          </div>
          <div className="prescedit-field budgetnew-auto-field">
            <label>{tu('k181')}</label>
            <div className="budgetnew-amount-readonly">
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : computed.prescriptionAmt}
              <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
          </div>
          <div className="prescedit-field budgetnew-auto-field">
            <label>{tu('k182')}</label>
            <div className="budgetnew-amount-readonly">
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : computed.payableAmt}
              <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
          </div>
        </div>

        <label className="prescedit-status-toggle">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className={`prescedit-toggle-track ${isActive ? 'on' : ''}`}>
            <span className="prescedit-toggle-thumb" />
          </span>
          {tu('k111')}
        </label>
      </div>
    </div>
  )
}
