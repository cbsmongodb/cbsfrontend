"use client"
import { useEffect, useRef, useState } from "react"
import { apiFetch } from "@/lib/api"
import "./HospitalDoctorsEditor.css"

export default function HospitalDoctorsEditor({ hospitalId, label, onSaveHospital }) {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const boxRef = useRef(null)

  async function loadDoctors() {
    if (!hospitalId) return
    setLoading(true)
    try {
      const data = await apiFetch(`/api/hospitals/${hospitalId}/doctors`)
      setDoctors(data)
    } catch { setDoctors([]) } finally { setLoading(false) }
  }

  useEffect(() => { loadDoctors() }, [hospitalId])

  useEffect(() => {
    if (!hospitalId) return
    const t = setTimeout(async () => {
      try {
        const q = encodeURIComponent(search.trim())
        const data = await apiFetch(`/api/hospitals/${hospitalId}/available-doctors?q=${q}`)
        setResults(data)
      } catch { setResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [search, hospitalId])

  useEffect(() => {
    function onClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  async function addDoctor(doctor) {
    try {
      await apiFetch(`/api/hospitals/${hospitalId}/doctors`, {
        method: "POST", body: JSON.stringify({ doctorId: doctor._id }),
      })
      setSearch(""); setOpen(false); loadDoctors()
    } catch (err) { console.error(err) }
  }

  async function removeDoctor(doctorId) {
    try {
      await apiFetch(`/api/hospitals/${hospitalId}/doctors/${doctorId}`, { method: "DELETE" })
      setDoctors((prev) => prev.filter((d) => d._id !== doctorId))
    } catch (err) { console.error(err) }
  }

  async function handleSaveHospital() {
    if (!onSaveHospital) return
    setSaving(true)
    try { await onSaveHospital() } finally { setSaving(false) }
  }

  if (!hospitalId) {
    return (
      <div className="hosp-doctors">
        <span className="hosp-doctors-label">{label || "ექიმები"}</span>
        <p className="hosp-doctors-hint">ექიმების დასამატებლად ჯერ შეინახეთ ჰოსპიტალი.</p>
        <button type="button" className="btn hosp-doctors-save-btn" onClick={handleSaveHospital} disabled={saving}>
          <span>{saving ? "ინახება..." : "შეინახე ჰოსპიტალი და დაამატე ექიმები"}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="hosp-doctors">
      <span className="hosp-doctors-label">{label || "ექიმები"}</span>
      <div className="hosp-doctors-search" ref={boxRef}>
        <input className="field-input" placeholder="ძებნა და დამატება — სახელი ან ID..."
          value={search} onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }} />
        {open && results.length > 0 && (
          <div className="hosp-doctors-dropdown">
            {results.map((d) => (
              <button type="button" key={d._id} className="hosp-doctors-option" onClick={() => addDoctor(d)}>
                <span>{d.name}</span>
                <span className="hosp-doctors-option-id">{d.uniqueNumber}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="hosp-doctors-chips">
        {loading ? (
          <span className="hosp-doctors-hint">იტვირთება...</span>
        ) : doctors.length === 0 ? (
          <span className="hosp-doctors-hint">ჯერ ექიმი არ არის დამატებული</span>
        ) : (
          doctors.map((d) => (
            <span className="hosp-doctors-chip" key={d._id}>
              <span className="hosp-doctors-chip-name">{d.name}</span>
              <span className="hosp-doctors-chip-id">{d.uniqueNumber}</span>
              <button type="button" className="hosp-doctors-chip-remove" onClick={() => removeDoctor(d._id)} title="მოშორება">×</button>
            </span>
          ))
        )}
      </div>
    </div>
  )
}
