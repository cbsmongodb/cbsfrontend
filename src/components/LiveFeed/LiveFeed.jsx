'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { apiFetch } from '@/lib/api'
import './LiveFeed.css'

const LiveFeedMap = dynamic(() => import('./LiveFeedMap'), { ssr: false })

const FAR_THRESHOLD_METERS = 300
const SHORT_VISIT_MINUTES = 1

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

function annotate(events) {
  const byGroup = new Map()
  events.forEach((e) => {
    if (!byGroup.has(e.groupKey)) byGroup.set(e.groupKey, [])
    byGroup.get(e.groupKey).push(e)
  })

  // visit numbering: per employee, chronological order of their groupKeys
  const groupsByEmployee = new Map()
  byGroup.forEach((groupEvents, groupKey) => {
    const employeeId = String(groupEvents[0].employeeId)
    const earliestTime = Math.min(...groupEvents.map((e) => new Date(e.time).getTime()))
    if (!groupsByEmployee.has(employeeId)) groupsByEmployee.set(employeeId, [])
    groupsByEmployee.get(employeeId).push({ groupKey, earliestTime })
  })

  const visitNumberByGroupKey = new Map()
  groupsByEmployee.forEach((groups) => {
    groups.sort((a, b) => a.earliestTime - b.earliestTime)
    groups.forEach((g, i) => visitNumberByGroupKey.set(g.groupKey, i + 1))
  })

  return events.map((e) => {
    const pair = byGroup.get(e.groupKey)
    const checkin = pair.find((p) => p.type === 'checkin')
    const checkout = pair.find((p) => p.type === 'checkout')
    const minutes =
      checkin && checkout ? (new Date(checkout.time) - new Date(checkin.time)) / 60000 : null
    return {
      ...e,
      isShort: minutes != null && minutes >= 0 && minutes < SHORT_VISIT_MINUTES,
      visitNumber: visitNumberByGroupKey.get(e.groupKey),
    }
  })
}

export default function LiveFeed() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(null) // { type: 'pair', groupKey } | { type: 'day', employeeId }
  const [onlyFar, setOnlyFar] = useState(false)

  async function load() {
    try {
      const items = await apiFetch('/api/attendance/live-feed')
      setEvents(annotate(flattenToEvents(items)))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const visibleEvents = onlyFar ? events.filter((e) => e.isFar) : events

  const mapEvents = !focus
    ? []
    : focus.type === 'pair'
    ? events.filter((e) => e.groupKey === focus.groupKey)
    : events.filter((e) => String(e.employeeId) === String(focus.employeeId))

  const focusKey = focus ? `${focus.type}-${focus.groupKey || focus.employeeId}` : null

  const seenEmployeeForDayLink = new Set()

  return (
    <div className="live-feed">
      <h1>Live Feed</h1>

      {error && <p className="live-feed-error">{error}</p>}

      <div style={{ margin: '8px 0' }}>
        <label style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={onlyFar}
            onChange={(e) => setOnlyFar(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          მხოლოდ საეჭვო ვიზიტები (300მ+ დაშორება)
        </label>
      </div>

      <LiveFeedMap events={mapEvents} focusKey={focusKey} />

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
          {visibleEvents.map((event, i) => {
            const isSelected =
              focus &&
              ((focus.type === 'pair' && focus.groupKey === event.groupKey) ||
                (focus.type === 'day' && String(focus.employeeId) === String(event.employeeId)))

            const empKey = String(event.employeeId)
            const showDayLink = event.employeeId && !seenEmployeeForDayLink.has(empKey)
            if (event.employeeId) seenEmployeeForDayLink.add(empKey)

            return (
              <tr
                key={i}
                className={`${event.isFar ? 'far' : ''} ${isSelected ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <td onClick={() => setFocus({ type: 'pair', groupKey: event.groupKey })}>
                  <span className={`dot ${event.isFar ? 'far' : event.type}`} />
                </td>
                <td onClick={() => setFocus({ type: 'pair', groupKey: event.groupKey })}>
                  {event.visitNumber != null && (
                    <span
                      style={{
                        display: 'inline-block',
                        minWidth: 18,
                        textAlign: 'center',
                        marginRight: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#fff',
                        background: '#334155',
                        borderRadius: 9,
                        padding: '1px 5px',
                      }}
                    >
                      {event.visitNumber}
                    </span>
                  )}
                  {event.employeeName}
                  {event.isShort && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        color: '#b45309',
                        background: '#fef3c7',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      ძალიან მოკლე ვიზიტი
                    </span>
                  )}
                  {showDayLink && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFocus({ type: 'day', employeeId: event.employeeId })
                      }}
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: '#2563eb',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      მთელი დღე
                    </button>
                  )}
                </td>
                <td onClick={() => setFocus({ type: 'pair', groupKey: event.groupKey })}>
                  {event.type === 'checkin' ? 'ჩექინი' : 'ჩექაუთი'}
                </td>
                <td onClick={() => setFocus({ type: 'pair', groupKey: event.groupKey })}>
                  {event.hospitalName}
                </td>
                <td onClick={() => setFocus({ type: 'pair', groupKey: event.groupKey })}>
                  {new Date(event.time).toLocaleTimeString('ka-GE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td onClick={() => setFocus({ type: 'pair', groupKey: event.groupKey })}>
                  {event.address}
                </td>
                <td onClick={() => setFocus({ type: 'pair', groupKey: event.groupKey })}>
                  {event.distanceFromHospital != null ? `${event.distanceFromHospital}მ` : '—'}
                </td>
              </tr>
            )
          })}
          {visibleEvents.length === 0 && (
            <tr>
              <td colSpan={7}>{onlyFar ? 'საეჭვო ვიზიტები არ არის' : 'დღეს ჯერ არავინ დაჩექინებულა'}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
