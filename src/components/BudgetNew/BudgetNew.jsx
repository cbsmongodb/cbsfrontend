'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { formatDoctorLabel } from '@/lib/doctorLabel'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import MonthSelect from '@/components/MonthSelect/MonthSelect'
import '../PrescriptionEdit/PrescriptionEdit.css'
import './BudgetNew.css'
import BudgetBulk from './BudgetBulk'
import { useTranslations } from 'next-intl'
import { BTXT, doctorBalance, balanceState } from './budgetBalance'
import EntryInfo from './EntryInfo'

function BudgetSingle() {
  const tu = useTranslations('ui')
  const tm = useTranslations('enteredRx')
  const { locale } = useParams()
  const router = useRouter()

  const [employees, setEmployees] = useState([])
  const [doctors, setDoctors] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  // budgetMonthOnly: a budget is for a MONTH -> saved as the 1st of that month
  const [date, setDate] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
  })
  // an existing budget keeps its exact old date unless the month is changed
  const [origDate, setOrigDate] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [paidAmount, setPaidAmount] = useState('0')
  const [computed, setComputed] = useState({
    advanceAmount: 0,
    salesAmount: 0,
    targetAmount: 0,
    prescriptionAmt: 0,
    payableAmt: 0,
    openingBalance: 0,
  })
  const [computing, setComputing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // budgetEditMode: /budgets/new?id=<budget> edits that budget
  const [editId, setEditId] = useState('')
  const B = BTXT[locale] || BTXT.en
  const bal = doctorBalance(computed, paidAmount)

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) return
    setEditId(id)
    apiFetch(`/api/budgets/${id}`)
      .then((b) => {
        setEmployeeId(String(b.employee?._id || b.employee || ''))
        setDoctorId(String(b.doctor?._id || b.doctor || ''))
        if (b.date) {
          const d = new Date(new Date(b.date).getTime() + 12 * 3600e3)
          const p = (x) => String(x).padStart(2, '0')
          const full = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
          setDate(full)
          setOrigDate(full)
        }
        setIsActive(b.isActive !== false)
        setPaidAmount(String(b.paidAmount ?? 0))
      })
      .catch((err) => setError(err.message))
  }, [])

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
      await apiFetch(editId ? `/api/budgets/${editId}` : '/api/budgets', {
        method: editId ? 'PUT' : 'POST',
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
          <h1>{editId ? tu('k101') : tu('k175')}</h1>
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
            <label>{tm('month')}</label>
            <MonthSelect
              value={date.slice(0, 7)}
              onChange={(v) => {
                if (!v) return
                setDate(origDate && origDate.slice(0, 7) === v ? origDate : `${v}-01`)
              }}
            />
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
              getLabel={formatDoctorLabel}
              placeholder={tu('k109')}
            />
            {employeeId && doctorId && <EntryInfo computed={computed} computing={computing} />}
          </div>
        </div>

        <div className="prescedit-fields budgetnew-amounts-row budgetnew-two">
          <div className="prescedit-field budgetnew-input-field">
            <label>{B.paid}</label>
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
          <div className="prescedit-field budgetnew-auto-field budgetnew-balance-field">
            <label>{B.balance}</label>
            <div className={`budgetnew-amount-readonly budgetnew-balance is-${balanceState(bal.balance)}`}>
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : bal.balance}
              <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
            {!computing && (
              <small className="budgetnew-balance-note">
                {B[balanceState(bal.balance)]} · {B.fromPrev}: {bal.opening}
              </small>
            )}
          </div>
        </div>

        <div className="prescedit-fields budgetnew-amounts-row budgetnew-two">
          <div className="prescedit-field budgetnew-auto-field">
            <label>{B.toPay}</label>
            <div className="budgetnew-amount-readonly">
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : bal.toPay}
              <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
          </div>
          <div className="prescedit-field budgetnew-auto-field">
            <label>{B.accrued}</label>
            <div className="budgetnew-amount-readonly">
              {computing ? <span className="btn-spinner" aria-hidden="true" /> : bal.accrued}
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

// /budgets/new        -> many budgets at once (BudgetBulk)
// /budgets/new?id=... -> edit one budget (the old single form)
export default function BudgetNew() {
  const [mode, setMode] = useState(null)
  useEffect(() => {
    setMode(new URLSearchParams(window.location.search).get('id') ? 'edit' : 'bulk')
  }, [])
  if (!mode) return null
  return mode === 'edit' ? <BudgetSingle /> : <BudgetBulk />
}
