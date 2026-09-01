'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { useTranslations } from 'next-intl'
import L from 'leaflet'
import { apiFetch } from '@/lib/api'
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

function FlyTo({ position }) {
  const map = useMap()
  if (position) {
    map.flyTo(position, 17, { duration: 0.6 })
  }
  return null
}

export default function HospitalPinMap({ position, onPick, initialQuery }) {
  const t = useTranslations('mapPicker')
  const [query, setQuery] = useState(initialQuery || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [flyTarget, setFlyTarget] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    try {
      const data = await apiFetch(`/api/hospitals/geocode-search?q=${encodeURIComponent(query)}`)
      if (data.length === 0) setSearchError(t('noResults'))
      setResults(data)
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setSearching(false)
    }
  }

  function pickResult(result) {
    onPick(result.lat, result.lng)
    setFlyTarget([result.lat, result.lng])
    setResults([])
  }

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          type="text"
          className="field-input"
          style={{ flex: 1, minWidth: 0, height: '2.3em' }}
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-gray btn-sm" disabled={searching}>
          <span>{searching ? t('searching') : `🔍 ${t('searchButton')}`}</span>
        </button>
      </form>

      {searchError && (
        <p style={{ fontSize: 12, color: '#b45309', marginBottom: 8 }}>{searchError}</p>
      )}

      {results.length > 0 && (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            marginBottom: 8,
            maxHeight: 140,
            overflowY: 'auto',
          }}
        >
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickResult(r)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 12.5,
              }}
            >
              📍 {r.label}
            </button>
          ))}
        </div>
      )}

      <MapContainer
        center={position || TBILISI}
        zoom={position ? 16 : 7}
        style={{ height: 500, width: '100%', borderRadius: 8 }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onPick={onPick} />
        {flyTarget && <FlyTo position={flyTarget} />}
        {position && <Marker position={position} icon={pinIcon()} />}
      </MapContainer>
    </div>
  )
}
