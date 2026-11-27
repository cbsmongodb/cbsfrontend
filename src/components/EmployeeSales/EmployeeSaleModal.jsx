"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { apiFetch } from "@/lib/api"
import GroupedEmployeePicker from "./GroupedEmployeePicker"
import "@/components/EmployeeTargets/EmployeeTargetModal.css"
import "./EmployeeSaleModal.css"
import { useTranslations, useLocale } from 'next-intl'
import { useMonthNames } from '@/lib/months'

const CURRENT_YEAR = new Date().getUTCFullYear()

// saleBatch: several employees' sales in one window, saved together
const TXT = {
  ka: {
    people: 'თანამშრომლები ამ შენახვაში', add: 'შემდეგი თანამშრომელი', noOne: 'აირჩიეთ თანამშრომელი',
    drugsN: (n) => `${n} წამალი`, boxesN: (n) => `${n} ყუთი`, remove: 'ამოშლა', removeAsk: (n) => `${n} — შეყვანილი წამლები წაიშლება. ამოვშალო?`,
    other: 'სხვა', showAll: 'ყველა წამალი', onlyGroup: 'მხოლოდ ჯგუფი', pickAll: 'ყველას მონიშვნა', clearAll: 'ყველას მოხსნა',
    already: 'ამ თვეზე ამ თანამშრომელს გაყიდვა უკვე აქვს შეყვანილი — შენახვისას კიდევ ერთი დაემატება.',
    missingBoxes: (n) => `${n} მონიშნულ წამალს ყუთები არ აქვს — ჩაწერეთ ან მოხსენით`, needEmployee: 'ამ ჩანართზე თანამშრომელი არ არის არჩეული', needDrug: 'ერთი წამალი მაინც ყუთებით',
    total: 'სულ', peopleN: (n) => `${n} თანამშრომელი`, saveN: (n) => (n > 1 ? `ყველას შენახვა (${n})` : 'შენახვა'), saving: (i, n) => `ვინახავ ${i} / ${n}…`,
    saved: 'შენახულია', closeAsk: 'შეყვანილი მონაცემები არ შენახულა. დავხურო?', step: 'ნაბიჯი', month: 'თვე — ერთი ყველასთვის',
    hint: 'ერთს რომ მორჩებით, დააჭირეთ „შემდეგი თანამშრომელი“ — ბოლოს ყველა ერთად შეინახება.',
  },
  en: {
    people: 'Employees in this save', add: 'Next employee', noOne: 'Choose an employee',
    drugsN: (n) => `${n} drugs`, boxesN: (n) => `${n} boxes`, remove: 'Remove', removeAsk: (n) => `${n} — the entered drugs will be lost. Remove?`,
    other: 'Other', showAll: 'All drugs', onlyGroup: 'Only group', pickAll: 'Select all', clearAll: 'Clear all',
    already: 'This employee already has a sale this month — saving adds another one.',
    missingBoxes: (n) => `${n} ticked drugs have no boxes — fill in or untick`, needEmployee: 'No employee chosen on this tab', needDrug: 'At least one drug with boxes',
    total: 'Total', peopleN: (n) => `${n} employee${n > 1 ? 's' : ''}`, saveN: (n) => (n > 1 ? `Save all (${n})` : 'Save'), saving: (i, n) => `Saving ${i} / ${n}…`,
    saved: 'Saved', closeAsk: 'The entered data is not saved. Close?', step: 'Step', month: 'Month — one for everyone',
    hint: 'When one is done, press “Next employee” — everything is saved together at the end.',
  },
  ru: {
    people: 'Сотрудники в этом сохранении', add: 'Следующий сотрудник', noOne: 'Выберите сотрудника',
    drugsN: (n) => `${n} препар.`, boxesN: (n) => `${n} коробок`, remove: 'Убрать', removeAsk: (n) => `${n} — введённые препараты пропадут. Убрать?`,
    other: 'Другие', showAll: 'Все препараты', onlyGroup: 'Только группа', pickAll: 'Выбрать все', clearAll: 'Снять все',
    already: 'У сотрудника уже есть продажа за этот месяц — при сохранении добавится ещё одна.',
    missingBoxes: (n) => `У ${n} отмеченных препаратов нет коробок — введите или снимите`, needEmployee: 'На этой вкладке не выбран сотрудник', needDrug: 'Хотя бы один препарат с коробками',
    total: 'Всего', peopleN: (n) => `${n} сотр.`, saveN: (n) => (n > 1 ? `Сохранить все (${n})` : 'Сохранить'), saving: (i, n) => `Сохраняю ${i} / ${n}…`,
    saved: 'Сохранено', closeAsk: 'Введённые данные не сохранены. Закрыть?', step: 'Шаг', month: 'Месяц — один для всех',
    hint: 'Закончив с одним, нажмите «Следующий сотрудник» — в конце всё сохранится вместе.',
  },
}

