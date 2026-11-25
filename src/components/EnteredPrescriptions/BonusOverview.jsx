'use client'

// Read-only bonus table for group / division managers: every drug's bonus this month
// (Tbilisi and region) and the doctors who have their own bonus.
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'

const T = {
  ka: { open: 'ბონუსები', title: 'ბონუსები', drug: 'პრეპარატი', tbilisi: 'თბილისი', region: 'რეგიონი', doctors: 'ექიმებზე', search: 'ძებნა: პრეპარატი ან ექიმი…', none: '—', special: 'ექიმზე შეცვლილი', close: 'დახურვა', empty: 'არაფერი მოიძებნა', hint: 'ცალკე ბონუსის მქონე ექიმები', n: (k) => `${k} ექიმი` },
  en: { open: 'Bonuses', title: 'Bonuses', drug: 'Drug', tbilisi: 'Tbilisi', region: 'Regions', doctors: 'Doctors', search: 'Search drug or doctor…', none: '—', special: 'doctor-specific', close: 'Close', empty: 'Nothing found', hint: 'Doctors with their own bonus', n: (k) => `${k} doctors` },
  ru: { open: 'Бонусы', title: 'Бонусы', drug: 'Препарат', tbilisi: 'Тбилиси', region: 'Регионы', doctors: 'Врачи', search: 'Поиск препарата или врача…', none: '—', special: 'бонус врача', close: 'Закрыть', empty: 'Ничего не найдено', hint: 'Врачи с отдельным бонусом', n: (k) => `${k} врач.` },
}
const money = (v) => `${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ₾`

export function isBonusViewer() {
  try {
    const me = JSON.parse(localStorage.getItem('employee') || 'null')
    const r = (me?.role?.name || '').toLowerCase().trim()
    return /(group|division) manager/.test(r) || ['admin', 'director'].includes(r)
  } catch { return false }
}

export default function BonusOverview({ month }) {
  const L = T[useLocale()] || T.ka
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!open) return
    setData(null); setError('')
    apiFetch(`/api/doctor-entry-items/bonus-table?month=${month}`).then(setData).catch((e) => setError(e.message))
  }, [open, month])
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = data?.drugs || []
    if (!s) return list
    return list.filter((d) => d.name.toLowerCase().includes(s) || d.doctors.some((x) => `${x.doctor} ${x.uniqueNumber}`.toLowerCase().includes(s)))
  }, [data, q])

  return (
    <>
      <button type="button" className="bo-open" onClick={() => setOpen(true)}>💰 {L.open}</button>
      {open && (
        <div className="bo-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="bo-modal" role="dialog" aria-modal="true" aria-label={L.title}>
            <header className="bo-head">
              <h2>{L.title} <span>· {data?.month || month}</span></h2>
              <button type="button" className="bo-x" onClick={() => setOpen(false)} aria-label={L.close}>✕</button>
            </header>
            <div className="bo-search">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} autoFocus />
            </div>
            <div className="bo-body">
              {error && <p className="resource-error">{error}</p>}
              {!data && !error && <p className="bo-muted"><span className="btn-spinner" /></p>}
              {data && (
                <table className="bo-table">
                  <thead>
                    <tr><th>{L.drug}</th><th className="n">{L.tbilisi}</th><th className="n">{L.region}</th><th>{L.doctors}</th></tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={4} className="bo-muted">{L.empty}</td></tr>}
                    {rows.map((d) => (
                      <FragmentRow key={d._id} d={d} L={L} q={q} open={expanded === d._id || (!!q.trim() && d.doctors.length > 0 && !d.name.toLowerCase().includes(q.trim().toLowerCase()))} toggle={() => setExpanded(expanded === d._id ? null : d._id)} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FragmentRow({ d, L, open, toggle, q }) {
  const s = q.trim().toLowerCase()
  const docs = s && !d.name.toLowerCase().includes(s) ? d.doctors.filter((x) => `${x.doctor} ${x.uniqueNumber}`.toLowerCase().includes(s)) : d.doctors
  return (
    <>
      <tr className={d.region !== d.tbilisi ? 'bo-diff' : ''}>
        <td className="bo-drug">{d.name}</td>
        <td className="n">{money(d.tbilisi)}</td>
        <td className="n">{money(d.region)}</td>
        <td>
          {d.doctors.length
            ? <button type="button" className={`bo-docs${open ? ' is-open' : ''}`} onClick={toggle}>👩‍⚕️ {L.n(d.doctors.length)} {open ? '▲' : '▼'}</button>
            : <span className="bo-muted">{L.none}</span>}
        </td>
      </tr>
      {open && docs.map((x, i) => (
        <tr key={i} className="bo-sub">
          <td>↳ {x.doctor}{x.uniqueNumber && <small> · {x.uniqueNumber}</small>}</td>
          <td className="n">{money(x.tbilisi)}</td>
          <td className="n">{money(x.region)}</td>
          <td><span className="bo-tag">{L.special}</span></td>
        </tr>
      ))}
    </>
  )
}
