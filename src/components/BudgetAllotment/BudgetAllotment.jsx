'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import MonthSelect from '@/components/MonthSelect/MonthSelect'
import './BudgetAllotment.css'
import ExcelExportButton from '@/components/ExcelExportButton/ExcelExportButton'
import ReportLoader from '@/components/ReportLoader/ReportLoader'

const LOCALE_TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }
const localeTag = (locale) => LOCALE_TAG[locale] || 'ka-GE'

function fmtMoney(n) {
  const num = Number(n) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// allotMonth: texts of this page
const TXT = {
  ka: {
    month: 'თვე', division: 'დივიზიონი', group: 'ჯგუფი', employee: 'თანამშრომელი',
    all: 'ყველა', allGroups: 'ყველა ჯგუფი', allEmployees: 'ყველა თანამშრომელი',
    paid: 'ექიმზე გადახდილი თანხა', sales: 'ექიმის გაყიდვების თანხა', quota: 'ექიმის კვოტის თანხა', balance: 'ექიმის ბალანსი',
    balanceHint: 'ოქტომბრიდან ამ ბიუჯეტამდე: გადახდილი − დარიცხული. მინუსი = ექიმს ვალში ვართ, პლიუსი = ავანსად აქვს',
    totalBalanceHint: 'თითო ექიმის ბალანსი თვის ბოლოს, ჯამში',
    search: 'ძებნა: ექიმი ან თანამშრომელი...', rows: 'ჩანაწერი', deleted: 'წაშლილი ბიუჯეტი — ჯამში არ ითვლება',
  },
  en: {
    month: 'Month', division: 'Division', group: 'Group', employee: 'Employee',
    all: 'All', allGroups: 'All groups', allEmployees: 'All employees',
    paid: 'Paid to doctor', sales: 'Doctor sales amount', quota: 'Doctor quota amount', balance: 'Doctor balance',
    balanceHint: 'From October up to this budget: paid − accrued. Minus = we owe the doctor, plus = paid ahead',
    totalBalanceHint: "Each doctor's balance at the month's end, summed",
    search: 'Search: doctor or employee...', rows: 'rows', deleted: 'Deleted budget — not counted',
  },
  ru: {
    month: 'Месяц', division: 'Дивизион', group: 'Группа', employee: 'Сотрудник',
    all: 'Все', allGroups: 'Все группы', allEmployees: 'Все сотрудники',
    paid: 'Выплачено врачу', sales: 'Сумма продаж врача', quota: 'Сумма квоты врача', balance: 'Баланс врача',
    balanceHint: 'С октября до этого бюджета: выплачено − начислено. Минус = мы должны врачу, плюс = аванс',
    totalBalanceHint: 'Баланс каждого врача на конец месяца, в сумме',
    search: 'Поиск: врач или сотрудник...', rows: 'записей', deleted: 'Удалённый бюджет — не считается',
  },
}

function lastMonth() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const balClass = (n) => (Number(n) < 0 ? 'is-owe' : Number(n) > 0 ? 'is-ahead' : '')

export default function BudgetAllotment() {
  const t = useTranslations('reports')
  const locale = useLocale()
  const L = TXT[locale] || TXT.ka

  const [month, setMonth] = useState(lastMonth())
  const [filters, setFilters] = useState({ sections: [], groups: [] })
  const [sectionId, setSectionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/employees?lite=1').then(setEmployees).catch((err) => setError(err.message))
    apiFetch('/api/budgets/allotment/filters').then((f) => setFilters({ sections: [], groups: [], ...f })).catch(() => {})
  }, [])

  // groups of the chosen division; people of the chosen division / group
  const groupsShown = useMemo(
    () => filters.groups.filter((g) => !sectionId || g.section === sectionId),
    [filters.groups, sectionId]
  )
  const employeesShown = useMemo(() => {
    if (!sectionId && !groupId) return employees
    const ids = new Set()
    ;(groupId ? filters.groups.filter((g) => g.id === groupId) : groupsShown).forEach((g) => g.employees.forEach((e) => ids.add(e)))
    if (!groupId && sectionId) {
      const h = filters.sections.find((s) => s.id === sectionId)?.head
      if (h) ids.add(h)
    }
    return employees.filter((e) => ids.has(String(e._id)))
  }, [employees, filters, groupsShown, sectionId, groupId])

  // a person outside the chosen division / group is dropped
  useEffect(() => {
    if (employeeId && employees.length && !employeesShown.some((e) => String(e._id) === String(employeeId))) setEmployeeId('')
  }, [employeesShown, employeeId, employees.length])

  // any change -> load again
  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ month })
        if (employeeId) params.set('employee_id', employeeId)
        else if (groupId) params.set('group', groupId)
        else if (sectionId) params.set('section', sectionId)
        const result = await apiFetch(`/api/budgets/allotment?${params}`)
        if (alive) setData(result)
      } catch (err) {
        if (alive) setError(err.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [month, sectionId, groupId, employeeId])

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.docs || []).filter((r) => !q
      || r.doctorName?.toLowerCase().includes(q)
      || r.employeeName?.toLowerCase().includes(q)
      || String(r.doctorUniqueNumber || '').toLowerCase().includes(q))
  }, [data, search])

  // 50 rows per page on screen; Excel still gets every row
  const PAGE = 50
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [data, search])
  const pageCount = Math.max(1, Math.ceil(filteredDocs.length / PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageDocs = filteredDocs.slice(safePage * PAGE, safePage * PAGE + PAGE)
  const pager = pageCount > 1 ? (
    <div className="budgetallot-pagination">
      <button type="button" onClick={() => setPage(0)} disabled={safePage === 0}>«</button>
      <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 0}>‹</button>
      <span>{safePage * PAGE + 1}–{Math.min((safePage + 1) * PAGE, filteredDocs.length)} / {filteredDocs.length}</span>
      <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1}>›</button>
      <button type="button" onClick={() => setPage(pageCount - 1)} disabled={safePage >= pageCount - 1}>»</button>
    </div>
  ) : null

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(localeTag(locale)) : '—')

  return (
    <div className="budgetallot-page">
      <div className="budgetallot-header">
        <div className="report-title-row">
          <h1>{t('budget.title')}</h1>
          <ExcelExportButton title={t('budget.title')} build={() => ({
            headers: [t('common.date'), L.employee, t('common.doctor'), t('budget.doctorId'), L.paid, L.sales, L.quota, L.balance, t('budget.isActive')],
            rows: filteredDocs.map((row) => [
              row.date ? { value: new Date(row.date), kind: 'date' } : '—',
              row.employeeName,
              row.doctorName,
              row.doctorUniqueNumber,
              { value: Number(row.paidAmount) || 0, kind: 'money' },
              { value: Number(row.salesAmount) || 0, kind: 'money' },
              { value: Number(row.targetAmount) || 0, kind: 'money' },
              { value: Number(row.balance) || 0, kind: 'money' },
              row.isActive ? '✓' : '✕',
            ]),
          })} />
          {loading && <ReportLoader />}
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="budgetallot-filters">
        <div className="budgetallot-field">
          <label>{L.month}</label>
          <MonthSelect value={month} onChange={(v) => v && setMonth(v)} />
        </div>
        {filters.sections.length > 1 && (
          <div className="budgetallot-field">
            <label>{L.division}</label>
            <select className="field-input" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setGroupId('') }}>
              <option value="">{L.all}</option>
              {filters.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {groupsShown.length > 1 && (
          <div className="budgetallot-field">
            <label>{L.group}</label>
            <select className="field-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">{L.allGroups}</option>
              {groupsShown.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div className="budgetallot-field budgetallot-field-grow">
          <label>{L.employee}</label>
          <SearchableSelect
            options={employeesShown}
            value={employeeId}
            onChange={setEmployeeId}
            getLabel={(o) => o.name || `${o.firstName} ${o.lastName || ''}`.trim()}
            placeholder={L.allEmployees}
          />
        </div>
      </div>

      <div className="budgetallot-kpi-row">
        <div className="budgetallot-kpi-card">
          <span className="budgetallot-kpi-value">{fmtMoney(data?.totalPaidAmount)}</span>
          <span className="budgetallot-kpi-label">{L.paid}</span>
        </div>
        <div className="budgetallot-kpi-card">
          <span className="budgetallot-kpi-value">{fmtMoney(data?.totalSalesAmount)}</span>
          <span className="budgetallot-kpi-label">{L.sales}</span>
        </div>
        <div className="budgetallot-kpi-card">
          <span className="budgetallot-kpi-value">{fmtMoney(data?.totalTargetAmount)}</span>
          <span className="budgetallot-kpi-label">{L.quota}</span>
        </div>
        <div className="budgetallot-kpi-card" title={L.totalBalanceHint}>
          <span className={`budgetallot-kpi-value budgetallot-balance ${balClass(data?.totalBalance)}`}>{fmtMoney(data?.totalBalance)}</span>
          <span className="budgetallot-kpi-label">{L.balance}</span>
        </div>
      </div>

      <input
        type="text"
        className="field-input budgetallot-search"
        placeholder={L.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {pager}

      <div className="budgetallot-table-wrap">
        <table className="budgetallot-table">
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>{L.employee}</th>
              <th>{t('common.doctor')}</th>
              <th>{t('budget.doctorId')}</th>
              <th className="num">{L.paid}</th>
              <th className="num">{L.sales}</th>
              <th className="num">{L.quota}</th>
              <th className="num" title={L.balanceHint}>{L.balance} <span className="budgetallot-hint">ⓘ</span></th>
              <th>{t('budget.isActive')}</th>
            </tr>
          </thead>
          <tbody>
            {pageDocs.map((row) => (
              <tr key={row._id} className={row.isActive ? '' : 'is-deleted'} title={row.isActive ? undefined : L.deleted}>
                <td>{fmtDate(row.date)}</td>
                <td>{row.employeeName}</td>
                <td>{row.doctorName}</td>
                <td>{row.doctorUniqueNumber}</td>
                <td className="num">{fmtMoney(row.paidAmount)}</td>
                <td className="num">{fmtMoney(row.salesAmount)}</td>
                <td className="num">{fmtMoney(row.targetAmount)}</td>
                <td className={`num budgetallot-balance ${balClass(row.balance)}`}>{fmtMoney(row.balance)}</td>
                <td>{row.isActive ? '✓' : '✕'}</td>
              </tr>
            ))}
            {!loading && filteredDocs.length === 0 && (
              <tr>
                <td colSpan={9}>{t('budget.noData')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pager}

      <p className="budgetallot-showing">{filteredDocs.length} {L.rows}</p>
    </div>
  )
}
