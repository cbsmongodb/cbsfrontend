'use client'

// Dark map of Georgia with one glowing bubble per zone: bigger = sells more.
// Each bubble shows the zone, its sales and the product that leads there.
// Labels pick a free side (below / right / left / above) so neighbouring zones never cover each other.
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_TILES } from '@/lib/useDarkTheme'

const GEORGIA = [[41.05, 39.95], [43.6, 46.75]]
const SIDES = ['b', 'r', 'l', 't']

function bubbleIcon(z, { size, tone, side, selected, fmt, crown }) {
  const html = `
    <div class="zs-bubble zs-side-${side} ${tone} ${selected ? 'is-selected' : ''}" style="--s:${size}px">
      <span class="zs-bubble-dot"></span>
      <div class="zs-bubble-label">
        <b>${z.label}</b>
        <span class="zs-bubble-val">${fmt(z.value)}</span>
        ${z.top ? `<span class="zs-bubble-top">${crown} ${z.top}</span>` : ''}
      </div>
    </div>`
  return L.divIcon({ html, className: 'zs-bubble-wrap', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

// rough label box size in px (3 short lines)
const labelSize = (z, fmt) => ({
  w: 20 + Math.max(z.label.length * 7.4, fmt(z.value).length * 8, z.top ? (z.top.length + 3) * 6.4 : 0),
  h: z.top ? 56 : 40,
})
const overlap = (a, b) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

function Bubbles({ zones, selected, onSelect, fmt, crown }) {
  const map = useMap()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const redo = () => setTick((n) => n + 1)
    map.on('zoomend resize', redo)
    return () => map.off('zoomend resize', redo)
  }, [map])

  const max = Math.max(1, ...zones.map((z) => z.value))
  const sizeOf = (z) => Math.round(26 + Math.sqrt(z.value / max) * 74)

  // biggest zones choose first; every label takes the first side that is still free
  const sides = useMemo(() => {
    const out = {}
    const view = map.getSize()
    const boxes = zones.map((z) => {
      const p = map.latLngToContainerPoint([z.lat, z.lng])
      const s = sizeOf(z)
      return { x: p.x - s / 2, y: p.y - s / 2, w: s, h: s, p, s }
    })
    const taken = boxes.map(({ x, y, w, h }) => ({ x, y, w, h })) // bubbles themselves
    const order = zones.map((z, i) => i).sort((a, b) => zones[b].value - zones[a].value)
    for (const i of order) {
      const z = zones[i]
      const { p, s } = boxes[i]
      const { w, h } = labelSize(z, fmt)
      const at = {
        b: { x: p.x - w / 2, y: p.y + s / 2 + 6, w, h },
        t: { x: p.x - w / 2, y: p.y - s / 2 - 6 - h, w, h },
        r: { x: p.x + s / 2 + 8, y: p.y - h / 2, w, h },
        l: { x: p.x - s / 2 - 8 - w, y: p.y - h / 2, w, h },
      }
      const others = taken.filter((_, k) => k !== i)
      // least covered side wins; leaving the map counts as covered
      const cost = (r) =>
        others.reduce((s, o) => s + overlap(r, o), 0) +
        (r.x < 4 || r.y < 64 || r.x + r.w > view.x - 4 || r.y + r.h > view.y - 4 ? r.w * r.h : 0)
      const side = SIDES.reduce((best, sd) => (cost(at[sd]) < cost(at[best]) ? sd : best), SIDES[0])
      out[z.key] = side
      taken.push(at[side])
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, tick, map])

  return zones.map((z) => (
    <Marker
      key={z.key}
      position={[z.lat, z.lng]}
      zIndexOffset={selected === z.key ? 2000 : Math.round((z.value / max) * 1000)}
      icon={bubbleIcon(z, {
        size: sizeOf(z),
        tone: z.tone === 'green' ? 'zs-b-top' : z.tone === 'red' ? 'zs-b-low' : '',
        side: sides[z.key] || 'b',
        selected: selected === z.key,
        fmt,
        crown,
      })}
      eventHandlers={{ click: () => onSelect(selected === z.key ? null : z.key) }}
    />
  ))
}

export default function ZoneMap({ zones, selected, onSelect, fmt, crown = '🏆' }) {
  return (
    <MapContainer
      bounds={GEORGIA}
      maxBounds={[[39.8, 38.5], [44.8, 48.2]]}
      scrollWheelZoom={false}
      zoomSnap={0.25}
      minZoom={6}
      attributionControl={false}
      className="zs-map"
    >
      <TileLayer url={MAP_TILES.dark} tileSize={MAP_TILES.tileSize} zoomOffset={MAP_TILES.zoomOffset || 0} />
      {MAP_TILES.darkLabels && <TileLayer url={MAP_TILES.darkLabels} tileSize={MAP_TILES.tileSize} opacity={0.55} />}
      <Bubbles zones={zones} selected={selected} onSelect={onSelect} fmt={fmt} crown={crown} />
    </MapContainer>
  )
}
