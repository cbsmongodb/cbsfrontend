'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './DevErrorsWidget.css'

const DEVELOPER_EMAIL = 'lbogveradze12@gmail.com'

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ახლახან'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} წთ წინ`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} სთ წინ`
  return `${Math.floor(h / 24)} დღის წინ`
}

// page in the app -> its name in the menu
const PAGES = [
  [/plannings/, 'ვიზიტების დაგეგმვა'], [/doctor-entry-items/, 'რეცეპტების შეყვანა'], [/sales-listing/, 'გაყიდვების სია'],
  [/budgets\/new/, 'ახალი ბიუჯეტი'], [/budgets/, 'ბიუჯეტები'], [/employee-sales/, 'გაყიდვები აფთიაქებიდან'],
  [/employee-targets/, 'თანამშრომლების გეგმები'], [/leave-requests/, 'შვებულების მოთხოვნა'], [/leaves/, 'შვებულებები'],
  [/reports\/efficiency/, 'ეფექტურობის რეპორტი'], [/reports\/reimbursement/, 'ტრანსპორტის ანაზღაურება'],
  [/reports\/attendances/, 'დასწრების რეპორტი'], [/reports\/prescriptions/, 'რეცეპტების რეპორტი'],
  [/reports\/staff-performance/, 'თანამშრომელთა შესრულება'], [/analytics/, 'ანალიტიკა'],
  [/live-feeds/, 'Live Feed'], [/team-status/, 'საველე გუნდის სტატუსი'], [/attendance-status/, 'დასწრების სტატუსი'],
  [/doctors/, 'ექიმები'], [/drugs/, 'მედიკამენტები'], [/hospitals/, 'ჰოსპიტლები'], [/pharmacies/, 'აფთიაქები'],
  [/employees/, 'თანამშრომლები'], [/stocks/, 'მარაგები'], [/roles/, 'როლები'], [/login/, 'შესვლა'],
  [/dashboard\/?$/, 'დაშბორდი'],
]
const pageName = (path) => (path ? (PAGES.find(([re]) => re.test(path)) || [null, path.replace(/^\/(ka|en|ru)/, '')])[1] : null)

// a short, human title for the error
const FN = {
  createPlanning: 'ვიზიტის დაგეგმვა ვერ მოხერხდა', updatePlanning: 'ვიზიტის შეცვლა ვერ მოხერხდა',
  deletePlanning: 'ვიზიტის წაშლა ვერ მოხერხდა', getPlannings: 'ვიზიტები ვერ ჩაიტვირთა',
  createRequest: 'შვებულების მოთხოვნა ვერ გაიგზავნა', approveRequest: 'შვებულება ვერ დადასტურდა',
  submitEntries: 'რეცეპტები ვერ შეინახა', getFinanceSummary: 'ფინანსების ბლოკი ვერ ჩაიტვირთა',
  getOverview: 'დირექტორის მიმოხილვა ვერ ჩაიტვირთა', getDoctorsReport: 'ექიმების რეპორტი ვერ ჩაიტვირთა',
}
function titleOf(e) {
  const first = String(e.message || '').split('\n')[0]
  const fn = first.match(/^(\w+) failed/)?.[1]
  if (fn && FN[fn]) return FN[fn]
  const geo = first.match(/^geocode failed for "([^"]+)"/)
  if (geo) return `მისამართი რუკაზე ვერ მოიძებნა: ${geo[1]}`
  if (e.action) return `${e.action}: შეცდომა`
  if (fn) return `${fn}: შეცდომა`
  return first.slice(0, 120)
}
function hintOf(e) {
  if (e.hint) return e.hint
  const m = String(e.message || '')
  const dup = m.match(/dup key: \{ (\w+): "?([^"}]*)"? \}/)
  if (dup) return `დუბლიკატი: "${dup[1]}" = "${dup[2]}" უკვე არსებობს.`
  if (/Rate Limited/i.test(m)) return 'რუკის სერვისის ლიმიტი: ზედმეტად ბევრი მოთხოვნა წუთში.'
  if (/Unable to geocode|Invalid Request/i.test(m)) return 'მისამართი ზედმეტად ზოგადია: გაასწორე, ან კოორდინატები ხელით ჩაწერე.'
  return null
}
const isSystem = (e) => !e.employeeName && !e.apiPath

