'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import '../PrescriptionEdit/PrescriptionEdit.css'

export default function PrescriptionNew() {
  const { locale } = useParams()
  const router = useRouter()

  const [employees, setEmployees] = useState([])
  const [doctors, setDoctors] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch('/api/employees'), apiFetch('/api/doctors')])
      .then(([e, d]) => {
        setEmployees(e)
        setDoctors(d)
      })
      .catch((err) => setError(err.message))
  }, [])

  async function handleCreate() {
    if (!employeeId || !doctorId) {
      setError('Employee-ც და Doctor-ც სავალდებულოა')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await apiFetch('/api/prescriptions', {
        method: 'POST',
        body: JSON.stringify({ employee: employeeId, doctor: doctorId, date, isActive }),
      })
      router.push(`/${locale}/dashboard/prescriptions/${result._id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="prescedit-page">
      <div className="prescedit-card">
        <div className="prescedit-card-header">
          <h1>New Prescription</h1>
          <div className="prescedit-header-actions">
            <button type="button" className="btn" onClick={handleCreate} disabled={saving}>
              <span>{saving ? '...' : 'Create'}</span>
            </button>
            <button type="button" className="btn-gray" onClick={() => router.push(`/${locale}/dashboard/prescriptions`)}>
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {error && <p className="resource-error">{error}</p>}

        <div className="prescedit-fields">
          <div className="prescedit-field">
            <label>Period</label>
            <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="prescedit-field">
            <label>Employee</label>
            <SearchableSelect
              options={employees}
              value={employeeId}
              onChange={setEmployeeId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="აირჩიეთ..."
            />
          </div>
          <div className="prescedit-field">
            <label>Doctor</label>
            <SearchableSelect
              options={doctors}
              value={doctorId}
              onChange={setDoctorId}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="აირჩიეთ..."
            />
          </div>
        </div>

        <label className="prescedit-status-toggle">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className={`prescedit-toggle-track ${isActive ? 'on' : ''}`}>
            <span className="prescedit-toggle-thumb" />
          </span>
          Status
        </label>
      </div>
    </div>
  )
}
