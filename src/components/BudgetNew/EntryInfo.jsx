'use client'

// Small chips under the doctor: is a plan / prescription entered for this doctor
// this month, and how much. Only information — not an input field.
import { useLocale } from 'next-intl'
import './EntryInfo.css'

const T = {
  ka: { plan: 'გეგმა', rx: 'რეცეპტი', boxes: 'კოლ.', none: 'არ არის შეყვანილი', other: 'სხვა თანამშრომლის შეყვანილით', legacy: 'ძველი სისტემიდან' },
  en: { plan: 'Plan', rx: 'Prescription', boxes: 'boxes', none: 'not entered', other: 'entered by another rep', legacy: 'from the old system' },
  ru: { plan: 'План', rx: 'Рецепт', boxes: 'уп.', none: 'не введено', other: 'введено другим сотрудником', legacy: 'из старой системы' },
}
const n = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function EntryInfo({ computed, computing }) {
  const L = T[useLocale()] || T.en
  if (computing || !computed || !computed.entry) return null
  const e = computed.entry
  const chip = (label, boxes, amount) => {
    const ok = boxes > 0
    return (
      <span className={`entry-chip ${ok ? 'ok' : 'no'}`}>
        <i aria-hidden="true">{ok ? '✓' : '✕'}</i>
        {label}:{' '}
        {ok ? <><b>{n(boxes)}</b> {L.boxes} · <b>{n(amount)} ₾</b></> : L.none}
      </span>
    )
  }
  return (
    <div className="entry-info">
      {chip(L.plan, e.planBoxes, computed.targetAmount)}
      {chip(L.rx, e.rxBoxes, computed.prescriptionAmt)}
      {e.lines > 0 && !e.own && <span className="entry-chip warn">ⓘ {L.other}</span>}
      {e.legacy && e.lines > 0 && <span className="entry-chip warn">ⓘ {L.legacy}</span>}
    </div>
  )
}
