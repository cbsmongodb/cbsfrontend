'use client'

// Drop-in replacement for <input type="date">: same value ("YYYY-MM-DD") and the
// same onChange(e) — but the date is always shown as dd/mm/yyyy, whatever the
// browser / computer language is. Clicking anywhere opens the calendar.
import { fmtDate } from '@/lib/date'
import './DateInput.css'

export default function DateInput({ className = '', style, placeholder = 'დდ/თთ/წწწწ', ...props }) {
  const shown = fmtDate(props.value)
  return (
    <span className={`date-input${props.disabled ? ' is-disabled' : ''}`} style={style}>
      <input
        type="date"
        {...props}
        className={`${className} date-input-native`}
        onClick={(e) => { try { e.currentTarget.showPicker?.() } catch {} ; props.onClick?.(e) }}
      />
      <span className={`date-input-text${shown ? '' : ' is-empty'}`} aria-hidden="true">{shown || placeholder}</span>
    </span>
  )
}
