'use client'

// Bonuses page: bonus per box for every drug, month by month, and a different
// bonus for specific doctors. The table only SHOWS the bonuses; "Edit" opens a
// window for one medicine (its bonus + its doctors) with a Save button, and a
// "saved successfully" window confirms it. The server then recalculates the
// month's prescription lines, so reports show the new numbers.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { formatDoctorLabel } from '@/lib/doctorLabel'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import './Bonuses.css'

const MONTHS = {
  ka: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
}
const monthName = (locale, { y, m }) => `${(MONTHS[locale] || MONTHS.ka)[m]} ${y}`
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
const valid = (s) => clean(s) === '' || /^\d+(\.\d+)?$/.test(clean(s))
const asText = (v) => (v == null ? '' : String(v))

// search box for "add a doctor"
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

// the "Edit" window for one medicine
function EditModal({ t, drug, monthText, onClose, onSave }) {
  const [text, setText] = useState(asText(drug.value))
  const [lines, setLines] = useState(drug.doctors.map((x) => ({ doctor: x.doctor, saved: x.value, text: asText(x.value), remove: false, isNew: false })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const firstInput = useRef(null)

  useEffect(() => { firstInput.current?.focus() }, [])
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [saving, onClose])

  const drugChanged = clean(text) !== clean(asText(drug.value))
  const lineChanged = (l) => l.remove || (l.isNew ? clean(l.text) !== '' : clean(l.text) !== clean(asText(l.saved)))
  const changedLines = lines.filter(lineChanged)
  const changes = (drugChanged ? 1 : 0) + changedLines.length
  const bad = (drugChanged && !valid(text)) || changedLines.some((l) => !l.remove && !valid(l.text))
  const effective = clean(text) !== '' && valid(text) ? clean(text) : drug.inherited
  const taken = new Set(lines.map((l) => l.doctor._id))

  async function save() {
    if (!changes || bad || saving) return
    setSaving(true)
    setError('')
    try {
      await onSave({
        drugs: drugChanged ? [{ drug: drug._id, value: clean(text) === '' ? null : clean(text) }] : [],
        doctors: changedLines.map((l) => ({ drug: drug._id, doctor: l.doctor._id, value: l.remove || clean(l.text) === '' ? null : clean(l.text) })),
      })
    } catch (err) {
      setError(err.message || t('saveFailed'))
      setSaving(false)
    }
  }

  const setLine = (id, patch) => setLines((ls) => ls.map((l) => (l.doctor._id === id ? { ...l, ...patch } : l)))

  return (
    <div className="bonus-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="bonus-modal" role="dialog" aria-modal="true" aria-labelledby="bonus-modal-title">
        <div className="bonus-modal-head">
          <div>
            <h2 id="bonus-modal-title">{drug.name}</h2>
            <span className="bonus-modal-month">{t('editFor', { month: monthText })}</span>
          </div>
          <button type="button" className="bonus-modal-x" onClick={onClose} disabled={saving} aria-label={t('cancel')}>✕</button>
        </div>

        <div className="bonus-modal-body">
          <label className="bonus-modal-label" htmlFor="bonus-main">{t('colBonus')}</label>
          <div className="bonus-modal-main">
            <input
              id="bonus-main"
              ref={firstInput}
              type="text"
              inputMode="decimal"
              className={`bonus-input is-large ${drugChanged ? 'is-changed' : ''} ${drugChanged && !valid(text) ? 'is-bad' : ''}`}
              value={text}
              placeholder={fmt(drug.inherited)}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            />
            <span className="bonus-modal-cur">₾</span>
          </div>
          <p className={`bonus-modal-help ${drugChanged && !valid(text) ? 'is-bad' : ''}`}>
            {drugChanged && !valid(text) ? t('badNumber')
              : clean(text) === '' ? t('emptyMeans', { value: fmt(drug.inherited) })
                : t('allDoctorsGet', { value: fmt(clean(text)) })}
          </p>

          <div className="bonus-modal-section">
            <div className="bonus-modal-section-title">{t('doctorsSection')}</div>
            <p className="bonus-modal-help">{t('doctorsHint', { value: fmt(effective) })}</p>
            {lines.length === 0 && <p className="bonuses-doctors-none">{t('noDoctors')}</p>}
            {lines.map((l) => {
              const lBad = !l.remove && lineChanged(l) && !valid(l.text)
              return (
                <div key={l.doctor._id} className={`bonuses-doctor-line ${l.remove ? 'is-removed' : ''} ${lineChanged(l) ? 'is-changed' : ''}`}>
                  <span className="bonuses-doctor-name">
                    {formatDoctorLabel(l.doctor)}
                    {l.isNew && <em className="bonuses-tag">{t('tagNew')}</em>}
                    {l.remove && <em className="bonuses-tag is-red">{t('tagRemove')}</em>}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`bonus-input ${lineChanged(l) && !l.remove ? 'is-changed' : ''} ${lBad ? 'is-bad' : ''}`}
                    value={l.text}
                    placeholder={t('typeValue')}
                    disabled={l.remove}
                    onChange={(e) => setLine(l.doctor._id, { text: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') save() }}
                    aria-label={`${formatDoctorLabel(l.doctor)} — ${t('colBonus')}`}
                  />
                  {l.remove ? (
                    <button type="button" className="bonuses-undo" onClick={() => setLine(l.doctor._id, { remove: false })}>{t('undo')}</button>
                  ) : (
                    <button
                      type="button"
                      className="bonuses-remove"
                      title={t('remove')}
                      aria-label={t('remove')}
                      onClick={() => (l.isNew ? setLines((ls) => ls.filter((x) => x.doctor._id !== l.doctor._id)) : setLine(l.doctor._id, { remove: true }))}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
            <DoctorPicker
              t={t}
              exclude={taken}
              onPick={(doctor) => setLines((ls) => [...ls, { doctor, saved: null, text: '', remove: false, isNew: true }])}
            />
          </div>
          {error && <p className="resource-error" style={{ marginTop: 12 }}>{error}</p>}
        </div>

        <div className="bonus-modal-foot">
          <span className="bonus-modal-foot-info">
            {bad ? t('fixFirst') : changes ? t('pending', { n: changes }) : t('noChanges')}
          </span>
          <button type="button" className="btn-gray" onClick={onClose} disabled={saving}><span>{t('cancel')}</span></button>
          <button type="button" className="btn bonuses-save is-big" onClick={save} disabled={!changes || bad || saving}>
            <span>{saving ? <><span className="btn-spinner" /> {t('saving')}</> : `💾 ${t('save')}`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// "saved successfully" window
function DoneModal({ t, done, onClose }) {
  const btn = useRef(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    btn.current?.focus()
    const id = setTimeout(() => close.current(), 4000)
    return () => clearTimeout(id)
  }, [])
  return (
    <div className="bonus-modal-overlay" onMouseDown={onClose}>
      <div className={`bonus-done is-${done.kind}`} role="alertdialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="bonus-done-icon" aria-hidden="true">{done.kind === 'success' ? '✓' : 'i'}</div>
        <h2>{done.title}</h2>
        {done.text && <p>{done.text}</p>}
        <button ref={btn} type="button" className="btn" onClick={onClose}><span>{t('ok')}</span></button>
      </div>
    </div>
  )
}

export default function Bonuses() {
  const t = useTranslations('bonusesPage')
  const locale = useLocale()
  const mName = (mo) => monthName(locale, mo)

  const [month, setMonth] = useState(thisMonth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [show, setShow] = useState('all') // all | set | doctors
  const [canEdit, setCanEdit] = useState(false)
  const [editing, setEditing] = useState(null) // drug being edited
  const [done, setDone] = useState(null) // { kind, title, text }
  const [justSaved, setJustSaved] = useState(null)
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
    load(month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  async function saveDrug(drug, body) {
    const res = await apiFetch('/api/bonuses/batch', {
      method: 'PUT',
      body: JSON.stringify({ month: key(month), ...body }),
    })
    await load(month, true)
    setEditing(null)
    setJustSaved(drug._id)
    setTimeout(() => setJustSaved((x) => (x === drug._id ? null : x)), 5000)
    setDone({
      kind: 'success',
      title: t('savedOkTitle'),
      text: `${drug.name} — ${mName(month)}. ${res.recalculated ? t('savedRecalc', { n: res.recalculated }) : t('savedNoRecalc')}`,
    })
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
      setDone(
        res.copiedDrugs || res.copiedDoctors
          ? { kind: 'success', title: t('savedOkTitle'), text: t('copyDone', { drugs: res.copiedDrugs, doctors: res.copiedDoctors }) }
          : { kind: 'info', title: t('copyNothing', { month: mName(from) }), text: '' }
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

  const sourceText = (d) =>
    d.value != null ? t('setForMonth')
      : d.inheritedFrom === 'drug' ? t('inheritedDrugShort')
        : d.inheritedFrom === 'default' ? t('inheritedDefaultShort')
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
          <span className="bonuses-month-name">{mName(month)}</span>
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
            <span>{copying ? <span className="btn-spinner" /> : t('copyFrom', { month: mName(shift(month, -1)) })}</span>
          </button>
        )}
      </div>

      <div className="bonuses-help">
        <strong>{t('howTitle')}</strong> {t('how')}
        {data?.defaultBonus != null && <> {t('howDefault', { value: data.defaultBonus })}</>}
        {!canEdit && <span className="bonuses-readonly">{t('readOnly')}</span>}
      </div>

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
                <th aria-label={t('edit')} />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={5} className="bonuses-empty">{t('noDrugs')}</td></tr>
              )}
              {visible.map((d) => (
                <tr key={d._id} className={`${d.value != null ? 'is-set' : ''} ${justSaved === d._id ? 'is-saved-flash' : ''}`}>
                  <td className="bonuses-drug">
                    {d.name}
                    {justSaved === d._id && <span className="bonuses-row-saved">✓ {t('rowSaved')}</span>}
                  </td>
                  <td className="num">{fmt(d.price)} ₾</td>
                  <td>
                    <div className="bonuses-value">
                      <strong className={d.value != null ? '' : 'is-inherited'}>{fmt(d.value ?? d.inherited) || '0'} ₾</strong>
                      <span className="bonuses-hint">{sourceText(d)}</span>
                    </div>
                  </td>
                  <td>
                    {d.doctors.length ? (
                      <span className="bonuses-doc-summary" title={d.doctors.map((x) => `${formatDoctorLabel(x.doctor)}: ${fmt(x.value)} ₾`).join('\n')}>
                        {t('doctorsCount', { n: d.doctors.length })}
                      </span>
                    ) : (
                      <span className="bonuses-hint">—</span>
                    )}
                  </td>
                  <td className="bonuses-actions">
                    {canEdit && (
                      <button type="button" className="btn-gray bonuses-edit" onClick={() => setEditing(d)}>
                        <span>✏️ {t('edit')}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditModal
          t={t}
          drug={editing}
          monthText={mName(month)}
          onClose={() => setEditing(null)}
          onSave={(body) => saveDrug(editing, body)}
        />
      )}
      {done && <DoneModal t={t} done={done} onClose={() => setDone(null)} />}
    </div>
  )
}
