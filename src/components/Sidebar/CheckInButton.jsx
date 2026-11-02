'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import './CheckInButton.css'
import GeoHelp from '@/components/GeoHelp/GeoHelp'
import { geoErrorKind, getGeoPosition, watchGeoPermission } from '@/lib/geo'

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tbilisi',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function fmtTime(value) {
  return value ? timeFmt.format(new Date(value)) : ''
}

export default function CheckInButton() {
  const t = useTranslations('checkin')
  const tg = useTranslations('geo')
  const [geoKind, setGeoKind] = useState(null)
  const [geoPerm, setGeoPerm] = useState('unknown')
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    let stop = () => {}
    watchGeoPermission(setGeoPerm).then((fn) => { stop = fn })
    return () => stop()
  }, [])

  // "Turn on location": the browser asks (if it still may), else show the steps
  async function enableLocation() {
    if (asking) return
    setAsking(true)
    try {
      await getGeoPosition()
      setGeoKind(null)
      setGeoPerm('granted')
    } catch (err) {
      setGeoKind(geoErrorKind(err))
    } finally {
      setAsking(false)
    }
  }
  const [status, setStatus] = useState('checkin')
  const [checkinTime, setCheckinTime] = useState(null)
  const [checkoutTime, setCheckoutTime] = useState(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const confirmTimer = useRef(null)

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await apiFetch('/api/attendance/my-status')
        setStatus(data.nextAction)
        setCheckinTime(data.checkinTime || null)
        setCheckoutTime(data.checkoutTime || null)
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

  // "გასული დრო" წუთში ერთხელ განახლდეს
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => () => clearTimeout(confirmTimer.current), [])

  const isIn = status === 'checkout' // ახლა დაჩექინებულია
  const isDone = !isIn && Boolean(checkoutTime) // დღეს უკვე დაჩექაუთდა

  function duration(from, to) {
    if (!from) return ''
    const mins = Math.max(0, Math.floor((new Date(to) - new Date(from)) / 60000))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? t('durationHM', { h, m }) : t('durationM', { m })
  }

  function getPosition() {
    return getGeoPosition()
  }

  async function submit() {
    setLoading(true)
    setError('')
    setGeoKind(null)
    try {
      const position = await getPosition()
      setGeoPerm('granted')
      const { latitude: lat, longitude: lng } = position.coords
      await apiFetch('/api/attendance/current-location', {
        method: 'POST',
        body: JSON.stringify({ lat, lng }),
      })
      await apiFetch('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ type: status }),
      })
      const stamp = new Date().toISOString()
      if (status === 'checkin') {
        setCheckinTime(stamp)
        setCheckoutTime(null)
        setStatus('checkout')
      } else {
        setCheckoutTime(stamp)
        setStatus('checkin')
      }
      window.dispatchEvent(new Event('cbs:attendance-changed'))
    } catch (err) {
      const msg = err.message
      if (err?.code >= 1 && err?.code <= 3) setGeoKind(geoErrorKind(err))
      else if (err?.kind === 'unsupported') setGeoKind('unsupported')
      else if (msg === 'already_checked_in') setError(t('alreadyIn'))
      else if (msg === 'not_checked_in') setError(t('notIn'))
      else setError(msg || t('genericError'))
      // re-read the real state from the server
      window.dispatchEvent(new Event('cbs:attendance-changed'))
    } finally {
      setLoading(false)
    }
  }

  // ერთი დაჭერა საკმარისია — დადასტურება აღარ სჭირდება
  function handleClick() {
    if (loading) return
    submit()
  }

  let label
  if (loading) label = <span className="btn-spinner" aria-hidden="true" />
  else if (confirming) label = isIn ? t('confirmCheckout') : t('confirmCheckin')
  else if (isIn) label = t('checkout')
  else if (isDone) label = t('checkinAgain')
  else label = t('checkin')

  return (
    <div className="checkin-box">
      {ready && isIn && (
        <div className="ci-status ci-status--in" role="status">
          <span className="ci-dot" aria-hidden="true" />
          <div className="ci-status-text">
            <span className="ci-status-title">{t('statusIn')}</span>
            <span className="ci-status-sub">
              {t('since', { time: fmtTime(checkinTime) })}
            </span>
          </div>
          <span className="ci-status-elapsed">{duration(checkinTime, now)}</span>
        </div>
      )}

      {ready && isDone && (
        <div className="ci-status ci-status--done" role="status">
          <span className="ci-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="13" height="13">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="ci-status-text">
            <span className="ci-status-title">{t('statusDone')}</span>
            <span className="ci-status-sub">
              {fmtTime(checkinTime)} – {fmtTime(checkoutTime)}
            </span>
          </div>
          <span className="ci-status-elapsed">{duration(checkinTime, checkoutTime)}</span>
        </div>
      )}

      {isDone ? (
        <button
          type="button"
          className={`ci-again ${confirming ? 'is-confirming' : ''}`}
          onClick={handleClick}
          disabled={loading || !ready}
        >
          {label}
        </button>
      ) : (
        <button
          type="button"
          className={`${isIn ? 'btn-red' : 'btn-green'} ${confirming ? 'ci-confirming' : ''}`}
          onClick={handleClick}
          disabled={loading || !ready}
          style={{ width: '100%' }}
        >
          <span>{label}</span>
        </button>
      )}

      {error && <p className="checkin-error">{error}</p>}

      <GeoHelp
        kind={geoKind}
        onRetry={() => { setGeoKind(null); submit() }}
        onClose={() => setGeoKind(null)}
      />

      {ready && geoPerm !== 'unknown' && (
        geoPerm === 'granted' ? (
          <div className="ci-geo ci-geo--on" role="status">
            <span aria-hidden="true">✓</span> {tg('shared')}
          </div>
        ) : (
          <button type="button" className="ci-geo ci-geo--off" onClick={enableLocation} disabled={asking}>
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.4" fill="currentColor" />
            </svg>
            {asking ? '…' : tg('button')}
          </button>
        )
      )}
    </div>
  )
}
