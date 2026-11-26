'use client'

// Sales list: everyone / a division / a group / one rep, one month.
// Rows come from the server one page at a time (/api/doctor-entry-items/page).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import ReportLoader from '@/components/ReportLoader/ReportLoader'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import './SalesListing.css'

const ALL = 'all'
const SIZES = [50, 100, 200, 500]

const TXT = {
  ka: { all: 'ყველა', division: 'დივიზიონი', group: 'ჯგუფი', allGroups: 'ყველა ჯგუფი', allEmployees: 'ყველა თანამშრომელი', employee: 'თანამშრომელი', drug: 'წამალი', allDrugs: 'ყველა წამალი', whoTitle: 'ვინ რამდენი გაყიდა (აფთიაქებიდან)', whoHint: 'დააჭირე სახელს — ცხრილში მხოლოდ მისი ჩანაწერები დარჩება', soldBoxes: 'გაყიდული კოლოფი', soldAmount: 'თანხა', noSales: 'ამ თვეში ამ წამალზე აფთიაქის გაყიდვები არ არის შეყვანილი', sum: 'ჯამი', quota: 'გეგმა', rx: 'რეცეპტი', showAll: 'ყველას ჩვენება', search: 'ძებნა', searchPh: 'ექიმი, ID, წამალი ან თანამშრომელი…', reset: 'გასუფთავება', rows: 'ჩანაწერი', doctors: 'ექიმი', reps: 'თანამშრომელი', total: 'სულ ბიუჯეტი', issued: 'გაცემული', planned: 'დაგეგმილი', diff: 'სხვაობა', perPage: 'გვერდზე', prev: 'წინა', next: 'შემდეგი', formulas: 'როგორ ითვლება?', scrollHint: 'ცხრილი გვერდზე სქროლდება →' },
  en: { all: 'All', division: 'Division', group: 'Group', allGroups: 'All groups', allEmployees: 'All employees', employee: 'Employee', drug: 'Drug', allDrugs: 'All drugs', whoTitle: 'Who sold how much (pharmacies)', whoHint: 'Click a name to see only their rows', soldBoxes: 'Boxes sold', soldAmount: 'Amount', noSales: 'No pharmacy sales of this drug entered for this month', sum: 'Total', quota: 'Plan', rx: 'Prescriptions', showAll: 'Show everyone', search: 'Search', searchPh: 'Doctor, ID, drug or employee…', reset: 'Reset', rows: 'rows', doctors: 'doctors', reps: 'employees', total: 'Total budget', issued: 'Issued', planned: 'Planned', diff: 'Difference', perPage: 'per page', prev: 'Previous', next: 'Next', formulas: 'How is it calculated?', scrollHint: 'Scroll the table sideways →' },
  ru: { all: 'Все', division: 'Дивизион', group: 'Группа', allGroups: 'Все группы', allEmployees: 'Все сотрудники', employee: 'Сотрудник', drug: 'Препарат', allDrugs: 'Все препараты', whoTitle: 'Кто сколько продал (аптеки)', whoHint: 'Нажмите на имя — останутся только его записи', soldBoxes: 'Продано упаковок', soldAmount: 'Сумма', noSales: 'Продажи аптек по этому препарату за месяц не внесены', sum: 'Итого', quota: 'План', rx: 'Рецепты', showAll: 'Показать всех', search: 'Поиск', searchPh: 'Врач, ID, препарат или сотрудник…', reset: 'Сбросить', rows: 'записей', doctors: 'врачей', reps: 'сотрудников', total: 'Итого бюджет', issued: 'Выдано', planned: 'Запланировано', diff: 'Разница', perPage: 'на странице', prev: 'Назад', next: 'Вперёд', formulas: 'Как считается?', scrollHint: 'Таблицу можно листать вбок →' },
}

function currentPeriodValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
function monthValueToPeriod(monthValue) {
  const [yyyy, mm] = monthValue.split('-')
  return `${mm}/${yyyy}`
}
function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
}
function fmtPercent(coefficient) {
  if (coefficient == null) return '—'
  return `${fmt(coefficient * 100)}%`
}
const personName = (p) => (p ? (p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || '—') : '—')

// 1 … 4 5 [6] 7 8 … 36
function pageList(cur, total) {
  const out = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - cur) <= 2) out.push(i)
    else if (out[out.length - 1] !== '…') out.push('…')
  }
  return out
}

