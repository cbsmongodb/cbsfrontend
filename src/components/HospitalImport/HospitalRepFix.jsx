'use client'

// Fix hospital locations from the reps' own GPS (check-in / check-out of completed visits):
//   • hospitals whose saved pin is off (more than N metres from where reps actually stand)
//   • hospitals with no location at all
// One button fixes everything that is ticked; "undo" puts the old points back.
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'

const gmaps = (p) => `https://www.google.com/maps?q=${p.lat},${p.lng}`
const fmtDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} კმ` : `${m} მ`)

function Row({ h, checked, onToggle, t }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 4px',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
        flexWrap: 'wrap',
      }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
        <strong>{h.name}</strong>
        <div style={{ color: '#64748b', fontSize: 12 }}>{[h.region, h.address].filter(Boolean).join(' · ')}</div>
        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
          {t('gpsPoints', { points: h.suggested.points, total: h.suggested.total })}
        </div>
      </div>
      {h.distance != null && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: h.distance > 2000 ? '#dc2626' : '#b45309',
            background: h.distance > 2000 ? '#fef2f2' : '#fffbeb',
            borderRadius: 999,
            padding: '3px 10px',
          }}
        >
          {t('offBy', { distance: fmtDist(h.distance) })}
        </span>
      )}
      <span style={{ display: 'flex', gap: 10, fontSize: 12 }}>
        {h.current && (
          <a href={gmaps(h.current)} target="_blank" rel="noreferrer" style={{ color: '#64748b' }} onClick={(e) => e.stopPropagation()}>
            {t('nowLink')}
          </a>
        )}
        <a href={gmaps(h.suggested)} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }} onClick={(e) => e.stopPropagation()}>
          {t('gpsLink')}
        </a>
      </span>
    </label>
  )
}

export default function HospitalRepFix({ onApplied }) {
  const t = useTranslations('hospitalRepFix')
  const [minDistance, setMinDistance] = useState(300)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null) // { updated, ids }
  const [undoing, setUndoing] = useState(false)

  async function load(dist = minDistance) {
    setLoading(true)
    setError('')
    try {
      const d = await apiFetch(`/api/hospitals/rep-location-fixes?minDistance=${dist}`)
      setData(d)
      setPicked(new Set([...d.displaced, ...d.missing].map((h) => h._id)))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const all = useMemo(() => (data ? [...data.displaced, ...data.missing] : []), [data])

  function toggle(id) {
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = (list, on) =>
    setPicked((prev) => {
      const next = new Set(prev)
      list.forEach((h) => (on ? next.add(h._id) : next.delete(h._id)))
      return next
    })

  async function applyPicked() {
    const ids = [...picked]
    if (!ids.length) return
    setSaving(true)
    setError('')
    try {
      const r = await apiFetch('/api/hospitals/apply-rep-locations', { method: 'POST', body: JSON.stringify({ ids }) })
      setDone({ updated: r.updated, ids: r.items.map((i) => i._id) })
      await load()
      onApplied?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function undo() {
    if (!done?.ids.length) return
    setUndoing(true)
    setError('')
    try {
      await apiFetch('/api/hospitals/undo-rep-locations', { method: 'POST', body: JSON.stringify({ ids: done.ids }) })
      setDone(null)
      await load()
      onApplied?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setUndoing(false)
    }
  }

  const section = (title, list, hint) =>
    list.length > 0 && (
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, margin: 0 }}>
            {title} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({list.length})</span>
          </h3>
          <span style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <button type="button" className="link-btn" style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => toggleAll(list, true)}>
              {t('selectAll')}
            </button>
            <button type="button" style={{ fontSize: 12, color: '#64748b', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => toggleAll(list, false)}>
              {t('selectNone')}
            </button>
          </span>
        </div>
        {hint && <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>{hint}</p>}
        <div style={{ marginTop: 6, maxHeight: 420, overflowY: 'auto' }}>
          {list.map((h) => (
            <Row key={h._id} h={h} checked={picked.has(h._id)} onToggle={() => toggle(h._id)} t={t} />
          ))}
        </div>
      </div>
    )

  return (
    <div
      style={{
        border: '1px solid #bbf7d0',
        background: 'linear-gradient(135deg, #f0fdf4, #ffffff)',
        borderRadius: 12,
        padding: 16,
        margin: '16px 0 8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📍 {t('title')}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('description')}</div>
        </div>
        <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t('thresholdLabel')}
          <select
            className="field-input"
            style={{ height: 32, width: 'auto', minWidth: 0, padding: '0 8px' }}
            value={minDistance}
            onChange={(e) => {
              const v = Number(e.target.value)
              setMinDistance(v)
              load(v)
            }}
          >
            {[200, 300, 500, 1000, 3000].map((v) => (
              <option key={v} value={v}>{fmtDist(v)}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && !data && <p style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>{t('loading')}</p>}
      {error && <p className="resource-error" style={{ marginTop: 12 }}>{error}</p>}

      {done && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: '#dcfce7',
            color: '#166534',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>✅ {t('doneText', { count: done.updated })}</span>
          {done.ids.length > 0 && (
            <button type="button" className="btn-gray btn-sm" onClick={undo} disabled={undoing}>
              <span>{undoing ? '...' : t('undoButton')}</span>
            </button>
          )}
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="btn" onClick={applyPicked} disabled={saving || picked.size === 0}>
              <span>{saving ? t('saving') : t('applyButton', { count: picked.size })}</span>
            </button>
            <button type="button" className="btn-gray" onClick={() => load()} disabled={loading}>
              <span>{loading ? t('loading') : t('refreshButton')}</span>
            </button>
          </div>

          {all.length === 0 && <p style={{ fontSize: 13, color: '#16a34a', marginTop: 12 }}>✓ {t('allGood')}</p>}

          {section(t('displacedHeading'), data.displaced, t('displacedHint'))}
          {section(t('missingHeading'), data.missing)}

          {data.missingNoData > 0 && (
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>{t('noDataNote', { count: data.missingNoData })}</p>
          )}
        </>
      )}
    </div>
  )
}
