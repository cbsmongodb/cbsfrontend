'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api'
import EmployeeSaleModal from './EmployeeSaleModal'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './EmployeeSales.css'
import { useTranslations, useLocale } from 'next-intl'

const thIcon = { display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }
const IconBox = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#13608f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /><path d="m7.5 5.5 9 5" />
  </svg>
)
const IconMoney = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2f9e6e" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <text x="12" y="16.4" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#2f9e6e" stroke="none">₾</text>
  </svg>
)

const FTXT = {
  ka: { division: 'დივიზიონი', group: 'ჯგუფი', all: 'ყველა', allGroups: 'ყველა ჯგუფი' },
  en: { division: 'Division', group: 'Group', all: 'All', allGroups: 'All groups' },
  ru: { division: 'Дивизион', group: 'Группа', all: 'Все', allGroups: 'Все группы' },
}
const CTXT = {
  ka: { col: 'დაკორექტირებული', edit: 'თანხის კორექტირება', note: 'მიზეზი (არასავალდებულო)', save: 'შენახვა', cancel: 'გაუქმება', clear: 'ცარიელი = კორექტირების მოხსნა', by: 'დააკორექტირა' },
  en: { col: 'Corrected', edit: 'Correct the amount', note: 'Reason (optional)', save: 'Save', cancel: 'Cancel', clear: 'empty = remove the correction', by: 'corrected by' },
  ru: { col: 'Скорректировано', edit: 'Корректировка суммы', note: 'Причина (необязательно)', save: 'Сохранить', cancel: 'Отмена', clear: 'пусто = убрать корректировку', by: 'скорректировал' },
}
const money2 = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const BOXES_HEAD = { ka: 'გაყიდული ყუთები', en: 'Boxes sold', ru: 'Продано упаковок' }
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import MonthPicker from '@/components/MonthPicker/MonthPicker'
import { fmtDate } from '@/lib/date'

