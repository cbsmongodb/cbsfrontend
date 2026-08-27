'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const HospitalPinMap = dynamic(() => import('@/components/HospitalImport/HospitalPinMap'), {
  ssr: false,
})

export default function LocationPickerModal({ initialLat, initialLng, initialQuery, onPick, onClose }) {
  const [position, setPosition] = useState(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null
  )

  function handleUse() {
    if (!position) return
    onPick(position[0], position[1])
    onClose()
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
          padding: 24,
          width: 720,
          maxWidth: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <strong style={{ fontSize: 15 }}>მდებარეობის არჩევა</strong>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
          მოძებნეთ მისამართით, ან პირდაპირ დააჭირეთ რუკაზე ზუსტ წერტილს
        </p>

        <HospitalPinMap
          position={position}
          onPick={(lat, lng) => setPosition([lat, lng])}
          initialQuery={initialQuery}
        />

        {position && (
          <p style={{ fontSize: 12, color: '#16a34a', marginTop: 8 }}>
            ✓ არჩეულია: {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" className="btn" disabled={!position} onClick={handleUse}>
            <span>ამ მდებარეობის გამოყენება</span>
          </button>
          <button type="button" className="btn-gray" onClick={onClose}>
            <span>გაუქმება</span>
          </button>
        </div>
      </div>
    </div>
  )
}