export default function DevErrorsWidget() {
  const [isDev, setIsDev] = useState(false)
  const [errors, setErrors] = useState(null)
  const [tab, setTab] = useState('users')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('employee')
    if (stored) setIsDev(JSON.parse(stored).email?.toLowerCase() === DEVELOPER_EMAIL)
  }, [])

  useEffect(() => {
    if (!isDev) return
    load()
    const poll = setInterval(load, 30000)
    return () => clearInterval(poll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDev])

  async function load() {
    try { setErrors(await apiFetch('/api/dev/errors')) } catch { /* dev-only widget */ }
  }
  async function markRead() {
    try { await apiFetch('/api/dev/errors/mark-read', { method: 'PUT' }); load() } catch { /* ignore */ }
  }

  // same problem many times -> one card, with everyone it happened to
  const groups = useMemo(() => {
    const m = new Map()
    ;(errors || []).forEach((e) => {
      const key = `${titleOf(e)}|${e.page || ''}`
      if (!m.has(key)) m.set(key, { key, title: titleOf(e), hint: hintOf(e), page: pageName(e.page), action: e.action, system: isSystem(e), items: [] })
      m.get(key).items.push(e)
    })
    return [...m.values()]
  }, [errors])
  const users = groups.filter((g) => !g.system)
  const system = groups.filter((g) => g.system)
  const shown = tab === 'users' ? users : system
  const unread = (errors || []).filter((e) => !e.read).length

  if (!isDev) return null

  return (
    <div className="errmon">
      <div className="errmon-head">
        <div className="errmon-title">
          <span className="errmon-icon">🛠️</span>
          <div>
            <strong>პრობლემები</strong>
            <span>რომელ თანამშრომელს, სად და რისი გაკეთებისას შეექმნა შეცდომა</span>
          </div>
          {unread > 0 && <em className="errmon-new">{unread} ახალი</em>}
        </div>
        <div className="errmon-tabs">
          <button type="button" className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>👤 თანამშრომლების ({users.length})</button>
          <button type="button" className={tab === 'system' ? 'active' : ''} onClick={() => setTab('system')}>⚙️ სისტემური ({system.length})</button>
        </div>
      </div>

      {errors === null && <p className="errmon-empty">იტვირთება…</p>}
      {errors && shown.length === 0 && <p className="errmon-ok">✓ აქ პრობლემები არ არის</p>}

      <div className="errmon-list">
        {shown.map((g) => {
          const latest = g.items[0]
          const people = [...new Map(g.items.filter((e) => e.employeeName).map((e) => [e.employeeName, e])).values()]
          const isNew = g.items.some((e) => !e.read)
          return (
            <div className={`errmon-card ${isNew ? 'is-new' : ''}`} key={g.key}>
              <div className="errmon-card-top">
                <strong className="errmon-card-title">{g.title}</strong>
                <span className="errmon-when">{timeAgo(latest.createdAt)}{g.items.length > 1 ? ` · ${g.items.length}-ჯერ` : ''}</span>
              </div>

              <div className="errmon-meta">
                {people.length > 0 ? people.slice(0, 6).map((e) => (
                  <span className="errmon-person" key={e.employeeName}>
                    <i>{e.employeeName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</i>
                    {e.employeeName}{e.employeeRole ? <small> · {e.employeeRole}</small> : null}
                  </span>
                )) : !g.system && <span className="errmon-person unknown"><i>?</i>უცნობი (ძველი ჩანაწერი, სანამ ეს ინფორმაცია ინახებოდა)</span>}
                {people.length > 6 && <span className="errmon-chip">+{people.length - 6}</span>}
                {g.page && <span className="errmon-chip">📄 {g.page}</span>}
                {g.action && <span className="errmon-chip">⚡ {g.action}</span>}
                {g.system && <span className="errmon-chip">⚙️ ფონური სკრიპტი / პროცესი</span>}
              </div>

              {g.hint && <div className="errmon-hint">💡 {g.hint}</div>}

              <button type="button" className="errmon-more" onClick={() => setOpen(open === g.key ? null : g.key)}>
                {open === g.key ? 'ტექნიკური დეტალების დამალვა ▴' : 'ტექნიკური დეტალები ▾'}
              </button>
              {open === g.key && (
                <pre className="errmon-tech">
                  {latest.method ? `${latest.method} ${latest.apiPath}${latest.query ? `?${latest.query}` : ''}\n` : ''}
                  {latest.bodyKeys ? `ველები: ${latest.bodyKeys}\n\n` : ''}
                  {latest.message}
                </pre>
              )}
            </div>
          )
        })}
      </div>

      {unread > 0 && (
        <button type="button" className="errmon-read" onClick={markRead}>✓ ყველა წაკითხულად მოვნიშნო</button>
      )}
    </div>
  )
}
