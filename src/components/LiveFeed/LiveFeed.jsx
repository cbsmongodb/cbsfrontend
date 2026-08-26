'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { apiFetch } from '@/lib/api'
import './LiveFeed.css'

const LiveFeedMap = dynamic(() => import('./LiveFeedMap'), { ssr: false })

const FAR_THRESHOLD_METERS = 300

function flattenToEvents(plans) {
  const events = []
  for (const plan of plans) {
    for (const addr of plan.addresses) {
      if (addr.lat == null || addr.lng == null) continue
      events.push({
        employeeName: plan.employeeName || 'უცნობი',
        hospitalName: plan.hospitalName || '—',
        type: addr.addressType === 'performer_i_went_location' ? 'checkin' : 'checkout',
        lat: addr.lat,
        lng: addr.lng,
        time: addr.time,
        address: addr.cleanAddress,
        distanceFromHospital: addr.distanceFromHospital,
        isFar: addr.distanceFromHospital != null && addr.distanceFromHospital > FAR_THRESHOLD_METERS,
      })
    }
  }
  return events.sort((a, b) => new Date(b.time) - new Date(a.time))
}

export default function LiveFeed() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      const plans = await apiFetch('/api/attendance/live-feed')
      setEvents(flattenToEvents(plans))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="live-feed">
      <h1>Live Feed</h1>

      {error && <p className="live-feed-error">{error}</p>}
      {loading ? (
        <p>იტვირთება...</p>
      ) : (
        <>
          <LiveFeedMap events={events} />

          <table className="live-feed-table">
            <thead>
              <tr>
                <th></th>
                <th>თანამშრომელი</th>
                <th>ტიპი</th>
                <th>ჰოსპიტალი</th>
                <th>დრო</th>
                <th>მისამართი</th>
                <th>მანძილი</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={i} className={event.isFar ? 'far' : ''}>
                  <td>
                    <span className={`dot ${event.isFar ? 'far' : event.type}`} />
                  </td>
                  <td>{event.employeeName}</td>
                  <td>{event.type === 'checkin' ? 'ჩექინი' : 'ჩექაუთი'}</td>
                  <td>{event.hospitalName}</td>
                  <td>
                    {new Date(event.time).toLocaleTimeString('ka-GE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{event.address}</td>
                  <td>{event.distanceFromHospital != null ? `${event.distanceFromHospital}მ` : '—'}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7}>დღეს ჯერ არავინ დაჩექინებულა</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
