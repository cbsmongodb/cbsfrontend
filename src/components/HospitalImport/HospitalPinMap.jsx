'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TBILISI = [41.7151, 44.8271]

function pinIcon() {
  const svg = `
    <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 25 15 25s15-13.8 15-25C30 6.7 23.3 0 15 0z"
        fill="#2563eb"
        stroke="#fff"
        stroke-width="2"
      />
      <circle cx="15" cy="15" r="6" fill="#fff" />
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'gmaps-style-pin',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  })
}

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function HospitalPinMap({ position, onPick }) {
  return (
    <MapContainer
      center={position || TBILISI}
      zoom={position ? 16 : 7}
      style={{ height: 320, width: '100%', borderRadius: 8 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onPick={onPick} />
      {position && <Marker position={position} icon={pinIcon()} />}
    </MapContainer>
  )
}
