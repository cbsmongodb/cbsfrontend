'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDarkTheme, MAP_TILES } from '@/lib/useDarkTheme'
import { useTranslations } from 'next-intl'

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

function hospitalIcon(isFar) {
  const color = isFar ? '#dc2626' : '#7c3aed'
  const svg = `
    <svg width="40" height="54" viewBox="0 0 40 54" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 0C9 0 0 9 0 20c0 15 20 34 20 34s20-19 20-34C40 9 31 0 20 0z"
        fill="${color}"
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

const OFFICE = [41.7676718, 44.7910395]

function officeIcon() {
  const svg = `
    <svg width="58" height="74" viewBox="0 0 58 74" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cbsPinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c084fc" />
          <stop offset="55%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#5b21b6" />
        </linearGradient>
        <linearGradient id="cbsPinShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>
        <filter id="cbsPinShadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="3.5"
            flood-color="#4c1d95" flood-opacity="0.45" />
        </filter>
      </defs>
      <ellipse cx="29" cy="70" rx="9" ry="2.6" fill="#4c1d95" opacity="0.25" />
      <path filter="url(#cbsPinShadow)"
        d="M29 3C15.2 3 4 14.2 4 28c0 18.6 25 40 25 40s25-21.4 25-40C54 14.2 42.8 3 29 3z"
        fill="url(#cbsPinGrad)" stroke="#ffffff" stroke-width="2.5" />
      <path d="M29 6C16.9 6 7 15.9 7 28c0 3 .6 5.8 1.6 8.4C12 22 20 14 29 14s17 8 20.4 22.4c1-2.6 1.6-5.4 1.6-8.4C51 15.9 41.1 6 29 6z"
        fill="url(#cbsPinShine)" />
      <circle cx="29" cy="28" r="16" fill="#ffffff" />
      <text x="29" y="33" text-anchor="middle" font-size="13" font-weight="900"
        letter-spacing="0.5" fill="#6d28d9"
        font-family="Montserrat, Arial, sans-serif">CBS</text>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'gmaps-style-pin cbs-office-pin',
    iconSize: [58, 74],
    iconAnchor: [29, 71],
    popupAnchor: [0, -64],
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
  const darkMap = useDarkTheme()
  const tu = useTranslations('ui')
  const center = events[0] ? [events[0].lat, events[0].lng] : TBILISI

  const [mapHeight, setMapHeight] = useState(350)
  useEffect(() => {
    function updateHeight() {
      setMapHeight(window.innerWidth <= 640 ? 250 : 350)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])
  const orderedEvents = [...events].sort((a, b) => new Date(a.time) - new Date(b.time))
  const routePoints = orderedEvents.map((e) => [e.lat, e.lng])

  // unique hospital positions among the currently shown events — isFar is
  // true if ANY event at that hospital was 300m+ away, making the pin red
  const hospitalMarkers = []
  const hospitalIndexByKey = new Map()
  for (const e of events) {
    if (e.hospitalLat == null || e.hospitalLng == null) continue
    if (e.isOffice) continue // the office has its own CBS pin
    const key = `${e.hospitalLat},${e.hospitalLng}`
    if (hospitalIndexByKey.has(key)) {
      if (e.isFar) hospitalMarkers[hospitalIndexByKey.get(key)].isFar = true
      continue
    }
    hospitalIndexByKey.set(key, hospitalMarkers.length)
    hospitalMarkers.push({ lat: e.hospitalLat, lng: e.hospitalLng, name: e.hospitalName, isFar: !!e.isFar })
  }

  // a check-out at the same spot as a check-in would hide behind it -> show it a few metres to the side
  const displayPos = (event, i) => {
    if (event.type !== 'checkout') return [event.lat, event.lng]
    const twin = events.some((e, j) => j !== i && e.type === 'checkin' &&
      distanceInMeters(e.lat, e.lng, event.lat, event.lng) < 15)
    return twin ? [event.lat, event.lng + 0.00012] : [event.lat, event.lng]
  }

  return (
    <div className="map-gradient-border">
      <MapContainer
        center={center}
        zoom={events.length > 0 ? 17 : 11}
        style={{ height: `${mapHeight}px`, width: '100%' }}
        attributionControl={false}
      >
        <TileLayer key={darkMap ? 'dark' : 'light'} url={darkMap ? MAP_TILES.dark : MAP_TILES.light} attribution={MAP_TILES.attribution} tileSize={MAP_TILES.tileSize} zoomOffset={MAP_TILES.zoomOffset} maxZoom={MAP_TILES.maxZoom} />
        {(darkMap ? MAP_TILES.darkLabels : MAP_TILES.lightLabels) && (
          <TileLayer key={darkMap ? 'dark-labels' : 'light-labels'} url={darkMap ? MAP_TILES.darkLabels : MAP_TILES.lightLabels} maxZoom={MAP_TILES.maxZoom} />
        )}
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
              <Tooltip
                permanent
                direction="center"
                className={event.isFar ? "distance-tooltip is-far" : "distance-tooltip"}
              >
                {distance}{tu('k032')}
              </Tooltip>
            </Polyline>
          )
        })}

        <Marker position={OFFICE} icon={officeIcon()} zIndexOffset={500}>
          <Popup>
            <strong>Global CBS</strong>
            <br />
            Guramishvili Ave 62, Office 3
          </Popup>
        </Marker>

        {hospitalMarkers.map((h, i) => (
          <Marker key={`hospital-${i}`} position={[h.lat, h.lng]} icon={hospitalIcon(h.isFar)}>
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
              position={displayPos(event, i)}
              icon={pinIcon(color, event.visitNumber, event.isFar)}
            >
              <Popup>
                <strong>{event.employeeName}</strong>
                <br />
                {event.type === 'checkin' ? tu('k033') : tu('k034')} — {event.hospitalName}
                <br />
                {new Date(event.time).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                {event.distanceFromHospital != null && (
                  <>
                    <br />
                    {tu('k035')}{" "}{event.distanceFromHospital}{tu('k032')}
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
