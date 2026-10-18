'use client'

import { useEffect, useState } from 'react'

export function useDarkTheme() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const read = () => setDark(el.getAttribute('data-theme') === 'dark')
    read()
    const obs = new MutationObserver(read)
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// map tiles: Mapbox when a token is set (NEXT_PUBLIC_MAPBOX_TOKEN), otherwise Esri canvas (no key)
const MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
const mb = (style) => `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${MAPBOX}`
export const MAP_TILES = MAPBOX
  ? {
      provider: 'mapbox',
      light: mb('streets-v12'),
      dark: mb('dark-v11'),
      lightLabels: null,
      darkLabels: null,
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }
  : {
      provider: 'esri',
      light: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      lightLabels: null,
      dark: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
      darkLabels: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
      tileSize: 256,
      zoomOffset: 0,
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    }
