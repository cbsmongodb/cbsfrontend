'use client'

// Bonuses page: bonus per box for every drug, month by month, and a different
// bonus for specific doctors. Every change is saved on its own (no Save button)
// and the month's prescription lines are recalculated by the server.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { formatDoctorLabel } from '@/lib/doctorLabel'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import './Bonuses.css'

const LOCALE_TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }

const thisMonth = () => {
  const d = new Date()
  return { y: d.getFullYear(), m: d.getMonth() }
}
const shift = ({ y, m }, by) => {
  const t = y * 12 + m + by
  return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }
}
const key = ({ y, m }) => `${y}-${String(m + 1).padStart(2, '0')}`
const fmt = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }))
const clean = (s) => String(s ?? '').trim().replace(',', '.')

function useMonthName(locale) {
  return (mo) =>
    new Date(Date.UTC(mo.y, mo.m, 1)).toLocaleDateString(LOCALE_TAG[locale] || 'ka-GE', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
}

// one number field that saves itself on Enter / leaving the field
function BonusInput({ value, placeholder, disabled, onSave, ariaLabel }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  const [state, setState] = useState('idle') // idle | saving | saved | error
  const last = useRef(value == null ? '' : String(value))

  useEffect(() => {
    const v = value == null ? '' : String(value)
    last.current = v
    setText(v)
  }, [value])

  async function commit() {
    const v = clean(text)
    if (v === clean(last.current)) return
    if (v !== '' && (!/^\d+(\.\d+)?$/.test(v))) {
      setState('error')
      return
    }
    setState('saving')
    try {
      await onSave(v === '' ? null : Number(v))
      last.current = v
      setState('saved')
      setTimeout(() => setState((s) => (s === 'saved' ? 'idle' : s)), 1800)
    } catch {
      setState('error')
    }
  }

  return (
    <span className={`bonus-input-wrap is-${state}`}>
      <input
        type="text"
        inputMode="decimal"
        className="bonus-input"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => { setText(e.target.value); if (state === 'error') setState('idle') }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') { setText(last.current); setState('idle'); e.currentTarget.blur() }
        }}
      />
      <span className="bonus-input-state" aria-hidden="true">
        {state === 'saving' && <span className="btn-spinner" />}
        {state === 'saved' && '✓'}
        {state === 'error' && '!'}
      </span>
    </span>
  )
}

