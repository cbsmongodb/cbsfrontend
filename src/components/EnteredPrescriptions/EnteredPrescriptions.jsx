'use client'

// "შეყვანილი რეცეპტები" — every rep sees the prescriptions they entered for
// a month, grouped by doctor, and can fix a number or delete a line / doctor.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import './EnteredPrescriptions.css'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const toPeriod = (m) => { const [y, mm] = m.split('-'); return `${mm}/${y}` }
const personName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '')
const num = (n) => Number(n || 0).toLocaleString('ka-GE', { maximumFractionDigits: 2 })

const IconEdit = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
)
const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
)

export default function EnteredPrescriptions() {
  const t = useTranslations('enteredRx')
  const { locale } = useParams()

  const [me, setMe] = useState(null)
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [search, setSearch] = useState('')

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [editId, setEditId] = useState(null)
  const [draft, setDraft] = useState({ quota: 0, prescription: 0 })
  const [busyId, setBusyId] = useState(null)
  const [confirmKey, setConfirmKey] = useState(null) // "item:<id>" | "doc:<id>"

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('employee') || 'null')
      if (stored?._id) { setMe(stored); setEmployeeId(stored._id) }
    } catch { /* ignore */ }
    apiFetch('/api/employees?lite=1')
      .then((list) => setEmployees(Array.isArray(list) ? list.filter((e) => e.isActive !== false) : []))
      .catch(() => setEmployees([]))
  }, [])

  const load = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    setError('')
    try {
      const own = me && employeeId === me._id
      const q = `period=${encodeURIComponent(toPeriod(month))}${own ? '' : `&employee=${employeeId}`}`
      const data = await apiFetch(`/api/my-entries?${q}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [employeeId, month, me])

  useEffect(() => { load() }, [load])
  useEffect(() => { setEditId(null); setConfirmKey(null) }, [employeeId, month])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(id)
  }, [notice])

  // group by doctor, filter by search
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const map = new Map()
    for (const it of items) {
      const key = it.doctor?._id || 'none'
      if (!map.has(key)) map.set(key, { doctorId: it.doctor?._id, doctor: personName(it.doctor) || t('deletedDoctor'), hospital: it.hospital?.name || '', rows: [] })
      map.get(key).rows.push(it)
    }
    let list = [...map.values()]
    if (q) {
      list = list
        .map((g) => g.doctor.toLowerCase().includes(q) || g.hospital.toLowerCase().includes(q)
          ? g
          : { ...g, rows: g.rows.filter((r) => (r.drug?.name || '').toLowerCase().includes(q)) })
        .filter((g) => g.rows.length)
    }
    list.forEach((g) => g.rows.sort((a, b) => (a.drug?.name || '').localeCompare(b.drug?.name || '')))
    return list.sort((a, b) => a.doctor.localeCompare(b.doctor, 'ka'))
  }, [items, search, t])

  const totals = useMemo(() => ({
    doctors: groups.length,
    lines: groups.reduce((s, g) => s + g.rows.length, 0),
    rx: groups.reduce((s, g) => s + g.rows.reduce((a, r) => a + (r.prescription || 0), 0), 0),
  }), [groups])

  function startEdit(row) {
    setConfirmKey(null)
    setEditId(row._id)
    setDraft({ quota: row.quota || 0, prescription: row.prescription || 0 })
  }

  async function saveEdit(row) {
    setBusyId(row._id)
    setError('')
    try {
      const saved = await apiFetch(`/api/my-entries/${row._id}`, {
        method: 'PUT',
        body: JSON.stringify({ quota: Number(draft.quota) || 0, prescription: Number(draft.prescription) || 0 }),
      })
      setItems((prev) => prev.map((x) => (x._id === row._id ? { ...x, quota: saved.quota, prescription: saved.prescription } : x)))
      setEditId(null)
      setNotice(t('saved'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteRow(row) {
    setBusyId(row._id)
    setError('')
    try {
      await apiFetch(`/api/my-entries/${row._id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((x) => x._id !== row._id))
      setConfirmKey(null)
      setNotice(t('deleted'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteDoctor(g) {
    setBusyId(`doc:${g.doctorId}`)
    setError('')
    try {
      const own = me && employeeId === me._id
      const q = `period=${encodeURIComponent(toPeriod(month))}${own ? '' : `&employee=${employeeId}`}`
      await apiFetch(`/api/my-entries/doctor/${g.doctorId}?${q}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((x) => x.doctor?._id !== g.doctorId))
      setConfirmKey(null)
      setNotice(t('deleted'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const showEmployeePicker = employees.length > 1

  return (
    <div className="erx-page">
      {loading && <ReportLoader variant="page" />}

      <div className="erx-head">
        <div>
          <h1>{t('title')}</h1>
          <p className="erx-sub">{t('subtitle')}</p>
        </div>
        <Link href={`/${locale}/dashboard/doctor-entry-items`} className="btn erx-add">
          <span>+ {t('addNew')}</span>
        </Link>
      </div>

      <div className="sales-listing-filters erx-filters">
        {showEmployeePicker && (
          <div className="sales-listing-field">
            <label>{t('employee')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={(v) => setEmployeeId(v || (me?._id ?? ''))}
              getLabel={(e) => personName(e)}
              placeholder={t('employee')}
            />
          </div>
        )}
        <div className="sales-listing-field">
          <label>{t('month')}</label>
          <input type="month" className="field-input field-date" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        <div className="sales-listing-field erx-search">
          <label>{t('search')}</label>
          <input type="text" className="field-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPh')} />
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}
      {notice && <div className="erx-notice">✓ {notice}</div>}

      {!loading && items.length > 0 && (
        <div className="erx-stats">
          <div className="erx-stat"><b>{totals.doctors}</b><span>{t('doctors')}</span></div>
          <div className="erx-stat"><b>{totals.lines}</b><span>{t('lines')}</span></div>
          <div className="erx-stat"><b>{num(totals.rx)}</b><span>{t('prescriptions')}</span></div>
        </div>
      )}

      {!loading && items.length === 0 && employeeId && (
        <div className="erx-empty">
          <p>{t('empty')}</p>
          <Link href={`/${locale}/dashboard/doctor-entry-items`} className="erx-empty-link">{t('addNew')} →</Link>
        </div>
      )}

      {!loading && items.length > 0 && groups.length === 0 && <div className="erx-empty"><p>{t('noMatch')}</p></div>}

      <div className="erx-list">
        {groups.map((g) => {
          const docKey = `doc:${g.doctorId}`
          return (
            <section key={g.doctorId || 'none'} className="erx-card">
              <header className="erx-card-head">
                <div className="erx-doc">
                  <span className="erx-avatar" aria-hidden="true">{g.doctor.charAt(0)}</span>
                  <div>
                    <div className="erx-doc-name">{g.doctor}</div>
                    {g.hospital && <div className="erx-doc-hosp">{g.hospital}</div>}
                  </div>
                </div>
                {g.doctorId && (confirmKey === docKey ? (
                  <div className="erx-confirm">
                    <span>{t('confirmDoctor', { n: g.rows.length })}</span>
                    <button type="button" className="erx-btn erx-btn-danger" disabled={busyId === docKey} onClick={() => deleteDoctor(g)}>{t('yesDelete')}</button>
                    <button type="button" className="erx-btn" onClick={() => setConfirmKey(null)}>{t('cancel')}</button>
                  </div>
                ) : (
                  <button type="button" className="erx-btn erx-btn-ghost-danger" onClick={() => { setEditId(null); setConfirmKey(docKey) }}>
                    <IconTrash /> {t('deleteDoctor')}
                  </button>
                ))}
              </header>

              <div className="erx-rows">
                <div className="erx-row erx-row-head">
                  <span>{t('drug')}</span>
                  <span className="erx-n">{t('quota')}</span>
                  <span className="erx-n">{t('prescriptions')}</span>
                  <span />
                </div>
                {g.rows.map((r) => {
                  const editing = editId === r._id
                  const itemKey = `item:${r._id}`
                  return (
                    <div key={r._id} className={`erx-row ${editing ? 'is-editing' : ''}`}>
                      <span className="erx-drug">{r.drug?.name || t('deletedDrug')}</span>
                      {editing ? (
                        <>
                          <span className="erx-n" data-label={t('quota')}>
                            <input type="number" min="0" className="erx-num" value={draft.quota} aria-label={t('quota')}
                              onChange={(e) => setDraft((d) => ({ ...d, quota: e.target.value }))} />
                          </span>
                          <span className="erx-n" data-label={t('prescriptions')}>
                            <input type="number" min="0" className="erx-num" value={draft.prescription} aria-label={t('prescriptions')} autoFocus
                              onChange={(e) => setDraft((d) => ({ ...d, prescription: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(r); if (e.key === 'Escape') setEditId(null) }} />
                          </span>
                          <span className="erx-actions">
                            <button type="button" className="erx-btn erx-btn-primary" disabled={busyId === r._id} onClick={() => saveEdit(r)}>{t('save')}</button>
                            <button type="button" className="erx-btn" onClick={() => setEditId(null)}>{t('cancel')}</button>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="erx-n" data-label={t('quota')}>{num(r.quota)}</span>
                          <span className="erx-n erx-rx" data-label={t('prescriptions')}>{num(r.prescription)}</span>
                          <span className="erx-actions">
                            {confirmKey === itemKey ? (
                              <>
                                <button type="button" className="erx-btn erx-btn-danger" disabled={busyId === r._id} onClick={() => deleteRow(r)}>{t('yesDelete')}</button>
                                <button type="button" className="erx-btn" onClick={() => setConfirmKey(null)}>{t('cancel')}</button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="erx-icon" title={t('edit')} aria-label={t('edit')} onClick={() => startEdit(r)}><IconEdit /></button>
                                <button type="button" className="erx-icon erx-icon-danger" title={t('delete')} aria-label={t('delete')} onClick={() => { setEditId(null); setConfirmKey(itemKey) }}><IconTrash /></button>
                              </>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
