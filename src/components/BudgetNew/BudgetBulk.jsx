'use client'

// New budgets, many at once: month on top, then one block per employee with
// as many doctor lines as needed. Each line auto-computes its amounts like the
// single form; Save stores every filled line (POST /api/budgets one by one).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import { formatDoctorLabel } from '@/lib/doctorLabel'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import MonthSelect from '@/components/MonthSelect/MonthSelect'
import '../PrescriptionEdit/PrescriptionEdit.css'
import './BudgetNew.css'
import './BudgetBulk.css'

const TXT = {
  ka: { addDoctor: '+ ექიმის დამატება', addEmployee: '+ თანამშრომლის დამატება', removeLine: 'ხაზის წაშლა', removeBlock: 'თანამშრომლის მოშორება', exists: 'ამ ექიმს ამ თვეში ბიუჯეტი უკვე აქვს', dup: 'ეს ექიმი ამ თანამშრომელზე ორჯერ არის არჩეული', saved: 'შენახულია', budgets: 'ბიუჯეტი', total: 'ჯამი', nothing: 'აირჩიე თანამშრომელი და ექიმი', partial: 'ზოგი ვერ შეინახა — წითლად მონიშნულს გადახედე', waiting: 'თანხები ჯერ ითვლება…', fixDup: 'ჯერ გაასწორე დუბლიკატი ექიმები' },
  en: { addDoctor: '+ Add doctor', addEmployee: '+ Add employee', removeLine: 'Remove line', removeBlock: 'Remove employee', exists: 'This doctor already has a budget this month', dup: 'This doctor is picked twice for this employee', saved: 'Saved', budgets: 'budgets', total: 'Total', nothing: 'Pick an employee and a doctor', partial: 'Some could not be saved — check the red lines', waiting: 'Amounts are still being calculated…', fixDup: 'Fix the duplicate doctors first' },
  ru: { addDoctor: '+ Добавить врача', addEmployee: '+ Добавить сотрудника', removeLine: 'Удалить строку', removeBlock: 'Убрать сотрудника', exists: 'У этого врача уже есть бюджет в этом месяце', dup: 'Этот врач выбран дважды для сотрудника', saved: 'Сохранено', budgets: 'бюджетов', total: 'Итого', nothing: 'Выберите сотрудника и врача', partial: 'Часть не сохранилась — проверьте красные строки', waiting: 'Суммы ещё считаются…', fixDup: 'Сначала исправьте повторяющихся врачей' },
}

const Lock = () => (
  <svg className="budgetnew-lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
)

