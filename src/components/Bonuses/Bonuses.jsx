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

// a doctor shown as: initials · name, and "profile · #ID" under it
function DoctorTag({ d }) {
  const name = `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || '—'
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const profile = d.profile && typeof d.profile === 'object' ? d.profile.name : ''
  return (
    <span className="bm-doc">
      <span className="bm-avatar" aria-hidden="true">{initials}</span>
      <span className="bm-doc-text">
        <span className="bm-doc-name">{name}</span>
        <span className="bm-doc-meta">{[profile, d.uniqueNumber ? `#${d.uniqueNumber}` : ''].filter(Boolean).join(' · ')}</span>
      </span>
    </span>
  )
}

// search box for "add doctors": tick several, add them together
function DoctorPicker({ t, onPick, exclude }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState([])
  const [picked, setPicked] = useState([]) // ticked, not added yet
  const [searching, setSearching] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) { setList([]); setSearching(false); return }
    setSearching(true)
    const id = setTimeout(async () => {
      const mine = ++seq.current
      try {
        const res = await apiFetch(`/api/bonuses/doctor-search?q=${encodeURIComponent(query)}`)
        if (mine === seq.current) setList(res || [])
      } catch { /* ignore */ } finally {
        if (mine === seq.current) setSearching(false)
      }
    }, 250)
    return () => clearTimeout(id)
  }, [q])

  const isPicked = (d) => picked.some((x) => x._id === d._id)
  const toggle = (d) => setPicked((p) => (isPicked(d) ? p.filter((x) => x._id !== d._id) : [...p, d]))
  const shown = list.filter((d) => !exclude.has(d._id))
  const allShownPicked = shown.length > 0 && shown.every(isPicked)
  const addAll = () => {
    if (!picked.length) return
    onPick(picked)
    setPicked([])
    setQ('')
    setList([])
  }

  return (
    <div className="bm-picker">
      <div className="bm-search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <input
          type="text"
          className="et-modal-search"
          value={q}
          placeholder={t('doctorSearch')}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAll() } }}
          aria-label={t('doctorSearch')}
        />
        {searching && <span className="btn-spinner" />}
        {q && !searching && <button type="button" className="bm-search-clear" onClick={() => { setQ(''); setList([]) }} aria-label="✕">✕</button>}
      </div>

      {q.trim().length >= 2 && !searching && (
        <div className="bm-results">
          {shown.length === 0 && <div className="bm-results-empty">{t('noDoctorFound')}</div>}
          {shown.length > 1 && (
            <label className="bm-result is-all">
              <input
                type="checkbox"
                checked={allShownPicked}
                onChange={() => setPicked((p) => (allShownPicked
                  ? p.filter((x) => !shown.some((d) => d._id === x._id))
                  : [...p, ...shown.filter((d) => !p.some((x) => x._id === d._id))]))}
              />
              <span>{t('pickAllShown', { n: shown.length })}</span>
            </label>
          )}
          {shown.map((d) => (
            <label key={d._id} className={`bm-result ${isPicked(d) ? 'is-picked' : ''}`}>
              <input type="checkbox" checked={isPicked(d)} onChange={() => toggle(d)} />
              <DoctorTag d={d} />
            </label>
          ))}
        </div>
      )}

      {picked.length > 0 && (
        <div className="bm-picked">
          <span>{t('pickedN', { n: picked.length })}</span>
          <button type="button" className="bm-link" onClick={() => setPicked([])}>{t('clearPicked')}</button>
          <button type="button" className="btn btn-sm" onClick={addAll}><span>{t('addPicked', { n: picked.length })}</span></button>
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
  const [bulk, setBulk] = useState('')
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
  const waiting = lines.filter((l) => l.isNew && clean(l.text) === '').length // added, no number yet
  const effective = clean(text) !== '' && valid(text) ? clean(text) : drug.inherited
  const active = lines.filter((l) => !l.remove)
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
      <div className="bm" role="dialog" aria-modal="true" aria-labelledby="bm-title">
        <header className="bm-head">
          <div className="bm-head-icon" aria-hidden="true">💊</div>
          <div className="bm-head-text">
            <h2 id="bm-title">{drug.name}</h2>
            <span className="bm-head-sub">
              <span className="bm-pill">{monthText}</span>
              {drug.price ? <span className="bm-head-price">{t('priceLabel', { value: fmt(drug.price) })}</span> : null}
            </span>
          </div>
          <button type="button" className="bm-x" onClick={onClose} disabled={saving} aria-label={t('cancel')}>✕</button>
        </header>

        <div className="bm-body">
          {/* 2 — specific doctors */}
          <section className="bm-card">
            <div className="bm-card-title">
              <span className="bm-step" aria-hidden="true">👩‍⚕️</span>
              <div>
                <h3>
                  {t('step2Title')}
                  {active.length > 0 && <span className="bm-count">{active.length}</span>}
                </h3>
                <p>{t('step2Text', { value: fmt(effective) })}</p>
                <ol className="bm-howto">
                  <li>{t('howto1')}</li>
                  <li>{t('howto2')}</li>
                  <li>{t('howto3')}</li>
                </ol>
              </div>
            </div>

            <DoctorPicker
              t={t}
              exclude={taken}
              onPick={(doctors) => setLines((ls) => [
                ...ls,
                ...doctors.filter((d) => !ls.some((l) => l.doctor._id === d._id))
                  .map((doctor) => ({ doctor, saved: null, text: bulk && valid(bulk) ? clean(bulk) : '', remove: false, isNew: true })),
              ])}
            />

            {active.length > 1 && (
              <div className="bm-bulk">
                <span>{t('bulkLabel')}</span>
                <div className={`bm-money is-small ${bulk && !valid(bulk) ? 'is-bad' : ''}`}>
                  <input type="text" inputMode="decimal" value={bulk} placeholder="0" onChange={(e) => setBulk(e.target.value)} aria-label={t('bulkLabel')} />
                  <span>₾</span>
                </div>
                <button
                  type="button"
                  className="btn-gray btn-sm"
                  disabled={!clean(bulk) || !valid(bulk)}
                  onClick={() => setLines((ls) => ls.map((l) => (l.remove ? l : { ...l, text: clean(bulk) })))}
                >
                  <span>{t('bulkApply', { n: active.length })}</span>
                </button>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="bm-empty">
                <span aria-hidden="true">👩‍⚕️</span>
                <p>{t('noDoctorsYet')}</p>
              </div>
            ) : (
              <ul className="bm-list">
                {lines.map((l) => {
                  const ch = lineChanged(l)
                  const lBad = !l.remove && ch && !valid(l.text)
                  const empty = l.isNew && clean(l.text) === ''
                  return (
                    <li key={l.doctor._id} className={`bm-line ${l.remove ? 'is-removed' : ''} ${ch ? 'is-changed' : ''} ${empty ? 'is-waiting' : ''}`}>
                      <DoctorTag d={l.doctor} />
                      <span className="bm-line-tags">
                        {l.isNew && <em className="bm-tag is-new">{t('tagNew')}</em>}
                        {l.remove && <em className="bm-tag is-red">{t('tagRemove')}</em>}
                      </span>
                      <div className={`bm-money is-small ${ch && !l.remove ? 'is-changed' : ''} ${lBad ? 'is-bad' : ''}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={l.text}
                          placeholder={t('typeValue')}
                          disabled={l.remove}
                          onChange={(e) => setLine(l.doctor._id, { text: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
                          aria-label={`${l.doctor.firstName || ''} ${l.doctor.lastName || ''} — ${t('colBonus')}`}
                        />
                        <span>₾</span>
                      </div>
                      {l.remove ? (
                        <button type="button" className="bm-link" onClick={() => setLine(l.doctor._id, { remove: false })}>{t('undo')}</button>
                      ) : (
                        <button
                          type="button"
                          className="bm-del"
                          title={t('remove')}
                          aria-label={t('remove')}
                          onClick={() => (l.isNew ? setLines((ls) => ls.filter((x) => x.doctor._id !== l.doctor._id)) : setLine(l.doctor._id, { remove: true }))}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          {error && <p className="resource-error" style={{ marginTop: 12 }}>{error}</p>}
        </div>

        <footer className="bm-foot">
          <span className={`bm-foot-info ${bad ? 'is-bad' : changes ? 'is-pending' : ''}`}>
            {bad ? t('fixFirst')
              : changes ? t('pending', { n: changes })
                : waiting ? t('typeForNew', { n: waiting })
                  : t('noChanges')}
          </span>
          <button type="button" className="btn-gray" onClick={onClose} disabled={saving}><span>{t('cancel')}</span></button>
          <button type="button" className="btn bm-save" onClick={save} disabled={!changes || bad || saving}>
            <span>{saving ? <><span className="btn-spinner" /> {t('saving')}</> : `💾 ${t('save')}`}</span>
          </button>
        </footer>
      </div>
    </div>
  )
}

// the month bonus of one medicine, typed right in the table, with its own Save
function MonthBonusCell({ t, d, canEdit, onSave, sourceText }) {
  const [text, setText] = useState(asText(d.value))
  const [saving, setSaving] = useState(false)
  useEffect(() => { setText(asText(d.value)) }, [d.value])
  const changed = clean(text) !== clean(asText(d.value))
  const bad = changed && !valid(text)

  async function save() {
    if (!changed || bad || saving) return
    setSaving(true)
    try {
      await onSave({ drugs: [{ drug: d._id, value: clean(text) === '' ? null : clean(text) }], doctors: [] })
    } catch { /* the page shows the error */ } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <div className="bonuses-value">
        <strong className={d.value != null ? '' : 'is-inherited'}>{fmt(d.value ?? d.inherited) || '0'} ₾</strong>
        <span className="bonuses-hint">{sourceText(d)}</span>
      </div>
    )
  }
  return (
    <div className="mb-cell">
      <div className={`bm-money is-small ${changed ? 'is-changed' : ''} ${bad ? 'is-bad' : ''}`}>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={fmt(d.inherited)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setText(asText(d.value))
          }}
          aria-label={`${d.name} — ${t('colBonus')}`}
        />
        <span>₾</span>
      </div>
      {changed ? (
        <>
          <button type="button" className="btn btn-sm mb-cell-save" onClick={save} disabled={bad || saving}>
            <span>{saving ? <span className="btn-spinner" /> : `💾 ${t('save')}`}</span>
          </button>
          <button type="button" className="bm-link" onClick={() => setText(asText(d.value))}>{t('cancel')}</button>
        </>
      ) : (
        <span className="bonuses-hint">{sourceText(d)}</span>
      )}
      {bad && <span className="bonuses-hint is-bad">{t('badNumber')}</span>}
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
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={4} className="bonuses-empty">{t('noDrugs')}</td></tr>
              )}
              {visible.map((d) => (
                <tr key={d._id} className={`${d.value != null ? 'is-set' : ''} ${justSaved === d._id ? 'is-saved-flash' : ''}`}>
                  <td className="bonuses-drug">
                    {d.name}
                    {justSaved === d._id && <span className="bonuses-row-saved">✓ {t('rowSaved')}</span>}
                  </td>
                  <td className="num">{fmt(d.price)} ₾</td>
                  <td>
                    <MonthBonusCell t={t} d={d} canEdit={canEdit} sourceText={sourceText} onSave={(body) => saveDrug(d, body)} />
                  </td>
                  <td>
                    <div className="mb-docs">
                      {d.doctors.length ? (
                        <span className="bonuses-doc-summary" title={d.doctors.map((x) => `${formatDoctorLabel(x.doctor)}: ${fmt(x.value)} ₾`).join('\n')}>
                          {t('doctorsCount', { n: d.doctors.length })}
                        </span>
                      ) : (
                        <span className="bonuses-hint">{t('noneShort')}</span>
                      )}
                      {canEdit && (
                        <button type="button" className="btn-gray bonuses-edit" onClick={() => setEditing(d)}>
                          <span>👩‍⚕️ {d.doctors.length ? t('editDoctors') : t('addDoctorsBtn')}</span>
                        </button>
                      )}
                    </div>
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