let KEY = 0
const blankTab = () => ({ key: ++KEY, employeeId: "", checked: {}, boxes: {}, pinned: {}, allDrugs: false, search: "", bulk: false })
const fmt = (n) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function EmployeeSaleModal({ employees, editId, onClose, onSaved }) {
  const tu = useTranslations('ui')
  const T = TXT[useLocale()] || TXT.ka
  const MONTHS = useMonthNames()
  const [month, setMonth] = useState(new Date().getUTCMonth())
  const [year, setYear] = useState(CURRENT_YEAR)
  const [drugs, setDrugs] = useState([])
  const [filters, setFilters] = useState({ sections: [], groups: [] })
  const [tabs, setTabs] = useState(() => [blankTab()])
  const [activeKey, setActiveKey] = useState(() => null)
  const [saving, setSaving] = useState(null) // { i, n }
  const [error, setError] = useState("")
  const [badKeys, setBadKeys] = useState({}) // key -> message
  const [existing, setExisting] = useState({}) // "empId|YYYY-MM" -> true
  const [loadingEdit, setLoadingEdit] = useState(!!editId)
  const listRef = useRef(null)

  const active = tabs.find((t) => t.key === activeKey) || tabs[0]
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    apiFetch("/api/employee-sales/visible-drugs").then(setDrugs).catch((err) => setError(err.message))
    apiFetch("/api/employee-sales/filters").then((f) => setFilters({ sections: [], groups: [], ...f })).catch(() => {})
  }, [])

  // editing one saved sale: one employee, as before
  useEffect(() => {
    if (!editId) return
    apiFetch(`/api/employee-sales/${editId}`)
      .then((s) => {
        if (s.date) { setMonth(new Date(s.date).getUTCMonth()); setYear(new Date(s.date).getUTCFullYear()) }
        const chk = {}, bx = {}
        ;(s.items || []).forEach((it) => { chk[it.drug] = true; bx[it.drug] = it.totalNoOfBoxes })
        const tab = { ...blankTab(), employeeId: String(s.employee?._id || s.employee || ""), checked: chk, boxes: bx, pinned: chk, allDrugs: true }
        setTabs([tab]); setActiveKey(tab.key)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingEdit(false))
  }, [editId])

  // does the chosen employee already have a sale this month? (new sales only)
  useEffect(() => {
    if (editId) return
    tabs.forEach((t) => {
      if (!t.employeeId) return
      const k = `${t.employeeId}|${monthKey}`
      if (k in existing) return
      setExisting((e) => ({ ...e, [k]: false }))
      apiFetch(`/api/employee-sales?employee=${t.employeeId}&month=${monthKey}&limit=1`)
        .then((r) => setExisting((e) => ({ ...e, [k]: (r?.total || r?.docs?.length || 0) > 0 })))
        .catch(() => {})
    })
  }, [tabs, monthKey, editId, existing])

  const update = (key, fn) => setTabs((ts) => ts.map((t) => (t.key === key ? { ...t, ...fn(t) } : t)))
  const nameOf = (id) => { const e = employees.find((x) => String(x._id) === String(id)); return e ? (e.name || `${e.firstName} ${e.lastName || ''}`.trim()) : '' }
  const statsOf = (t) => {
    const ids = Object.keys(t.checked).filter((id) => t.checked[id])
    const withBoxes = ids.filter((id) => Number(t.boxes[id]) > 0)
    return { ticked: ids.length, filled: withBoxes.length, missing: ids.length - withBoxes.length, boxes: withBoxes.reduce((s, id) => s + Number(t.boxes[id]), 0) }
  }

  // ----- the active tab -----
  const used = new Set(tabs.filter((t) => t.key !== active.key && t.employeeId).map((t) => String(t.employeeId)))
  const pickable = employees.filter((e) => !used.has(String(e._id)))
  const theGroup = active.employeeId ? filters.groups.find((g) => g.employees.includes(String(active.employeeId)) && g.drugs?.length) || null : null
  const groupDrugs = !active.allDrugs && theGroup ? new Set(theGroup.drugs) : null
  const q = active.search.trim().toLowerCase()
  const filtered = drugs
    .filter((d) => !groupDrugs || groupDrugs.has(String(d._id)) || active.checked[d._id])
    .filter((d) => !q || d.name.toLowerCase().includes(q))
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (active.pinned[b.d._id] || active.checked[b.d._id] ? 1 : 0) - (active.pinned[a.d._id] || active.checked[a.d._id] ? 1 : 0) || a.i - b.i)
    .map((x) => x.d)
  const allPicked = filtered.length > 0 && filtered.every((d) => active.checked[d._id])
  const st = statsOf(active)

  function toggle(id) {
    update(active.key, (t) => {
      const checked = { ...t.checked, [id]: !t.checked[id] }
      const boxes = { ...t.boxes }
      if (!checked[id]) delete boxes[id]
      return { checked, boxes, bulk: false }
    })
    setBadKeys((b) => { const c = { ...b }; delete c[active.key]; return c })
  }
  function pickAll() {
    update(active.key, (t) => {
      const checked = { ...t.checked }, boxes = { ...t.boxes }
      filtered.forEach((d) => { checked[d._id] = !allPicked; if (allPicked) delete boxes[d._id] })
      return { checked, boxes, bulk: true }
    })
  }
  function addTab() {
    const t = blankTab()
    setTabs((ts) => [...ts, t]); setActiveKey(t.key); setError("")
    listRef.current?.scrollTo?.({ top: 0 })
  }
  function removeTab(t) {
    const s = statsOf(t)
    if ((s.ticked > 0) && !window.confirm(T.removeAsk(nameOf(t.employeeId) || T.noOne))) return
    setTabs((ts) => {
      const rest = ts.filter((x) => x.key !== t.key)
      const next = rest.length ? rest : [blankTab()]
      if (t.key === active.key) setActiveKey(next[Math.max(0, ts.findIndex((x) => x.key === t.key) - 1)]?.key ?? next[0].key)
      return next
    })
  }
  // outsideClick: a click outside the window closes it only while nothing is entered
  function outside() {
    const dirty = editId || tabs.some((t) => t.employeeId || statsOf(t).ticked > 0)
    if (!dirty && !saving) onClose()
  }
  function close() {
    const dirty = tabs.some((t) => t.employeeId || statsOf(t).ticked > 0)
    if (!editId && dirty && !saving && !window.confirm(T.closeAsk)) return
    onClose()
  }

  // ----- save everything -----
  async function saveAll() {
    setError(""); setBadKeys({})
    // drop completely empty extra tabs, check the rest
    const work = tabs.filter((t, i) => t.employeeId || statsOf(t).ticked > 0 || (tabs.length === 1 && i === 0))
    const bad = {}
    work.forEach((t) => {
      const s = statsOf(t)
      if (!t.employeeId) bad[t.key] = T.needEmployee
      else if (s.missing > 0) bad[t.key] = T.missingBoxes(s.missing)
      else if (s.filled === 0) bad[t.key] = T.needDrug
    })
    if (Object.keys(bad).length) {
      setBadKeys(bad)
      const first = work.find((t) => bad[t.key])
      setActiveKey(first.key)
      setError(`${nameOf(first.employeeId) || T.noOne}: ${bad[first.key]}`)
      return
    }
    const date = new Date(Date.UTC(year, month, 1)).toISOString()
    let done = 0
    for (const t of work) {
      setSaving({ i: done + 1, n: work.length })
      setActiveKey(t.key)
      const items = Object.keys(t.checked).filter((id) => t.checked[id] && Number(t.boxes[id]) > 0)
        .map((drug) => ({ drug, totalNoOfBoxes: Number(t.boxes[drug]) }))
      try {
        const body = JSON.stringify({ employee: t.employeeId, date, items })
        if (editId) await apiFetch(`/api/employee-sales/${editId}`, { method: "PUT", body })
        else await apiFetch("/api/employee-sales", { method: "POST", body })
        done++
        if (!editId) setTabs((ts) => ts.filter((x) => x.key !== t.key)) // saved -> off the list
      } catch (err) {
        setSaving(null)
        setBadKeys({ [t.key]: err.message })
        setError(`${nameOf(t.employeeId)}: ${err.message}${done ? ` — ${done} ${T.saved.toLowerCase()}` : ''}`)
        if (done) onSaved()
        return
      }
    }
    setSaving(null)
    onSaved()
    onClose()
  }

  const batch = !editId
  const filledTabs = tabs.filter((t) => t.employeeId && statsOf(t).filled > 0)
  const totals = filledTabs.reduce((a, t) => { const s = statsOf(t); return { drugs: a.drugs + s.filled, boxes: a.boxes + s.boxes } }, { drugs: 0, boxes: 0 })
  const saveCount = Math.max(1, tabs.filter((t) => t.employeeId || statsOf(t).ticked > 0).length)

  return (
    <div className="et-modal-overlay" onClick={outside}>
      <div className={`et-modal${batch ? " sb-modal" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="et-modal-head">
          <h2>{editId ? tu('k151') : tu('k152')}</h2>
          <button className="et-modal-close" onClick={close}>×</button>
        </div>

        <div className="sb-body">
          {batch && (
            <aside className="sb-side">
              <div className="et-modal-field sb-month">
                <label>{T.month}</label>
                <select className="field-select" value={month} onChange={(e) => setMonth(Number(e.target.value))} disabled={!!saving}>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m} {year}</option>)}
                </select>
              </div>
              <div className="sb-side-title">{T.people}</div>
              <ol className="sb-tabs">
                {tabs.map((t, i) => {
                  const s = statsOf(t)
                  const isOn = t.key === active.key
                  return (
                    <li key={t.key} className={`sb-tab${isOn ? " is-on" : ""}${badKeys[t.key] ? " is-bad" : ""}${t.employeeId && s.filled > 0 && s.missing === 0 ? " is-ready" : ""}`}>
                      <button type="button" className="sb-tab-main" onClick={() => setActiveKey(t.key)} disabled={!!saving}>
                        <span className="sb-tab-num">{t.employeeId && s.filled > 0 && s.missing === 0 && !badKeys[t.key] ? "✓" : i + 1}</span>
                        <span className="sb-tab-text">
                          <b>{nameOf(t.employeeId) || T.noOne}</b>
                          <small>{badKeys[t.key] || (s.ticked ? `${T.drugsN(s.filled)} · ${T.boxesN(fmt(s.boxes))}` : '—')}</small>
                        </span>
                      </button>
                      {(tabs.length > 1 || s.ticked > 0 || t.employeeId) && !saving && (
                        <button type="button" className="sb-tab-x" onClick={() => removeTab(t)} title={T.remove} aria-label={T.remove}>×</button>
                      )}
                    </li>
                  )
                })}
              </ol>
              <button type="button" className="sb-add" onClick={addTab} disabled={!!saving || !active.employeeId || st.filled === 0}>
                <span>+</span> {T.add}
              </button>
              <p className="sb-hint">{T.hint}</p>
            </aside>
          )}

          <section className="sb-main">
            <div className="et-modal-top sb-top">
              {!batch && (
                <div className="et-modal-field">
                  <label>{tu('k145')}</label>
                  <select className="field-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m} {year}</option>)}
                  </select>
                </div>
              )}
              <div className={`et-modal-field sb-emp ${active.employeeId ? "is-picked" : "is-empty"}`}> {/* empFieldState */}
                <label>{batch ? `${T.step} ${tabs.findIndex((t) => t.key === active.key) + 1} — ${tu('k044')}` : tu('k044')}</label>
                <GroupedEmployeePicker
                  key={active.key}
                  employees={pickable}
                  groups={filters.groups}
                  sections={filters.sections}
                  value={active.employeeId}
                  onChange={(id) => { update(active.key, () => ({ employeeId: id, allDrugs: false })); setBadKeys((b) => { const c = { ...b }; delete c[active.key]; return c }) }}
                  placeholder={`👤 ${T.noOne}…`}
                  otherLabel={T.other}
                />
                {active.employeeId && <span className="sb-emp-ok" aria-hidden="true">✓</span>}
              </div>
            </div>
            {batch && active.employeeId && existing[`${active.employeeId}|${monthKey}`] && (
              <p className="sb-warn">⚠ {T.already}</p>
            )}

            <div className="et-modal-druglabel">
              <span>{tu('k153')}</span>
              {st.ticked > 0 && <span className="et-modal-count">{tu('k009')}{" "}{st.ticked}</span>}
              {theGroup && (
                <button type="button" className={`et-group-chip${active.allDrugs ? "" : " is-on"}`} onClick={() => update(active.key, (t) => ({ allDrugs: !t.allDrugs }))}>
                  {active.allDrugs ? `${T.onlyGroup} ${theGroup.name}` : `${theGroup.name} · ${T.showAll}`}
                </button>
              )}
              {filtered.length > 0 && (
                <button type="button" className={`et-pick-all${allPicked ? " is-on" : ""}`} onClick={pickAll}>
                  <span className="et-pick-all-box">{allPicked ? "✓" : ""}</span>
                  {allPicked ? T.clearAll : T.pickAll}{!allPicked && (q || groupDrugs) ? ` (${filtered.length})` : ""}
                </button>
              )}
            </div>

            <div className="et-modal-searchwrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
              </svg>
              <input className="et-modal-search" placeholder={tu('k027')} value={active.search}
                onChange={(e) => update(active.key, () => ({ search: e.target.value }))} />
            </div>

            <div className="et-modal-druglist" ref={listRef}>
              {filtered.map((d) => {
                const isChecked = !!active.checked[d._id]
                const empty = isChecked && !(Number(active.boxes[d._id]) > 0)
                return (
                  <div className={`et-modal-drugrow${isChecked ? " is-checked" : ""}`} key={d._id}>
                    <label className="et-modal-check">
                      <input type="checkbox" checked={isChecked} onChange={() => toggle(d._id)} />
                      <span className="et-modal-checkbox" />
                      <span className="et-modal-drugname">{d.name}</span>
                    </label>
                    {isChecked && (
                      <input
                        className={`et-modal-boxinput${empty && badKeys[active.key] ? " sb-empty" : ""}`}
                        type="number" min="0" step="any"
                        placeholder={tu('k116')}
                        autoFocus={!active.pinned[d._id] && !active.bulk}
                        value={active.boxes[d._id] ?? ""}
                        onChange={(e) => update(active.key, (t) => ({ boxes: { ...t.boxes, [d._id]: e.target.value } }))}
                      />
                    )}
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="et-modal-empty">{tu('k029')}</p>}
            </div>
          </section>
        </div>

        {error && <p className="resource-error" style={{ margin: "10px 24px 0" }}>{error}</p>}

        <div className="et-modal-actions sb-actions">
          <button className="btn" onClick={saveAll} disabled={!!saving || loadingEdit}>
            <span>{saving ? <><span className="btn-spinner" aria-hidden="true" /> {T.saving(saving.i, saving.n)}</> : (batch ? T.saveN(saveCount) : tu('k043'))}</span>
          </button>
          <button className="btn-gray" onClick={close} disabled={!!saving}><span>{tu('k031')}</span></button>
          {batch && filledTabs.length > 0 && (
            <span className="sb-total">{T.total}: <b>{T.peopleN(filledTabs.length)}</b> · {T.drugsN(totals.drugs)} · {T.boxesN(fmt(totals.boxes))}</span>
          )}
        </div>
      </div>
    </div>
  )
}
