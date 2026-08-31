'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TBILISI = [41.7151, 44.8271]
const CHECKIN_COLOR = '#16a34a'
const CHECKOUT_COLOR = '#dc2626'

function pinIcon(color, number, isFar) {
  const ringColor = isFar ? '#f59e0b' : '#ffffff'
  const ringWidth = isFar ? 3 : 2

  const svg = `
    <svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 29 17 29s17-16.3 17-29C34 7.6 26.4 0 17 0z"
        fill="${color}"
        stroke="${ringColor}"
        stroke-width="${ringWidth}"
      />
      <circle cx="17" cy="17" r="11" fill="rgba(255,255,255,0.15)" />
      ${
        number != null
          ? `<text x="17" y="22" text-anchor="middle" font-size="15" font-weight="700" fill="#fff" font-family="Arial, sans-serif">${number}</text>`
          : ''
      }
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: 'gmaps-style-pin',
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -40],
  })
}

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
    <div className="map-gradient-border">
      <MapContainer
        center={center}
        zoom={events.length > 0 ? 17 : 11}
        style={{ height: '350px', width: '100%' }}
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
            <Marker
              key={i}
              position={[event.lat, event.lng]}
              icon={pinIcon(color, event.visitNumber, event.isFar)}
            >
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
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
