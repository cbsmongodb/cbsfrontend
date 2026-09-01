'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'

export default function CheckInButton() {
  const t = useTranslations('checkin')
  const [status, setStatus] = useState('checkin')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await apiFetch('/api/attendance/my-status')
        setStatus(data.nextAction)
      } catch (err) {
        console.error('loadStatus failed:', err)
      } finally {
        setReady(true)
      }
    }
    loadStatus()
  }, [])

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error(t('gpsUnsupported')))
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
      setStatus(status === 'checkin' ? 'checkout' : 'checkin')
    } catch (err) {
      setError(err.message || t('genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="checkin-box">
      <button
        type="button"
        className={status === 'checkin' ? 'btn-green' : 'btn-red'}
        onClick={handleClick}
        disabled={loading || !ready}
        style={{ width: '100%' }}
      >
        <span>{loading ? '...' : status === 'checkin' ? t('checkin') : t('checkout')}</span>
      </button>
      {error && <p className="checkin-error">{error}</p>}
    </div>
  )
}
