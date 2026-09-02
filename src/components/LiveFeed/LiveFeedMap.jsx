'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TBILISI = [41.7151, 44.8271]
const CHECKIN_COLOR = '#16a34a'
const CHECKOUT_COLOR = '#dc2626'

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

function hospitalIcon() {
  const svg = `
    <svg width="40" height="54" viewBox="0 0 40 54" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 0C9 0 0 9 0 20c0 15 20 34 20 34s20-19 20-34C40 9 31 0 20 0z"
        fill="#7c3aed"
        stroke="#fff"
        stroke-width="2.5"
      />
      <circle cx="20" cy="20" r="13" fill="rgba(255,255,255,0.15)" />
      <path d="M20 12v16M12 20h16" stroke="#fff" stroke-width="4" stroke-linecap="round" />
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'gmaps-style-pin',
    iconSize: [40, 54],
    iconAnchor: [20, 54],
    popupAnchor: [0, -48],
  })
}

function FitBounds({ events, focusKey }) {
  const map = useMap()
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    const current = eventsRef.current
    if (!current || current.length === 0) return

    const points = []
    current.forEach((e) => {
      points.push([e.lat, e.lng])
      if (e.hospitalLat != null && e.hospitalLng != null) {
        points.push([e.hospitalLat, e.hospitalLng])
      }
    })

    map.whenReady(() => {
      if (points.length === 1) {
        map.setView(points[0], 17)
        return
      }
      map.fitBounds(points, { padding: [60, 60], maxZoom: 18 })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, map])

  return null
}

export default function LiveFeedMap({ events = [], focusKey }) {
  const center = events[0] ? [events[0].lat, events[0].lng] : TBILISI
  const orderedEvents = [...events].sort((a, b) => new Date(a.time) - new Date(b.time))
  const routePoints = orderedEvents.map((e) => [e.lat, e.lng])

  // unique hospital positions among the currently shown events
  const hospitalMarkers = []
  const seenHospitals = new Set()
  for (const e of events) {
    if (e.hospitalLat == null || e.hospitalLng == null) continue
    const key = `${e.hospitalLat},${e.hospitalLng}`
    if (seenHospitals.has(key)) continue
    seenHospitals.add(key)
    hospitalMarkers.push({ lat: e.hospitalLat, lng: e.hospitalLng, name: e.hospitalName })
  }

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
          if (event.hospitalLat == null || event.hospitalLng == null) return null
          const distance =
            event.distanceFromHospital ??
            distanceInMeters(event.lat, event.lng, event.hospitalLat, event.hospitalLng)
          return (
            <Polyline
              key={`link-${i}`}
              positions={[
                [event.lat, event.lng],
                [event.hospitalLat, event.hospitalLng],
              ]}
              pathOptions={{
                color: event.isFar ? '#f59e0b' : '#7c3aed',
                weight: 3.5,
                dashArray: '2 10',
                opacity: 0.9,
                lineCap: 'round',
              }}
            >
              <Tooltip permanent direction="center" className="distance-tooltip">
                {distance}მ
              </Tooltip>
            </Polyline>
          )
        })}

        {hospitalMarkers.map((h, i) => (
          <Marker key={`hospital-${i}`} position={[h.lat, h.lng]} icon={hospitalIcon()}>
            <Popup>
              <strong>{h.name}</strong>
            </Popup>
          </Marker>
        ))}

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
