'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { apiFetch } from '@/lib/api'

const HospitalPinMap = dynamic(() => import('./HospitalPinMap'), { ssr: false })

export default function HospitalPinModal({ hospital, onClose, onSaved }) {
  const [position, setPosition] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!position) return
    setSaving(true)
    setError('')
    try {
      await apiFetch(`/api/hospitals/${hospital._id}`, {
        method: 'PUT',
        body: JSON.stringify({ lat: position[0], lng: position[1] }),
      })
      onSaved(hospital._id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          width: 480,
          maxWidth: '92vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <strong style={{ fontSize: 15 }}>{hospital.name}</strong>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{hospital.address}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
          დააჭირეთ რუკაზე ზუსტად იმ წერტილს, სადაც ეს ჰოსპიტალია
        </p>

        <HospitalPinMap position={position} onPick={(lat, lng) => setPosition([lat, lng])} initialQuery={hospital.address} />

        {position && (
          <p style={{ fontSize: 12, color: '#16a34a', marginTop: 8 }}>
            ✓ არჩეულია: {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </p>
        )}

        {error && <p className="resource-error" style={{ marginTop: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" className="btn" disabled={!position || saving} onClick={handleSave}>
            <span>{saving ? '...' : 'შენახვა'}</span>
          </button>
          <button type="button" className="btn-gray" onClick={onClose}>
            <span>გაუქმება</span>
          </button>
        </div>
      </div>
    </div>
  )
}
