'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { useMonthNames } from '@/lib/months'
import './LeaveRequests.css'

const TYPES = ['paid', 'unpaid', 'sick']
const TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }
const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const personName = (e) => (e ? `${e.firstName || ''} ${e.lastName || ''}`.trim() : '—')

// every day of a request with its type (old admin entries: the weekdays of their range)
function daysOf(r) {
  if (r.days?.length) return r.days.map((d) => ({ date: String(d.date).slice(0, 10), type: d.type }))
  const out = []
  if (!TYPES.includes(r.type)) return out
  let d = new Date(String(r.startDate).slice(0, 10) + 'T00:00:00Z')
  const end = new Date(String(r.endDate).slice(0, 10) + 'T00:00:00Z')
  while (d <= end) {
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) out.push({ date: d.toISOString().slice(0, 10), type: r.type })
    d = new Date(d.getTime() + 86400000)
  }
  return out
}

function countTypes(days) {
  const c = { paid: 0, unpaid: 0, sick: 0 }
  days.forEach((d) => { if (c[d.type] !== undefined) c[d.type] += 1 })
  return c
}

export default function LeaveRequests() {
  const t = useTranslations('leaveRequests')
  const locale = useLocale()
  const months = useMonthNames()
  const now = new Date()

  const [tab, setTab] = useState('mine')
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [mine, setMine] = useState(null)
  const [restDays, setRestDays] = useState({})
  const [brush, setBrush] = useState('paid')
  const [picked, setPicked] = useState({})
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [pending, setPending] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [archiveYear, setArchiveYear] = useState(now.getFullYear())
  const [archive, setArchive] = useState(null)
  const [archiveSearch, setArchiveSearch] = useState('')
  const [openPerson, setOpenPerson] = useState(null)

  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(TAG[locale] || 'ka-GE', { weekday: 'short' })
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i, 12))))
  }, [locale])

  const fmtDay = (k) => {
    const [, m, d] = k.split('-').map(Number)
    return `${d} ${months[m - 1]}`
  }
  const fmtRange = (days) => {
    if (!days.length) return '—'
    const a = days[0].date, b = days[days.length - 1].date
    return a === b ? fmtDay(a) : `${fmtDay(a)} – ${fmtDay(b)}`
  }

  async function loadMine(year) {
    try {
      const [m, r] = await Promise.all([
        apiFetch(`/api/leave-requests/mine?year=${year}`),
        apiFetch(`/api/leave-requests/rest-days?year=${year}`).catch(() => []),
      ])
      setMine(m)
      setRestDays(Object.fromEntries((r || []).map((x) => [x.date, x.label || t('holiday')])))
    } catch (err) {
      setError(err.message)
    }
  }
  async function loadPending() {
    try { setPending(await apiFetch('/api/leave-requests/pending')) } catch (err) { setError(err.message) }
  }
  async function loadArchive(year) {
    try { setArchive(await apiFetch(`/api/leave-requests/archive?year=${year}`)) } catch (err) { setError(err.message) }
  }

  useEffect(() => { loadMine(view.y) }, [view.y]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'approvals') loadPending() }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'archive') loadArchive(archiveYear) }, [tab, archiveYear]) // eslint-disable-line react-hooks/exhaustive-deps

  // days already requested (pending / approved) -> shown on the calendar, not clickable
  const booked = useMemo(() => {
    const map = {}
    ;(mine?.requests || []).forEach((r) => {
      const st = r.status || 'approved'
      if (st !== 'pending' && st !== 'approved') return
      daysOf(r).forEach((d) => { map[d.date] = { type: d.type, status: st } })
    })
    return map
  }, [mine])

  const pickedDays = useMemo(() => Object.entries(picked).map(([date, type]) => ({ date, type })).sort((a, b) => a.date.localeCompare(b.date)), [picked])
  const pickedCount = countTypes(pickedDays)
  const s = mine?.summary
  const paidLeftAfter = s ? s.paidTotal - s.used.paid - s.pending.paid - pickedCount.paid : 0

  function toggleDay(k, disabled) {
    if (disabled) return
    setMessage('')
    setPicked((p) => {
      const n = { ...p }
      if (n[k] === brush) delete n[k]
      else n[k] = brush
      return n
    })
  }

  async function submit() {
    if (!pickedDays.length) return
    setSaving(true); setError(''); setMessage('')
    try {
      await apiFetch('/api/leave-requests', { method: 'POST', body: JSON.stringify({ days: pickedDays, note }) })
      setPicked({}); setNote('')
      setMessage(t('sent'))
      await loadMine(view.y)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function cancel(r) {
    if (!window.confirm(t('confirmCancel'))) return
    try {
      await apiFetch(`/api/leave-requests/${r._id}`, { method: 'DELETE' })
      await loadMine(view.y)
      if (tab === 'archive') await loadArchive(archiveYear)
    } catch (err) { setError(err.message) }
  }

  async function decide(r, action) {
    let noteText = ''
    if (action === 'reject') {
      const v = window.prompt(t('rejectReason'), '')
      if (v === null) return
      noteText = v
    }
    setBusyId(r._id); setError('')
    try {
      await apiFetch(`/api/leave-requests/${r._id}/${action}`, { method: 'POST', body: JSON.stringify({ note: noteText }) })
      await loadPending()
      await loadMine(view.y)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // ---------- calendar ----------
  const first = new Date(view.y, view.m, 1)
  const blanks = (first.getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const todayKey = keyOf(now.getFullYear(), now.getMonth(), now.getDate())
  const shiftMonth = (delta) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const StatusBadge = ({ status }) => <span className={`lr-status ${status || 'approved'}`}>{t(`status.${status || 'approved'}`)}</span>
  const TypeChips = ({ days }) => {
    const c = countTypes(days)
    return (
      <span className="lr-chips">
        {TYPES.filter((k) => c[k]).map((k) => (
          <span key={k} className={`lr-chip ${k}`}>{t(`types.${k}`)} · {c[k]}</span>
        ))}
      </span>
    )
  }

  const archivePeople = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase()
    return (archive?.summary || []).filter((p) => !q || personName(p.employee).toLowerCase().includes(q))
  }, [archive, archiveSearch])

  return (
    <div className="lr">
      <div className="lr-head">
        <div>
          <h1>{t('title')}</h1>
          <p className="lr-sub">{t('subtitle')}</p>
        </div>
        {mine?.canApprove && (
          <div className="lr-tabs">
            {['mine', 'approvals', 'archive'].map((k) => (
              <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
                {t(`tabs.${k}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}

      {tab === 'mine' && (
        <>
          {s && (
            <div className="lr-cards">
              <div className="lr-card paid">
                <span>{t('types.paid')}</span>
                <strong>{s.paidTotal - s.used.paid}<small>/{s.paidTotal}</small></strong>
                <em>{t('left')}{s.pending.paid ? ` · ${s.pending.paid} ${t('waiting')}` : ''}</em>
              </div>
              <div className="lr-card unpaid">
                <span>{t('types.unpaid')}</span>
                <strong>{s.used.unpaid}</strong>
                <em>{t('usedThisYear')}</em>
              </div>
              <div className="lr-card sick">
                <span>{t('types.sick')}</span>
                <strong>{s.used.sick}</strong>
                <em>{t('usedThisYear')}</em>
              </div>
            </div>
          )}

          <div className="lr-request">
            <div className="lr-calendar">
              <div className="lr-brush">
                <span className="lr-brush-hint">{t('brushHint')}</span>
                <div className="lr-brush-buttons">
                  {TYPES.map((k) => (
                    <button key={k} type="button" className={`lr-brush-btn ${k} ${brush === k ? 'active' : ''}`} onClick={() => setBrush(k)}>
                      <i />{t(`types.${k}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lr-month">
                <button type="button" onClick={() => shiftMonth(-1)} aria-label="prev">‹</button>
                <strong>{months[view.m]} {view.y}</strong>
                <button type="button" onClick={() => shiftMonth(1)} aria-label="next">›</button>
              </div>

              <div className="lr-grid">
                {weekdayNames.map((w, i) => <span key={w + i} className={`lr-wd ${i > 4 ? 'weekend' : ''}`}>{w}</span>)}
                {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = i + 1
                  const k = keyOf(view.y, view.m, d)
                  const wd = (blanks + i) % 7
                  const weekend = wd > 4
                  const holiday = restDays[k]
                  const b = booked[k]
                  const sel = picked[k]
                  const disabled = weekend || !!holiday || !!b
                  const cls = ['lr-day', weekend && 'weekend', holiday && 'holiday', b && `booked ${b.type} ${b.status}`, sel && `picked ${sel}`, k === todayKey && 'today'].filter(Boolean).join(' ')
                  const title = holiday || (b ? `${t(`types.${b.type}`)} · ${t(`status.${b.status}`)}` : weekend ? t('weekend') : '')
                  return (
                    <button key={k} type="button" className={cls} disabled={disabled} title={title} onClick={() => toggleDay(k, disabled)}>
                      {d}
                    </button>
                  )
                })}
              </div>

              <div className="lr-legend">
                <span><i className="lg pending" />{t('status.pending')}</span>
                <span><i className="lg approved" />{t('status.approved')}</span>
                <span><i className="lg holiday" />{t('holiday')}</span>
              </div>
            </div>

            <div className="lr-summary">
              <h3>{t('selected')}</h3>
              {pickedDays.length === 0 ? (
                <p className="lr-muted">{t('nothingSelected')}</p>
              ) : (
                <>
                  <p className="lr-range">{fmtRange(pickedDays)} · {pickedDays.length} {t('days')}</p>
                  <TypeChips days={pickedDays} />
                  {pickedCount.paid > 0 && (
                    <p className={`lr-paid-after ${paidLeftAfter < 0 ? 'bad' : ''}`}>
                      {t('paidLeftAfter')}: <strong>{paidLeftAfter}</strong>
                    </p>
                  )}
                </>
              )}
              <textarea className="field-input" rows={3} placeholder={t('note')} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="lr-actions">
                <button type="button" className="btn" disabled={!pickedDays.length || saving || paidLeftAfter < 0} onClick={submit}>
                  <span>{saving ? <span className="btn-spinner" aria-hidden="true" /> : t('submit')}</span>
                </button>
                {pickedDays.length > 0 && (
                  <button type="button" className="btn-gray" onClick={() => setPicked({})}>{t('clear')}</button>
                )}
              </div>
              {message && <p className="lr-ok">{message}</p>}
            </div>
          </div>

          <h3 className="lr-section">{t('myRequests')}</h3>
          {(mine?.requests || []).length === 0 && <p className="lr-muted">{t('noRequests')}</p>}
          <div className="lr-list">
            {(mine?.requests || []).map((r) => {
              const days = daysOf(r)
              return (
                <div key={r._id} className="lr-item">
                  <div className="lr-item-main">
                    <strong>{fmtRange(days)}</strong>
                    <span className="lr-muted">{days.length} {t('days')}</span>
                    <TypeChips days={days} />
                  </div>
                  <div className="lr-item-side">
                    <StatusBadge status={r.status} />
                    {r.status === 'pending' && (
                      <button type="button" className="lr-link-btn" onClick={() => cancel(r)}>{t('cancel')}</button>
                    )}
                  </div>
                  {(r.note || r.decisionNote) && (
                    <div className="lr-item-notes">
                      {r.note && <span>{r.note}</span>}
                      {r.decisionNote && <span className="lr-decision">↳ {r.decisionNote}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'approvals' && (
        <div className="lr-list">
          {pending.length === 0 && <p className="lr-muted">{t('noPending')}</p>}
          {pending.map((r) => {
            const days = daysOf(r)
            const left = r.summary ? r.summary.paidTotal - r.summary.used.paid : null
            return (
              <div key={r._id} className="lr-item lr-approval">
                <div className="lr-item-main">
                  <strong className="lr-person">{personName(r.employee)}</strong>
                  <span>{fmtRange(days)} · {days.length} {t('days')}</span>
                  <TypeChips days={days} />
                  {left !== null && <span className="lr-muted">{t('types.paid')}: {left}/{r.summary.paidTotal} {t('left')}</span>}
                  {r.note && <span className="lr-item-note">“{r.note}”</span>}
                  <span className="lr-day-list">{days.map((d) => fmtDay(d.date)).join(', ')}</span>
                </div>
                <div className="lr-item-side">
                  <button type="button" className="btn" disabled={busyId === r._id} onClick={() => decide(r, 'approve')}>
                    <span>{busyId === r._id ? <span className="btn-spinner" aria-hidden="true" /> : t('approve')}</span>
                  </button>
                  <button type="button" className="btn-red" disabled={busyId === r._id} onClick={() => decide(r, 'reject')}>{t('reject')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'archive' && (
        <div className="lr-archive">
          <div className="lr-archive-bar">
            <select className="field-input" value={archiveYear} onChange={(e) => setArchiveYear(Number(e.target.value))}>
              {[0, 1, 2, 3].map((i) => <option key={i} value={now.getFullYear() - i}>{now.getFullYear() - i}</option>)}
            </select>
            <input className="field-input" placeholder={t('search')} value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} />
          </div>
          {!archive && <p className="lr-muted"><span className="btn-spinner" aria-hidden="true" /></p>}
          {archive && (
            <div className="lr-table-wrap">
              <table className="lr-table">
                <thead>
                  <tr>
                    <th>{t('employee')}</th>
                    <th className="num">{t('types.paid')}</th>
                    <th className="num">{t('left')}</th>
                    <th className="num">{t('types.unpaid')}</th>
                    <th className="num">{t('types.sick')}</th>
                    <th className="num">{t('status.pending')}</th>
                  </tr>
                </thead>
                <tbody>
                  {archivePeople.map((p) => {
                    const id = String(p.employee?._id || '')
                    const open = openPerson === id
                    const reqs = open ? archive.requests.filter((r) => String(r.employee?._id || '') === id) : []
                    return [
                      <tr key={id} className={`lr-row ${open ? 'open' : ''}`} onClick={() => setOpenPerson(open ? null : id)}>
                        <td>
                          <span className="lr-person-cell">
                            <span className="lr-avatar">{personName(p.employee).split(' ').filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</span>
                            <strong>{personName(p.employee)}</strong>
                            <span className="lr-expand" aria-hidden="true">›</span>
                          </span>
                        </td>
                        <td className="num"><span className={`lr-num ${p.used.paid ? 'on paid' : ''}`}>{p.used.paid}</span></td>
                        <td className="num">
                          {(() => {
                            const ratio = p.paidTotal ? p.paidRemaining / p.paidTotal : 0
                            const level = ratio > 0.5 ? 'ok' : ratio > 0.2 ? 'mid' : 'low'
                            return (
                              <div className="lr-remain">
                                <div className="lr-remain-bar"><i className={level} style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }} /></div>
                                <span className={`lr-remain-pill ${level}`}>{p.paidRemaining}/{p.paidTotal}</span>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="num"><span className={`lr-num ${p.used.unpaid ? 'on unpaid' : ''}`}>{p.used.unpaid}</span></td>
                        <td className="num"><span className={`lr-num ${p.used.sick ? 'on sick' : ''}`}>{p.used.sick}</span></td>
                        <td className="num">{p.pending ? <span className="lr-pending-badge">{p.pending}</span> : <span className="lr-dash">—</span>}</td>
                      </tr>,
                      open && (
                        <tr key={`${id}-x`} className="lr-row-detail">
                          <td colSpan={6}>
                            {reqs.length === 0 && <span className="lr-muted">{t('noRequests')}</span>}
                            {reqs.map((r) => {
                              const days = daysOf(r)
                              return (
                                <div key={r._id} className="lr-detail-line">
                                  <span>{fmtRange(days)} · {days.length} {t('days')}</span>
                                  <TypeChips days={days} />
                                  <StatusBadge status={r.status} />
                                  {r.decidedBy && <span className="lr-muted">{personName(r.decidedBy)}</span>}
                                  {(r.status === 'pending' || r.status === 'approved' || !r.status) && (
                                    <button type="button" className="lr-link-btn" onClick={(e) => { e.stopPropagation(); cancel(r) }}>{t('cancel')}</button>
                                  )}
                                </div>
                              )
                            })}
                          </td>
                        </tr>
                      ),
                    ]
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
