'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { exportLeavePayrollXlsx } from '@/lib/leavePayrollExcel'
import '@/components/ExcelExportButton/ExcelExportButton.css'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import '@/components/ReimbursementReport/ReimbursementReport.css'
import './LeavePayrollReport.css'

const LOCALE_TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function LeavePayrollReport() {
  const t = useTranslations('reports')
  const locale = useLocale()
  const [month, setMonth] = useState(currentMonth())
  const [divisionId, setDivisionId] = useState('')
  const [divisions, setDivisions] = useState([])
  const [search, setSearch] = useState('')
  const [onlyUnpaid, setOnlyUnpaid] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/reports/leave-payroll/divisions').then(setDivisions).catch(() => {})
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load(div = divisionId) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ month: month || currentMonth() })
      if (div) params.set('division', div)
      setData(await apiFetch(`/api/reports/leave-payroll?${params}`))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const monthLabel = useMemo(() => {
    const [y, m] = (data?.month || month).split('-').map(Number)
    const s = new Date(y, m - 1, 1).toLocaleDateString(LOCALE_TAG[locale] || 'ka-GE', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }, [data, month, locale])

  const divisionName = (d) => d.name || t('leavePayroll.noDivision')

  // search + "only unpaid" filter, applied inside every division
  const shown = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.divisions
      .map((d) => {
        const rows = d.rows.filter((r) => (!q || r.employeeName.toLowerCase().includes(q)) && (!onlyUnpaid || r.unpaid > 0))
        const totals = rows.reduce((s, r) => ({ paid: s.paid + r.paid, unpaid: s.unpaid + r.unpaid, sick: s.sick + r.sick }), { paid: 0, unpaid: 0, sick: 0 })
        return { ...d, rows, totals }
      })
      .filter((d) => d.rows.length)
  }, [data, search, onlyUnpaid])

  const grand = useMemo(() => shown.reduce((s, d) => ({
    people: s.people + d.rows.length,
    paid: s.paid + d.totals.paid,
    unpaid: s.unpaid + d.totals.unpaid,
    sick: s.sick + d.totals.sick,
    pending: s.pending + d.rows.filter((r) => r.pending.length).length,
  }), { people: 0, paid: 0, unpaid: 0, sick: 0, pending: 0 }), [shown])

  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')
  async function downloadExcel() {
    if (!data || !shown.length) { setExportMsg(t('common.exportNothing')); return }
    setExporting(true); setExportMsg('')
    try {
      const lp = (k) => t(`leavePayroll.${k}`)
      await exportLeavePayrollXlsx({
        divisions: shown,
        month: data.month,
        locale,
        fileName: lp('title'),
        L: {
          title: lp('title'), employee: t('common.employee'), exportedAt: t('common.exportedAt'),
          paid: lp('paid'), unpaid: lp('unpaid'), sick: lp('sick'), total: lp('total'),
          paidDates: lp('paidDates'), unpaidDates: lp('unpaidDates'), sickDates: lp('sickDates'),
          paidDays: lp('paidDays'), unpaidDays: lp('unpaidDays'), sickDays: lp('sickDays'),
          people: lp('people'), peopleShort: lp('peopleShort'), noDivision: lp('noDivision'),
          inactive: lp('inactive'), weekend: lp('weekend'), pendingShort: lp('pendingShort'),
          approvedOnly: lp('approvedOnly'), grandTotal: lp('grandTotal'),
          sheetSummary: lp('sheetSummary'), sheetCalendar: lp('sheetCalendar'),
        },
      })
    } catch (e) {
      console.error(e); setExportMsg(t('common.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  // the month as a row of days: 1 … 28/30/31, weekends marked
  const WD = { ka: ['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'], en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] }
  const calendar = useMemo(() => {
    const [y, m] = (data?.month || month).split('-').map(Number)
    const count = new Date(y, m, 0).getDate()
    const today = new Date()
    const isThisMonth = today.getFullYear() === y && today.getMonth() + 1 === m
    return Array.from({ length: count }, (_, i) => {
      const wd = new Date(y, m - 1, i + 1).getDay()
      return { day: i + 1, key: `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, wd, weekend: wd === 0 || wd === 6, today: isThisMonth && today.getDate() === i + 1 }
    })
  }, [data, month])
  const wdName = (wd) => (WD[locale] || WD.ka)[wd]

  const TYPE_LABEL = { paid: t('leavePayroll.paid'), unpaid: t('leavePayroll.unpaid'), sick: t('leavePayroll.sick') }
  function dayMap(r) {
    const m = new Map()
    r.paidDates.forEach((k) => m.set(k, 'paid'))
    r.sickDates.forEach((k) => m.set(k, 'sick'))
    r.unpaidDates.forEach((k) => m.set(k, 'unpaid'))
    r.pending.forEach((p) => { if (!m.has(p.date)) m.set(p.date, 'pending') })
    return m
  }

  const Pill = ({ type, n }) => n ? (
    <span className={`lp-pill lp-pill-${type}`}><b>{n}</b> {TYPE_LABEL[type]}</span>
  ) : null

  const CalHead = () => (
    <div className="lp-cal lp-cal-head" aria-hidden="true">
      {calendar.map((c) => (
        <span key={c.day} className={`${c.weekend ? 'is-weekend' : ''} ${c.today ? 'is-today' : ''}`}>
          <b>{c.day}</b><i>{wdName(c.wd)}</i>
        </span>
      ))}
    </div>
  )

  return (
    <div className="reimbursement-report leave-payroll">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{t('leavePayroll.title')}</h1>
          <span className="excel-export">
            <button type="button" className="excel-export-btn" onClick={downloadExcel} disabled={exporting || loading}>
              {exporting ? <span className="btn-spinner" aria-hidden="true" /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="4" fill="#1D7A45" />
                  <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              )}
              <span>{t('common.exportExcel')}</span>
            </button>
            {exportMsg && <em className="excel-export-msg">{exportMsg}</em>}
          </span>
          {loading && <ReportLoader />}
        </div>
        <p className="lp-subtitle">{t('leavePayroll.subtitle')}</p>
      </div>

      <div className="reimbursement-filters-card">
        <div className="reimbursement-filters-grid">
          <div className="reimbursement-field">
            <label>{t('common.month')}</label>
            <input type="month" className="field-input" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="reimbursement-field">
            <label>{t('common.employee')}</label>
            <input type="text" className="field-input" placeholder={t('leavePayroll.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="button" className="btn reimbursement-search-btn" onClick={() => load()} disabled={loading}>
            <span>{loading ? <span className="btn-spinner" aria-hidden="true" /> : t('common.search')}</span>
          </button>
        </div>
        {divisions.length > 1 && (
          <div className="lp-division-chips" role="tablist" aria-label={t('common.division')}>
            <span className="lp-chips-label">{t('common.division')}:</span>
            {[{ _id: '', name: t('common.all') }, ...divisions].map((d) => (
              <button
                key={d._id || 'all'}
                type="button"
                role="tab"
                aria-selected={divisionId === d._id}
                className={`lp-chip ${divisionId === d._id ? 'is-active' : ''}`}
                onClick={() => { setDivisionId(d._id); load(d._id) }}
                disabled={loading}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
        <label className="lp-only-unpaid">
          <input type="checkbox" checked={onlyUnpaid} onChange={(e) => setOnlyUnpaid(e.target.checked)} />
          <span>{t('leavePayroll.onlyUnpaid')}</span>
        </label>
      </div>

      {error && <p className="resource-error">{error}</p>}

      {data && (
        <div className="lp-summary">
          <div className="lp-sum lp-sum-unpaid"><b>{grand.unpaid}</b><span>{t('leavePayroll.unpaidDays')}</span></div>
          <div className="lp-sum lp-sum-sick"><b>{grand.sick}</b><span>{t('leavePayroll.sickDays')}</span></div>
          <div className="lp-sum lp-sum-paid"><b>{grand.paid}</b><span>{t('leavePayroll.paidDays')}</span></div>
          <div className="lp-sum"><b>{grand.people}</b><span>{t('leavePayroll.people')}</span></div>
        </div>
      )}

      {data && grand.pending > 0 && (
        <p className="lp-pending-note">⏳ {t('leavePayroll.pendingNote', { n: grand.pending })}</p>
      )}

      {data && (
        <div className="lp-legend">
          <span><i className="lp-sw lp-c-unpaid" />{t('leavePayroll.unpaid')}</span>
          <span><i className="lp-sw lp-c-sick" />{t('leavePayroll.sick')}</span>
          <span><i className="lp-sw lp-c-paid" />{t('leavePayroll.paid')}</span>
          <span><i className="lp-sw lp-c-pending" />{t('leavePayroll.pendingShort')}</span>
          <span><i className="lp-sw is-weekend" />{t('leavePayroll.weekend')}</span>
        </div>
      )}

      <div className="lp-board-scroll">
        <div className="lp-board" style={{ '--lp-days': calendar.length }}>
          {shown.map((d) => (
            <section className="lp-div" key={d._id || 'none'}>
              <header className="lp-div-head">
                <h3>{divisionName(d)}</h3>
                <span className="lp-div-count">{d.rows.length} {t('leavePayroll.peopleShort')}</span>
                <span className="lp-div-pills">
                  <Pill type="unpaid" n={d.totals.unpaid} />
                  <Pill type="sick" n={d.totals.sick} />
                  <Pill type="paid" n={d.totals.paid} />
                </span>
              </header>
              <div className="lp-row lp-row-head">
                <div className="lp-col-name">{t('common.employee')}</div>
                <div className="lp-col-sum">{t('leavePayroll.daysCount')}</div>
                <CalHead />
              </div>
              {d.rows.map((r) => {
                const map = dayMap(r)
                return (
                  <div className={`lp-row ${r.unpaid ? 'has-unpaid' : ''}`} key={r.employeeId}>
                    <div className="lp-col-name">
                      <strong>{r.employeeName}</strong>
                      {!r.isActive && <span className="lp-inactive">{t('leavePayroll.inactive')}</span>}
                    </div>
                    <div className="lp-col-sum">
                      <Pill type="unpaid" n={r.unpaid} />
                      <Pill type="sick" n={r.sick} />
                      <Pill type="paid" n={r.paid} />
                      {r.pending.length > 0 && <span className="lp-pill lp-pill-pending">⏳ {r.pending.length}</span>}
                    </div>
                    <div className="lp-cal">
                      {calendar.map((c) => {
                        const type = map.get(c.key)
                        const label = type ? (type === 'pending' ? t('leavePayroll.pendingShort') : TYPE_LABEL[type]) : ''
                        return (
                          <span
                            key={c.day}
                            className={`${type ? `lp-c-${type}` : ''} ${c.weekend ? 'is-weekend' : ''} ${c.today ? 'is-today' : ''}`}
                            title={type ? `${c.day} — ${label}` : undefined}
                          >
                            {type ? c.day : ''}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
          {data && shown.length === 0 && <p className="lp-empty">{t('leavePayroll.empty')}</p>}
        </div>
      </div>
    </div>
  )
}
