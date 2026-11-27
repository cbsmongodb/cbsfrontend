"use client"
import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api"
import SearchableSelect from "@/components/ResourceTable/SearchableSelect"
import "@/components/EmployeeTargets/EmployeeTargetModal.css"
import { useTranslations, useLocale } from 'next-intl'
import { useMonthNames } from '@/lib/months'

const MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
]
const CURRENT_YEAR = new Date().getUTCFullYear()
// saleModalGroups: division / group filter + "select all" in the sale window
const GTXT = {
  ka: { division: 'დივიზიონი', group: 'ჯგუფი', all: 'ყველა', allGroups: 'ყველა ჯგუფი', pickAll: 'ყველას მონიშვნა', clearAll: 'ყველას მოხსნა' },
  en: { division: 'Division', group: 'Group', all: 'All', allGroups: 'All groups', pickAll: 'Select all', clearAll: 'Clear all' },
  ru: { division: 'Дивизион', group: 'Группа', all: 'Все', allGroups: 'Все группы', pickAll: 'Выбрать все', clearAll: 'Снять все' },
}

export default function EmployeeSaleModal({ employees, editId, onClose, onSaved }) {
  const tu = useTranslations('ui')
  // month names in the chosen language (the Georgian list above is only a fallback)
  const MONTHS = useMonthNames()
  const [month, setMonth] = useState(new Date().getUTCMonth())
  const [year, setYear] = useState(CURRENT_YEAR)
  const [pinned, setPinned] = useState({})
  const [employeeId, setEmployeeId] = useState("")
  const [drugs, setDrugs] = useState([])
  const [checked, setChecked] = useState({}) // { drugId: true }
  const [boxes, setBoxes] = useState({})     // { drugId: value }
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadingEdit, setLoadingEdit] = useState(!!editId)
  const G = GTXT[useLocale()] || GTXT.ka
  const [filters, setFilters] = useState({ sections: [], groups: [] })
  const [sectionId, setSectionId] = useState("")
  const [groupId, setGroupId] = useState("")
  const [bulk, setBulk] = useState(false) // after "select all": no jumping focus
  useEffect(() => {
    apiFetch("/api/employee-sales/filters").then((f) => setFilters({ sections: [], groups: [], ...f })).catch(() => {})
  }, [])
  const groupsShown = useMemo(() => filters.groups.filter((g) => !sectionId || g.section === sectionId), [filters.groups, sectionId])
  const theGroup = filters.groups.find((g) => g.id === groupId) || null
  // people of the chosen division / group
  const employeesShown = useMemo(() => {
    if (!sectionId && !groupId) return employees
    const ids = new Set()
    ;(theGroup ? [theGroup] : groupsShown).forEach((g) => g.employees.forEach((e) => ids.add(e)))
    if (!groupId && sectionId) { const h = filters.sections.find((s) => s.id === sectionId)?.head; if (h) ids.add(h) }
    return employees.filter((e) => ids.has(String(e._id)) || String(e._id) === String(employeeId))
  }, [employees, filters.sections, groupsShown, theGroup, sectionId, groupId, employeeId])
  // drugs of the chosen group (a group with no drugs listed shows every drug)
  const groupDrugs = theGroup && theGroup.drugs?.length ? new Set(theGroup.drugs) : null

  useEffect(() => {
    apiFetch("/api/employee-sales/visible-drugs")
      .then(setDrugs)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!editId) return
    apiFetch(`/api/employee-sales/${editId}`)
      .then((t) => {
        if (t.date) { setMonth(new Date(t.date).getUTCMonth()); setYear(new Date(t.date).getUTCFullYear()) }
        setEmployeeId(t.employee || "")
        const chk = {}
        const bx = {}
        ;(t.items || []).forEach((it) => { chk[it.drug] = true; bx[it.drug] = it.totalNoOfBoxes })
        setChecked(chk)
        setBoxes(bx)
        setPinned(chk)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingEdit(false))
  }, [editId])

  const filtered = drugs
    .filter((d) => !groupDrugs || groupDrugs.has(String(d._id)) || checked[d._id])
    .filter((d) => (!search.trim() ? true : d.name.toLowerCase().includes(search.trim().toLowerCase())))
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (pinned[b.d._id] || checked[b.d._id] ? 1 : 0) - (pinned[a.d._id] || checked[a.d._id] ? 1 : 0) || a.i - b.i) // ticked on top
    .map((x) => x.d)

  function toggle(drugId) {
    setChecked((prev) => {
      const next = { ...prev, [drugId]: !prev[drugId] }
      if (!next[drugId]) {
        setBoxes((b) => { const c = { ...b }; delete c[drugId]; return c })
      }
      return next
    })
  }

  function setBox(drugId, val) {
    setBoxes((prev) => ({ ...prev, [drugId]: val }))
  }

  const chosenCount = Object.keys(checked).filter((id) => checked[id]).length
  const allPicked = filtered.length > 0 && filtered.every((d) => checked[d._id])
  function pickAll() {
    setBulk(true)
    if (allPicked) {
      const ids = new Set(filtered.map((d) => d._id))
      setChecked((p) => { const n = { ...p }; ids.forEach((id) => { n[id] = false }); return n })
      setBoxes((b) => { const c = { ...b }; ids.forEach((id) => { delete c[id] }); return c })
    } else {
      setChecked((p) => { const n = { ...p }; filtered.forEach((d) => { n[d._id] = true }); return n })
    }
  }

  async function handleSave() {
    setError("")
    if (!employeeId) { setError(tu('k141')); return }
    const items = Object.keys(checked)
      .filter((id) => checked[id] && Number(boxes[id]) > 0)
      .map((drug) => ({ drug, totalNoOfBoxes: Number(boxes[drug]) }))
    if (items.length === 0) { setError(tu('k142')); return }

    setSaving(true)
    try {
      const date = new Date(Date.UTC(year, month, 1)).toISOString()
      const body = JSON.stringify({ employee: employeeId, date, items })
      if (editId) {
        await apiFetch(`/api/employee-sales/${editId}`, { method: "PUT", body })
      } else {
        await apiFetch("/api/employee-sales", { method: "POST", body })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="et-modal-overlay" onClick={onClose}>
      <div className="et-modal" onClick={(e) => e.stopPropagation()}>
        <div className="et-modal-head">
          <h2>{editId ? tu('k151') : tu('k152')}</h2>
          <button className="et-modal-close" onClick={onClose}>×</button>
        </div>

        {(filters.sections.length > 1 || filters.groups.length > 1) && (
          <div className="et-modal-top et-modal-filters">
            {filters.sections.length > 1 && (
              <div className="et-modal-field">
                <label>{G.division}</label>
                <select className="field-select" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setGroupId("") }}>
                  <option value="">{G.all}</option>
                  {filters.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {groupsShown.length > 0 && (
              <div className="et-modal-field">
                <label>{G.group}</label>
                <select className="field-select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  <option value="">{G.allGroups}</option>
                  {groupsShown.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="et-modal-top">
          <div className="et-modal-field">
            <label>{tu('k145')}</label>
            <select className="field-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m} {year}</option>)}
            </select>
          </div>
          <div className="et-modal-field">
            <label>{tu('k044')}</label>
            <SearchableSelect
              options={employeesShown}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={tu('k109')}
            />
          </div>
        </div>

        <div className="et-modal-druglabel">
          <span>{tu('k153')}</span>
          {chosenCount > 0 && <span className="et-modal-count">{tu('k009')}{" "}{chosenCount}</span>}
          {filtered.length > 0 && (
            <button type="button" className={`et-pick-all${allPicked ? " is-on" : ""}`} onClick={pickAll}>
              <span className="et-pick-all-box">{allPicked ? "✓" : ""}</span>
              {allPicked ? G.clearAll : G.pickAll}{!allPicked && (search.trim() || groupDrugs) ? ` (${filtered.length})` : ""}
            </button>
          )}
        </div>

        <div className="et-modal-searchwrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input
            className="et-modal-search"
            placeholder={tu('k027')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="et-modal-druglist">
          {filtered.map((d) => {
            const isChecked = !!checked[d._id]
            return (
              <div className={`et-modal-drugrow${isChecked ? " is-checked" : ""}`} key={d._id}>
                <label className="et-modal-check">
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(d._id)} />
                  <span className="et-modal-checkbox" />
                  <span className="et-modal-drugname">{d.name}</span>
                </label>
                {isChecked && (
                  <input
                    className="et-modal-boxinput"
                    type="number"
                    min="0"
                    step="any"
                    placeholder={tu('k116')}
                    autoFocus={!pinned[d._id] && !bulk}
                    value={boxes[d._id] ?? ""}
                    onChange={(e) => setBox(d._id, e.target.value)}
                  />
                )}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="et-modal-empty">{tu('k029')}</p>}
        </div>

        {error && <p className="resource-error" style={{ margin: "10px 24px 0" }}>{error}</p>}

        <div className="et-modal-actions">
          <button className="btn" onClick={handleSave} disabled={saving || loadingEdit}>
            <span>{saving ? <span className="btn-spinner" aria-hidden="true" /> : tu('k043')}</span>
          </button>
          <button className="btn-gray" onClick={onClose}>
            <span>{tu('k031')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
