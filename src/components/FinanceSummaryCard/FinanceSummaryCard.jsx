'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { useMonthNames } from '@/lib/months'
import './FinanceSummaryCard.css'
import FinDetails from './FinDetails'

const money = (n) => `₾${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

const MTXT = {
  ka: { empty: 'ჯერ ცარიელი', showing: 'ნაჩვენებია', notFilled: 'ჯერ არ არის შევსებული (აფთიაქების გაყიდვები არ ატვირთულა).', notYet: 'ამ თვის აფთიაქების გაყიდვები ჯერ არ არის ატვირთული — ციფრები ჯერ არასრულია.', failed: 'მონაცემები ვერ ჩაიტვირთა', all: 'ყველა', division: 'დივიზიონი', group: 'ჯგუფი', allGroups: 'ყველა ჯგუფი', reset: 'გასუფთავება', allDebts: 'ყველა ვალის ნახვა', hideDebts: 'დამალვა' },
  en: { empty: 'not filled yet', showing: 'Showing', notFilled: 'is not filled yet (pharmacy sales not uploaded).', notYet: 'Pharmacy sales for this month are not uploaded yet — the numbers are incomplete.', failed: 'Could not load the data', all: 'All', division: 'Division', group: 'Group', allGroups: 'All groups', reset: 'Reset', allDebts: 'Show all debts', hideDebts: 'Hide' },
  ru: { empty: 'ещё пусто', showing: 'Показан', notFilled: 'ещё не заполнен (продажи аптек не загружены).', notYet: 'Продажи аптек за этот месяц ещё не загружены — цифры неполные.', failed: 'Не удалось загрузить данные', all: 'Все', division: 'Дивизион', group: 'Группа', allGroups: 'Все группы', reset: 'Сбросить', allDebts: 'Показать все долги', hideDebts: 'Скрыть' },
}

// Finance manager's dashboard: sales, what doctors are owed, what was paid
export default function FinanceSummaryCard() {
  const t = useTranslations('finance')
  const locale = useLocale()
  const months = useMonthNames()
  const now = new Date()
  const options = [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { value: ym(d), label: `${months[d.getMonth()]} ${d.getFullYear()}` }
  })
  const M = MTXT[locale] || MTXT.en
  const [allDebts, setAllDebts] = useState(false)
  // a month counts as "filled" once its pharmacy sales are uploaded
  const isFilled = (d) => !!d && ((d.sales?.amount || 0) > 0 || (d.sales?.boxes || 0) > 0)

  // ---- filters: division (Section) and group ----
  const [filters, setFilters] = useState({ sections: [], groups: [] })
  const [section, setSection] = useState('')
  const [group, setGroup] = useState('')
  useEffect(() => {
    apiFetch('/api/finance/filters').then(setFilters).catch(() => {})
  }, [])
  const groupsShown = section ? filters.groups.filter((g) => g.section === section) : filters.groups
  const fq = `${section ? `&section=${section}` : ''}${group ? `&group=${group}` : ''}`

  const [month, setMonth] = useState(null)
  const [byMonth, setByMonth] = useState({}) // 'YYYY-MM' -> summary (for the current filter)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // load the 3 months for the current filter; on the first visit open the newest filled month
  useEffect(() => {
    let alive = true
    setLoading(true); setError('')
    Promise.all(options.map((o) => apiFetch(`/api/finance/summary?month=${o.value}${fq}`).catch(() => null)))
      .then((list) => {
        if (!alive) return
        const map = {}
        list.forEach((d, i) => { if (d) map[options[i].value] = d })
        setByMonth(map)
        setMonth((m) => m || (options.find((o) => isFilled(map[o.value])) || options[0]).value)
        if (!list.some(Boolean)) setError(M.failed)
        setLoading(false)
      })
    return () => { alive = false }
  }, [fq]) // eslint-disable-line react-hooks/exhaustive-deps

  // a month picked by hand is re-read (live numbers)
  const pick = (v) => {
    setMonth(v)
    apiFetch(`/api/finance/summary?month=${v}${fq}`).then((d) => setByMonth((m) => ({ ...m, [v]: d }))).catch((e) => setError(e.message))
  }

  const data = month ? byMonth[month] || null : null
  const current = options[0]
  const shownLabel = options.find((o) => o.value === month)?.label || ''
  const note = !data ? '' : !isFilled(data)
    ? M.notYet
    : month !== current.value && byMonth[current.value] && !isFilled(byMonth[current.value])
      ? `${M.showing} ${shownLabel} — ${current.label} ${M.notFilled}`
      : ''

  const s = data?.sales, b = data?.budget
  const trend = s && s.previousAmount > 0 ? ((s.amount - s.previousAmount) / s.previousAmount) * 100 : null
  const paidPct = b && b.planned > 0 ? Math.min(100, (b.issued / b.planned) * 100) : 0
  // click a card -> the rows behind it open underneath (FinDetails)
  const [open, setOpen] = useState(null)
  const cards = data ? [
    ['sales', t('sales'), s.amount, <>{s.boxes.toLocaleString('en-US')} {t('boxes')}{trend !== null && s.amount > 0 && <b className={trend >= 0 ? 'up' : 'down'}> {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%</b>}</>],
    ['planned', t('planned'), b.planned, <>{b.doctors} {t('doctors')}</>],
    ['issued', t('issued'), b.issued, <>{paidPct.toFixed(0)}% {t('ofPlanned')}</>],
    ['owed', t('owed'), b.owed, <>{b.unpaidDoctors} {t('unpaidDoctors')}</>],
    ['payments', t('payments'), data.payments.amount, <>{data.payments.count} {t('records')}</>],
  ] : []
  const openCard = cards.find((c) => c[0] === open)
  const sectionName = filters.sections.find((x) => x.id === section)?.name
  const groupName = filters.groups.find((x) => x.id === group)?.name

  useEffect(() => setAllDebts(false), [month, section, group])

  return (
    <div className="fin">
      <div className="fin-head">
        <h3>
          {t('title')}
          {shownLabel && <span className="fin-shown"> · {shownLabel}</span>}
          {(sectionName || groupName) && <span className="fin-shown-filter"> · {groupName || sectionName}</span>}
        </h3>
        <div className="fin-months">
          {options.map((o) => (
            <button key={o.value} type="button" className={month === o.value ? 'active' : ''} onClick={() => pick(o.value)}>
              {o.label}
              {byMonth[o.value] && !isFilled(byMonth[o.value]) && <small className="fin-empty-tag">{M.empty}</small>}
            </button>
          ))}
        </div>
      </div>

      {filters.sections.length > 0 && (
        <div className="fin-filters">
          <div className="fin-filter">
            <span className="fin-filter-label">{M.division}</span>
            <div className="fin-pills">
              <button type="button" className={!section ? 'active' : ''} onClick={() => { setSection(''); setGroup('') }}>{M.all}</button>
              {filters.sections.map((x) => (
                <button key={x.id} type="button" className={section === x.id ? 'active' : ''} onClick={() => { setSection(x.id); setGroup('') }}>{x.name}</button>
              ))}
            </div>
          </div>
          <div className="fin-filter">
            <span className="fin-filter-label">{M.group}</span>
            <select className="fin-select" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">{M.allGroups}</option>
              {groupsShown.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {(section || group) && (
            <button type="button" className="fin-reset" onClick={() => { setSection(''); setGroup('') }}>✕ {M.reset}</button>
          )}
          {loading && <span className="btn-spinner fin-filter-spin" aria-hidden="true" />}
        </div>
      )}

      {note && <p className="fin-note">ℹ️ {note}</p>}
      {error && <p className="resource-error">{error}</p>}
      {!data && !error && <p className="fin-muted"><span className="btn-spinner" aria-hidden="true" /></p>}

      {data && (
        <>
          <div className={`fin-cards${loading ? ' is-loading' : ''}`}>
            {cards.map(([key, label, value, sub]) => (
              <button key={key} type="button" className={`fin-card ${key}${open === key ? ' open' : ''}`} onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key}>
                <span>{label}</span>
                <strong>{money(value)}</strong>
                <em>{sub}</em>
                <i className="fin-card-more" aria-hidden="true">{open === key ? '▲' : '▼'}</i>
              </button>
            ))}
          </div>

          {openCard && (
            <FinDetails month={month} card={openCard[0]} title={openCard[1]} cardTotal={openCard[2]} section={section} group={group} onClose={() => setOpen(null)} />
          )}

          <div className="fin-progress">
            <div className="fin-progress-label">
              <span>{t('paidOfPlanned')}</span>
              <strong>{money(b.issued)} / {money(b.planned)}</strong>
            </div>
            <div className="fin-bar"><i style={{ width: `${paidPct}%` }} /></div>
            {b.overpaid > 0 && <p className="fin-muted">{t('overpaid')}: {money(b.overpaid)}</p>}
          </div>

          <div className="fin-grid">
            <div className={`fin-panel${allDebts ? ' fin-panel-wide' : ''}`}>
              <h4>{t('topDebts')}</h4>
              {allDebts ? (
                <FinDetails compact month={month} card="owed" cardTotal={b.owed} title={t('topDebts')} section={section} group={group} onClose={() => setAllDebts(false)} />
              ) : data.topDebts.length === 0 ? (
                <p className="fin-ok">✓ {t('noDebts')}</p>
              ) : (
                <table className="fin-table">
                  <thead>
                    <tr><th>{t('doctor')}</th><th>{t('rep')}</th><th className="num">{t('planned')}</th><th className="num">{t('issued')}</th><th className="num">{t('owed')}</th></tr>
                  </thead>
                  <tbody>
                    {data.topDebts.map((d, i) => (
                      <tr key={i}>
                        <td>{d.doctor}</td>
                        <td className="fin-muted-cell">{d.employee}</td>
                        <td className="num">{money(d.planned)}</td>
                        <td className="num">{money(d.issued)}</td>
                        <td className="num owed">{money(d.owed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {data.topDebts.length > 0 && (
                <button type="button" className="fin-link fin-link-btn" onClick={() => setAllDebts((v) => !v)}>
                  {allDebts ? `▲ ${M.hideDebts}` : `${M.allDebts} ↓`}
                </button>
              )}
            </div>

            <div className="fin-panel">
              <h4>{t('byBank')}</h4>
              {b.byBank.length === 0 ? (
                <p className="fin-muted">{t('nothingPaid')}</p>
              ) : (
                <ul className="fin-banks">
                  {b.byBank.map((x) => (
                    <li key={x.bank}>
                      <span>{x.bank}</span>
                      <div className="fin-bank-bar"><i style={{ width: `${b.issued ? (x.amount / b.issued) * 100 : 0}%` }} /></div>
                      <strong>{money(x.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
