'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import './StockUpload.css'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
}

function canUpload() {
  try {
    const emp = JSON.parse(localStorage.getItem('employee') || 'null')
    if (emp?.role?.name?.toLowerCase() === 'admin') return true
    return emp?.role?.privileges?.stock_upload?.add === 1
  } catch {
    return false
  }
}

const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString() : '—')

export default function StockUpload() {
  const t = useTranslations('stockUpload')
  const [allowUpload, setAllowUpload] = useState(false)
  const [period, setPeriod] = useState(currentMonth())
  const [inputKey, setInputKey] = useState(0)
  const [fileBase64, setFileBase64] = useState('')
  const [preview, setPreview] = useState(null)
  const [lines, setLines] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [periods, setPeriods] = useState([])
  const [openPeriod, setOpenPeriod] = useState(null)
  const [periodRows, setPeriodRows] = useState([])

  useEffect(() => {
    setAllowUpload(canUpload())
    loadPeriods()
  }, [])

  async function loadPeriods() {
    try {
      setPeriods(await apiFetch('/api/stocks/periods'))
    } catch (e) {
      setError(e.message)
    }
  }

  async function runPreview(base64, cols = {}) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const data = await apiFetch('/api/stocks/preview', {
        method: 'POST',
        body: JSON.stringify({ fileBase64: base64, period, ...cols }),
      })
      setPreview(data)
      setLines(data.lines.map((l, idx) => ({ ...l, idx })))
    } catch (e) {
      setError(e.message)
      setPreview(null)
      setLines([])
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/\.xlsx$/i.test(file.name)) {
      setError(t('onlyXlsx'))
      return
    }
    const b64 = await readAsBase64(file)
    setFileBase64(b64)
    setPreview(null)
    setLines([])
    setError('')
    setMessage('')
  }

  function changeColumn(which, value) {
    runPreview(fileBase64, { nameCol: preview.nameCol, qtyCol: preview.qtyCol, [which]: Number(value) })
  }

  function setLineDrug(idx, drugId) {
    setLines((prev) => prev.map((l) => (l.idx === idx ? { ...l, drug: drugId || null, guessed: false } : l)))
  }

  function reset() {
    setPreview(null)
    setLines([])
    setFileBase64('')
    setInputKey((k) => k + 1)
  }

  async function commit() {
    const items = lines.filter((l) => l.drug).map((l) => ({ drug: l.drug, stocks: l.qty, sourceName: l.fileName }))
    if (items.length === 0) return
    if (periods.some((p) => p.period === period) && !confirm(t('confirmOverwrite', { period }))) return
    setBusy(true)
    setError('')
    try {
      const r = await apiFetch('/api/stocks/commit', { method: 'POST', body: JSON.stringify({ period, items }) })
      setMessage(t('saved', { count: r.saved, period: r.period }) + (r.updatedCurrent ? ' ' + t('updatedCurrent') : ''))
      reset()
      loadPeriods()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePeriod(p) {
    if (openPeriod === p) {
      setOpenPeriod(null)
      return
    }
    setOpenPeriod(p)
    setPeriodRows([])
    try {
      setPeriodRows(await apiFetch(`/api/stocks/period/${p}`))
    } catch (e) {
      setError(e.message)
    }
  }

  const drugsById = useMemo(() => new Map((preview?.drugs || []).map((d) => [d._id, d])), [preview])
  const sortedLines = useMemo(() => {
    const rank = (l) => (!l.drug ? 0 : l.guessed ? 1 : 2)
    return [...lines].sort((a, b) => rank(a) - rank(b) || a.idx - b.idx)
  }, [lines])
  const matchedCount = lines.filter((l) => l.drug).length
  const unmatchedCount = lines.length - matchedCount
  const alreadyUploaded = periods.some((p) => p.period === period)

  return (
    <div className="stock-upload">
      <h1>{t('title')}</h1>

      {allowUpload && (
        <section className="stock-card">
          <p className="stock-muted">{t('intro')}</p>
          <div className="stock-row">
            <label className="stock-field">
              <span>{t('period')}</span>
              <input
                className="field-input"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="stock-field">
              <span>{t('file')}</span>
              <input key={inputKey} className="field-input" type="file" accept=".xlsx" onChange={onFile} disabled={busy} />
            </label>
          </div>
          {alreadyUploaded && <p className="stock-warning">{t('alreadyUploaded')}</p>}

          {!preview && (
            <div className="stock-row">
              <button type="button" className="btn" onClick={() => runPreview(fileBase64)} disabled={busy || !fileBase64}>
                <span>{busy ? t('working') : t('upload')}</span>
              </button>
              {fileBase64 && (
                <button type="button" className="btn-gray" onClick={reset} disabled={busy}>
                  <span>{t('cancel')}</span>
                </button>
              )}
            </div>
          )}
          {busy && <p className="stock-muted">{t('working')}</p>}

          {preview && (
            <>
              <div className="stock-row">
                <label className="stock-field">
                  <span>{t('nameCol')}</span>
                  <select className="field-input" value={preview.nameCol} onChange={(e) => changeColumn('nameCol', e.target.value)} disabled={busy}>
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
                <label className="stock-field">
                  <span>{t('qtyCol')}</span>
                  <select className="field-input" value={preview.qtyCol} onChange={(e) => changeColumn('qtyCol', e.target.value)} disabled={busy}>
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="stock-summary">
                {t('sheet', { name: preview.sheetName })} ·{' '}
                {t('summary', { matched: matchedCount, unmatched: unmatchedCount, skipped: preview.skipped })}
              </p>

              <div className="stock-table-wrap">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>{t('fileName')}</th>
                      <th>{t('qty')}</th>
                      <th>{t('drug')}</th>
                      <th>{t('currentStock')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLines.map((l) => {
                      const d = l.drug ? drugsById.get(l.drug) : null
                      const editable = !l.drug || l.guessed
                      return (
                        <tr key={l.idx} className={!l.drug ? 'stock-missing' : l.guessed ? 'stock-guessed' : ''}>
                          <td>{l.fileName}</td>
                          <td>{fmt(l.qty)}</td>
                          <td>
                            {editable ? (
                              <>
                                <select className="field-input" value={l.drug || ''} onChange={(e) => setLineDrug(l.idx, e.target.value)}>
                                  <option value="">{t('skip')}</option>
                                  {preview.drugs.map((dr) => (
                                    <option key={dr._id} value={dr._id}>{dr.name}</option>
                                  ))}
                                </select>
                                <small className="stock-hint">{l.drug ? t('guessed') : t('notFound')}</small>
                              </>
                            ) : (
                              d?.name
                            )}
                          </td>
                          <td>{d ? fmt(d.stocks) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="stock-row">
                <button type="button" className="btn" onClick={commit} disabled={busy || matchedCount === 0}>
                  <span>{busy ? t('saving') : t('confirm', { period })}</span>
                </button>
                <button type="button" className="btn-gray" onClick={reset} disabled={busy}>
                  <span>{t('cancel')}</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {error && <p className="resource-error">{error}</p>}
      {message && <p className="stock-success">{message}</p>}

      <section className="stock-card">
        <h2>{t('history')}</h2>
        {periods.length === 0 ? (
          <p className="stock-muted">{t('noHistory')}</p>
        ) : (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <tbody>
                {periods.map((p) => (
                  <tr key={p.period}>
                    <td><strong>{p.period}</strong></td>
                    <td>{t('drugsCount', { count: p.count })}</td>
                    <td>{t('total', { total: fmt(p.total) })}</td>
                    <td className="stock-muted">
                      {new Date(p.updatedAt).toLocaleDateString()}
                      {p.uploadedBy ? ` · ${p.uploadedBy}` : ''}
                    </td>
                    <td>
                      <button type="button" className="btn-gray btn-sm" onClick={() => togglePeriod(p.period)}>
                        <span>{openPeriod === p.period ? t('hide') : t('show')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {openPeriod && (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>{t('drug')}</th>
                  <th>{t('qty')}</th>
                  <th>{t('fileName')}</th>
                </tr>
              </thead>
              <tbody>
                {periodRows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.drug}</td>
                    <td>{fmt(r.stocks)}</td>
                    <td className="stock-muted">{r.sourceName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
