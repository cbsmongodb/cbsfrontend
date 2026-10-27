'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import '@/components/ExcelExportButton/ExcelExportButton.css'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import '@/components/ReimbursementReport/ReimbursementReport.css'
import './LeavePayrollReport.css'

const LOCALE_TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// "2026-10-14" -> "14"  (all dates in the list are of the chosen month)
const dayOnly = (k) => String(Number(k.slice(8, 10)))

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

  const title = `${t('leavePayroll.title')} — ${monthLabel}`

  function buildExcel() {
    const headers = [t('common.division'), t('common.employee'), t('leavePayroll.paid'), t('leavePayroll.unpaid'), t('leavePayroll.sick'), t('leavePayroll.total'), t('leavePayroll.unpaidDates'), t('leavePayroll.sickDates'), t('leavePayroll.paidDates')]
    const rows = shown.flatMap((d) => d.rows.map((r) => [
      divisionName(d), r.employeeName, r.paid, r.unpaid, r.sick, r.paid + r.unpaid + r.sick,
      r.unpaidDates.map(dayOnly).join(', '), r.sickDates.map(dayOnly).join(', '), r.paidDates.map(dayOnly).join(', '),
    ]))
    return { headers, rows }
  }

  const Dates = ({ list, cls }) => list.length ? (
    <span className={`lp-dates ${cls}`}>{list.map(dayOnly).join(', ')}</span>
  ) : null

  return (
    <div className="reimbursement-report leave-payroll">
      <div className="reimbursement-header">
        <div className="report-title-row report-title-row-spread">
          <h1>{t('leavePayroll.title')}</h1>
          <ExcelExportButton title={title} fileName={`${t('leavePayroll.title')} ${data?.month || month}`} build={buildExcel} />
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
        <div className="reimbursement-summary">
          <div className="reimbursement-summary-item highlight lp-sum-unpaid">
            <span>{grand.unpaid}</span>
            <label>{t('leavePayroll.unpaidDays')}</label>
          </div>
          <div className="reimbursement-summary-item">
            <span>{grand.sick}</span>
            <label>{t('leavePayroll.sickDays')}</label>
          </div>
          <div className="reimbursement-summary-item">
            <span>{grand.paid}</span>
            <label>{t('leavePayroll.paidDays')}</label>
          </div>
          <div className="reimbursement-summary-item">
            <span>{grand.people}</span>
            <label>{t('leavePayroll.people')}</label>
          </div>
        </div>
      )}

      {data && grand.pending > 0 && (
        <p className="lp-pending-note">⏳ {t('leavePayroll.pendingNote', { n: grand.pending })}</p>
      )}

      <div className="reimbursement-table-scroll">
        <table className="reimbursement-table lp-table">
          <thead>
            <tr>
              <th>{t('common.employee')}</th>
              <th className="lp-num">{t('leavePayroll.paid')}</th>
              <th className="lp-num lp-col-unpaid">{t('leavePayroll.unpaid')}</th>
              <th className="lp-num">{t('leavePayroll.sick')}</th>
              <th className="lp-num">{t('leavePayroll.total')}</th>
              <th>{t('leavePayroll.days')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <Fragment key={d._id || 'none'}>
                <tr className="lp-division-row">
                  <td>{divisionName(d)} <em>· {d.rows.length}</em></td>
                  <td className="lp-num">{d.totals.paid}</td>
                  <td className="lp-num lp-col-unpaid">{d.totals.unpaid}</td>
                  <td className="lp-num">{d.totals.sick}</td>
                  <td className="lp-num">{d.totals.paid + d.totals.unpaid + d.totals.sick}</td>
                  <td></td>
                </tr>
                {d.rows.map((r) => (
                  <tr key={r.employeeId}>
                    <td className="reimb-strong">
                      {r.employeeName}
                      {!r.isActive && <span className="lp-inactive">{t('leavePayroll.inactive')}</span>}
                    </td>
                    <td className="lp-num">{r.paid || '—'}</td>
                    <td className={`lp-num lp-col-unpaid ${r.unpaid ? 'lp-has-unpaid' : ''}`}>{r.unpaid || '—'}</td>
                    <td className="lp-num">{r.sick || '—'}</td>
                    <td className="lp-num reimb-strong">{r.paid + r.unpaid + r.sick || '—'}</td>
                    <td className="lp-dates-cell">
                      <Dates list={r.unpaidDates} cls="lp-unpaid" />
                      <Dates list={r.sickDates} cls="lp-sick" />
                      <Dates list={r.paidDates} cls="lp-paid" />
                      {r.pending.length > 0 && (
                        <span className="lp-dates lp-pending" title={t('leavePayroll.pendingTitle')}>⏳ {r.pending.map((p) => dayOnly(p.date)).join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {data && shown.length === 0 && (
              <tr><td colSpan={6}>{t('leavePayroll.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="lp-legend">
          <span className="lp-dates lp-unpaid">{t('leavePayroll.unpaid')}</span>
          <span className="lp-dates lp-sick">{t('leavePayroll.sick')}</span>
          <span className="lp-dates lp-paid">{t('leavePayroll.paid')}</span>
          <span className="lp-dates lp-pending">⏳ {t('leavePayroll.pendingShort')}</span>
          <em>{t('leavePayroll.legendNote')}</em>
        </div>
      )}
    </div>
  )
}
