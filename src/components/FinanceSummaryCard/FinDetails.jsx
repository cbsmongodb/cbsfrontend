'use client'

// "where does this number come from" — opens under the finance cards:
// the source, the formula, automatic checks and every row behind the number.
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'

const TXT = {
  ka: { source: 'საიდან მოდის', formula: 'როგორ ითვლება', checks: 'შემოწმება', ok: 'საეჭვო არაფერი ჩანს', total: 'ჯამი ცხრილში', card: 'ბარათზე', match: '✓ ემთხვევა ბარათს', nomatch: '⚠ არ ემთხვევა ბარათს', search: 'ძებნა…', showAll: 'ყველას ჩვენება', close: 'დახურვა', empty: 'ჩანაწერი არ არის' },
  en: { source: 'Where it comes from', formula: 'How it is calculated', checks: 'Checks', ok: 'Nothing suspicious found', total: 'Table total', card: 'On the card', match: '✓ matches the card', nomatch: '⚠ does not match the card', search: 'Search…', showAll: 'Show all', close: 'Close', empty: 'No records' },
  ru: { source: 'Откуда берётся', formula: 'Как считается', checks: 'Проверка', ok: 'Ничего подозрительного', total: 'Итого в таблице', card: 'На карточке', match: '✓ совпадает с карточкой', nomatch: '⚠ не совпадает с карточкой', search: 'Поиск…', showAll: 'Показать все', close: 'Закрыть', empty: 'Нет записей' },
}

const money = (n) => `₾${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export default function FinDetails({ month, card, cardTotal, title, onClose }) {
  const L = TXT[useLocale()] || TXT.en
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [all, setAll] = useState(false)

  useEffect(() => {
    setData(null); setError(''); setQ(''); setAll(false)
    apiFetch(`/api/finance/details?month=${month}&card=${card}`).then(setData).catch((e) => setError(e.message))
  }, [month, card])

  const rows = useMemo(() => {
    if (!data) return []
    const s = q.trim().toLowerCase()
    return s ? data.rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(s))) : data.rows
  }, [data, q])

  const shown = all ? rows : rows.slice(0, 50)
  const same = data && Math.abs((data.total || 0) - (cardTotal || 0)) < 0.01

  return (
    <div className={`fin-details ${card}`}>
      <div className="fin-details-head">
        <h4>{title}</h4>
        <button type="button" className="fin-details-x" onClick={onClose} aria-label={L.close}>✕</button>
      </div>

      {error && <p className="resource-error">{error}</p>}
      {!data && !error && <p className="fin-muted"><span className="btn-spinner" aria-hidden="true" /></p>}

      {data && (
        <>
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

          {data.rows.length > 8 && (
            <input className="field-input fin-details-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} />
          )}

          <div className="fin-panel fin-details-table">
            {rows.length === 0 ? (
              <p className="fin-muted">{L.empty}</p>
            ) : (
              <table className="fin-table">
                <thead>
                  <tr>{data.columns.map(([k, label, kind]) => <th key={k} className={kind ? 'num' : ''}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => (
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
            {!all && rows.length > 50 && (
              <button type="button" className="fin-link fin-showall" onClick={() => setAll(true)}>{L.showAll} ({rows.length})</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
