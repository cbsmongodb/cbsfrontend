'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './Leaves.css'

function currentYear() {
  return new Date().getFullYear()
}

export default function Leaves() {
  const t = useTranslations('leaves')
  const TYPE_LABELS = { paid: t('types.paid'), unpaid: t('types.unpaid'), sick: t('types.sick') }

  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [year, setYear] = useState(currentYear())
  const [balance, setBalance] = useState(null)
  const [balanceForm, setBalanceForm] = useState({ paidDaysTotal: 24, unpaidDaysTotal: 0, sickDaysTotal: 0 })

  const [entries, setEntries] = useState([])
  const [entryForm, setEntryForm] = useState({ employee: '', type: 'paid', startDate: '', endDate: '', note: '' })

  const [restDays, setRestDays] = useState([])
  const [restDayForm, setRestDayForm] = useState({ date: '', label: '' })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadEmployees() {
    const data = await apiFetch('/api/employees')
    setEmployees(data)
  }

  async function loadBalance(employeeId, y) {
    if (!employeeId) {
      setBalance(null)
      return
    }
    try {
      const data = await apiFetch(`/api/leaves/balance?employee=${employeeId}&year=${y}`)
      setBalance(data)
      setBalanceForm({
        paidDaysTotal: data.paid.total,
        unpaidDaysTotal: data.unpaid.total,
        sickDaysTotal: data.sick.total,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadEntries() {
    try {
      const data = await apiFetch('/api/leaves')
      setEntries(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadRestDays() {
    try {
      const data = await apiFetch('/api/leaves/rest-days')
      setRestDays(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    Promise.all([loadEmployees(), loadEntries(), loadRestDays()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadBalance(selectedEmployee, year)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, year])

  async function handleSaveBalance(e) {
    e.preventDefault()
    setError('')
    try {
      await apiFetch('/api/leaves/balance', {
        method: 'POST',
        body: JSON.stringify({ employee: selectedEmployee, year, ...balanceForm }),
      })
      loadBalance(selectedEmployee, year)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddEntry(e) {
    e.preventDefault()
    setError('')
    if (!entryForm.employee || !entryForm.startDate || !entryForm.endDate) {
      setError(t('validationError'))
      return
    }
    try {
      await apiFetch('/api/leaves', {
        method: 'POST',
        body: JSON.stringify(entryForm),
      })
      setEntryForm({ employee: '', type: 'paid', startDate: '', endDate: '', note: '' })
      loadEntries()
      if (entryForm.employee === selectedEmployee) loadBalance(selectedEmployee, year)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteEntry(id, employeeId) {
    if (!confirm(t('confirmDelete'))) return
    try {
      await apiFetch(`/api/leaves/${id}`, { method: 'DELETE' })
      loadEntries()
      if (employeeId === selectedEmployee) loadBalance(selectedEmployee, year)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddRestDay(e) {
    e.preventDefault()
    setError('')
    if (!restDayForm.date) return
    try {
      await apiFetch('/api/leaves/rest-days', {
        method: 'POST',
        body: JSON.stringify(restDayForm),
      })
      setRestDayForm({ date: '', label: '' })
      loadRestDays()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteRestDay(id) {
    if (!confirm(t('confirmDelete'))) return
    try {
      await apiFetch(`/api/leaves/rest-days/${id}`, { method: 'DELETE' })
      loadRestDays()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>{t('loading')}</p>

  return (
    <div className="leaves-page">
      <h1>{t('title')}</h1>
      {error && <p className="resource-error">{error}</p>}

      {/* Balance section */}
      <section className="leaves-section">
        <h2 className="leaves-section-title">
          <span className="leaves-section-icon balance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          {t('sectionBalance')}
        </h2>
        <div className="leaves-balance-controls">
          <SearchableSelect
            options={employees}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
            placeholder={t('selectEmployeePlaceholder')}
          />
          <input
            type="number"
            className="field-input"
            style={{ width: 100 }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>

        {balance && (
          <>
            <div className="leaves-balance-cards">
              {['paid', 'unpaid', 'sick'].map((type) => (
                <div key={type} className="balance-card">
                  <div className="balance-card-label">{TYPE_LABELS[type]}</div>
                  <div className="balance-card-numbers">
                    <span className="remaining">{balance[type].remaining}</span>
                    <span className="of-total"> / {balance[type].total} {t('daysUnit')}</span>
                  </div>
                  <div className="used-label">{t('usedLabel', { count: balance[type].used })}</div>
                </div>
              ))}
            </div>

            <form className="leaves-balance-edit" onSubmit={handleSaveBalance}>
              <label>
                {t('formLabels.paidTotal')}
                <input
                  type="number"
                  className="field-input"
                  value={balanceForm.paidDaysTotal}
                  onChange={(e) => setBalanceForm((p) => ({ ...p, paidDaysTotal: Number(e.target.value) }))}
                />
              </label>
              <label>
                {t('formLabels.unpaidTotal')}
                <input
                  type="number"
                  className="field-input"
                  value={balanceForm.unpaidDaysTotal}
                  onChange={(e) => setBalanceForm((p) => ({ ...p, unpaidDaysTotal: Number(e.target.value) }))}
                />
              </label>
              <label>
                {t('formLabels.sickTotal')}
                <input
                  type="number"
                  className="field-input"
                  value={balanceForm.sickDaysTotal}
                  onChange={(e) => setBalanceForm((p) => ({ ...p, sickDaysTotal: Number(e.target.value) }))}
                />
              </label>
              <button type="submit" className="btn-gray btn-sm">
                <span>{t('saveLimits')}</span>
              </button>
            </form>
          </>
        )}
      </section>

      {/* Entries section */}
      <section className="leaves-section">
        <h2 className="leaves-section-title">
          <span className="leaves-section-icon entries">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1z" />
              <line x1="8" y1="11" x2="16" y2="11" />
              <line x1="8" y1="15" x2="13" y2="15" />
            </svg>
          </span>
          {t('sectionEntries')}
        </h2>

        <form className="resource-form" onSubmit={handleAddEntry}>
          <SearchableSelect
            options={employees}
            value={entryForm.employee}
            onChange={(val) => setEntryForm((p) => ({ ...p, employee: val }))}
            getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
            placeholder={t('employeePlaceholder')}
          />
          <select
            className="field-select"
            value={entryForm.type}
            onChange={(e) => setEntryForm((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="paid">{t('types.paid')}</option>
            <option value="unpaid">{t('types.unpaid')}</option>
            <option value="sick">{t('types.sick')}</option>
          </select>
          <input
            type="date"
            className="field-date"
            value={entryForm.startDate}
            onChange={(e) => setEntryForm((p) => ({ ...p, startDate: e.target.value }))}
          />
          <input
            type="date"
            className="field-date"
            value={entryForm.endDate}
            onChange={(e) => setEntryForm((p) => ({ ...p, endDate: e.target.value }))}
          />
          <input
            type="text"
            className="field-input"
            placeholder={t('notePlaceholder')}
            value={entryForm.note}
            onChange={(e) => setEntryForm((p) => ({ ...p, note: e.target.value }))}
          />
          <button type="submit" className="btn">
            <span>{t('addButton')}</span>
          </button>
        </form>

        <table className="leaves-table">
          <thead>
            <tr>
              <th>{t('entriesHeaders.employee')}</th>
              <th>{t('entriesHeaders.type')}</th>
              <th>{t('entriesHeaders.start')}</th>
              <th>{t('entriesHeaders.end')}</th>
              <th>{t('entriesHeaders.days')}</th>
              <th>{t('entriesHeaders.note')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id}>
                <td>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                <td>{TYPE_LABELS[entry.type]}</td>
                <td>{String(entry.startDate).slice(0, 10)}</td>
                <td>{String(entry.endDate).slice(0, 10)}</td>
                <td>{entry.daysCount}</td>
                <td>{entry.note}</td>
                <td>
                  <button
                    className="btn-gray btn-sm"
                    onClick={() => handleDeleteEntry(entry._id, entry.employee?._id)}
                  >
                    <span>{t('deleteButton')}</span>
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7}>{t('noEntries')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Rest days section */}
      <section className="leaves-section">
        <h2 className="leaves-section-title">
          <span className="leaves-section-icon rest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          </span>
          {t('sectionRestDays')}
        </h2>

        <form className="resource-form" onSubmit={handleAddRestDay}>
          <input
            type="date"
            className="field-date"
            value={restDayForm.date}
            onChange={(e) => setRestDayForm((p) => ({ ...p, date: e.target.value }))}
          />
          <input
            type="text"
            className="field-input"
            placeholder={t('restDayLabelPlaceholder')}
            value={restDayForm.label}
            onChange={(e) => setRestDayForm((p) => ({ ...p, label: e.target.value }))}
          />
          <button type="submit" className="btn">
            <span>{t('addButton')}</span>
          </button>
        </form>

        <table className="leaves-table">
          <thead>
            <tr>
              <th>{t('restDayHeaders.date')}</th>
              <th>{t('restDayHeaders.name')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {restDays.map((rd) => (
              <tr key={rd._id}>
                <td>{String(rd.date).slice(0, 10)}</td>
                <td>{rd.label}</td>
                <td>
                  <button className="btn-gray btn-sm" onClick={() => handleDeleteRestDay(rd._id)}>
                    <span>{t('deleteButton')}</span>
                  </button>
                </td>
              </tr>
            ))}
            {restDays.length === 0 && (
              <tr>
                <td colSpan={3}>{t('noRestDays')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