export default function EmployeeSales() {
  const tu = useTranslations('ui')
  const tp = useTranslations('plannings')
  const tb = useTranslations('bonusesPage')
  const locale = useLocale()
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState('') // "YYYY-MM" or "" = all months
  // division / group filter: only the divisions this user may see
  const F = FTXT[locale] || FTXT.ka
  const [filters, setFilters] = useState({ sections: [], groups: [] })
  const [sectionId, setSectionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const groupsShown = useMemo(() => filters.groups.filter((g) => !sectionId || g.section === sectionId), [filters.groups, sectionId])
  const employeesShown = useMemo(() => {
    if (!sectionId && !groupId) return employees
    const ids = new Set()
    ;(groupId ? filters.groups.filter((g) => g.id === groupId) : groupsShown).forEach((g) => g.employees.forEach((e) => ids.add(e)))
    if (!groupId && sectionId) { const h = filters.sections.find((s) => s.id === sectionId)?.head; if (h) ids.add(h) }
    return employees.filter((e) => ids.has(String(e._id)))
  }, [employees, filters, groupsShown, sectionId, groupId])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  // amount correction (division managers + finance)
  const C = CTXT[locale] || CTXT.ka
  const CLR = {
    ka: { btn: 'გასუფთავება', hint: 'კორექტირების მოხსნა — დარჩება თავდაპირველი თანხა' },
    en: { btn: 'Clear', hint: 'Remove the correction — the original amount stays' },
    ru: { btn: 'Очистить', hint: 'Убрать корректировку — останется исходная сумма' },
  }[locale] || { btn: 'გასუფთავება', hint: 'კორექტირების მოხსნა — დარჩება თავდაპირველი თანხა' }
  const [corr, setCorr] = useState(null) // { id, amount }
  const [corrBusy, setCorrBusy] = useState(false)
  // corrClear: saveCorrection('', id) removes the correction — the sale counts with its original amount again
  async function saveCorrection(over, overId) {
    const id = overId || corr?.id
    if (!id) return
    const amount = typeof over === 'string' ? over : corr.amount
    setCorrBusy(true); setError('')
    try {
      await apiFetch(`/api/employee-sales/${id}/correction`, { method: 'PUT', body: JSON.stringify({ amount: String(amount ?? '').trim() }) })
      setCorr(null)
      await load(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setCorrBusy(false)
    }
  }
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    apiFetch('/api/employee-sales/employees').then(setEmployees).catch((err) => setError(err.message))
    apiFetch('/api/employee-sales/filters').then((f) => setFilters({ sections: [], groups: [], ...f })).catch(() => {})
  }, [])

  async function load(targetPage = 1, size = pageSize, m = month, emp = employeeId) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', size)
      if (search.trim()) params.set('search', search.trim())
      if (emp) params.set('employee', emp)
      if (groupId) params.set('group', groupId)
      else if (sectionId) params.set('section', sectionId)
      if (m) params.set('month', m)

      const result = await apiFetch(`/api/employee-sales?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // a new division / group -> reload (and drop a person who is not in it)
  const firstFilter = useRef(true)
  useEffect(() => {
    if (firstFilter.current) { firstFilter.current = false; return }
    let emp = employeeId
    if (emp && !employeesShown.some((e) => String(e._id) === String(emp))) { emp = ''; setEmployeeId('') }
    load(1, pageSize, month, emp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, groupId])

  // Excel: every sale that matches the filters (all pages), not only the visible page
  async function buildExcel() {
    const base = new URLSearchParams({ limit: 500 })
    if (search.trim()) base.set('search', search.trim())
    if (employeeId) base.set('employee', employeeId)
    if (month) base.set('month', month)
    if (groupId) base.set('group', groupId)
    else if (sectionId) base.set('section', sectionId)
    let all = [], pg = 1, last = 1
    do {
      base.set('page', pg)
      const r = await apiFetch(`/api/employee-sales?${base}`)
      all = all.concat(r.docs || [])
      last = r.pages || 1
      pg += 1
    } while (pg <= last)
    const XL = { ka: { date: 'თარიღი', emp: 'თანამშრომელი', amount: 'თანხა (ყუთები × ფასი)', corr: 'დაკორექტირებული', final: 'საბოლოო თანხა', boxes: 'გაყიდული ყუთები' },
      en: { date: 'Date', emp: 'Employee', amount: 'Amount (boxes × price)', corr: 'Corrected', final: 'Final amount', boxes: 'Boxes sold' },
      ru: { date: 'Дата', emp: 'Сотрудник', amount: 'Сумма (упаковки × цена)', corr: 'Скорректировано', final: 'Итоговая сумма', boxes: 'Продано упаковок' } }[locale] || {}
    const day = (d) => { if (!d) return ''; const t = new Date(+new Date(d) + 4 * 3600e3); return { value: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())), kind: 'date' } }
    return {
      headers: [XL.date, XL.emp, XL.amount, XL.corr, XL.final, XL.boxes],
      rows: all.map((r) => [
        day(r.date),
        r.employeeName || '—',
        { value: Number(r.saleAmount) || 0, kind: 'money' },
        r.correctedAmount != null ? { value: Number(r.correctedAmount), kind: 'money' } : '',
        { value: Number(r.correctedAmount ?? r.saleAmount) || 0, kind: 'money' },
        { value: Number(r.saleBoxes) || 0, kind: 'number' },
      ]),
    }
  }

  async function handleDelete(id) {
    if (!confirm(tu('k147'))) return
    try {
      await apiFetch(`/api/employee-sales/${id}`, { method: 'DELETE' })
      load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="employee-sales-page">
      {loading && <ReportLoader variant="page" />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><h1>{tu('k148')}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ExcelExportButton title={`${tu('k148')}${month ? ` — ${month.split('-').reverse().join('/')}` : ''}`} build={buildExcel} />
          <button className="btn" onClick={() => { setEditId(null); setShowModal(true) }}><span>{tu('k149')}</span></button>
        </div>
      </div>

      <div className="employee-sales-filters">
        <div className="employee-sales-filters-grid">
          <div className="employee-sales-field">
            <label>{tb('month')}</label>
            <MonthPicker value={month} onChange={(m) => { setMonth(m); load(1, pageSize, m) }} />
          </div>
          {filters.sections.length > 1 && (
            <div className="employee-sales-field">
              <label>{F.division}</label>
              <select className="field-input" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setGroupId('') }}>
                <option value="">{F.all}</option>
                {filters.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {groupsShown.length > 1 && (
            <div className="employee-sales-field">
              <label>{F.group}</label>
              <select className="field-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">{F.allGroups}</option>
                {groupsShown.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div className="employee-sales-field">
            <label>{tu('k044')}</label>
            <SearchableSelect
              options={employeesShown}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={tu('k092')}
            />
          </div>
          <button type="button" className="btn employee-sales-search-btn" onClick={() => load(1)} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : tu('k093')}</span>
          </button>
        </div>
        <input
          type="text"
          className="field-input"
          placeholder={tu('k139')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
          style={{ maxWidth: 280, marginTop: 14 }}
        />
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="employee-sales-table-wrap">
        <table className="employee-sales-table">
          <thead>
            <tr>
              <th>{tu('k096')}</th>
              <th>{tu('k044')}</th>
              <th><span style={thIcon}><IconMoney />{tu('k150')}</span></th>
              <th>{C.col}</th>
              <th><span style={thIcon}><IconBox />{BOXES_HEAD[locale] || BOXES_HEAD.ka}</span></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td data-label={tu('k096')}>{row.date ? fmtDate(row.date) : '—'}</td>
                <td data-label={tu('k044')}>{row.employeeName}</td>
                <td data-label={tu('k150')}>{money2(row.saleAmount)}</td>
                <td data-label={C.col} className="es-corr">
                  {corr?.id === row._id ? (
                    <div className="es-corr-edit">
                      <input type="text" inputMode="decimal" className="field-input" value={corr.amount} autoFocus placeholder={money2(row.saleAmount)} title={C.clear}
                        onChange={(e) => setCorr({ ...corr, amount: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveCorrection(); if (e.key === 'Escape') setCorr(null) }} />
                      <button type="button" className="es-corr-ok" disabled={corrBusy} onClick={() => saveCorrection()} title={C.save} aria-label={C.save}>✓</button>
                      {row.correctedAmount != null && (
                        <button type="button" className="es-corr-clear" disabled={corrBusy} onClick={() => saveCorrection('', row._id)} title={CLR.hint}>{CLR.btn}</button>
                      )}
                      <button type="button" className="es-corr-x" onClick={() => setCorr(null)} aria-label={C.cancel}>✕</button>
                    </div>
                  ) : (
                    <div className="es-corr-view">
                      {row.correctedAmount != null ? <b>{money2(row.correctedAmount)}</b> : <span className="es-muted">—</span>}
                      {data?.canCorrect && row.correctedAmount != null && (
                        <button type="button" className="es-corr-del" disabled={corrBusy} onClick={() => saveCorrection('', row._id)} title={CLR.hint} aria-label={CLR.hint}>✕</button>
                      )}
                      {data?.canCorrect && (
                        <button type="button" className="es-corr-btn" title={C.edit} aria-label={C.edit}
                          onClick={() => setCorr({ id: row._id, amount: row.correctedAmount != null ? String(row.correctedAmount) : '' })}>✏️</button>
                      )}
                    </div>
                  )}
                </td>
                <td data-label={BOXES_HEAD[locale] || BOXES_HEAD.ka}>{(row.saleBoxes || 0).toLocaleString('en-US')}</td>
                <td data-label="">
                  <button className="btn-gray btn-sm" onClick={() => { setEditId(row._id); setShowModal(true) }}><span>{tu('k101')}</span></button>
                  <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(row._id)}>
                    <span>{tu('k069')}</span>
                  </button>
                </td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={6}>{tu('k102')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="employee-sales-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1 || loading} onClick={() => load(1)} title="1">
            <span>«</span>
          </button>
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span className="employee-sales-pagination-info">
            {page} / {data.pages} ({data.total} {tu('k103')}
          </span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages || loading} onClick={() => load(page + 1)}>
            <span>→</span>
          </button>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages || loading} onClick={() => load(data.pages)} title={String(data.pages)}>
            <span>»</span>
          </button>
          <span className="employee-sales-pagination-size">
            {tp('showCount.prefix')}{' '}
            <select
              value={pageSize}
              onChange={(e) => {
                const size = Number(e.target.value)
                setPageSize(size)
                load(1, size)
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>{' '}
            {tp('showCount.suffix')}
          </span>
        </div>
      )}
    
      {showModal && (
        <EmployeeSaleModal
          employees={employees}
          editId={editId}
          onClose={() => { setShowModal(false); setEditId(null) }}
          onSaved={() => load(1)}
        />
      )}
    </div>
  )
}