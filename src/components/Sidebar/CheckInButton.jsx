'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

function todayKey() {
  return `checkinStatus-${new Date().toISOString().slice(0, 10)}`
}

export default function CheckInButton() {
  const [status, setStatus] = useState(() => {
    if (typeof window === 'undefined') return 'checkin'
    return localStorage.getItem(todayKey()) || 'checkin'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('ეს ბრაუზერი GPS-ს არ უჭერს მხარს'))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    })
  }

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const position = await getPosition()
      const { latitude: lat, longitude: lng } = position.coords

      await apiFetch('/api/attendance/current-location', {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
      })

      await apiFetch('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ type: status }),
      })

      const nextStatus = status === 'checkin' ? 'checkout' : 'checkin'
      setStatus(nextStatus)
      localStorage.setItem(todayKey(), nextStatus)
    } catch (err) {
      setError(err.message || 'შეცდომა მოხდა')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="checkin-box">
      <button
        type="button"
        className={status === 'checkin' ? 'btn-green' : 'btn-gray'}
        onClick={handleClick}
        disabled={loading}
        style={{ width: '100%' }}
      >
        <span>{loading ? '...' : status === 'checkin' ? 'ჩექინი' : 'ჩექაუთი'}</span>
      </button>
      {error && <p className="checkin-error">{error}</p>}
    </div>
  )
}
