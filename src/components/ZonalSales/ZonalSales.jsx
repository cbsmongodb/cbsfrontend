'use client'

// Zonal sales — where in Georgia what sells, and how much.
//   map of Georgia (bubble per zone) · zone ranking · pharmacy chains · products · zone × product heatmap
// Director / finance / office see every division; a division manager only their own (the server decides).
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import '@/components/ExcelExportButton/ExcelExportButton.css'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import '@/components/ReimbursementReport/ReimbursementReport.css'
import '@/components/VisitsReport/VisitsReport.css'
import { matchZone } from './zones'
import './ZonalSales.css'

const ZoneMap = dynamic(() => import('./ZoneMap'), { ssr: false, loading: () => <div className="zs-map zs-map-loading" /> })

const TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }

// add rows up by a key
function sumBy(rows, keyFn, metric) {
  const m = new Map()
  rows.forEach((r) => {
    const k = keyFn(r)
    m.set(k, (m.get(k) || 0) + (r[metric] || 0))
  })
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function Bars({ items, total, fmt, tone = 'gold', max, onPick, picked, empty }) {
  if (!items.length) return <p className="zs-muted">{empty}</p>
  const top = max || Math.max(1, ...items.map((i) => i.value))
  return (
    <ol className="zs-bars">
      {items.map((it, i) => (
        <li
          key={it.key || it.name}
          className={`${onPick ? 'is-clickable' : ''} ${picked && picked === it.key ? 'is-picked' : ''}`}
          onClick={onPick ? () => onPick(picked === it.key ? null : it.key) : undefined}
        >
          <span className="zs-bar-rank">{i + 1}</span>
          <div className="zs-bar-body">
            <div className="zs-bar-head">
              <strong title={it.name}>{it.name}</strong>
              <span>
                {fmt(it.value)}
                {total > 0 && <em>{((it.value / total) * 100).toFixed(1)}%</em>}
              </span>
            </div>
            <div className="zs-bar-track">
              <i className={`zs-bar-fill zs-${it.tone || tone}`} style={{ width: `${Math.max(2, (it.value / top) * 100)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function ZonalSales() {
  const t = useTranslations('zonalSales')
  const locale = useLocale()
  const tag = TAG[locale] || TAG.ka

  const [divisions, setDivisions] = useState([])
  const [divisionId, setDivisionId] = useState('')
  const [month, setMonth] = useState('')
  const [metric, setMetric] = useState('amount')
  const [zoneKey, setZoneKey] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/reports/zonal-sales/divisions').then(setDivisions).catch(() => {})
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(over = {}) {
    const r = { month, divisionId, ...over }
    setLoading(true)
    setError('')
    try {
      const p = new URLSearchParams()
      if (r.month) p.set('month', r.month)
      if (r.divisionId) p.set('division', r.divisionId)
      const d = await apiFetch(`/api/reports/zonal-sales/summary?${p}`)
      setData(d)
      if (d.month) setMonth(d.month)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const money = (v) => `${Math.round(v).toLocaleString(tag)} ₾`
  const units = (v) => `${Math.round(v).toLocaleString(tag)} ${t('pcs')}`
  const fmt = metric === 'amount' ? money : units
  const compact = (v) => {
    const s = v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}K` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : `${Math.round(v)}`
    return metric === 'amount' ? `${s} ₾` : s
  }
  const monthLabel = (m) => {
    const [y, mm] = m.split('-').map(Number)
    const s = new Date(y, mm - 1, 1).toLocaleDateString(tag, { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const zoneName = (z) => (locale === 'ka' ? z.ka : z.en)

  // every number the page shows, from the server's sums
  const view = useMemo(() => {
    if (!data) return null
    const zoneOf = (name) => {
      const z = matchZone(name)
      return z ? { key: z.key, label: zoneName(z), lat: z.lat, lng: z.lng } : { key: `x:${name}`, label: name }
    }
    const meta = new Map()
    const keyed = (rows) => rows.map((r) => {
      const z = zoneOf(r.zone)
      if (!meta.has(z.key)) meta.set(z.key, z)
      return { ...r, zoneKey: z.key }
    })
    const zp = keyed(data.zoneProducts)
    const zc = keyed(data.zoneChains)
    const zr = keyed(data.zones)

    const zones = sumBy(zr, (r) => r.zoneKey, metric).map((z, i, all) => ({
      ...meta.get(z.name),
      value: z.value,
      rank: i,
      tone: i === 0 ? 'green' : i === all.length - 1 && all.length > 2 ? 'red' : 'gold',
      top: sumBy(zp.filter((r) => r.zoneKey === z.name), (r) => r.product, metric)[0]?.name || null,
    }))
    const total = zones.reduce((s, z) => s + z.value, 0)
    const inZone = (rows) => (zoneKey ? rows.filter((r) => r.zoneKey === zoneKey) : rows)
    const products = sumBy(inZone(zp), (r) => r.product, metric)
    const chains = sumBy(inZone(zc), (r) => r.chain, metric)
    const allProducts = sumBy(zp, (r) => r.product, metric)

    // heatmap: top 8 products × every zone
    const cols = allProducts.slice(0, 8).map((p) => p.name)
    const cell = new Map()
    zp.forEach((r) => {
      const k = `${r.zoneKey}|${r.product}`
      cell.set(k, (cell.get(k) || 0) + (r[metric] || 0))
    })
    const matrix = zones.map((z) => {
      const vals = cols.map((c) => cell.get(`${z.key}|${c}`) || 0)
      return { zone: z, vals, max: Math.max(1, ...vals) }
    })

    return {
      zones,
      total,
      products,
      chains,
      allProducts,
      cols,
      matrix,
      onMap: zones.filter((z) => z.lat != null),
      offMap: zones.filter((z) => z.lat == null),
      selected: zones.find((z) => z.key === zoneKey) || null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, metric, zoneKey, locale])

  function buildExcel() {
    const headers = [t('zone'), metric === 'amount' ? t('amount') : t('qty'), t('share'), t('leader')]
    const rows = view.zones.map((z) => [z.label, Math.round(z.value), `${((z.value / view.total) * 100).toFixed(1)}%`, z.top || ''])
    return { headers, rows }
  }

  const divisionChips = divisions.length > 1 ? [{ _id: '', name: t('all') }, ...divisions] : divisions
  const has = view && view.zones.length > 0
  const best = has ? view.zones[0] : null
  const worst = has && view.zones.length > 1 ? view.zones[view.zones.length - 1] : null

  return (
    <div className="reimbursement-report visits-report zonal-sales">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{t('title')}</h1>
          {has && <ExcelExportButton title={`${t('title')} — ${monthLabel(data.month)}`} fileName={`${t('title')} ${data.month}`} build={buildExcel} />}
          {loading && <ReportLoader />}
        </div>
        <p className="vr-subtitle">{divisions.length === 1 ? t('subtitleOwn', { division: divisions[0].name }) : t('subtitleAll')}</p>
      </div>

      <div className="reimbursement-filters-card">
        <div className="reimbursement-filters-grid">
          <div className="reimbursement-field">
            <label>{t('month')}</label>
            <select
              className="field-input"
              value={month}
              disabled={!data?.months?.length}
              onChange={(e) => { setMonth(e.target.value); setZoneKey(null); load({ month: e.target.value }) }}
            >
              {!data?.months?.length && <option value="">{t('noMonths')}</option>}
              {(data?.months || []).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div className="reimbursement-field">
            <label>{t('measure')}</label>
            <div className="zs-toggle">
              {['amount', 'qty'].map((m) => (
                <button key={m} type="button" className={`vr-chip ${metric === m ? 'is-active' : ''}`} onClick={() => setMetric(m)}>
                  {t(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {divisionChips.length > 0 && (
          <div className="vr-division-chips" role="tablist" aria-label={t('division')}>
            <span className="vr-chips-label">{t('division')}:</span>
            {divisionChips.map((d) => {
              const on = divisionId === d._id || divisions.length === 1
              return (
                <button
                  key={d._id || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`vr-chip ${on ? 'is-active' : ''}`}
                  onClick={() => { setDivisionId(d._id); setZoneKey(null); load({ divisionId: d._id }) }}
                  disabled={loading}
                >
                  {d.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}

      {data && !has && !loading && (
        <div className="zs-empty">
          <div className="zs-empty-icon" aria-hidden="true">🗺️</div>
          <strong>{t('emptyTitle')}</strong>
          <p>{t('emptyText')}</p>
        </div>
      )}

      {has && (
        <>
          {/* headline numbers */}
          <div className="zs-kpis">
            <div className="zs-kpi zs-kpi-main">
              <span>{t('kpiTotal')}</span>
              <b>{fmt(view.total)}</b>
              <em>{t('kpiZones', { count: view.zones.length })}</em>
            </div>
            <div className="zs-kpi zs-kpi-green">
              <span>{t('kpiBest')}</span>
              <b>{best.label}</b>
              <em>{fmt(best.value)} · {((best.value / view.total) * 100).toFixed(1)}%</em>
            </div>
            {worst && (
              <div className="zs-kpi zs-kpi-red">
                <span>{t('kpiWorst')}</span>
                <b>{worst.label}</b>
                <em>{fmt(worst.value)} · {((worst.value / view.total) * 100).toFixed(1)}%</em>
              </div>
            )}
            {view.allProducts[0] && (
              <div className="zs-kpi zs-kpi-gold">
                <span>{t('kpiProduct')}</span>
                <b title={view.allProducts[0].name}>🏆 {view.allProducts[0].name}</b>
                <em>{fmt(view.allProducts[0].value)}</em>
              </div>
            )}
          </div>

          {/* map + ranking */}
          <div className="zs-main">
            <section className="zs-map-card">
              <div className="zs-map-head">
                <div>
                  <h2>{t('mapTitle')}</h2>
                  <p>{t('mapHint')}</p>
                </div>
                <div className="zs-legend">
                  <span><i className="zs-dot zs-green" />{t('legendTop')}</span>
                  <span><i className="zs-dot zs-gold" />{t('legendMid')}</span>
                  <span><i className="zs-dot zs-red" />{t('legendLow')}</span>
                </div>
              </div>
              <ZoneMap zones={view.onMap} selected={zoneKey} onSelect={setZoneKey} fmt={compact} />
              {view.offMap.length > 0 && (
                <p className="zs-offmap">{t('offMap', { zones: view.offMap.map((z) => z.label).join(', ') })}</p>
              )}
            </section>

            <section className="zs-card">
              <h2>{t('rankTitle')}</h2>
              <p className="zs-muted">{t('rankHint')}</p>
              <Bars items={view.zones.map((z) => ({ ...z, name: z.label }))} total={view.total} fmt={fmt} onPick={setZoneKey} picked={zoneKey} empty="" />
            </section>
          </div>

          {/* products + chains — whole country or the picked zone */}
          <div className="zs-focus">
            <div className="zs-focus-title">
              {view.selected ? (
                <>
                  <h2>📍 {view.selected.label}</h2>
                  <span>{fmt(view.selected.value)} · {((view.selected.value / view.total) * 100).toFixed(1)}% {t('ofTotal')}</span>
                  <button type="button" className="btn-gray btn-sm" onClick={() => setZoneKey(null)}><span>{t('allZones')}</span></button>
                </>
              ) : (
                <>
                  <h2>🇬🇪 {t('wholeCountry')}</h2>
                  <span>{t('pickZone')}</span>
                </>
              )}
            </div>
            <div className="zs-two">
              <section className="zs-card">
                <h2>{t('productsTitle')}</h2>
                <Bars items={view.products.slice(0, 10)} total={view.selected ? view.selected.value : view.total} fmt={fmt} tone="gold" empty={t('noData')} />
              </section>
              <section className="zs-card">
                <h2>{t('chainsTitle')}</h2>
                <Bars items={view.chains.slice(0, 10)} total={view.selected ? view.selected.value : view.total} fmt={fmt} tone="blue" empty={t('noData')} />
              </section>
            </div>
          </div>

          {/* which product leads in which zone */}
          {view.cols.length > 0 && (
            <section className="zs-card zs-heat-card">
              <h2>{t('heatTitle')}</h2>
              <p className="zs-muted">{t('heatHint')}</p>
              <div className="zs-heat-wrap">
                <table className="zs-heat">
                  <thead>
                    <tr>
                      <th>{t('zone')}</th>
                      {view.cols.map((c) => <th key={c} title={c}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {view.matrix.map((row) => (
                      <tr key={row.zone.key} className={zoneKey === row.zone.key ? 'is-picked' : ''} onClick={() => setZoneKey(zoneKey === row.zone.key ? null : row.zone.key)}>
                        <th>{row.zone.label}</th>
                        {row.vals.map((v, i) => {
                          const k = v / row.max
                          const lead = v > 0 && v === row.max
                          return (
                            <td key={i} style={{ '--k': k.toFixed(3) }} className={lead ? 'is-lead' : v === 0 ? 'is-zero' : ''} title={`${row.zone.label} · ${view.cols[i]}: ${fmt(v)}`}>
                              {v ? compact(v) : '—'}
                              {lead && <i aria-hidden="true">🏆</i>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
