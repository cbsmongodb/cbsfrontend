'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import GeoHelp from '@/components/GeoHelp/GeoHelp'
import { geoErrorKind, getGeoPosition, watchGeoPermission } from '@/lib/geo'
import './LocationCard.css'

// dashboard: "Turn on location" under "Plan a visit"
// - not decided yet: asks right away when the dashboard opens, and on click
// - on: green "Location is on"
// - blocked: the browser won't ask again -> show how to turn it on
export default function LocationCard() {
  const tg = useTranslations('geo')
  const [perm, setPerm] = useState('unknown')
  const [kind, setKind] = useState(null)
  const [busy, setBusy] = useState(false)
  const askedOnce = useRef(false)

  async function ask() {
    if (busy) return
    setBusy(true)
    try {
      await getGeoPosition()
      setKind(null)
      setPerm('granted')
    } catch (err) {
      const k = geoErrorKind(err)
      setKind(k)
      if (k === 'denied') setPerm('denied')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let stop = () => {}
    watchGeoPermission((state) => {
      setPerm(state)
      if (state === 'granted') setKind(null)
      // first visit: let the browser ask straight away
      if (state === 'prompt' && !askedOnce.current) {
        askedOnce.current = true
        ask()
      }
    }).then((fn) => { stop = fn })
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const on = perm === 'granted' && !kind
  const blocked = perm === 'denied' || kind === 'denied'

  return (
    <div className="loc-card">
      <button
        type="button"
        className={`loc-btn ${on ? 'is-on' : blocked ? 'is-blocked' : 'is-off'}`}
        onClick={blocked ? () => setKind('denied') : ask}
        disabled={busy}
      >
        <span className="loc-btn-icon" aria-hidden="true">
          {on ? (
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.4" fill="currentColor" /></svg>
          )}
        </span>
        <span className="loc-btn-text">
          {busy ? '…' : on ? tg('on') : blocked ? tg('blockedHow') : tg('button')}
          {!on && !busy && <small>{tg('why')}</small>}
        </span>
        {on && <span className="loc-live" aria-hidden="true" />}
      </button>
      <GeoHelp kind={kind} onRetry={ask} onClose={() => setKind(null)} />
    </div>
  )
}
