'use client'

// "where does this number come from" — opens under the finance cards:
// the source, the formula, automatic checks and the rows behind the number.
// Rows come from the server in pages: first 50, then +500 per click.
import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'

const TXT = {
  ka: { source: 'საიდან მოდის', formula: 'როგორ ითვლება', checks: 'შემოწმება', ok: 'საეჭვო არაფერი ჩანს', total: 'ჯამი', card: 'ბარათზე', match: '✓ ემთხვევა ბარათს', nomatch: '⚠ არ ემთხვევა ბარათს', search: 'ძებნა…', more: 'მეტის ჩვენება', shown: 'ნაჩვენებია', of: '-დან', close: 'დახურვა', empty: 'ჩანაწერი არ არის' },
  en: { source: 'Where it comes from', formula: 'How it is calculated', checks: 'Checks', ok: 'Nothing suspicious found', total: 'Total', card: 'On the card', match: '✓ matches the card', nomatch: '⚠ does not match the card', search: 'Search…', more: 'Show more', shown: 'Showing', of: ' of', close: 'Close', empty: 'No records' },
  ru: { source: 'Откуда берётся', formula: 'Как считается', checks: 'Проверка', ok: 'Ничего подозрительного', total: 'Итого', card: 'На карточке', match: '✓ совпадает с карточкой', nomatch: '⚠ не совпадает с карточкой', search: 'Поиск…', more: 'Показать ещё', shown: 'Показано', of: ' из', close: 'Закрыть', empty: 'Нет записей' },
}
const FIRST = 50
const STEP = 500

const money = (n) => `₾${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export default function FinDetails({ month, card, cardTotal, title, section, group, onClose, compact }) {
  const L = TXT[useLocale()] || TXT.en
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [more, setMore] = useState(false)
  const req = useRef(0)

  // search: wait until typing stops
  useEffect(() => {
    const id = setTimeout(() => setQ(qInput.trim()), 300)
    return () => clearTimeout(id)
  }, [qInput])

  const url = (offset, limit) => {
    const p = new URLSearchParams({ month, card, offset, limit })
    if (section) p.set('section', section)
    if (group) p.set('group', group)
    if (q) p.set('q', q)
    return `/api/finance/details?${p}`
  }

  useEffect(() => {
    const id = ++req.current
    setError('')
    if (!data || data.card !== card) setData(null)
    apiFetch(url(0, FIRST))
      .then((d) => id === req.current && setData(d))
      .catch((e) => id === req.current && setError(e.message))
  }, [month, card, section, group, q]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadMore() {
    const id = req.current
    setMore(true)
    apiFetch(url(data.rows.length, STEP))
      .then((d) => id === req.current && setData((x) => ({ ...x, rows: [...x.rows, ...d.rows] })))
      .catch((e) => setError(e.message))
      .finally(() => setMore(false))
  }

  const same = data && Math.abs((data.total || 0) - (cardTotal || 0)) < 0.01

  return (
    <div className={`fin-details ${card}${compact ? ' compact' : ''}`}>
      {!compact && <div className="fin-details-head">
        <h4>{title}</h4>
        <button type="button" className="fin-details-x" onClick={onClose} aria-label={L.close}>✕</button>
      </div>}

      {error && <p className="resource-error">{error}</p>}
      {!data && !error && <p className="fin-muted"><span className="btn-spinner" aria-hidden="true" /></p>}

      {data && (
        <>
          {!compact && <>
          <div className="fin-details-info">
            <div><span>{L.source}</span><p>{data.source}</p></div>
            <div><span>{L.formula}</span><p className="fin-formula">{data.formula}</p></div>
          </div>

          <div className="fin-details-total">
            <span>{L.total}: <strong>{money(data.total)}</strong></span>
            <span>{L.card}: <strong>{money(cardTotal)}</strong></span>
            <b className={same ? 'ok' : 'bad'}>{same ? L.match : L.nomatch}</b>
            {data.meta && <em>{data.meta}</em>}
          </div>

          <div className="fin-checks">
            <span>{L.checks}</span>
            {data.checks.length === 0
              ? <p className="fin-check ok">✓ {L.ok}</p>
              : data.checks.map((c, i) => <p key={i} className={`fin-check ${c.level}`}>{c.level === 'error' ? '⛔' : c.level === 'warn' ? '⚠️' : 'ℹ️'} {c.text}</p>)}
          </div>
          </>}

          {(data.count > 8 || qInput) && (
            <input className="field-input fin-details-search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder={L.search} />
          )}

          <div className="fin-panel fin-details-table">
            {data.rows.length === 0 ? (
              <p className="fin-muted">{L.empty}</p>
            ) : (
              <table className="fin-table">
                <thead>
                  <tr>{data.columns.map(([k, label, kind]) => <th key={k} className={kind ? 'num' : ''}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i}>
                      {data.columns.map(([k, , kind]) => (
                        <td key={k} className={`${kind ? 'num' : ''}${k === 'diff' && Math.abs(r[k]) > 0.005 ? ' owed' : ''}`}>
                          {kind === 'money' ? money(r[k]) : kind === 'num' ? Number(r[k] || 0).toLocaleString('en-US') : r[k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="fin-more">
              <span>{L.shown} {data.rows.length.toLocaleString('en-US')}{L.of} {data.count.toLocaleString('en-US')}</span>
              {data.rows.length < data.count && (
                <button type="button" className="fin-more-btn" onClick={loadMore} disabled={more}>
                  {more ? <span className="btn-spinner" aria-hidden="true" /> : `${L.more} (+${Math.min(STEP, data.count - data.rows.length)})`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
