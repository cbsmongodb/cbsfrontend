'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line, LabelList,
} from 'recharts'
import { apiFetch } from '@/lib/api'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import './DirectorOverview.css'

// division colours = the sidebar themes
const DIV_COLORS = [
  { test: /^1/, a: '#52b788', b: '#1b4332' },
  { test: /^2/, a: '#2bb3c0', b: '#0b3a6e' },
  { test: /^3/, a: '#e0a37a', b: '#5a2a72' },
]
const FALLBACK = [{ a: '#8fa3bf', b: '#3b4a63' }, { a: '#f2c66d', b: '#8a5a12' }, { a: '#e88fb0', b: '#7a1f4a' }]
const colorsFor = (name, i) => DIV_COLORS.find((c) => c.test.test(String(name || '').trim())) || FALLBACK[i % FALLBACK.length]
const money = (n) => `₾${Math.round(n || 0).toLocaleString('en-US')}`
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : `${Math.round(n)}`)
const MONTHS = { ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'] }

function GlassTooltip({ active, payload, label, fmt = money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="ov-tooltip">
      {label && <div className="ov-tooltip-label">{label}</div>}
      {payload.filter((p) => p.value != null).map((p, i) => (
        <div className="ov-tooltip-row" key={i}>
          <i style={{ background: p.color || p.payload?.fill || p.stroke }} />
          <span>{p.name}</span>
          <strong>{typeof p.value === 'number' ? fmt(p.value, p) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function Kpi({ title, value, sub, data, dataKey, tone }) {
  return (
    <div className={`ov-kpi ov-kpi-${tone}`}>
      <div className="ov-kpi-top">
        <span>{title}</span>
        <strong>{value}</strong>
        {sub && <em>{sub}</em>}
      </div>
      <div className="ov-kpi-spark">
        <ResponsiveContainer width="100%" height={54}>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={dataKey} stroke="#ffffff" strokeWidth={2.2} fill={`url(#spark-${tone})`} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function DirectorOverview() {
  const t = useTranslations('director')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // instantOverview: the last numbers seen on this device show right away,
  // fresh ones replace them as soon as the server answers
  useEffect(() => {
    const key = `dirOverview:${year}`
    let shown = false
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null')
      if (saved?.months) { setData(saved); shown = true }
    } catch { /* ignore */ }
    if (!shown) setData(null)
    setLoading(!shown); setError('')
    let alive = true
    apiFetch(`/api/director-dashboard/overview?year=${year}`)
      .then((d) => {
        if (!alive) return
        setData(d)
        try { localStorage.setItem(key, JSON.stringify(d)) } catch { /* ignore */ }
      })
      .catch((e) => { if (alive && !shown) setError(e.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [year])

  const months = useMemo(() => (data?.months || []).map((m, i) => ({ ...m, label: MONTHS.ka[i] })), [data])
  const divisions = data?.divisions || []
  const divNames = divisions.map((d) => d.name)
  // only months up to now in the current year
  const lastMonth = year === now.getFullYear() ? now.getMonth() : 11
  const shown = months.slice(0, lastMonth + 1)
  const totals = data?.totals || {}
  const divTotal = divisions.reduce((s, d) => s + d.amount, 0)
  // no drug prices yet -> draw the charts in boxes instead of GEL
  const byBoxes = !(totals.sales > 0)
  const metric = byBoxes ? 'boxes' : 'amount'
  const fmtMetric = (v) => (byBoxes ? `${Math.round(v || 0).toLocaleString('en-US')} ${t('overview.boxes')}` : money(v))

  return (
    <div className="ov">
      <div className="ov-head">
        <div>
          <h2>{t('overview.title')}</h2>
          <span>{t('overview.subtitle')}</span>
        </div>
        <div className="ov-years">
          {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
            <button key={y} type="button" className={y === year ? 'active' : ''} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
      </div>

      {loading && <ReportLoader variant="page" />}
      {error && <p className="resource-error">{error}</p>}

      {data && (
        <>
          <div className="ov-kpis">
            <Kpi tone="blue" title={t('overview.sales')} value={money(totals.sales)} sub={`${(totals.boxes || 0).toLocaleString('en-US')} ${t('overview.boxes')}`} data={shown} dataKey="sales" />
            <Kpi tone="green" title={t('overview.visits')} value={(totals.visits || 0).toLocaleString('en-US')} sub={`${(totals.doctorVisits || 0).toLocaleString('en-US')} ${t('overview.doctorVisits')}`} data={shown} dataKey="visits" />
            <Kpi tone="purple" title={t('overview.prescriptions')} value={(totals.prescriptions || 0).toLocaleString('en-US')} sub={t('overview.fromDataEntry')} data={shown} dataKey="prescriptions" />
            <Kpi tone="amber" title={t('overview.budget')} value={money(totals.plannedBudget)} sub={`${totals.activeEmployees || 0} ${t('overview.employees')}`} data={shown} dataKey="plannedBudget" />
          </div>

          <div className="ov-grid ov-grid-main">
            <div className="ov-card">
              <h3>{t('overview.salesByMonth')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={shown} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    {divNames.map((n, i) => {
                      const c = colorsFor(n, i)
                      return (
                        <linearGradient key={n} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c.a} stopOpacity={0.85} />
                          <stop offset="100%" stopColor={c.b} stopOpacity={0.15} />
                        </linearGradient>
                      )
                    })}
                    <filter id="ov-glow" x="-10%" y="-10%" width="120%" height="140%">
                      <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0c3557" floodOpacity="0.25" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e3e8ef" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={48} />
                  <Tooltip content={<GlassTooltip />} />
                  {divNames.map((n, i) => (
                    <Area key={n} type="monotone" stackId="1" name={n} dataKey={(m) => m.byDivision?.[n] || 0}
                      stroke={colorsFor(n, i).b} strokeWidth={2} fill={`url(#area-${i})`} filter="url(#ov-glow)" />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="ov-card ov-donut-card">
              <h3>{t('overview.divisionShare')}</h3>
              <div className="ov-donut">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <defs>
                      {divNames.map((n, i) => {
                        const c = colorsFor(n, i)
                        return (
                          <linearGradient key={n} id={`pie-${i}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={c.a} />
                            <stop offset="100%" stopColor={c.b} />
                          </linearGradient>
                        )
                      })}
                    </defs>
                    {/* the "3D" depth: a darker copy a bit lower */}
                    <Pie data={divisions} dataKey="amount" nameKey="name" cx="50%" cy="54%" innerRadius={62} outerRadius={98}
                      paddingAngle={3} stroke="none" isAnimationActive={false} legendType="none">
                      {divisions.map((d, i) => <Cell key={i} fill={colorsFor(d.name, i).b} opacity={0.55} />)}
                    </Pie>
                    <Pie data={divisions} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={98}
                      paddingAngle={3} stroke="#ffffff" strokeWidth={2} cornerRadius={6}>
                      {divisions.map((d, i) => <Cell key={i} fill={`url(#pie-${i})`} />)}
                    </Pie>
                    <Tooltip content={<GlassTooltip fmt={(v) => `${money(v)} · ${divTotal ? Math.round((v / divTotal) * 100) : 0}%`} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="ov-donut-center">
                  <strong>{short(divTotal)}</strong>
                  <span>₾ {t('overview.total')}</span>
                </div>
              </div>
              <ul className="ov-legend">
                {divisions.map((d, i) => (
                  <li key={d.name}>
                    <i style={{ background: `linear-gradient(135deg, ${colorsFor(d.name, i).a}, ${colorsFor(d.name, i).b})` }} />
                    <span>{d.name}</span>
                    <strong>{divTotal ? Math.round((d.amount / divTotal) * 100) : 0}%</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ov-grid">
            <div className="ov-card">
              <h3>{t('overview.topDrugs')}{byBoxes && <small className="ov-note">{t('overview.inBoxes')}</small>}</h3>
              <ResponsiveContainer width="100%" height={Math.max(220, (data.topDrugs?.length || 0) * 34)}>
                <BarChart data={data.topDrugs} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bar-drugs" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0c3557" />
                      <stop offset="100%" stopColor="#2a93c4" />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} />
                  <Tooltip content={<GlassTooltip fmt={fmtMetric} />} cursor={{ fill: 'rgba(42,147,196,0.08)' }} />
                  <Bar dataKey={metric} name={t('overview.sales')} fill="url(#bar-drugs)" radius={[0, 10, 10, 0]} barSize={18}>
                    <LabelList dataKey={metric} position="right" formatter={short} style={{ fill: '#0c3557', fontWeight: 700, fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="ov-card">
              <h3>{t('overview.visitsVsRx')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={shown} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bar-visits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#52b788" />
                      <stop offset="100%" stopColor="#1b4332" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e3e8ef" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="l" tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={44} />
                  <YAxis yAxisId="r" orientation="right" tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: '#8e4f9a', fontSize: 12 }} width={44} />
                  <Tooltip content={<GlassTooltip fmt={(v) => v.toLocaleString('en-US')} />} cursor={{ fill: 'rgba(82,183,136,0.08)' }} />
                  <Bar yAxisId="l" dataKey="visits" name={t('overview.visits')} fill="url(#bar-visits)" radius={[8, 8, 0, 0]} barSize={22} />
                  <Line yAxisId="r" type="monotone" dataKey="prescriptions" name={t('overview.prescriptions')} stroke="#8e4f9a" strokeWidth={3}
                    dot={{ r: 4, fill: '#ffffff', stroke: '#8e4f9a', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="ov-card">
            <h3>{t('overview.topReps')}</h3>
            <div className="ov-reps">
              {(data.topReps || []).map((r, i) => {
                const max = data.topReps[0]?.[metric] || 1
                return (
                  <div className="ov-rep" key={i}>
                    <span className={`ov-rep-rank r${i + 1}`}>{i + 1}</span>
                    <span className="ov-rep-name">{r.name}</span>
                    <div className="ov-rep-bar"><i style={{ width: `${((r[metric] || 0) / max) * 100}%` }} /></div>
                    <strong>{fmtMetric(r[metric])}</strong>
                  </div>
                )
              })}
              {!data.topReps?.length && <p className="ov-empty">{t('overview.noSales')}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
