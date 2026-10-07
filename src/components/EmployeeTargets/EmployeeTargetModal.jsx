"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import SearchableSelect from "@/components/ResourceTable/SearchableSelect"
import "./EmployeeTargetModal.css"
import { useTranslations } from 'next-intl'
import { useMonthNames } from '@/lib/months'

const MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
]
const CURRENT_YEAR = new Date().getUTCFullYear()

export default function EmployeeTargetModal({ employees, editId, onClose, onSaved }) {
  const tu = useTranslations('ui')
  // month names in the chosen language (the Georgian list above is only a fallback)
  const MONTHS = useMonthNames()
  const [month, setMonth] = useState(new Date().getUTCMonth())
  const [employeeId, setEmployeeId] = useState("")
  const [drugs, setDrugs] = useState([])
  const [checked, setChecked] = useState({}) // { drugId: true }
  const [boxes, setBoxes] = useState({})     // { drugId: value }
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadingEdit, setLoadingEdit] = useState(!!editId)

  useEffect(() => {
    apiFetch("/api/employee-targets/visible-drugs")
      .then(setDrugs)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!editId) return
    apiFetch(`/api/employee-targets/${editId}`)
      .then((t) => {
        if (t.date) setMonth(new Date(t.date).getUTCMonth())
        setEmployeeId(t.employee || "")
        const chk = {}
        const bx = {}
        ;(t.items || []).forEach((it) => { chk[it.drug] = true; bx[it.drug] = it.totalNoOfBoxes })
        setChecked(chk)
        setBoxes(bx)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingEdit(false))
  }, [editId])

  const filtered = drugs.filter((d) =>
    !search.trim() ? true : d.name.toLowerCase().includes(search.trim().toLowerCase())
  )

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

  async function handleSave() {
    setError("")
    if (!employeeId) { setError(tu('k141')); return }
    const items = Object.keys(checked)
      .filter((id) => checked[id] && Number(boxes[id]) > 0)
      .map((drug) => ({ drug, totalNoOfBoxes: Number(boxes[drug]) }))
    if (items.length === 0) { setError(tu('k142')); return }

    setSaving(true)
    try {
      const date = new Date(Date.UTC(CURRENT_YEAR, month, 1)).toISOString()
      const body = JSON.stringify({ employee: employeeId, date, items })
      if (editId) {
        await apiFetch(`/api/employee-targets/${editId}`, { method: "PUT", body })
      } else {
        await apiFetch("/api/employee-targets", { method: "POST", body })
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
          <h2>{editId ? tu('k143') : tu('k144')}</h2>
          <button className="et-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="et-modal-top">
          <div className="et-modal-field">
            <label>{tu('k145')}</label>
            <select className="field-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m} {CURRENT_YEAR}</option>)}
            </select>
          </div>
          <div className="et-modal-field">
            <label>{tu('k044')}</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={tu('k109')}
            />
          </div>
        </div>

        <div className="et-modal-druglabel">
          <span>{tu('k146')}</span>
          {chosenCount > 0 && <span className="et-modal-count">{tu('k009')}{" "}{chosenCount}</span>}
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
                    placeholder={tu('k116')}
                    autoFocus
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
            <span>{saving ? "..." : tu('k043')}</span>
          </button>
          <button className="btn-gray" onClick={onClose}>
            <span>{tu('k031')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
