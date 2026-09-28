"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import SearchableSelect from "@/components/ResourceTable/SearchableSelect"
import "./EmployeeTargetModal.css"

const MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
]
const CURRENT_YEAR = new Date().getUTCFullYear()

export default function EmployeeTargetModal({ employees, onClose, onSaved }) {
  const [month, setMonth] = useState(new Date().getUTCMonth())
  const [employeeId, setEmployeeId] = useState("")
  const [drugs, setDrugs] = useState([])
  const [checked, setChecked] = useState({}) // { drugId: true }
  const [boxes, setBoxes] = useState({})     // { drugId: value }
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    apiFetch("/api/employee-targets/visible-drugs")
      .then(setDrugs)
      .catch((err) => setError(err.message))
  }, [])

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
    if (!employeeId) { setError("აირჩიეთ თანამშრომელი"); return }
    const items = Object.keys(checked)
      .filter((id) => checked[id] && Number(boxes[id]) > 0)
      .map((drug) => ({ drug, totalNoOfBoxes: Number(boxes[drug]) }))
    if (items.length === 0) { setError("მონიშნეთ წამალი და შეიყვანეთ ყუთები"); return }

    setSaving(true)
    try {
      const date = new Date(Date.UTC(CURRENT_YEAR, month, 1)).toISOString()
      await apiFetch("/api/employee-targets", {
        method: "POST",
        body: JSON.stringify({ employee: employeeId, date, items }),
      })
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
          <h2>ახალი სამიზნე</h2>
          <button className="et-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="et-modal-top">
          <div className="et-modal-field">
            <label>პერიოდი (თვე)</label>
            <select className="field-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m} {CURRENT_YEAR}</option>)}
            </select>
          </div>
          <div className="et-modal-field">
            <label>თანამშრომელი</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="აირჩიეთ..."
            />
          </div>
        </div>

        <div className="et-modal-druglabel">
          <span>სამიზნე წამლები (მონიშნეთ და შეიყვანეთ ყუთები)</span>
          {chosenCount > 0 && <span className="et-modal-count">არჩეულია: {chosenCount}</span>}
        </div>

        <div className="et-modal-searchwrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input
            className="et-modal-search"
            placeholder="ძებნა წამლის სახელით..."
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
                    placeholder="ყუთები"
                    autoFocus
                    value={boxes[d._id] ?? ""}
                    onChange={(e) => setBox(d._id, e.target.value)}
                  />
                )}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="et-modal-empty">წამალი არ მოიძებნა</p>}
        </div>

        {error && <p className="resource-error" style={{ margin: "10px 24px 0" }}>{error}</p>}

        <div className="et-modal-actions">
          <button className="btn" onClick={handleSave} disabled={saving}>
            <span>{saving ? "..." : "შენახვა"}</span>
          </button>
          <button className="btn-gray" onClick={onClose}>
            <span>დახურვა</span>
          </button>
        </div>
      </div>
    </div>
  )
}