export default function SalesListing() {
  const tu = useTranslations('ui')
  const L = TXT[useLocale()] || TXT.en

  const [employees, setEmployees] = useState([])
  const [filters, setFilters] = useState({ sections: [], groups: [], drugs: [] })
  const [me, setMe] = useState(null)

  const [section, setSection] = useState('')
  const [group, setGroup] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [drug, setDrug] = useState('')
  const [monthValue, setMonthValue] = useState(currentPeriodValue())
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(SIZES[0])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const req = useRef(0)
  const scrollRef = useRef(null)
  const [canScrollX, setCanScrollX] = useState(false)

  // who am I, who can I see, which divisions / groups exist
  useEffect(() => {
    let stored = null
    try { stored = JSON.parse(localStorage.getItem('employee') || 'null') } catch { /* ignore */ }
    if (stored?._id) setMe(stored)
    apiFetch('/api/employees?lite=1')
      .then((list) => {
        const arr = Array.isArray(list) ? list : []
        setEmployees(arr)
        // a rep sees only themself; everyone else starts on "all employees"
        setEmployeeId(arr.length === 1 ? arr[0]._id : arr.length > 1 ? ALL : stored?._id || '')
      })
      .catch((err) => setError(err.message))
    apiFetch('/api/doctor-entry-items/filters').then((f) => setFilters({ sections: [], groups: [], drugs: [], ...f })).catch(() => {})
  }, [])

  const onlySelf = employees.length === 1 || (!employees.length && !!me)

  // search waits until typing stops
  useEffect(() => {
    const id = setTimeout(() => setQ(qInput.trim()), 350)
    return () => clearTimeout(id)
  }, [qInput])

  // groups of the chosen division, employees of the chosen group / division
  const groupsShown = useMemo(
    () => filters.groups.filter((g) => !section || g.section === section),
    [filters.groups, section]
  )
  const employeesShown = useMemo(() => {
    if (!section && !group) return employees
    const ids = new Set()
    ;(group ? filters.groups.filter((g) => g.id === group) : groupsShown).forEach((g) => g.employees.forEach((e) => ids.add(e)))
    if (!group && section) { const head = filters.sections.find((s) => s.id === section)?.head; if (head) ids.add(head) }
    return employees.filter((e) => ids.has(String(e._id)))
  }, [employees, filters, groupsShown, section, group])
  const employeeOptions = useMemo(
    () => [{ _id: ALL, name: `— ${L.allEmployees} —` }, ...employeesShown],
    [employeesShown, L.allEmployees]
  )

  const drugOptions = useMemo(
    () => [{ _id: ALL, name: `— ${L.allDrugs} —` }, ...(filters.drugs || [])],
    [filters.drugs, L.allDrugs]
  )
  const drugName = (filters.drugs || []).find((d) => d._id === drug)?.name || ''

  // a picked person who is not in the new division / group -> back to "all"
  useEffect(() => {
    if (employeeId && employeeId !== ALL && !onlySelf && !employeesShown.some((e) => e._id === employeeId)) setEmployeeId(ALL)
  }, [employeesShown]) // eslint-disable-line react-hooks/exhaustive-deps

  // new filter -> page 1
  useEffect(() => { setPage(1) }, [section, group, employeeId, drug, monthValue, q, size])

  // load the page
  useEffect(() => {
    if (!employeeId) return
    const id = ++req.current
    const p = new URLSearchParams({ period: monthValueToPeriod(monthValue), page, limit: size })
    if (employeeId !== ALL) p.set('employee', employeeId)
    else {
      if (group) p.set('group', group)
      else if (section) p.set('section', section)
    }
    if (drug) p.set('drug', drug)
    if (q) p.set('q', q)
    setLoading(true)
    setError('')
    apiFetch(`/api/doctor-entry-items/page?${p}`)
      .then((d) => { if (id === req.current) { setData(d); scrollRef.current?.scrollTo({ top: 0 }) } })
      .catch((err) => id === req.current && setError(err.message))
      .finally(() => id === req.current && setLoading(false))
  }, [employeeId, section, group, drug, monthValue, q, page, size])

  // show the "scroll sideways" hint only when the table is wider than the screen
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setCanScrollX(el.scrollWidth > el.clientWidth + 4 && el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    check()
    el.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [data])

  // Excel: every row that matches the filters (all pages), easy to read: names, numbers, ₾ and %
  async function buildExcel() {
    const base = new URLSearchParams({ period: monthValueToPeriod(monthValue), limit: 500 })
    if (employeeId && employeeId !== ALL) base.set('employee', employeeId)
    else if (group) base.set('group', group)
    else if (section) base.set('section', section)
    if (drug) base.set('drug', drug)
    if (q) base.set('q', q)
    let rows = [], ph = {}, pg = 1, last = 1
    do {
      base.set('page', pg)
      const d = await apiFetch(`/api/doctor-entry-items/page?${base}`)
      rows = rows.concat(d.items || [])
      ph = { ...ph, ...(d.pharmacySales || {}) }
      last = Math.max(1, Math.ceil((d.count || 0) / 500))
      pg += 1
    } while (pg <= last)
    const N = (v) => ({ value: Number(v) || 0, kind: 'number' })
    const money = (v) => ({ value: Math.round((Number(v) || 0) * 100) / 100, kind: 'money' })
    return {
      headers: [
        L.employee, tu('k049'), 'ID', tu('k076'), tu('k077'), tu('k055'),
        tu('planCol'), tu('k064'), tu('pharmacyCol'), tu('bonusCol'), tu('k080'),
        tu('k081'), tu('k051'), tu('k057'), tu('k058'), tu('k082'), tu('k083'), tu('k084'),
      ],
      rows: rows.map((it) => {
        const pharmacy = ph[`${it.employee?._id || it.employee}:${it.drug?._id}`]
        return [
          personName(it.employee),
          it.doctor ? personName(it.doctor) : tu('deletedDoctor'),
          { value: it.doctor?.uniqueNumber || '', kind: 'text' },
          it.drug?.name || '—',
          it.hospital?.name || '—',
          it.bank || '—',
          N(it.quota), N(it.prescription), pharmacy != null ? N(pharmacy) : '—',
          money(it.budget),
          { value: Number(it.coefficient) || 0, kind: 'pct' },
          money(it.totalBudget), money(it.issuedBudget), money(it.plannedBudget), money(it.difference),
          money(it.analysisOfPreviousMonth), money(it.budgetCalculation), money(it.analysisOfCurrentMonth),
        ]
      }),
    }
  }

  function shiftMonth(delta) {
    const [y, m] = monthValue.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonthValue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function pickSection(id) { setSection(id); setGroup('') }
  function resetAll() { setSection(''); setGroup(''); setDrug(''); setQInput(''); if (!onlySelf) setEmployeeId(ALL) }

  const items = data?.items || []
  const count = data?.count || 0
  const pages = Math.max(1, Math.ceil(count / size))
  const showRep = employeeId === ALL
  const pharmacy = data?.pharmacySales || {}
  const tot = data?.totals || {}
  const filtered = section || group || drug || qInput || (!onlySelf && employeeId !== ALL)
  const go = (n) => n >= 1 && n <= pages && n !== page && setPage(n)

  return (
    <div className="sales-listing-page">
      {loading && !data && <ReportLoader variant="page" />}
      <div className="sl-title-row">
        <h1>{tu('k072')}</h1>
        <ExcelExportButton
          title={[
            `${tu('k072')} — ${monthValueToPeriod(monthValue)}`,
            employeeId && employeeId !== ALL ? personName(employees.find((e) => e._id === employeeId) || me) : '',
            group ? filters.groups.find((g) => g.id === group)?.name : section ? filters.sections.find((s) => s.id === section)?.name : '',
            drug ? drugName : '',
          ].filter(Boolean).join(' · ')}
          fileName={`${tu('k072')} ${monthValue}`}
          build={buildExcel}
        />
      </div>

      <div className="sales-listing-filters">
        {!onlySelf && filters.sections.length > 0 && (
          <div className="sl-row">
            <div className="sl-field">
              <label>{L.division}</label>
              <div className="sl-pills">
                <button type="button" className={!section ? 'active' : ''} onClick={() => pickSection('')}>{L.all}</button>
                {filters.sections.map((s) => (
                  <button key={s.id} type="button" className={section === s.id ? 'active' : ''} onClick={() => pickSection(s.id)}>{s.name}</button>
                ))}
              </div>
            </div>
            <div className="sl-field">
              <label>{L.group}</label>
              <select className="field-input sl-select" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">{L.allGroups}</option>
                {groupsShown.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="sl-row">
          <div className="sl-field sl-grow">
            <label>{L.employee}</label>
            {onlySelf ? (
              <input type="text" className="field-input" value={personName(employees[0] || me)} readOnly />
            ) : (
              <SearchableSelect
                options={employeeOptions}
                value={employeeId}
                onChange={(v) => setEmployeeId(v || ALL)}
                getLabel={personName}
                placeholder={L.allEmployees}
              />
            )}
          </div>

          <div className="sl-field sl-grow">
            <label>{L.drug}</label>
            <SearchableSelect
              options={drugOptions}
              value={drug || ALL}
              onChange={(v) => setDrug(v && v !== ALL ? v : '')}
              getLabel={(d) => d.name}
              placeholder={L.allDrugs}
            />
          </div>

          <div className="sl-field">
            <label>{tu('k046')}</label>
            <div className="sl-month">
              <button type="button" className="sl-month-btn" onClick={() => shiftMonth(-1)} aria-label={L.prev}>‹</button>
              <input type="month" className="field-input field-date" value={monthValue} onChange={(e) => e.target.value && setMonthValue(e.target.value)} />
              <button type="button" className="sl-month-btn" onClick={() => shiftMonth(1)} aria-label={L.next}>›</button>
            </div>
          </div>

          <div className="sl-field sl-grow">
            <label>{L.search}</label>
            <input type="search" className="field-input" placeholder={L.searchPh} value={qInput} onChange={(e) => setQInput(e.target.value)} />
          </div>

          {filtered && (
            <button type="button" className="sl-reset" onClick={resetAll}>✕ {L.reset}</button>
          )}
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      {data && (
        <div className="sl-summary">
          <div className="sl-stat"><span>{L.rows}</span><strong>{fmt(count)}</strong></div>
          {tot.doctors != null && <div className="sl-stat"><span>{L.doctors}</span><strong>{fmt(tot.doctors)}</strong></div>}
          {showRep && tot.employees != null && <div className="sl-stat"><span>{L.reps}</span><strong>{fmt(tot.employees)}</strong></div>}
          <div className="sl-stat"><span>{L.total}</span><strong>₾{fmt(tot.totalBudget)}</strong></div>
          <div className="sl-stat"><span>{L.issued}</span><strong>₾{fmt(tot.issuedBudget)}</strong></div>
          <div className="sl-stat"><span>{L.diff}</span><strong className={tot.difference < 0 ? 'neg' : ''}>₾{fmt(tot.difference)}</strong></div>
          <details className="sl-formulas">
            <summary>{L.formulas}</summary>
            <div>
              <span>{tu('fCoef')}</span>
              <span>{tu('fTotal')}</span>
              <span>{tu('fPlanned')}</span>
              <span>{tu('fDiff')}</span>
              <span>{tu('fCalc')}</span>
            </div>
          </details>
        </div>
      )}

      {data?.byEmployee && (
        <div className="sl-who">
          <div className="sl-who-head">
            <h3>{L.whoTitle} <span>· {drugName}</span></h3>
            {employeeId !== ALL && !onlySelf
              ? <button type="button" className="sl-who-all" onClick={() => setEmployeeId(ALL)}>{L.showAll}</button>
              : <small>{L.whoHint}</small>}
          </div>
          {data.byEmployee.length === 0 ? (
            <p className="sl-who-empty">{L.noSales}</p>
          ) : (
            <div className="sl-who-scroll">
              <table className="sl-who-table">
                <thead>
                  <tr>
                    <th className="n">#</th><th>{L.employee}</th>
                    <th className="sl-who-rx">{L.soldBoxes}</th>
                    <th className="n">{L.soldAmount}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const max = Math.max(1, ...data.byEmployee.map((r) => r.boxes || 0))
                    return data.byEmployee.map((r, i) => (
                      <tr key={r.employee} className={employeeId === r.employee ? 'active' : ''} onClick={() => !onlySelf && setEmployeeId(r.employee)}>
                        <td className="n sl-who-i">{i + 1}</td>
                        <td className="sl-who-name">{r.name || '—'}</td>
                        <td className="sl-who-rx">
                          <div className="sl-who-bar"><i style={{ width: `${(Math.max(0, r.boxes || 0) / max) * 100}%` }} /></div>
                          <b>{fmt(r.boxes)}</b>
                        </td>
                        <td className="n">₾{fmt(r.amount)}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
                {data.byEmployee.length > 1 && (
                  <tfoot>
                    <tr>
                      <td /><td>{L.sum}</td>
                      <td className="sl-who-rx"><b>{fmt(data.byEmployee.reduce((s, r) => s + (r.boxes || 0), 0))}</b></td>
                      <td className="n">₾{fmt(data.byEmployee.reduce((s, r) => s + (r.amount || 0), 0))}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}

      {data && (
        <div className={`sl-table-card${loading ? ' is-loading' : ''}`}>
          <div className={`sales-listing-scroll${canScrollX ? ' can-scroll-x' : ''}`} ref={scrollRef}>
            <table className={`sales-listing-table${showRep ? ' with-rep' : ''}`}>
              <thead>
                <tr>
                  <th className="sl-sticky sl-num">#</th>
                  <th className="sl-sticky sl-doc">{tu('k049')}</th>
                  {showRep && <th>{L.employee}</th>}
                  <th>{tu('k076')}</th>
                  <th>{tu('k077')}</th>
                  <th>{tu('k055')}</th>
                  <th className="n">{tu('planCol')}</th>
                  <th className="n">{tu('k064')}</th>
                  <th className="n">{tu('pharmacyCol')}</th>
                  <th className="n">{tu('bonusCol')}</th>
                  <th className="n">{tu('k080')}</th>
                  <th className="n">{tu('k081')}</th>
                  <th>{tu('howCol')}</th>
                  <th className="n">{tu('k051')}</th>
                  <th className="n">{tu('k057')}</th>
                  <th className="n">{tu('k058')}</th>
                  <th className="n">{tu('k082')}</th>
                  <th className="n">{tu('k083')}</th>
                  <th className="n">{tu('k084')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const ph = pharmacy[`${item.employee?._id || item.employee}:${item.drug?._id}`]
                  return (
                    <tr key={item._id}>
                      <td className="sl-sticky sl-num">{(page - 1) * size + i + 1}</td>
                      <td className="sl-sticky sl-doc">
                        {item.doctor ? personName(item.doctor) : tu('deletedDoctor')}
                        {item.doctor?.uniqueNumber && <small>{item.doctor.uniqueNumber}</small>}
                      </td>
                      {showRep && <td className="sl-muted">{personName(item.employee)}</td>}
                      <td>{item.drug?.name || '—'}</td>
                      <td className="sl-muted sl-hosp">{(() => {
                        const n = item.hospital?.name
                        if (!n) return '—'
                        const [a, ...b] = n.split(' / ')
                        return <span title={n}>{a}{b.length > 0 && <small>{b.join(' / ')}</small>}</span>
                      })()}</td>
                      <td>{item.bank ? <span className="sl-bank">{item.bank}</span> : '—'}</td>
                      <td className="n">{fmt(item.quota)}</td>
                      <td className="n">{fmt(item.prescription)}</td>
                      <td className="n">{ph != null ? fmt(ph) : '—'}</td>
                      <td className="n">{fmt(item.budget)}</td>
                      <td className="n">{fmtPercent(item.coefficient)}</td>
                      <td className="n strong">{fmt(item.totalBudget)}</td>
                      <td className="sales-listing-how">{fmt(item.prescription)} × {fmt(item.budget)} ₾ × {fmtPercent(item.coefficient)} = {fmt(item.totalBudget)} ₾</td>
                      <td className="n">{fmt(item.issuedBudget)}</td>
                      <td className="n">{fmt(item.plannedBudget)}</td>
                      <td className={`n${item.difference < 0 ? ' negative' : ''}`}>{fmt(item.difference)}</td>
                      <td className="n">{fmt(item.analysisOfPreviousMonth)}</td>
                      <td className={`n${item.budgetCalculation < 0 ? ' negative' : ''}`}>{fmt(item.budgetCalculation)}</td>
                      <td className="n">{fmt(item.analysisOfCurrentMonth)}</td>
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr><td className="sl-empty" colSpan={showRep ? 19 : 18}>{q ? tu('k085') : tu('k086')}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {canScrollX && <div className="sl-scroll-hint">{L.scrollHint}</div>}

          {count > 0 && (
            <div className="sl-pager">
              <span className="sl-pager-info">
                {fmt((page - 1) * size + 1)}–{fmt(Math.min(page * size, count))} / {fmt(count)}
              </span>
              {pages > 1 && (
                <div className="sl-pages">
                  <button type="button" onClick={() => go(page - 1)} disabled={page === 1} aria-label={L.prev}>‹</button>
                  {pageList(page, pages).map((n, i) => n === '…'
                    ? <span key={`d${i}`} className="sl-dots">…</span>
                    : <button key={n} type="button" className={n === page ? 'active' : ''} onClick={() => go(n)}>{n}</button>)}
                  <button type="button" onClick={() => go(page + 1)} disabled={page === pages} aria-label={L.next}>›</button>
                </div>
              )}
              <label className="sl-size">
                <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                  {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {L.perPage}
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
