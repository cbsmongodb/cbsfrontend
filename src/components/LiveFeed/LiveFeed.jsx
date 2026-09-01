'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { io } from 'socket.io-client'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import './LiveFeed.css'

const LiveFeedMap = dynamic(() => import('./LiveFeedMap'), { ssr: false })

const FAR_THRESHOLD_METERS = 300
const SHORT_VISIT_MINUTES = 1
const API_URL = process.env.NEXT_PUBLIC_API_URL
const DATE_LOCALES = { ka: 'ka-GE', en: 'en-US', ru: 'ru-RU' }

function flattenToEvents(items) {
  const events = []
  for (const item of items) {
    for (const addr of item.addresses) {
      if (addr.lat == null || addr.lng == null) continue
      events.push({
        groupKey: item.groupKey,
        employeeId: item.employeeId,
        employeeName: item.employeeName || '',
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

export default function LiveFeed() {
  const t = useTranslations('liveFeed')
  const { locale } = useParams()
  const dateLocale = DATE_LOCALES[locale] || 'en-US'

  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [focus, setFocus] = useState(null)
  const [onlyFar, setOnlyFar] = useState(false)
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [agoText, setAgoText] = useState('')
  const seenEmployeeForDayLink = new Set()

  function formatAgo(seconds) {
    if (seconds < 5) return t('ago.justNow')
    if (seconds < 60) return t('ago.seconds', { count: seconds })
    const minutes = Math.floor(seconds / 60)
    return t('ago.minutes', { count: minutes })
  }

  function formatDuration(minutes) {
    if (minutes == null) return '—'
    if (minutes < 60) return t('duration.minutesOnly', { m: minutes })
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? t('duration.hoursMinutes', { h, m }) : t('duration.hoursOnly', { h })
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <h1>{t('title')}</h1>
        {lastUpdated && <span className="live-feed-updated">{t('updated', { time: agoText })}</span>}
      </div>

      {error && <p className="live-feed-error">{error}</p>}

      <LiveFeedMap events={mapEvents} focusKey={focusKey} />

      <div className="live-feed-controls">
        <form className="live-search" onSubmit={(e) => e.preventDefault()}>
          <button type="button" tabIndex={-1}>
            <svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9"
                stroke="currentColor"
                strokeWidth="1.333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <input
            className="live-search-input"
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
          />
          <button className="live-search-reset" type="button" onClick={() => setSearch('')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>

        <label className="live-feed-far-toggle">
          <input
            type="checkbox"
            checked={onlyFar}
            onChange={(e) => setOnlyFar(e.target.checked)}
          />
          {t('onlyFar')}
        </label>
      </div>

      <div className="live-feed-table-wrap">
        <table className="live-feed-table">
          <thead>
            <tr>
              <th></th>
              <th>{t('headers.employee')}</th>
              <th>{t('headers.hospital')}</th>
              <th>{t('headers.checkin')}</th>
              <th>{t('headers.checkout')}</th>
              <th>{t('headers.duration')}</th>
              <th>{t('headers.distance')}</th>
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
                  <td data-label="">
                    <span className={`dot ${visit.isFar ? 'far' : 'checkin'}`} />
                  </td>
                  <td data-label={t('headers.employee')}>
                    {visit.visitNumber != null && (
                      <span className="visit-badge">{visit.visitNumber}</span>
                    )}
                    {visit.employeeName}
                    {visit.isShort && <span className="short-badge">{t('shortVisit')}</span>}
                    {showDayLink && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFocus({ type: 'day', employeeId: visit.employeeId })
                        }}
                        className="day-link"
                      >
                        {t('wholeDay')}
                      </button>
                    )}
                  </td>
                  <td data-label={t('headers.hospital')}>{visit.hospitalName}</td>
                  <td data-label={t('headers.checkin')}>
                    {visit.checkinTime
                      ? new Date(visit.checkinTime).toLocaleTimeString(dateLocale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td data-label={t('headers.checkout')}>
                    {visit.checkoutTime ? (
                      new Date(visit.checkoutTime).toLocaleTimeString(dateLocale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : visit.isOpen ? (
                      <span className="live-badge">{t('currentlyThere')}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td data-label={t('headers.duration')}>{formatDuration(visit.durationMinutes)}</td>
                  <td data-label={t('headers.distance')}>{distance != null ? `${distance}მ` : '—'}</td>
                </tr>
              )
            })}
            {visibleVisits.length === 0 && (
              <tr>
                <td colSpan={7}>
                  {search ? t('empty.noSearchResults') : onlyFar ? t('empty.noFarVisits') : t('empty.noneToday')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
