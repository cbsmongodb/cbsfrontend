'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './TodayVisits.css'

const FAR_THRESHOLD_METERS = 300

function distanceInMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

export default function TodayVisits() {
  const [me, setMe] = useState(null)
  const [plans, setPlans] = useState([])
  const [position, setPosition] = useState(null)
  const [locError, setLocError] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function loadMe() {
    const employee = await apiFetch('/api/auth/me')
    setMe(employee)
    return employee
  }

  async function loadPlans(employeeId) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const params = new URLSearchParams({
      performer: employeeId,
      period_from: startOfDay.toISOString(),
      period_to: endOfDay.toISOString(),
    })
    const data = await apiFetch(`/api/plannings?${params}`)
    setPlans(data)
  }

  function refreshLocation() {
    setLocError('')
    if (!navigator.geolocation) {
      setLocError('ეს ბრაუზერი GPS-ს არ უჭერს მხარს')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setLocError(err.message || 'ლოკაციის მიღება ვერ მოხერხდა'),
      { enableHighAccuracy: true }
    )
  }

  useEffect(() => {
    loadMe()
      .then((employee) => loadPlans(employee._id))
      .catch((err) => setError(err.message))
    refreshLocation()
  }, [])

  async function reload() {
    if (me) await loadPlans(me._id)
  }

  async function handleCheckin(plan) {
    if (!position) {
      setLocError('ჯერ ლოკაცია არ არის ხელმისაწვდომი — დააჭირეთ "ლოკაციის განახლება"-ს')
      return
    }
    setBusyId(plan._id)
    setError('')
    try {
      await apiFetch(`/api/plannings/${plan._id}/checkin`, {
        method: 'POST',
        body: JSON.stringify({ lat: position.lat, lng: position.lng, address: '' }),
      })
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleCheckout(plan) {
    if (!position) {
      setLocError('ჯერ ლოკაცია არ არის ხელმისაწვდომი — დააჭირეთ "ლოკაციის განახლება"-ს')
      return
    }
    setBusyId(plan._id)
    setError('')
    try {
      await apiFetch(`/api/plannings/${plan._id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ lat: position.lat, lng: position.lng, address: '' }),
      })
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const withDistance = plans.map((plan) => {
    const target = plan.hospital || plan.pharmacy
    const distance =
      position && target?.lat != null && target?.lng != null
        ? distanceInMeters(position.lat, position.lng, target.lat, target.lng)
        : null
    return { plan, distance }
  })

  withDistance.sort((a, b) => {
    if (a.distance == null) return 1
    if (b.distance == null) return -1
    return a.distance - b.distance
  })

  return (
    <div className="today-visits">
      <div className="today-visits-header">
        <h2>დღევანდელი ჩემი ვიზიტები</h2>
        <button type="button" className="btn-gray btn-sm" onClick={refreshLocation}>
          <span>ლოკაციის განახლება</span>
        </button>
      </div>

      {locError && <p className="today-visits-warning">{locError}</p>}
      {error && <p className="resource-error">{error}</p>}

      {withDistance.length === 0 && <p>დღეს დანიშნული ვიზიტები არ არის</p>}

      <div className="today-visits-list">
        {withDistance.map(({ plan, distance }) => {
          const name = plan.hospital?.name || plan.pharmacy?.pharmacyName || 'უცნობი'
          const isFar = distance != null && distance > FAR_THRESHOLD_METERS
          const canCheckin = plan.status === 'planned'
          const canCheckout = plan.status === 'i_went'
          const isDone = plan.status === 'i_left' || plan.status === 'completed'

          return (
            <div key={plan._id} className={`today-visit-card ${isFar ? 'far' : ''}`}>
              <div className="today-visit-main">
                <span className="today-visit-name">{name}</span>
                <span className="today-visit-status">{plan.status}</span>
              </div>
              {distance != null && (
                <div className={`today-visit-distance ${isFar ? 'far' : ''}`}>
                  {isFar ? `⚠ ${distance}მ დაშორებული` : `${distance}მ დაშორებული`}
                </div>
              )}
              <div className="today-visit-actions">
                {canCheckin && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === plan._id}
                    onClick={() => handleCheckin(plan)}
                  >
                    <span>{busyId === plan._id ? '...' : 'ჩექინი'}</span>
                  </button>
                )}
                {canCheckout && (
                  <button
                    type="button"
                    className="btn-gray"
                    disabled={busyId === plan._id}
                    onClick={() => handleCheckout(plan)}
                  >
                    <span>{busyId === plan._id ? '...' : 'ჩექაუთი'}</span>
                  </button>
                )}
                {isDone && <span className="today-visit-done">დასრულებულია</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
