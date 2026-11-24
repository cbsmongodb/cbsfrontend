'use client'

// Staff performance: one row per employee — visits, doctors seen, paid to doctors,
// and (for a whole month) prescriptions, plan and real pharmacy sales in ₾.
import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import MonthSelect from '@/components/MonthSelect/MonthSelect'
import DateInput from '@/components/DateInput/DateInput'
import './StaffPerformanceReport.css'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import ReportLoader from '@/components/ReportLoader/ReportLoader'

const TXT = {
  ka: {
    visits: 'ვიზიტები', doctors: 'ექიმები', paid: 'გადახდილი', rx: 'რეცეპტები', plan: 'გეგმა', sales: 'გაყიდვები', done: 'შესრულება',
    total: 'ჯამი', how: 'როგორ ითვლება?', perPage: 'გვერდზე',
    hVisits: 'დასრულებული ვიზიტები (მივედი / წამოვედი / დასრულებული)',
    hDoctors: 'რამდენი სხვადასხვა ექიმი ნახა ამ ვიზიტებზე',
    hPaid: 'ექიმებზე გადახდილი თანხა ბიუჯეტებიდან (წაშლილი ბიუჯეტები არ ითვლება)',
    hRx: 'რეცეპტების შეყვანაში შეყვანილი რეცეპტები × წამლის ფასი',
    hPlan: '„თანამშრომლის გეგმებში“ შეყვანილი კოლოფები × წამლის ფასი',
    hSales: '„თანამშრომლის გაყიდვებში“ შეყვანილი კოლოფები × წამლის ფასი',
    hDone: 'გაყიდვები ÷ გეგმა',
    boxes: 'კოლ.',
  },
  en: {
    visits: 'Visits', doctors: 'Doctors', paid: 'Paid', rx: 'Prescriptions', plan: 'Plan', sales: 'Sales', done: 'Fulfilment',
    total: 'Total', how: 'How is it calculated?', perPage: 'per page',
    hVisits: 'Finished visits (arrived / left / completed)',
    hDoctors: 'Different doctors seen on those visits',
    hPaid: 'Paid to doctors from budgets (deleted budgets excluded)',
    hRx: 'Entered prescriptions × drug price',
    hPlan: 'Boxes in "Employee plans" × drug price',
    hSales: 'Boxes in "Employee sales" × drug price',
    hDone: 'Sales ÷ plan',
    boxes: 'boxes',
  },
  ru: {
    visits: 'Визиты', doctors: 'Врачи', paid: 'Выплачено', rx: 'Рецепты', plan: 'План', sales: 'Продажи', done: 'Выполнение',
    total: 'Итого', how: 'Как считается?', perPage: 'на странице',
    hVisits: 'Завершённые визиты (пришёл / ушёл / завершён)',
    hDoctors: 'Сколько разных врачей посещено',
    hPaid: 'Выплачено врачам по бюджетам (удалённые не считаются)',
    hRx: 'Введённые рецепты × цена препарата',
    hPlan: 'Упаковки в «Планах сотрудников» × цена',
    hSales: 'Упаковки в «Продажах сотрудников» × цена',
    hDone: 'Продажи ÷ план',
    boxes: 'уп.',
  },
}
const SIZES = [25, 50, 100]

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function defaultFrom() { const d = new Date(); d.setDate(d.getDate() - 6); return iso(d) }
function defaultTo() { return iso(new Date()) }
const money = (n) => `₾${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const num = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

function pageList(cur, total) {
  const out = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - cur) <= 2) out.push(i)
    else if (out[out.length - 1] !== '…') out.push('…')
  }
  return out
}

function Pct({ v }) {
  if (v == null) return <span className="sp-muted">—</span>
  const cls = v >= 100 ? 'good' : v >= 70 ? 'mid' : 'bad'
  return (
    <span className={`sp-pct ${cls}`}>
      <span className="sp-pct-bar"><i style={{ width: `${Math.min(v, 100)}%` }} /></span>
      <b>{num(v)}%</b>
    </span>
  )
}

export default function StaffPerformanceReport() {
  const t = useTranslations('reports')
  const L = TXT[useLocale()] || TXT.ka
  const [mode, setMode] = useState('month')
  const [month, setMonth] = useState(currentMonthValue())
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  const [sections, setSections] = useState([])
  const [groups, setGroups] = useState([])
  const [employees, setEmployees] = useState([])
  const [sectionId, setSectionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const [page, setPage] = useState(1)
  const [size, setSize] = useState(50)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const req = useRef(0)

  useEffect(() => {
    apiFetch('/api/admin/sections').then((x) => setSections(Array.isArray(x) ? x : [])).catch(() => setSections([]))
    apiFetch('/api/admin/groups').then((x) => setGroups(Array.isArray(x) ? x : [])).catch(() => setGroups([]))
    apiFetch('/api/employees?lite=1').then((x) => setEmployees(Array.isArray(x) ? x : [])).catch((err) => setError(err.message))
  }, [])

  // groups of the chosen division (when the list knows each group's division)
  const secOf = (g) => String(g.section?._id || g.section || '')
  const groupOptions = sectionId && groups.some(secOf)
    ? groups.filter((g) => secOf(g) === String(sectionId))
    : groups

  // any filter change -> page 1; then load
  useEffect(() => { setPage(1) }, [mode, month, from, to, sectionId, groupId, employeeId, size])
  useEffect(() => {
    if (mode === 'range' && (!from || !to)) return
    const id = ++req.current
    const params = new URLSearchParams({ page, limit: size })
    if (mode === 'month') { params.set('mode', 'month'); params.set('month', month) }
    else { params.set('mode', 'range'); params.set('from', from); params.set('to', to) }
    if (sectionId) params.set('section', sectionId)
    if (groupId) params.set('group', groupId)
    if (employeeId) params.set('employee', employeeId)
    setLoading(true)
    setError('')
    apiFetch(`/api/reports/staff-performance?${params}`)
      .then((r) => id === req.current && setData(r))
      .catch((err) => id === req.current && setError(err.message))
      .finally(() => id === req.current && setLoading(false))
  }, [mode, month, from, to, sectionId, groupId, employeeId, page, size])

  const isMonthMode = data?.mode === 'month'
  const tot = data?.totals || {}
  const cols = isMonthMode ? 9 : 4

  return (
    <div className="staff-performance">
      <div className="report-title-row">
        <h1>{t('staff.title')}</h1>
        <ExcelExportButton title={t('staff.title')} build={() => ({
          headers: [t('common.employee'), L.visits, L.doctors, L.paid, ...(isMonthMode ? [L.rx, L.plan, L.sales, `${L.done} %`] : [])],
          rows: (data?.docs || []).map((r) => [
            r.employeeName,
            { value: r.visits || 0, kind: 'number' },
            { value: r.doctorsVisited || 0, kind: 'number' },
            { value: r.totalPaidAmount || 0, kind: 'number' },
            ...(isMonthMode ? [
              { value: r.totalPrescriptionAmount || 0, kind: 'number' },
              { value: r.targetAmount || 0, kind: 'number' },
              { value: r.salesAmount || 0, kind: 'number' },
              { value: r.fulfillment == null ? 0 : r.fulfillment / 100, kind: 'pct' },
            ] : []),
          ]),
        })} />
        {loading && <ReportLoader />}
      </div>

      <div className="staff-performance-filters">
        <div className="staff-performance-mode-toggle">
          <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>{t('staff.byMonth')}</button>
          <button type="button" className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>{t('staff.byRange')}</button>
        </div>

        <div className="staff-performance-filters-grid">
          {mode === 'month' ? (
            <div className="staff-performance-field">
              <label>{t('common.month')}</label>
              <MonthSelect value={month} onChange={(v) => v && setMonth(v)} />
            </div>
          ) : (
            <>
              <div className="staff-performance-field">
                <label>{t('common.startDate')}</label>
                <DateInput className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="staff-performance-field">
                <label>{t('common.endDate')}</label>
                <DateInput className="field-input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}

          {sections.length > 0 && (
            <div className="staff-performance-field">
              <label>{t('common.division')}</label>
              <SearchableSelect options={sections} value={sectionId} onChange={(v) => { setSectionId(v); setGroupId('') }} getLabel={(o) => o.name} placeholder={t('common.all')} />
            </div>
          )}
          {groups.length > 0 && (
            <div className="staff-performance-field">
              <label>{t('common.group')}</label>
              <SearchableSelect options={groupOptions} value={groupId} onChange={setGroupId} getLabel={(o) => o.name} placeholder={t('common.all')} />
            </div>
          )}
          <div className="staff-performance-field">
            <label>{t('common.employee')}</label>
            <SearchableSelect options={employees} value={employeeId} onChange={setEmployeeId} getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`} placeholder={t('common.all')} />
          </div>
        </div>

        {mode === 'range' && <p className="staff-performance-hint">{t('staff.rangeHint')}</p>}

        <details className="sp-how">
          <summary>{L.how}</summary>
          <ul>
            <li><b>{L.visits}</b> — {L.hVisits}</li>
            <li><b>{L.doctors}</b> — {L.hDoctors}</li>
            <li><b>{L.paid}</b> — {L.hPaid}</li>
            <li><b>{L.rx}</b> — {L.hRx}</li>
            <li><b>{L.plan}</b> — {L.hPlan}</li>
            <li><b>{L.sales}</b> — {L.hSales}</li>
            <li><b>{L.done}</b> — {L.hDone}</li>
          </ul>
        </details>
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className={`staff-performance-table-wrap${loading ? ' is-loading' : ''}`}>
        <table className="staff-performance-table">
          <thead>
            <tr>
              <th>{t('common.employee')}</th>
              <th className="n" title={L.hVisits}>{L.visits}</th>
              <th className="n" title={L.hDoctors}>{L.doctors}</th>
              <th className="n" title={L.hPaid}>{L.paid}</th>
              {isMonthMode && (
                <>
                  <th className="n" title={L.hRx}>{L.rx}</th>
                  <th className="n" title={L.hPlan}>{L.plan}</th>
                  <th className="n" title={L.hSales}>{L.sales}</th>
                  <th title={L.hDone}>{L.done}</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((r) => (
              <tr key={r.employeeId} className={employeeId === String(r.employeeId) ? 'is-active' : ''}>
                <td data-label={t('common.employee')}>
                  <button type="button" className="sp-name" onClick={() => setEmployeeId(employeeId === String(r.employeeId) ? '' : String(r.employeeId))}>{r.employeeName}</button>
                </td>
                <td className="n" data-label={L.visits}>{num(r.visits)}</td>
                <td className="n" data-label={L.doctors}>{num(r.doctorsVisited)}</td>
                <td className="n" data-label={L.paid}>{money(r.totalPaidAmount)}</td>
                {isMonthMode && (
                  <>
                    <td className="n" data-label={L.rx}>{money(r.totalPrescriptionAmount)}<small>{num(r.prescriptionBoxes)} {L.boxes}</small></td>
                    <td className="n" data-label={L.plan}>{money(r.targetAmount)}<small>{num(r.targetBoxes)} {L.boxes}</small></td>
                    <td className="n" data-label={L.sales}>{money(r.salesAmount)}<small>{num(r.salesBoxes)} {L.boxes}</small></td>
                    <td data-label={L.done}><Pct v={r.fulfillment} /></td>
                  </>
                )}
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr><td colSpan={cols} className="sp-empty">{t('common.noRecordsFilter')}</td></tr>
            )}
          </tbody>
          {data && data.total > 1 && (
            <tfoot>
              <tr>
                <td>{L.total} · {num(data.total)}</td>
                <td className="n">{num(tot.visits)}</td>
                <td className="n">{num(tot.doctorsVisited)}</td>
                <td className="n">{money(tot.totalPaidAmount)}</td>
                {isMonthMode && (
                  <>
                    <td className="n">{money(tot.totalPrescriptionAmount)}</td>
                    <td className="n">{money(tot.targetAmount)}</td>
                    <td className="n">{money(tot.salesAmount)}</td>
                    <td><Pct v={tot.fulfillment} /></td>
                  </>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="sp-pager">
          <span>{num((page - 1) * size + 1)}–{num(Math.min(page * size, data.total))} / {num(data.total)}</span>
          {data.pages > 1 && (
            <div className="sp-pages">
              <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1}>‹</button>
              {pageList(page, data.pages).map((n, i) => n === '…'
                ? <span key={`d${i}`} className="sp-dots">…</span>
                : <button key={n} type="button" className={n === page ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}
              <button type="button" onClick={() => setPage(page + 1)} disabled={page >= data.pages}>›</button>
            </div>
          )}
          <label className="sp-size">
            <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {L.perPage}
          </label>
        </div>
      )}
    </div>
  )
}
