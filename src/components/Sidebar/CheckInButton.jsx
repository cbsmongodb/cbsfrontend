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
    // every check-in button on the page (sidebar + dashboard) stays in sync
    window.addEventListener('cbs:attendance-changed', loadStatus)
    return () => window.removeEventListener('cbs:attendance-changed', loadStatus)
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
      window.dispatchEvent(new Event('cbs:attendance-changed'))
    } catch (err) {
      const msg = err.message
      if (msg === 'already_checked_in') setError(t('alreadyIn'))
      else if (msg === 'not_checked_in') setError(t('notIn'))
      else setError(msg || t('genericError'))
      // re-read the real state from the server
      window.dispatchEvent(new Event('cbs:attendance-changed'))
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
