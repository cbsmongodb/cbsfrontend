'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import '@/components/ReimbursementReport/ReimbursementReport.css'
import '@/components/LeavePayrollReport/LeavePayrollReport.css'
import './TimesheetReport.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const CODES = ['დ', 'ა/შ', 'უხ/შ', 'ს/ფ', 'გ', 'დ/შ']
const WD = {
  ka: ['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
}
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const codeClass = (v) => {
  if (/^\d/.test(String(v))) return 'ts-work'
  return { 'დ': 'ts-rest', 'ა/შ': 'ts-paid', 'უხ/შ': 'ts-unpaid', 'ს/ფ': 'ts-sick', 'გ': 'ts-absent', 'დ/შ': 'ts-maternity' }[v] || ''
}

async function downloadFile(path, name) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Download failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function TimesheetReport() {
  const t = useTranslations('reports')
  const locale = useLocale()
  const wdShort = (wd) => (WD[locale] || WD.ka)[wd]

  const [sheets, setSheets] = useState([])
  const [sheetKey, setSheetKey] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [grid, setGrid] = useState(null)
  const [docDate, setDocDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [picker, setPicker] = useState(null) // { member, dayIndex, x, y }
  const [mode, setMode] = useState('grid')   // grid | people
  const [editHead, setEditHead] = useState(null)

  useEffect(() => {
    apiFetch('/api/reports/timesheet/sheets')
      .then((list) => {
        setSheets(list)
        if (list.length) setSheetKey((k) => k || list[0].key)
      })
      .catch((e) => setError(e.message))
  }, [])

  async function load(key = sheetKey, m = month) {
    if (!key) return
    setLoading(true)
    setError('')
    try {
      const g = await apiFetch(`/api/reports/timesheet/grid?sheet=${encodeURIComponent(key)}&month=${m}`)
      setGrid(g)
      setDocDate(g.docDate)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [sheetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const sheet = sheets.find((s) => s.key === sheetKey)
  const t2 = (k, v) => t(`timesheet.${k}`, v)

  // ---- editing one day -------------------------------------------------------
  function openPicker(e, member, i) {
    const r = e.currentTarget.getBoundingClientRect()
    setPicker({ member, i, x: Math.min(r.left, window.innerWidth - 250), y: r.bottom + 6 })
  }
  async function setValue(value) {
    const { member, i } = picker
    const date = grid.days[i].key
    setPicker(null)
    try {
      await apiFetch('/api/reports/timesheet/cell', { method: 'PUT', body: JSON.stringify({ member: member._id, date, value }) })
      setGrid((g) => ({
        ...g,
        members: g.members.map((m) => {
          if (m._id !== member._id) return m
          const values = [...m.values]; const edited = [...m.edited]
          values[i] = value || m.auto[i]
          edited[i] = !!value
          const nums = values.filter((v) => /^\d/.test(v)).map(Number)
          return { ...m, values, edited, totalDays: nums.length, totalHours: nums.reduce((s, n) => s + n, 0) }
        }),
      }))
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => {
    if (!picker) return
    const close = (e) => { if (!e.target.closest('.ts-picker')) setPicker(null) }
    const esc = (e) => { if (e.key === 'Escape') setPicker(null) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [picker])

  // ---- download ------------------------------------------------------------------
  const docDateParam = () => {
    const m = String(docDate).match(/^(\d{4})-(\d{2})-(\d{2})$/)
    return m ? `${m[3]}.${m[2]}.${m[1]}` : docDate
  }
  async function exportOne() {
    if (!grid) return
    setBusy('one')
    try {
      await downloadFile(`/api/reports/timesheet/export?sheet=${sheetKey}&month=${month}&docDate=${encodeURIComponent(docDateParam())}`,
        `${t2('fileName')} - ${grid.sheet.title} - ${grid.monthName} ${grid.year}.xlsx`)
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }
  async function exportAll() {
    setBusy('all')
    try {
      await downloadFile(`/api/reports/timesheet/export?sheet=all&month=${month}&docDate=${encodeURIComponent(docDateParam())}`,
        `${t2('filesName')} - ${grid?.monthName || month} ${grid?.year || ''}.zip`)
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  // ---- head / responsible -----------------------------------------------------
  async function saveHead() {
    try {
      await apiFetch(`/api/reports/timesheet/sheets/${sheetKey}`, { method: 'PUT', body: JSON.stringify(editHead) })
      setSheets((list) => list.map((s) => (s.key === sheetKey ? { ...s, ...editHead } : s)))
      setGrid((g) => (g ? { ...g, sheet: { ...g.sheet, ...editHead } } : g))
      setEditHead(null)
    } catch (e) { setError(e.message) }
  }

  // DD.MM.YYYY <-> yyyy-mm-dd for the date input
  const docDateInput = useMemo(() => {
    const m = String(docDate).match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    return m ? `${m[3]}-${m[2]}-${m[1]}` : docDate
  }, [docDate])

  return (
    <div className="reimbursement-report leave-payroll timesheet-report">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{t2('title')}</h1>
          {loading && <ReportLoader />}
        </div>
        <p className="lp-subtitle">{t2('subtitle')}</p>
      </div>

      <div className="reimbursement-filters-card">
        <div className="reimbursement-filters-grid">
          <div className="reimbursement-field">
            <label>{t('common.month')}</label>
            <input type="month" className="field-input" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="reimbursement-field">
            <label>{t2('docDate')}</label>
            <input type="date" className="field-input" value={docDateInput} onChange={(e) => setDocDate(e.target.value)} />
          </div>
          <button type="button" className="btn reimbursement-search-btn" onClick={() => load()} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : t('common.search')}</span>
          </button>
        </div>
        <div className="lp-division-chips" role="tablist" aria-label={t2('department')}>
          <span className="lp-chips-label">{t2('department')}:</span>
          {sheets.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={sheetKey === s.key}
              className={`lp-chip ${sheetKey === s.key ? 'is-active' : ''}`}
              onClick={() => { setSheetKey(s.key); setMode('grid') }}
              disabled={loading}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      {grid && sheet && (
        <div className="ts-bar">
          <div className="ts-bar-info">
            <h2>{grid.sheet.title} <span>· {grid.monthName} {grid.year}</span></h2>
            {editHead ? (
              <div className="ts-head-edit">
                <label>{t2('head')}<input className="field-input" value={editHead.head} onChange={(e) => setEditHead({ ...editHead, head: e.target.value })} /></label>
                <label>{t2('responsible')}<input className="field-input" value={editHead.responsible} onChange={(e) => setEditHead({ ...editHead, responsible: e.target.value })} /></label>
                <label>{t2('sheetTitle')}<input className="field-input" value={editHead.title} onChange={(e) => setEditHead({ ...editHead, title: e.target.value })} /></label>
                <div className="ts-head-actions">
                  <button type="button" className="btn btn-sm" onClick={saveHead}>{t2('save')}</button>
                  <button type="button" className="btn-gray btn-sm" onClick={() => setEditHead(null)}>{t2('cancel')}</button>
                </div>
              </div>
            ) : (
              <p className="ts-head-line">
                <span>{t2('head')}: <b>{grid.sheet.head || '—'}</b></span>
                <span>{t2('responsible')}: <b>{grid.sheet.responsible || '—'}</b></span>
                <button type="button" className="ts-link" onClick={() => setEditHead({ head: grid.sheet.head || '', responsible: grid.sheet.responsible || '', title: grid.sheet.title })}>✎ {t2('change')}</button>
              </p>
            )}
            <p className="ts-meta">{t2('workingDays', { n: grid.workingDays })} · {t2('people', { n: grid.members.length })}</p>
          </div>
          <div className="ts-bar-actions">
            <div className="reimb-view-toggle" role="tablist">
              <button type="button" className={mode === 'grid' ? 'active' : ''} onClick={() => setMode('grid')}>{t2('viewGrid')}</button>
              <button type="button" className={mode === 'people' ? 'active' : ''} onClick={() => setMode('people')}>{t2('viewPeople')}</button>
            </div>
            <button type="button" className="ts-excel" onClick={exportOne} disabled={!!busy}>
              {busy === 'one' ? <span className="btn-spinner" aria-hidden="true" /> : <ExcelIcon />} {t2('download')}
            </button>
            <button type="button" className="ts-excel ts-excel-all" onClick={exportAll} disabled={!!busy}>
              {busy === 'all' ? <span className="btn-spinner" aria-hidden="true" /> : <ExcelIcon />} {t2('downloadAll')}
            </button>
          </div>
        </div>
      )}

      {grid && mode === 'grid' && (
        <>
          <div className="lp-legend">
            {[['8', 'work'], ['დ', 'rest'], ['ა/შ', 'paid'], ['უხ/შ', 'unpaid'], ['ს/ფ', 'sick'], ['გ', 'absent'], ['დ/შ', 'maternity']].map(([c, k]) => (
              <span key={k}><i className={`ts-sw ${codeClass(c)}`}>{c}</i>{t2(`code.${k}`)}</span>
            ))}
            <span className="ts-legend-hint">✎ {t2('editHint')}</span>
          </div>

          <div className="ts-scroll">
            <table className="ts-table">
              <thead>
                <tr>
                  <th className="ts-sticky ts-c-num">#</th>
                  <th className="ts-sticky ts-c-name">{t2('name')}</th>
                  <th className="ts-c-id">{t2('personalId')}</th>
                  <th className="ts-c-pos">{t2('position')}</th>
                  {grid.days.map((d) => (
                    <th key={d.key} className={`ts-day ${d.weekend || d.holiday ? 'is-off' : ''}`} title={d.holiday ? t2('holiday') : undefined}>
                      <b>{d.day}</b><i>{wdShort(d.wd)}</i>
                    </th>
                  ))}
                  <th className="ts-total">{t2('totalDays')}</th>
                  <th className="ts-total">{t2('totalHours')}</th>
                </tr>
              </thead>
              <tbody>
                {grid.members.map((m, idx) => (
                  <tr key={m._id}>
                    <td className="ts-sticky ts-c-num">{idx + 1}</td>
                    <td className="ts-sticky ts-c-name">
                      <strong>{m.nameKa}</strong>
                      {!m.employee && <span className="ts-nolink" title={t2('notLinkedHint')}>{t2('notLinked')}</span>}
                    </td>
                    <td className="ts-c-id">{m.personalId}</td>
                    <td className="ts-c-pos" title={m.position}>{m.position}</td>
                    {m.values.map((v, i) => (
                      <td key={i} className={`ts-cell ${codeClass(v)} ${m.edited[i] ? 'is-edited' : ''} ${grid.days[i].weekend || grid.days[i].holiday ? 'is-off' : ''}`}>
                        <button type="button" onClick={(e) => openPicker(e, m, i)} title={`${grid.days[i].day} — ${v}`}>{v}</button>
                      </td>
                    ))}
                    <td className="ts-total">{m.totalDays}</td>
                    <td className="ts-total">{m.totalHours}</td>
                  </tr>
                ))}
                {grid.members.length === 0 && (
                  <tr><td colSpan={grid.days.length + 6} className="ts-empty">{t2('empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {grid && mode === 'people' && (
        <PeopleEditor
          sheetKey={sheetKey}
          sheets={sheets}
          members={grid.members}
          capacity={grid.capacity}
          t2={t2}
          wdShort={wdShort}
          onChanged={() => {
            load()
            apiFetch('/api/reports/timesheet/sheets').then(setSheets).catch(() => {})
          }}
          onError={setError}
        />
      )}

      {picker && (
        <div className="ts-picker" style={{ left: picker.x, top: picker.y }}>
          <p>{picker.member.nameKa} · {grid.days[picker.i].day} {grid.monthName}</p>
          <div className="ts-picker-grid">
            {[...new Set([String(picker.member.hours || 8), '8', '4', '2'])].map((h) => (
              <button key={h} type="button" className="ts-work" onClick={() => setValue(h)}>{h}</button>
            ))}
            {CODES.map((c) => (
              <button key={c} type="button" className={codeClass(c)} onClick={() => setValue(c)}>{c}</button>
            ))}
          </div>
          {picker.member.edited[picker.i] && (
            <button type="button" className="ts-picker-reset" onClick={() => setValue('')}>↺ {t2('resetAuto')} ({picker.member.auto[picker.i]})</button>
          )}
        </div>
      )}
    </div>
  )
}

function ExcelIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="#1D7A45" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

const EMPTY = { employee: '', nameKa: '', personalId: '', position: '', hours: 8, workDays: [1, 2, 3, 4, 5] }

function PeopleEditor({ sheetKey, sheets, members, capacity, t2, wdShort, onChanged, onError }) {
  const [rows, setRows] = useState(() => members.map((m) => ({ ...m, employee: m.employee?._id || '', _dirty: false })))
  const [available, setAvailable] = useState([])
  const [draft, setDraft] = useState(EMPTY)
  const [saving, setSaving] = useState('')
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false } else setRows(members.map((m) => ({ ...m, employee: m.employee?._id || '', _dirty: false })))
  }, [members])
  useEffect(() => { apiFetch('/api/reports/timesheet/available-employees').then(setAvailable).catch(() => {}) }, [members])

  const edit = (id, patch) => setRows((list) => list.map((r) => (r._id === id ? { ...r, ...patch, _dirty: true } : r)))
  const toggleDay = (days, d) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d])

  async function run(key, fn) {
    setSaving(key)
    try { await fn(); onChanged() } catch (e) { onError(e.message) } finally { setSaving('') }
  }
  const save = (r) => run(r._id, () => apiFetch(`/api/reports/timesheet/members/${r._id}`, {
    method: 'PUT', body: JSON.stringify({ nameKa: r.nameKa, personalId: r.personalId, position: r.position, hours: r.hours, workDays: r.workDays }),
  }))
  const move = (r, dir) => run(r._id, () => apiFetch(`/api/reports/timesheet/members/${r._id}/move`, { method: 'POST', body: JSON.stringify({ dir }) }))
  const moveTo = (r, sheet) => run(r._id, () => apiFetch(`/api/reports/timesheet/members/${r._id}`, { method: 'PUT', body: JSON.stringify({ sheet }) }))
  const remove = (r) => {
    if (!window.confirm(t2('removeConfirm', { name: r.nameKa }))) return
    run(r._id, () => apiFetch(`/api/reports/timesheet/members/${r._id}`, { method: 'DELETE' }))
  }
  const add = () => run('add', async () => {
    await apiFetch('/api/reports/timesheet/members', { method: 'POST', body: JSON.stringify({ ...draft, sheet: sheetKey }) })
    setDraft(EMPTY)
  })

  const WorkDays = ({ value, onChange }) => (
    <span className="ts-wd">
      {WEEK_ORDER.map((d) => (
        <button key={d} type="button" className={value.includes(d) ? 'on' : ''} onClick={() => onChange(toggleDay(value, d))}>{wdShort(d)}</button>
      ))}
    </span>
  )

  return (
    <div className="ts-people">
      <p className="ts-people-hint">{t2('peopleHint', { n: capacity })}</p>
      <div className="ts-scroll">
        <table className="ts-table ts-people-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t2('nameKa')}</th>
              <th>{t2('personalId')}</th>
              <th>{t2('position')}</th>
              <th>{t2('hours')}</th>
              <th>{t2('workDaysLabel')}</th>
              <th>{t2('crmEmployee')}</th>
              <th>{t2('moveTo')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r._id} className={r._dirty ? 'is-dirty' : ''}>
                <td className="ts-order">
                  <button type="button" onClick={() => move(r, -1)} disabled={i === 0 || !!saving} aria-label="up">▲</button>
                  <button type="button" onClick={() => move(r, 1)} disabled={i === rows.length - 1 || !!saving} aria-label="down">▼</button>
                </td>
                <td><input className="field-input" value={r.nameKa} onChange={(e) => edit(r._id, { nameKa: e.target.value })} /></td>
                <td><input className="field-input ts-in-id" value={r.personalId} onChange={(e) => edit(r._id, { personalId: e.target.value })} /></td>
                <td><input className="field-input" value={r.position} onChange={(e) => edit(r._id, { position: e.target.value })} /></td>
                <td><input className="field-input ts-in-hours" type="number" min="1" max="24" value={r.hours} onChange={(e) => edit(r._id, { hours: e.target.value })} /></td>
                <td><WorkDays value={r.workDays || []} onChange={(v) => edit(r._id, { workDays: v })} /></td>
                <td className="ts-crm">{members.find((m) => m._id === r._id)?.employee?.name || <span className="ts-nolink">{t2('notLinked')}</span>}</td>
                <td>
                  <select className="field-input" value="" onChange={(e) => e.target.value && moveTo(r, e.target.value)}>
                    <option value="">—</option>
                    {sheets.filter((s) => s.key !== sheetKey).map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}
                  </select>
                </td>
                <td className="ts-row-actions">
                  {r._dirty && (
                    <button type="button" className="btn btn-sm" onClick={() => save(r)} disabled={!!saving}>
                      {saving === r._id ? <span className="btn-spinner" aria-hidden="true" /> : t2('save')}
                    </button>
                  )}
                  <button type="button" className="ts-remove" onClick={() => remove(r)} disabled={!!saving} title={t2('remove')}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ts-add">
        <h3>{t2('addPerson')}</h3>
        <div className="ts-add-grid">
          <label>{t2('crmEmployee')}
            <SearchableSelect
              options={available}
              value={draft.employee}
              onChange={(id) => setDraft((d) => ({ ...d, employee: id, nameKa: d.nameKa || available.find((a) => a._id === id)?.name || '' }))}
              getLabel={(o) => o.name}
              placeholder={t2('crmOptional')}
            />
          </label>
          <label>{t2('nameKa')}<input className="field-input" value={draft.nameKa} onChange={(e) => setDraft({ ...draft, nameKa: e.target.value })} /></label>
          <label>{t2('personalId')}<input className="field-input" value={draft.personalId} onChange={(e) => setDraft({ ...draft, personalId: e.target.value })} /></label>
          <label>{t2('position')}<input className="field-input" value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} /></label>
          <label>{t2('hours')}<input className="field-input ts-in-hours" type="number" min="1" max="24" value={draft.hours} onChange={(e) => setDraft({ ...draft, hours: e.target.value })} /></label>
          <label>{t2('workDaysLabel')}<WorkDays value={draft.workDays} onChange={(v) => setDraft({ ...draft, workDays: v })} /></label>
        </div>
        <button type="button" className="btn" onClick={add} disabled={!draft.nameKa.trim() || !!saving || rows.length >= capacity}>
          <span>{saving === 'add' ? <span className="btn-spinner" aria-hidden="true" /> : `+ ${t2('add')}`}</span>
        </button>
      </div>
    </div>
  )
}