const monthEnd = (ymd) => {
  const [y, m] = ymd.split('-').map(Number)
  return `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

export default function BudgetBulk() {
  const tu = useTranslations('ui')
  const tm = useTranslations('enteredRx')
  const { locale } = useParams()
  const L = TXT[locale] || TXT.en
  const router = useRouter()
  const uid = useRef(0)
  const nextKey = () => ++uid.current

  const newRow = () => ({ key: nextKey(), doctorId: '', paid: '', isActive: true, sig: '', computed: null, computing: false, err: '', saved: false })
  const newBlock = () => ({ key: nextKey(), employeeId: '', rows: [newRow()] })

  const [employees, setEmployees] = useState([])
  const [doctors, setDoctors] = useState([])
  const [date, setDate] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [blocks, setBlocks] = useState(() => [newBlock()])
  const [existing, setExisting] = useState({}) // `${emp}|${date}` -> Set(doctorId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch('/api/employees?lite=1'), apiFetch('/api/doctors?lite=1')])
      .then(([e, d]) => { setEmployees(e); setDoctors(d) })
      .catch((err) => setError(err.message))
  }, [])

  const patchRow = useCallback((bKey, rKey, patch, onlyIfSig) => {
    setBlocks((bs) => bs.map((b) => b.key !== bKey ? b : {
      ...b,
      rows: b.rows.map((r) => (r.key !== rKey || (onlyIfSig && r.sig !== onlyIfSig)) ? r : { ...r, ...patch }),
    }))
  }, [])

  // (re)compute amounts for every line whose employee / doctor / month changed
  useEffect(() => {
    blocks.forEach((b) => b.rows.forEach((r) => {
      if (!b.employeeId || !r.doctorId || r.saved) return
      const sig = `${b.employeeId}|${r.doctorId}|${date}`
      if (r.sig === sig) return
      patchRow(b.key, r.key, { sig, computing: true, computed: null, err: '' })
      const params = new URLSearchParams({ employee: b.employeeId, doctor: r.doctorId, date })
      apiFetch(`/api/budgets/compute-amounts?${params}`)
        .then((c) => patchRow(b.key, r.key, { computed: c, computing: false }, sig))
        .catch((e) => patchRow(b.key, r.key, { err: e.message, computing: false }, sig))
    }))
  }, [blocks, date, patchRow])

  // which doctors already have a budget this month (per chosen employee)
  const empKey = blocks.map((b) => b.employeeId).filter(Boolean).join(',')
  useEffect(() => {
    const ids = [...new Set(empKey.split(',').filter(Boolean))]
    ids.forEach((emp) => {
      const k = `${emp}|${date}`
      if (existing[k]) return
      const p = new URLSearchParams({ employee: emp, from: date, to: `${monthEnd(date)}T23:59:59` })
      apiFetch(`/api/budgets?${p}`)
        .then((list) => setExisting((x) => ({ ...x, [k]: new Set((list || []).map((b) => String(b.doctor?._id || b.doctor))) })))
        .catch(() => {})
    })
  }, [empKey, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const setBlockEmployee = (bKey, employeeId) =>
    setBlocks((bs) => bs.map((b) => b.key === bKey ? { ...b, employeeId: employeeId || '' } : b))
  const addRow = (bKey) => setBlocks((bs) => bs.map((b) => b.key === bKey ? { ...b, rows: [...b.rows, newRow()] } : b))
  const removeRow = (bKey, rKey) => setBlocks((bs) => bs.map((b) => {
    if (b.key !== bKey) return b
    const rows = b.rows.filter((r) => r.key !== rKey)
    return { ...b, rows: rows.length ? rows : [newRow()] }
  }))
  const addBlock = () => setBlocks((bs) => [...bs, newBlock()])
  const removeBlock = (bKey) => setBlocks((bs) => (bs.length > 1 ? bs.filter((b) => b.key !== bKey) : [newBlock()]))

  const isDup = (b, r) => !!r.doctorId && b.rows.some((x) => x.key !== r.key && x.doctorId === r.doctorId)
  const hasBudget = (b, r) => !!r.doctorId && !!existing[`${b.employeeId}|${date}`]?.has(String(r.doctorId))

  const pending = blocks.flatMap((b) => b.rows.filter((r) => b.employeeId && r.doctorId && !r.saved).map((r) => ({ b, r })))
  const totalPaid = pending.reduce((s, { r }) => s + (parseFloat(r.paid) || 0), 0)

  function goBack() {
    if (window.history.length > 1) router.back()
    else router.push(`/${locale}/dashboard/budgets-list`)
  }

  async function saveAll() {
    setError('')
    if (!pending.length) { setError(L.nothing); return }
    if (pending.some(({ b, r }) => isDup(b, r))) { setError(L.fixDup); return }
    if (pending.some(({ r }) => r.computing || !r.computed)) { setError(L.waiting); return }
    setSaving(true)
    let failed = 0
    for (const { b, r } of pending) {
      try {
        const c = r.computed
        await apiFetch('/api/budgets', {
          method: 'POST',
          body: JSON.stringify({
            employee: b.employeeId,
            doctor: r.doctorId,
            date,
            isActive: r.isActive,
            paidAmount: parseFloat(r.paid) || 0,
            advanceAmount: c.advanceAmount,
            salesAmount: c.salesAmount,
            targetAmount: c.targetAmount,
            prescriptionAmt: c.prescriptionAmt,
            payableAmt: c.payableAmt,
          }),
        })
        patchRow(b.key, r.key, { saved: true, err: '' })
      } catch (e) {
        failed++
        patchRow(b.key, r.key, { err: e.message })
      }
    }
    setSaving(false)
    if (failed) setError(L.partial)
    else goBack()
  }

  const fmt = (n) => (n == null ? 0 : n)

  return (
    <div className="prescedit-page">
      <div className="prescedit-card">
        <div className="prescedit-card-header">
          <h1>{tu('k175')}</h1>
          <div className="prescedit-header-actions">
            {pending.length > 0 && (
              <span className="bb-summary">{pending.length} {L.budgets} · {L.total} {Math.round(totalPaid * 100) / 100}</span>
            )}
            <button type="button" className="btn" onClick={saveAll} disabled={saving}>
              <span>{saving ? <span className="btn-spinner" aria-hidden="true" /> : `Save${pending.length ? ` (${pending.length})` : ''}`}</span>
            </button>
            <button type="button" className="btn-gray" onClick={goBack}>
              <span>{tu('k106')}</span>
            </button>
          </div>
        </div>

        {error && <p className="resource-error">{error}</p>}

        <div className="prescedit-fields bb-month">
          <div className="prescedit-field budgetnew-input-field">
            <label>{tm('month')}</label>
            <MonthSelect value={date.slice(0, 7)} onChange={(v) => v && setDate(`${v}-01`)} />
          </div>
        </div>

        {blocks.map((b, bi) => (
          <section key={b.key} className="bb-block">
            <div className="bb-block-head">
              <span className="bb-block-no">{bi + 1}</span>
              <div className="prescedit-field budgetnew-input-field bb-emp">
                <label>{tu('k108')}</label>
                <SearchableSelect
                  options={employees}
                  value={b.employeeId}
                  onChange={(v) => setBlockEmployee(b.key, v)}
                  getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
                  placeholder={tu('k109')}
                />
              </div>
              <button type="button" className="bb-x" title={L.removeBlock} aria-label={L.removeBlock} onClick={() => removeBlock(b.key)}>✕</button>
            </div>

            {b.rows.map((r) => {
              const dup = isDup(b, r)
              const has = hasBudget(b, r)
              const c = r.computed || {}
              return (
                <div key={r.key} className={`bb-row ${r.saved ? 'is-saved' : ''} ${r.err || dup ? 'is-bad' : ''}`}>
                  <div className="prescedit-field budgetnew-input-field bb-doc">
                    <label>{tu('k110')}</label>
                    <SearchableSelect
                      options={doctors}
                      value={r.doctorId}
                      onChange={(v) => patchRow(b.key, r.key, { doctorId: v || '' })}
                      getLabel={formatDoctorLabel}
                      placeholder={tu('k109')}
                    />
                  </div>
                  <div className="prescedit-field budgetnew-input-field bb-paid">
                    <label>{tu('k177')}</label>
                    <div className="budgetnew-amount-input">
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        className="field-input budgetnew-paid-input"
                        value={r.paid}
                        disabled={r.saved}
                        onChange={(e) => patchRow(b.key, r.key, { paid: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter' && b.rows[b.rows.length - 1].key === r.key) addRow(b.key) }}
                      />
                    </div>
                  </div>
                  <div className="bb-stats">
                    {[['k178', c.advanceAmount], ['k179', c.salesAmount], ['k180', c.targetAmount], ['k181', c.prescriptionAmt], ['k182', c.payableAmt]].map(([k, v]) => (
                      <div key={k} className="bb-stat">
                        <span className="bb-stat-label">{tu(k)}</span>
                        <span className="bb-stat-val">{r.computing ? <span className="btn-spinner" aria-hidden="true" /> : fmt(v)}<Lock /></span>
                      </div>
                    ))}
                  </div>
                  <div className="bb-row-end">
                    <label className="prescedit-status-toggle bb-status" title={tu('k111')}>
                      <input type="checkbox" checked={r.isActive} disabled={r.saved} onChange={(e) => patchRow(b.key, r.key, { isActive: e.target.checked })} />
                      <span className={`prescedit-toggle-track ${r.isActive ? 'on' : ''}`}><span className="prescedit-toggle-thumb" /></span>
                      <span className="bb-status-label">{tu('k111')}</span>
                    </label>
                    {r.saved
                      ? <span className="bb-ok">✓ {L.saved}</span>
                      : <button type="button" className="bb-x" title={L.removeLine} aria-label={L.removeLine} onClick={() => removeRow(b.key, r.key)}>✕</button>}
                  </div>
                  {(dup || has || r.err) && (
                    <p className="bb-note">{r.err || (dup ? L.dup : L.exists)}</p>
                  )}
                </div>
              )
            })}

            <button type="button" className="bb-add" onClick={() => addRow(b.key)}>{L.addDoctor}</button>
          </section>
        ))}

        <button type="button" className="bb-add bb-add-emp" onClick={addBlock}>{L.addEmployee}</button>
      </div>
    </div>
  )
}
