"use client"
import { useState } from "react"
import "@/components/EmployeeTargets/EmployeeTargetModal.css"
import { useTranslations } from 'next-intl'

export default function DrugPickerModal({ drugs, alreadyAddedIds = [], onClose, onConfirm }) {
  const tu = useTranslations('ui')
  const [checked, setChecked] = useState({})
  const [search, setSearch] = useState("")

  const filtered = drugs.filter((d) =>
    !search.trim() ? true : d.name.toLowerCase().includes(search.trim().toLowerCase())
  )
  function toggle(id) { setChecked((p) => ({ ...p, [id]: !p[id] })) }
  const chosen = Object.keys(checked).filter((id) => checked[id])

  return (
    <div className="et-modal-overlay" onClick={onClose}>
      <div className="et-modal" onClick={(e) => e.stopPropagation()}>
        <div className="et-modal-head">
          <h2>{tu('k025')}</h2>
          <button className="et-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="et-modal-druglabel" style={{ paddingTop: 16 }}>
          <span>{tu('k026')}</span>
          {chosen.length > 0 && <span className="et-modal-count">{tu('k009')}{" "}{chosen.length}</span>}
        </div>
        <div className="et-modal-searchwrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <input className="et-modal-search" placeholder={tu('k027')} value={search}
            onChange={(e) => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="et-modal-druglist">
          {filtered.map((d) => {
            const isAdded = alreadyAddedIds.includes(d._id)
            const isChecked = !!checked[d._id]
            return (
              <div className={`et-modal-drugrow${isChecked ? " is-checked" : ""}`} key={d._id}>
                <label className="et-modal-check" style={isAdded ? { opacity: 0.45 } : {}}>
                  <input type="checkbox" checked={isChecked} disabled={isAdded} onChange={() => toggle(d._id)} />
                  <span className="et-modal-checkbox" />
                  <span className="et-modal-drugname">{d.name}{isAdded ? tu('k028') : ""}</span>
                </label>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="et-modal-empty">{tu('k029')}</p>}
        </div>
        <div className="et-modal-actions">
          <button className="btn" onClick={() => { onConfirm(chosen); onClose() }} disabled={chosen.length === 0}>
            <span>{tu('k030')}{chosen.length > 0 ? ` (${chosen.length})` : ""}</span>
          </button>
          <button className="btn-gray" onClick={onClose}><span>{tu('k031')}</span></button>
        </div>
      </div>
    </div>
  )
}
