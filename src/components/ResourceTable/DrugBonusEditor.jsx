"use client"
import { useState } from "react"
import { useTranslations } from 'next-intl'
import { useMonthNames } from '@/lib/months'

const MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
]

const CURRENT_YEAR = new Date().getUTCFullYear()

function toPeriod(month) {
  return new Date(Date.UTC(CURRENT_YEAR, month, 1)).toISOString()
}

function labelFromPeriod(iso, months = MONTHS) {
  const d = new Date(iso)
  return months[d.getUTCMonth()]
}

// value: array of { period (iso), value (number) }
export default function DrugBonusEditor({ value = [], onChange, label }) {
  const tu = useTranslations('ui')
  // month names in the chosen language (the Georgian list above is only a fallback)
  const MONTHS = useMonthNames()
  const [month, setMonth] = useState(new Date().getUTCMonth())
  const [bonus, setBonus] = useState("")

  function addBonus() {
    const val = parseFloat(bonus)
    if (isNaN(val)) return
    const period = toPeriod(month)
    const without = value.filter((b) => new Date(b.period).getTime() !== new Date(period).getTime())
    const next = [...without, { period, value: val }].sort(
      (a, b) => new Date(a.period) - new Date(b.period)
    )
    onChange(next)
    setBonus("")
  }

  function removeBonus(period) {
    onChange(value.filter((b) => new Date(b.period).getTime() !== new Date(period).getTime()))
  }

  return (
    <div className="drug-bonus-editor">
      <span className="drug-bonus-editor-label">{label || tu('k021')}</span>

      <div className="drug-bonus-editor-row">
        <select className="field-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <input
          className="field-input"
          type="number"
          step="any"
          placeholder={tu('k022')}
          value={bonus}
          onChange={(e) => setBonus(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBonus() } }}
        />
        <button type="button" className="drug-bonus-editor-add" onClick={addBonus}>
          {tu('k023')}
        </button>
      </div>

      {value.length > 0 ? (
        <div className="drug-bonus-editor-list">
          {value.map((b) => (
            <div key={b.period} className="drug-bonus-editor-chip">
              <span className="drug-bonus-editor-chip-period">{labelFromPeriod(b.period, MONTHS)}</span>
              <span className="drug-bonus-editor-chip-value">{b.value}</span>
              <button type="button" className="drug-bonus-editor-chip-remove" onClick={() => removeBonus(b.period)}>
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <span className="drug-bonus-editor-empty">{tu('k024')}</span>
      )}
    </div>
  )
}
