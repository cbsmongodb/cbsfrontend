'use client'

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

const TBILISI = [41.7151, 44.8271]
const CHECKIN_COLOR = '#16a34a'
const CHECKOUT_COLOR = '#dc2626'

function FitBounds({ events, focusKey }) {
  const map = useMap()
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    const current = eventsRef.current
    if (!current || current.length === 0) return

    map.whenReady(() => {
      if (current.length === 1) {
        map.setView([current[0].lat, current[0].lng], 17)
        return
      }
      const bounds = current.map((e) => [e.lat, e.lng])
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, map])

  return null
}

export default function LiveFeedMap({ events = [], focusKey }) {
  const center = events[0] ? [events[0].lat, events[0].lng] : TBILISI
  const orderedEvents = [...events].sort((a, b) => new Date(a.time) - new Date(b.time))
  const routePoints = orderedEvents.map((e) => [e.lat, e.lng])

  return (
    <MapContainer
      center={center}
      zoom={events.length > 0 ? 17 : 11}
      style={{ height: '380px', width: '100%' }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds events={events} focusKey={focusKey} />

      {routePoints.length > 1 && (
        <Polyline
          positions={routePoints}
          pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.6, dashArray: '6 8' }}
        />
      )}

      {events.map((event, i) => {
        const color = event.type === 'checkin' ? CHECKIN_COLOR : CHECKOUT_COLOR
        return (
          <CircleMarker
            key={i}
            center={[event.lat, event.lng]}
            radius={14}
            pathOptions={{
              color: event.isFar ? '#f59e0b' : '#fff',
              weight: event.isFar ? 3 : 2,
              dashArray: event.isFar ? '4 3' : undefined,
              fillColor: color,
              fillOpacity: 0.95,
            }}
          >
            {event.visitNumber != null && (
              <Tooltip permanent direction="center" className="visit-number-tooltip">
                {event.visitNumber}
              </Tooltip>
            )}
            <Popup>
              <strong>{event.employeeName}</strong>
              <br />
              {event.type === 'checkin' ? 'ჩექინი' : 'ჩექაუთი'} — {event.hospitalName}
              <br />
              {new Date(event.time).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
              {event.distanceFromHospital != null && (
                <>
                  <br />
                  მანძილი ჰოსპიტალამდე: {event.distanceFromHospital}მ
                </>
              )}
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
