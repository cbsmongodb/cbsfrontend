'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import './LiveFeed.css'

const LiveFeedMap = dynamic(() => import('./LiveFeedMap'), { ssr: false })

const FAR_THRESHOLD_METERS = 300
const SHORT_VISIT_MINUTES = 1
const API_URL = process.env.NEXT_PUBLIC_API_URL

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
        hospitalLat: item.hospitalLat ?? null,
        hospitalLng: item.hospitalLng ?? null,
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

  return events.map((e) => ({ ...e, visitNumber: visitNumberByGroupKey.get(e.groupKey) }))
}

function buildVisits(events) {
  const byGroup = new Map()
  events.forEach((e) => {
    if (!byGroup.has(e.groupKey)) byGroup.set(e.groupKey, [])
    byGroup.get(e.groupKey).push(e)
  })

  const visits = []
  byGroup.forEach((groupEvents, groupKey) => {
    const checkin = groupEvents.find((e) => e.type === 'checkin')
    const checkout = groupEvents.find((e) => e.type === 'checkout')
    const anchor = checkin || checkout
    const minutes =
      checkin && checkout ? (new Date(checkout.time) - new Date(checkin.time)) / 60000 : null

    visits.push({
      groupKey,
      visitNumber: anchor.visitNumber,
      employeeId: anchor.employeeId,
      employeeName: anchor.employeeName,
      hospitalName: anchor.hospitalName,
      checkinTime: checkin?.time || null,
      checkoutTime: checkout?.time || null,
      checkinDistance: checkin?.distanceFromHospital ?? null,
      checkoutDistance: checkout?.distanceFromHospital ?? null,
      isFar: (checkin?.isFar || checkout?.isFar) ?? false,
      isShort: minutes != null && minutes >= 0 && minutes < SHORT_VISIT_MINUTES,
      durationMinutes: minutes != null ? Math.round(minutes) : null,
      address: checkin?.address || checkout?.address || '',
      sortTime: anchor.time,
      isOpen: !!checkin && !checkout,
    })
  })

  return visits.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime))
}

function formatAgo(seconds) {
  if (seconds < 5) return 'ახლახან'
  if (seconds < 60) return `${seconds} წამის წინ`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} წუთის წინ`
}

export default function LiveFeed() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(null)
  const [onlyFar, setOnlyFar] = useState(false)
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [agoText, setAgoText] = useState('')
  const seenEmployeeForDayLink = new Set()

  async function load() {
    try {
      const items = await apiFetch('/api/attendance/live-feed')
      setEvents(annotate(flattenToEvents(items)))
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // safety-net refresh in case a socket event is ever missed
    const interval = setInterval(load, 60000)

    let socket
    if (API_URL) {
      socket = io(API_URL, { transports: ['websocket'] })
      socket.on('attendance:new', () => load())
    }

    return () => {
      clearInterval(interval)
      if (socket) socket.disconnect()
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => {
      if (!lastUpdated) return
      setAgoText(formatAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000)))
    }, 1000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  const visits = useMemo(() => buildVisits(events), [events])

  const visibleVisits = useMemo(() => {
    let list = onlyFar ? visits.filter((v) => v.isFar) : visits
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((v) => v.employeeName.toLowerCase().includes(q))
    }
    return list
  }, [visits, onlyFar, search])

  const mapEvents = !focus
    ? []
    : focus.type === 'pair'
    ? events.filter((e) => e.groupKey === focus.groupKey)
    : events.filter((e) => String(e.employeeId) === String(focus.employeeId))

  const focusKey = focus ? `${focus.type}-${focus.groupKey || focus.employeeId}` : null

  return (
    <div className="live-feed">
      <div className="live-feed-header">
        <h1>Live Feed</h1>
        {lastUpdated && <span className="live-feed-updated">განახლდა: {agoText}</span>}
      </div>

      {error && <p className="live-feed-error">{error}</p>}

      <div className="live-feed-controls">
        <input
          type="text"
          placeholder="ძებნა თანამშრომლის სახელით..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="live-feed-search"
        />
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
            <th>ჰოსპიტალი</th>
            <th>ჩექინი</th>
            <th>ჩექაუთი</th>
            <th>ხანგრძლივობა</th>
            <th>მანძილი</th>
          </tr>
        </thead>
        <tbody>
          {visibleVisits.map((visit) => {
            const isSelected =
              focus &&
              ((focus.type === 'pair' && focus.groupKey === visit.groupKey) ||
                (focus.type === 'day' && String(focus.employeeId) === String(visit.employeeId)))

            const empKey = String(visit.employeeId)
            const showDayLink = visit.employeeId && !seenEmployeeForDayLink.has(empKey)
            if (visit.employeeId) seenEmployeeForDayLink.add(empKey)

            const distance = visit.checkinDistance ?? visit.checkoutDistance

            return (
              <tr
                key={visit.groupKey}
                className={`${visit.isFar ? 'far' : ''} ${isSelected ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFocus({ type: 'pair', groupKey: visit.groupKey })}
              >
                <td>
                  <span className={`dot ${visit.isFar ? 'far' : 'checkin'}`} />
                </td>
                <td>
                  {visit.visitNumber != null && (
                    <span className="visit-badge">{visit.visitNumber}</span>
                  )}
                  {visit.employeeName}
                  {visit.isShort && <span className="short-badge">ძალიან მოკლე ვიზიტი</span>}
                  {showDayLink && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFocus({ type: 'day', employeeId: visit.employeeId })
                      }}
                      className="day-link"
                    >
                      მთელი დღე
                    </button>
                  )}
                </td>
                <td>{visit.hospitalName}</td>
                <td>
                  {visit.checkinTime
                    ? new Date(visit.checkinTime).toLocaleTimeString('ka-GE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>
                <td>
                  {visit.checkoutTime ? (
                    new Date(visit.checkoutTime).toLocaleTimeString('ka-GE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  ) : visit.isOpen ? (
                    <span className="live-badge">🟢 ამჟამად იქ არის</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{visit.durationMinutes != null ? `${visit.durationMinutes} წთ` : '—'}</td>
                <td>{distance != null ? `${distance}მ` : '—'}</td>
              </tr>
            )
          })}
          {visibleVisits.length === 0 && (
            <tr>
              <td colSpan={7}>
                {search ? 'ასეთი თანამშრომელი ვერ მოიძებნა' : onlyFar ? 'საეჭვო ვიზიტები არ არის' : 'დღეს ჯერ არავინ დაჩექინებულა'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
