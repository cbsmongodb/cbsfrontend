'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { apiFetch } from '@/lib/api'
import EmployeeDayModal from './EmployeeDayModal'
import './LiveFeed.css'

const LiveFeedMap = dynamic(() => import('./LiveFeedMap'), { ssr: false })

const FAR_THRESHOLD_METERS = 300

function flattenToEvents(items) {
  const events = []
  for (const item of items) {
    for (const addr of item.addresses) {
      if (addr.lat == null || addr.lng == null) continue
      events.push({
        groupKey: item.groupKey,
        employeeId: item.employeeId,
        employeeName: item.employeeName || 'უცნობი',
        hospitalName: item.hospitalName || '—',
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
  const [error, setError] = useState('')
  const [selectedGroupKey, setSelectedGroupKey] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  async function load() {
    try {
      const items = await apiFetch('/api/attendance/live-feed')
      setEvents(flattenToEvents(items))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  function handleRowClick(event) {
    setSelectedGroupKey(event.groupKey)
    if (event.employeeId) {
      setSelectedEmployee({ id: event.employeeId, name: event.employeeName })
    }
  }

  const mapEvents = selectedGroupKey
    ? events.filter((e) => e.groupKey === selectedGroupKey)
    : []

  return (
    <div className="live-feed">
      <h1>Live Feed</h1>

      {error && <p className="live-feed-error">{error}</p>}

      <LiveFeedMap events={mapEvents} />

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
            <tr
              key={i}
              className={`${event.isFar ? 'far' : ''} ${selectedGroupKey === event.groupKey ? 'selected' : ''}`}
              onClick={() => handleRowClick(event)}
              style={{ cursor: 'pointer' }}
            >
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

      {selectedEmployee && (
        <EmployeeDayModal
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  )
}
