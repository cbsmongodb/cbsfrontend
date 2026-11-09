'use client'

// Bonuses page: bonus per box for every drug, month by month, and a different
// bonus for specific doctors. Changes are collected (marked "not saved") and
// written with the Save button; the server then recalculates the month's
// prescription lines and the page shows a clear success message.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
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
  const mName = (mo) => monthName(locale, mo)

  const [month, setMonth] = useState(thisMonth)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { kind: 'success' | 'error' | 'info', text }
  const [search, setSearch] = useState('')
  const [show, setShow] = useState('all') // all | set | doctors | changed
  const [openDrug, setOpenDrug] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [blockedMove, setBlockedMove] = useState(false)
  const [savingRow, setSavingRow] = useState(null) // drug id being saved from its own button
  const [savedRow, setSavedRow] = useState(null) // drug id just saved -> "✓ შენახულია" next to it

  // not saved yet:  drugEdits: drugId -> text   docEdits: "drug|doctor" -> { drug, doctor, text, remove }
  const [drugEdits, setDrugEdits] = useState({})
  const [docEdits, setDocEdits] = useState({})
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
    setDrugEdits({})
    setDocEdits({})
    load(month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const drugs = data?.drugs || []
  const byId = useMemo(() => new Map(drugs.map((d) => [d._id, d])), [drugs])

  // only real changes count (typing the same value back is not a change)
  const changedDrugs = Object.entries(drugEdits).filter(([id, text]) => {
    const d = byId.get(id)
    return d && clean(text) !== clean(asText(d.value))
  })
  const changedDocs = Object.values(docEdits).filter((e) => {
    const d = byId.get(e.drug)
    const saved = d?.doctors.find((x) => x.doctor._id === e.doctor._id)
    if (e.remove) return !!saved
    if (!saved) return clean(e.text) !== ''
    return clean(e.text) !== clean(asText(saved.value))
  })
  const changes = changedDrugs.length + changedDocs.length
  const invalid = changedDrugs.some(([, text]) => !valid(text)) || changedDocs.some((e) => !e.remove && !valid(e.text))
  const dirty = changes > 0

  // closing the tab with unsaved changes asks first
  useEffect(() => {
    if (!dirty) return
    const h = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  function goMonth(by) {
    if (dirty) { setBlockedMove(true); return }
    setBlockedMove(false)
    setResult(null)
    setMonth((m) => shift(m, by))
  }

  function discard() {
    setDrugEdits({})
    setDocEdits({})
    setBlockedMove(false)
    setResult({ kind: 'info', text: t('discarded') })
  }

  // onlyDrug: the row's own "Save" button saves just that medicine (and its doctors)
  async function save(onlyDrug) {
    const dRows = changedDrugs.filter(([id]) => !onlyDrug || id === onlyDrug)
    const cRows = changedDocs.filter((e) => !onlyDrug || e.drug === onlyDrug)
    const bad = dRows.some(([, text]) => !valid(text)) || cRows.some((e) => !e.remove && !valid(e.text))
    if (!dRows.length && !cRows.length) return
    if (bad || saving || savingRow) return
    if (onlyDrug) setSavingRow(onlyDrug)
    else setSaving(true)
    setResult(null)
    try {
      const res = await apiFetch('/api/bonuses/batch', {
        method: 'PUT',
        body: JSON.stringify({
          month: key(month),
          drugs: dRows.map(([drug, text]) => ({ drug, value: clean(text) === '' ? null : clean(text) })),
          doctors: cRows.map((e) => ({ drug: e.drug, doctor: e.doctor._id, value: e.remove || clean(e.text) === '' ? null : clean(e.text) })),
        }),
      })
      await load(month, true)
      if (onlyDrug) {
        setDrugEdits((p) => { const n = { ...p }; delete n[onlyDrug]; return n })
        setDocEdits((p) => Object.fromEntries(Object.entries(p).filter(([, e]) => e.drug !== onlyDrug)))
        setSavedRow(onlyDrug)
        setTimeout(() => setSavedRow((r) => (r === onlyDrug ? null : r)), 4000)
      } else {
        setDrugEdits({})
        setDocEdits({})
      }
      setBlockedMove(false)
      setResult({
        kind: 'success',
        text: t('savedOk', { n: res.saved, month: mName(month) }),
        sub: res.recalculated ? t('savedRecalc', { n: res.recalculated }) : t('savedNoRecalc'),
      })
    } catch (err) {
      setResult({ kind: 'error', text: t('saveFailed'), sub: err.message })
    } finally {
      setSaving(false)
      setSavingRow(null)
    }
  }

  async function copyFromPrevious() {
    if (dirty) { setBlockedMove(true); return }
    const from = shift(month, -1)
    setCopying(true)
    setResult(null)
    try {
      const res = await apiFetch('/api/bonuses/copy', {
        method: 'POST',
        body: JSON.stringify({ from: key(from), to: key(month) }),
      })
      await load(month, true)
      setResult(
        res.copiedDrugs || res.copiedDoctors
          ? { kind: 'success', text: t('copyDone', { drugs: res.copiedDrugs, doctors: res.copiedDoctors }), sub: res.recalculated ? t('savedRecalc', { n: res.recalculated }) : '' }
          : { kind: 'info', text: t('copyNothing', { month: mName(from) }) }
      )
    } catch (err) {
      setResult({ kind: 'error', text: t('saveFailed'), sub: err.message })
    } finally {
      setCopying(false)
    }
  }

  const stats = useMemo(() => ({
    set: drugs.filter((d) => d.value != null).length,
    doctors: drugs.reduce((s, d) => s + d.doctors.length, 0),
  }), [drugs])

  const changedIds = new Set([...changedDrugs.map(([id]) => id), ...changedDocs.map((e) => e.drug)])
  const visible = drugs.filter((d) => {
    if (search.trim() && !d.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    if (show === 'set') return d.value != null
    if (show === 'doctors') return d.doctors.length > 0
    if (show === 'changed') return changedIds.has(d._id)
    return true
  })

  const inheritedText = (d) =>
    d.inheritedFrom === 'drug' ? t('inheritedDrug', { value: fmt(d.inherited) })
      : d.inheritedFrom === 'default' ? t('inheritedDefault', { value: fmt(d.inherited) })
        : t('inheritedNone')

  const SaveButton = ({ big }) => (
    <button
      type="button"
      className={`btn bonuses-save ${big ? 'is-big' : ''}`}
      onClick={() => save()}
      disabled={!dirty || invalid || saving || !!savingRow || !canEdit}
    >
      <span>
        {saving ? <><span className="btn-spinner" /> {t('saving')}</> : <>💾 {dirty ? t('saveN', { n: changes }) : t('save')}</>}
      </span>
    </button>
  )

  return (
    <div className="bonuses-page">
      <div className="bonuses-head">
        <div>
          <h1>{t('title')}</h1>
          <p className="bonuses-sub">{t('subtitle')}</p>
        </div>
        <div className="bonuses-head-right">
          <div className="bonuses-month" role="group" aria-label={t('month')}>
            <button type="button" className="bonuses-month-arrow" onClick={() => goMonth(-1)} aria-label={t('prevMonth')}>‹</button>
            <span className="bonuses-month-name">{mName(month)}</span>
            <button type="button" className="bonuses-month-arrow" onClick={() => goMonth(1)} aria-label={t('nextMonth')}>›</button>
          </div>
        </div>
      </div>

      {result && (
        <div className={`bonuses-result is-${result.kind}`} role="status">
          <span className="bonuses-result-icon" aria-hidden="true">
            {result.kind === 'success' ? '✓' : result.kind === 'error' ? '!' : 'i'}
          </span>
          <div className="bonuses-result-text">
            <strong>{result.text}</strong>
            {result.sub && <span>{result.sub}</span>}
          </div>
          <button type="button" className="bonuses-result-close" onClick={() => setResult(null)} aria-label="✕">✕</button>
        </div>
      )}

      {blockedMove && dirty && (
        <div className="bonuses-result is-warn" role="alert">
          <span className="bonuses-result-icon" aria-hidden="true">!</span>
          <div className="bonuses-result-text">
            <strong>{t('unsavedTitle', { n: changes })}</strong>
            <span>{t('unsavedText')}</span>
          </div>
        </div>
      )}

      <div className="bonuses-toolbar">
        <input
          type="text"
          className="field-input bonuses-search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="bonuses-chips">
          {['all', 'set', 'doctors', ...(dirty ? ['changed'] : [])].map((k) => (
            <button key={k} type="button" className={`bonuses-chip ${show === k ? 'is-on' : ''} ${k === 'changed' ? 'is-changed' : ''}`} onClick={() => setShow(k)}>
              {t(`show.${k}`)}
              {k === 'set' && <em>{stats.set}</em>}
              {k === 'doctors' && <em>{stats.doctors}</em>}
              {k === 'changed' && <em>{changes}</em>}
            </button>
          ))}
        </div>
        {canEdit && (
          <button type="button" className="btn-gray bonuses-copy" onClick={copyFromPrevious} disabled={copying || loading || saving}>
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
              {visible.map((d) => {
                const isOpen = openDrug === d._id
                const text = drugEdits[d._id] ?? asText(d.value)
                const drugChanged = clean(text) !== clean(asText(d.value))
                const bad = drugChanged && !valid(text)

                // saved doctors + the ones added / changed / removed on the page
                const lines = d.doctors.map((x) => {
                  const e = docEdits[`${d._id}|${x.doctor._id}`]
                  return { doctor: x.doctor, saved: x.value, text: e ? e.text : asText(x.value), remove: !!e?.remove, isNew: false }
                })
                Object.values(docEdits)
                  .filter((e) => e.drug === d._id && !d.doctors.some((x) => x.doctor._id === e.doctor._id))
                  .forEach((e) => lines.push({ doctor: e.doctor, saved: null, text: e.text, remove: false, isNew: true }))
                const taken = new Set(lines.map((l) => l.doctor._id))
                const rowChanged = changedIds.has(d._id)
                const rowBad = bad || lines.some((l) => !l.remove && (l.isNew || clean(l.text) !== clean(asText(l.saved))) && !valid(l.text))
                const shownDoctors = lines.filter((l) => !l.remove).length

                const setDoc = (doctor, patch) =>
                  setDocEdits((p) => {
                    const k = `${d._id}|${doctor._id}`
                    const prev = p[k] || { drug: d._id, doctor, text: asText(d.doctors.find((x) => x.doctor._id === doctor._id)?.value), remove: false }
                    return { ...p, [k]: { ...prev, ...patch } }
                  })
                const dropDoc = (doctor) =>
                  setDocEdits((p) => {
                    const n = { ...p }
                    delete n[`${d._id}|${doctor._id}`]
                    return n
                  })

                return (
                  <Fragment key={d._id}>
                    <tr className={`${d.value != null ? 'is-set' : ''} ${isOpen ? 'is-open' : ''} ${rowChanged ? 'is-changed' : ''} ${savedRow === d._id && !rowChanged ? 'is-saved-flash' : ''}`}>
                      <td className="bonuses-drug">
                        {d.name}
                        {rowChanged && <span className="bonuses-unsaved">{t('notSaved')}</span>}
                      </td>
                      <td className="num">{fmt(d.price)} ₾</td>
                      <td>
                        <div className="bonuses-cell">
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`bonus-input ${drugChanged ? 'is-changed' : ''} ${bad ? 'is-bad' : ''}`}
                            value={text}
                            placeholder={fmt(d.inherited)}
                            disabled={!canEdit}
                            aria-label={`${d.name} — ${t('colBonus')}`}
                            onChange={(e) => setDrugEdits((p) => ({ ...p, [d._id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') save(d._id) }}
                          />
                          {canEdit && rowChanged && (
                            <button
                              type="button"
                              className="btn bonuses-row-save"
                              onClick={() => save(d._id)}
                              disabled={rowBad || !!savingRow || saving}
                            >
                              <span>{savingRow === d._id ? <span className="btn-spinner" /> : `💾 ${t('save')}`}</span>
                            </button>
                          )}
                          {savedRow === d._id && !rowChanged && <span className="bonuses-row-saved">✓ {t('rowSaved')}</span>}
                          <span className={`bonuses-hint ${bad ? 'is-bad' : ''}`}>
                            {bad ? t('badNumber')
                              : drugChanged ? (clean(text) === '' ? t('willInherit', { value: fmt(d.inherited) }) : t('pressSave'))
                                : d.value != null ? t('setForMonth') : inheritedText(d)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`bonuses-doctors-btn ${shownDoctors ? 'has' : ''}`}
                          onClick={() => setOpenDrug(isOpen ? null : d._id)}
                          aria-expanded={isOpen}
                        >
                          {shownDoctors ? t('doctorsCount', { n: shownDoctors }) : canEdit ? t('addDoctors') : '—'}
                          <span className="bonuses-caret">{isOpen ? '▴' : '▾'}</span>
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bonuses-doctors-row">
                        <td colSpan={4}>
                          <div className="bonuses-doctors-panel">
                            <div className="bonuses-doctors-title">{t('doctorsTitle', { drug: d.name, month: mName(month) })}</div>
                            <p className="bonuses-doctors-hint">
                              {t('doctorsHint', { value: fmt(clean(text) !== '' && valid(text) ? clean(text) : d.inherited) })}
                            </p>
                            {lines.length === 0 && <p className="bonuses-doctors-none">{t('noDoctors')}</p>}
                            {lines.map((l) => {
                              const lChanged = l.remove || l.isNew || clean(l.text) !== clean(asText(l.saved))
                              const lBad = !l.remove && lChanged && !valid(l.text)
                              return (
                                <div key={l.doctor._id} className={`bonuses-doctor-line ${l.remove ? 'is-removed' : ''} ${lChanged ? 'is-changed' : ''}`}>
                                  <span className="bonuses-doctor-name">
                                    {formatDoctorLabel(l.doctor)}
                                    {l.isNew && <em className="bonuses-tag">{t('tagNew')}</em>}
                                    {l.remove && <em className="bonuses-tag is-red">{t('tagRemove')}</em>}
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    className={`bonus-input ${lChanged && !l.remove ? 'is-changed' : ''} ${lBad ? 'is-bad' : ''}`}
                                    value={l.text}
                                    placeholder={t('typeValue')}
                                    disabled={!canEdit || l.remove}
                                    aria-label={`${formatDoctorLabel(l.doctor)} — ${t('colBonus')}`}
                                    onChange={(e) => setDoc(l.doctor, { text: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') save(d._id) }}
                                  />
                                  {canEdit && lChanged && (
                                    <button
                                      type="button"
                                      className="btn bonuses-row-save"
                                      onClick={() => save(d._id)}
                                      disabled={rowBad || !!savingRow || saving}
                                    >
                                      <span>{savingRow === d._id ? <span className="btn-spinner" /> : `💾 ${t('save')}`}</span>
                                    </button>
                                  )}
                                  {canEdit && (
                                    l.remove ? (
                                      <button type="button" className="bonuses-undo" onClick={() => dropDoc(l.doctor)}>{t('undo')}</button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="bonuses-remove"
                                        onClick={() => (l.isNew ? dropDoc(l.doctor) : setDoc(l.doctor, { remove: true }))}
                                        aria-label={t('remove')}
                                        title={t('remove')}
                                      >
                                        ✕
                                      </button>
                                    )
                                  )}
                                </div>
                              )
                            })}
                            {canEdit && (
                              <DoctorPicker
                                t={t}
                                exclude={taken}
                                onPick={(doctor) => setDocEdits((p) => ({ ...p, [`${d._id}|${doctor._id}`]: { drug: d._id, doctor, text: '', remove: false } }))}
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

      {canEdit && dirty && (
        <div className="bonuses-savebar" role="region" aria-label={t('save')}>
          <span className="bonuses-savebar-text">
            <span className="bonuses-savebar-dot" />
            {invalid ? t('fixFirst') : t('pending', { n: changes })}
          </span>
          <div className="bonuses-savebar-actions">
            <button type="button" className="btn-gray" onClick={discard} disabled={saving}><span>{t('discard')}</span></button>
            <SaveButton big />
          </div>
        </div>
      )}
    </div>
  )
}
