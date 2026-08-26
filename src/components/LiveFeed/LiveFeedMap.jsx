'use client'

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const TBILISI = [41.7151, 44.8271]

function colorFor(event) {
  if (event.isFar) return '#e11d48'
  if (event.type === 'checkin') return '#16a34a'
  return '#6b7280'
}

export default function LiveFeedMap({ events }) {
  const center = events[0] ? [events[0].lat, events[0].lng] : TBILISI

  return (
    <MapContainer center={center} zoom={12} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {events.map((event, i) => (
        <CircleMarker
          key={i}
          center={[event.lat, event.lng]}
          radius={9}
          pathOptions={{ color: colorFor(event), fillColor: colorFor(event), fillOpacity: 0.8 }}
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
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