// search box for the "add a doctor" row
function DoctorPicker({ t, onPick, exclude }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) { setList([]); return }
    const id = setTimeout(async () => {
      const mine = ++seq.current
      try {
        const res = await apiFetch(`/api/bonuses/doctor-search?q=${encodeURIComponent(query)}`)
        if (mine === seq.current) setList(res || [])
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(id)
  }, [q])

  const shown = list.filter((d) => !exclude.has(d._id))
  return (
    <div className="bonus-doctor-picker">
      <input
        type="text"
        className="field-input"
        placeholder={t('doctorSearch')}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && q.trim().length >= 2 && (
        <div className="bonus-doctor-results">
          {shown.length === 0 && <div className="bonus-doctor-empty">{t('noDoctorFound')}</div>}
          {shown.map((d) => (
            <button
              key={d._id}
              type="button"
              className="bonus-doctor-result"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(d); setQ(''); setList([]); setOpen(false) }}
            >
              {formatDoctorLabel(d)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Bonuses() {
  const t = useTranslations('bonusesPage')
  const locale = useLocale()
  const monthName = useMonthName(locale)

  const [month, setMonth] = useState(thisMonth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [show, setShow] = useState('all') // all | set | doctors
  const [openDrug, setOpenDrug] = useState(null)
  const [pending, setPending] = useState([]) // doctors just picked, waiting for a value
  const [canEdit, setCanEdit] = useState(false)
  const [copying, setCopying] = useState(false)
  const loadSeq = useRef(0)

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((me) => {
        const role = me?.role
        const isAdmin = (role?.name || '').toLowerCase() === 'admin'
        setCanEdit(isAdmin || !!role?.privileges?.drug_bonuses?.update)
      })
      .catch(() => setCanEdit(false))
  }, [])

  async function load(mo = month, quiet = false) {
    const mine = ++loadSeq.current
    if (!quiet) setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`/api/bonuses?month=${key(mo)}`)
      if (mine === loadSeq.current) setData(res)
    } catch (err) {
      if (mine === loadSeq.current) setError(err.message)
    } finally {
      if (mine === loadSeq.current) setLoading(false)
    }
  }

  useEffect(() => {
    setOpenDrug(null)
    setPending([])
    load(month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  function flash(msg) {
    setNotice(msg)
    setTimeout(() => setNotice((n) => (n === msg ? '' : n)), 3500)
  }

  async function saveDrug(drug, value) {
    const res = await apiFetch('/api/bonuses/drug', {
      method: 'PUT',
      body: JSON.stringify({ month: key(month), drug: drug._id, value }),
    })
    setData((d) => ({ ...d, drugs: d.drugs.map((x) => (x._id === drug._id ? { ...x, value } : x)) }))
    flash(res.recalculated ? t('savedRecalc', { n: res.recalculated }) : t('saved'))
  }

  async function saveDoctor(drug, doctor, value) {
    const res = await apiFetch('/api/bonuses/doctor', {
      method: 'PUT',
      body: JSON.stringify({ month: key(month), drug: drug._id, doctor: doctor._id, value }),
    })
    setPending((p) => p.filter((x) => !(x.drug === drug._id && x.doctor._id === doctor._id)))
    await load(month, true)
    flash(res.recalculated ? t('savedRecalc', { n: res.recalculated }) : t('saved'))
  }

  async function copyFromPrevious() {
    const from = shift(month, -1)
    setCopying(true)
    setError('')
    try {
      const res = await apiFetch('/api/bonuses/copy', {
        method: 'POST',
        body: JSON.stringify({ from: key(from), to: key(month) }),
      })
      await load(month, true)
      flash(
        res.copiedDrugs || res.copiedDoctors
          ? t('copyDone', { drugs: res.copiedDrugs, doctors: res.copiedDoctors })
          : t('copyNothing', { month: monthName(from) })
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setCopying(false)
    }
  }

  const drugs = data?.drugs || []
  const stats = useMemo(() => ({
    set: drugs.filter((d) => d.value != null).length,
    doctors: drugs.reduce((s, d) => s + d.doctors.length, 0),
  }), [drugs])

  const visible = drugs.filter((d) => {
    if (search.trim() && !d.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    if (show === 'set') return d.value != null
    if (show === 'doctors') return d.doctors.length > 0
    return true
  })

  const inheritedText = (d) =>
    d.inheritedFrom === 'drug' ? t('inheritedDrug', { value: fmt(d.inherited) })
      : d.inheritedFrom === 'default' ? t('inheritedDefault', { value: fmt(d.inherited) })
        : t('inheritedNone')

  return (
    <div className="bonuses-page">
      <div className="bonuses-head">
        <div>
          <h1>{t('title')}</h1>
          <p className="bonuses-sub">{t('subtitle')}</p>
        </div>
        <div className="bonuses-month" role="group" aria-label={t('month')}>
          <button type="button" className="bonuses-month-arrow" onClick={() => setMonth((m) => shift(m, -1))} aria-label={t('prevMonth')}>‹</button>
          <span className="bonuses-month-name">{monthName(month)}</span>
          <button type="button" className="bonuses-month-arrow" onClick={() => setMonth((m) => shift(m, 1))} aria-label={t('nextMonth')}>›</button>
        </div>
      </div>

      <div className="bonuses-toolbar">
        <input
          type="text"
          className="field-input bonuses-search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="bonuses-chips">
          {['all', 'set', 'doctors'].map((k) => (
            <button key={k} type="button" className={`bonuses-chip ${show === k ? 'is-on' : ''}`} onClick={() => setShow(k)}>
              {t(`show.${k}`)}
              {k === 'set' && <em>{stats.set}</em>}
              {k === 'doctors' && <em>{stats.doctors}</em>}
            </button>
          ))}
        </div>
        {canEdit && (
          <button type="button" className="btn-gray bonuses-copy" onClick={copyFromPrevious} disabled={copying || loading}>
            <span>{copying ? <span className="btn-spinner" /> : t('copyFrom', { month: monthName(shift(month, -1)) })}</span>
          </button>
        )}
      </div>

      <div className="bonuses-help">
        <strong>{t('howTitle')}</strong> {t('how')}
        {data?.defaultBonus != null && <> {t('howDefault', { value: data.defaultBonus })}</>}
        {!canEdit && <span className="bonuses-readonly">{t('readOnly')}</span>}
      </div>

      {notice && <div className="bonuses-notice">{notice}</div>}
      {error && <p className="resource-error">{error}</p>}

      {loading && !data ? (
        <ReportLoader label={t('loading')} />
      ) : (
        <div className="bonuses-table-wrap">
          <table className="bonuses-table">
            <thead>
              <tr>
                <th>{t('colDrug')}</th>
                <th className="num">{t('colPrice')}</th>
                <th>{t('colBonus')}</th>
                <th>{t('colDoctors')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={4} className="bonuses-empty">{t('noDrugs')}</td></tr>
              )}
              {visible.map((d) => {
                const isOpen = openDrug === d._id
                const waiting = pending.filter((p) => p.drug === d._id)
                const taken = new Set([...d.doctors.map((x) => x.doctor._id), ...waiting.map((p) => p.doctor._id)])
                return (
                  <Fragment key={d._id}>
                    <tr className={`${d.value != null ? 'is-set' : ''} ${isOpen ? 'is-open' : ''}`}>
                      <td className="bonuses-drug">{d.name}</td>
                      <td className="num">{fmt(d.price)} ₾</td>
                      <td>
                        <div className="bonuses-cell">
                          <BonusInput
                            value={d.value}
                            placeholder={fmt(d.inherited)}
                            disabled={!canEdit}
                            ariaLabel={`${d.name} — ${t('colBonus')}`}
                            onSave={(v) => saveDrug(d, v)}
                          />
                          <span className="bonuses-hint">
                            {d.value != null ? t('setForMonth') : inheritedText(d)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`bonuses-doctors-btn ${d.doctors.length ? 'has' : ''}`}
                          onClick={() => setOpenDrug(isOpen ? null : d._id)}
                          aria-expanded={isOpen}
                        >
                          {d.doctors.length ? t('doctorsCount', { n: d.doctors.length }) : canEdit ? t('addDoctors') : '—'}
                          <span className="bonuses-caret">{isOpen ? '▴' : '▾'}</span>
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bonuses-doctors-row">
                        <td colSpan={4}>
                          <div className="bonuses-doctors-panel">
                            <div className="bonuses-doctors-title">{t('doctorsTitle', { drug: d.name, month: monthName(month) })}</div>
                            <p className="bonuses-doctors-hint">
                              {t('doctorsHint', { value: fmt(d.value ?? d.inherited) })}
                            </p>
                            {d.doctors.length === 0 && waiting.length === 0 && (
                              <p className="bonuses-doctors-none">{t('noDoctors')}</p>
                            )}
                            {[...d.doctors.map((x) => ({ doctor: x.doctor, value: x.value, saved: true })), ...waiting.map((p) => ({ doctor: p.doctor, value: null, saved: false }))].map((x) => (
                              <div key={x.doctor._id} className={`bonuses-doctor-line ${x.saved ? '' : 'is-new'}`}>
                                <span className="bonuses-doctor-name">{formatDoctorLabel(x.doctor)}</span>
                                <BonusInput
                                  value={x.value}
                                  placeholder={x.saved ? '' : t('typeValue')}
                                  disabled={!canEdit}
                                  ariaLabel={`${formatDoctorLabel(x.doctor)} — ${t('colBonus')}`}
                                  onSave={(v) => (v == null && !x.saved ? Promise.resolve() : saveDoctor(d, x.doctor, v))}
                                />
                                {canEdit && (
                                  <button
                                    type="button"
                                    className="bonuses-remove"
                                    onClick={() => (x.saved ? saveDoctor(d, x.doctor, null) : setPending((p) => p.filter((y) => !(y.drug === d._id && y.doctor._id === x.doctor._id))))}
                                    aria-label={t('remove')}
                                    title={t('remove')}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                            {canEdit && (
                              <DoctorPicker
                                t={t}
                                exclude={taken}
                                onPick={(doctor) => setPending((p) => [...p, { drug: d._id, doctor }])}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
