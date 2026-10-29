'use client'

// "შეყვანილი რეცეპტები" — every rep sees the prescriptions they entered for
// a month, grouped by doctor, and can fix a number or delete a line / doctor.
import { useCallback, useEffect, useMemo, useState } from 'react'
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
const ALL_ID = 'all'
const PAGE_SIZE = 15
const num = (n) => Number(n || 0).toLocaleString('ka-GE', { maximumFractionDigits: 2 })

const IconEdit = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
)
const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
)

export default function EnteredPrescriptions() {
  const t = useTranslations('enteredRx')

  const [me, setMe] = useState(null)
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [search, setSearch] = useState('')

  const [items, setItems] = useState([])
  // pages of 15 doctor cards, loaded one page at a time from the server
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [order, setOrder] = useState([])
  const [srvTotals, setSrvTotals] = useState({ doctors: 0, lines: 0, rx: 0, employees: 0 })
  const [q, setQ] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 400)
    return () => clearTimeout(id)
  }, [search])
  useEffect(() => { setPage(1) }, [employeeId, month, q])
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
      const qs = `period=${encodeURIComponent(toPeriod(month))}${own ? '' : `&employee=${employeeId}`}`
        + `&page=${page}&limit=${PAGE_SIZE}${q ? `&search=${encodeURIComponent(q)}` : ''}`
      const data = await apiFetch(`/api/my-entries?${qs}`)
      if (Array.isArray(data)) {           // older server without pages
        setItems(data); setOrder([]); setPages(1); setSrvTotals(null)
      } else {
        setItems(data.items || [])
        setOrder(data.order || [])
        setPages(data.pages || 1)
        setSrvTotals(data.totals || null)
        if (page > (data.pages || 1)) setPage(data.pages || 1)
      }
    } catch (err) {
      setError(err.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [employeeId, month, me, page, q])

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
      const key = `${it.employee?._id || ''}|${it.doctor?._id || 'none'}`
      if (!map.has(key)) map.set(key, {
        key, doctorId: it.doctor?._id, doctor: personName(it.doctor) || t('deletedDoctor'), hospital: it.hospital?.name || '',
        employeeId: it.employee?._id, employeeName: personName(it.employee), rows: [],
      })
      map.get(key).rows.push(it)
    }
    const list = [...map.values()]
    list.forEach((g) => g.rows.sort((a, b) => (a.drug?.name || '').localeCompare(b.drug?.name || '')))
    if (order.length) {
      const pos = new Map(order.map((k, i) => [k, i]))
      return list.sort((a, b) => (pos.get(a.key) ?? 1e9) - (pos.get(b.key) ?? 1e9))
    }
    return list.sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'ka') || a.doctor.localeCompare(b.doctor, 'ka'))
  }, [items, order, t])

  const totals = useMemo(() => srvTotals || ({
    employees: new Set(groups.map((g) => g.employeeId)).size,
    doctors: groups.length,
    lines: groups.reduce((s, g) => s + g.rows.length, 0),
    rx: groups.reduce((s, g) => s + g.rows.reduce((a, r) => a + (r.prescription || 0), 0), 0),
  }), [groups, srvTotals])

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
      await load()
      setConfirmKey(null)
      setNotice(t('deleted'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteDoctor(g) {
    setBusyId(`doc:${g.key}`)
    setError('')
    try {
      const emp = isAll ? g.employeeId : employeeId
      const own = me && emp === me._id
      const q = `period=${encodeURIComponent(toPeriod(month))}${own ? '' : `&employee=${emp}`}`
      await apiFetch(`/api/my-entries/doctor/${g.doctorId}?${q}`, { method: 'DELETE' })
      await load()
      setConfirmKey(null)
      setNotice(t('deleted'))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const showEmployeePicker = employees.length > 1
  const isAll = employeeId === ALL_ID
  const pickerOptions = useMemo(
    () => (employees.length > 1 ? [{ _id: ALL_ID, firstName: t('allEmployees'), lastName: '' }, ...employees] : employees),
    [employees, t]
  )

  return (
    <div className="erx-page">
      {loading && <ReportLoader variant="page" />}

      <div className="erx-head">
        <div>
          <h1>{t('title')}</h1>
          <p className="erx-sub">{t('subtitle')}</p>
        </div>
      </div>

      <div className="sales-listing-filters erx-filters">
        {showEmployeePicker && (
          <div className="erx-field">
            <label>{t('employee')}</label>
            <SearchableSelect
              options={pickerOptions}
              value={employeeId}
              onChange={(v) => setEmployeeId(v || (me?._id ?? ''))}
              getLabel={(e) => personName(e)}
              placeholder={t('employee')}
            />
          </div>
        )}
        <div className="erx-field">
          <label>{t('month')}</label>
          <input type="month" className="field-input field-date" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        <div className="erx-field erx-search">
          <label>{t('search')}</label>
          <input type="text" className="field-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPh')} />
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}
      {notice && <div className="erx-notice">✓ {notice}</div>}

      {!loading && items.length > 0 && (
        <div className="erx-stats">
          {isAll && <div className="erx-stat"><b>{totals.employees}</b><span>{t('employeesCount')}</span></div>}
          <div className="erx-stat"><b>{totals.doctors}</b><span>{t('doctors')}</span></div>
          <div className="erx-stat"><b>{totals.lines}</b><span>{t('lines')}</span></div>
          <div className="erx-stat"><b>{num(totals.rx)}</b><span>{t('prescriptions')}</span></div>
        </div>
      )}

      {!loading && items.length === 0 && employeeId && (
        <div className="erx-empty">
          <p>{q ? t('noMatch') : t('empty')}</p>
        </div>
      )}

      <div className="erx-list">
        {groups.map((g) => {
          const docKey = `doc:${g.key}`
          return (
            <section key={g.key} className="erx-card">
              <header className="erx-card-head">
                <div className="erx-doc">
                  <span className="erx-avatar" aria-hidden="true">{g.doctor.charAt(0)}</span>
                  <div>
                    {isAll && g.employeeName && <div className="erx-emp">{g.employeeName}</div>}
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

      {pages > 1 && (
        <div className="erx-pager">
          <button type="button" className="erx-btn" disabled={page <= 1 || loading} onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>‹ {t('prev')}</button>
          <span className="erx-pager-info">{t('pageOf', { page, pages })}</span>
          <button type="button" className="erx-btn" disabled={page >= pages || loading} onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{t('next')} ›</button>
        </div>
      )}
    </div>
  )
}
