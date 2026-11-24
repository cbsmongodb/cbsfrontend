'use client'

// ლამაზი თვის ამრჩევი (მნიშვნელობა "YYYY-MM"): ღილაკი + ამომხტარი ბადე წლის ისრებით.
// ყველა ბრაუზერზე ერთნაირად მუშაობს (<input type="month"> Safari/Firefox-ზე არ მუშაობს).
import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import './MonthSelect.css'

const NAMES = {
  ka: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
  en: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
}
const THIS_MONTH = { ka: 'მიმდინარე თვე', en: 'This month', ru: 'Текущий месяц' }
const idx = (y, m) => y * 12 + m // m: 0..11
const key = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`

export default function MonthSelect({ value, onChange, className = 'field-input', back = 36, ahead = 2 }) {
  const locale = useLocale()
  const names = NAMES[locale] || NAMES.ka
  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth()
  const minIdx = idx(cy, cm) - back
  const maxIdx = idx(cy, cm) + ahead
  const minYear = Math.floor(minIdx / 12)
  const maxYear = Math.floor(maxIdx / 12)

  const [vy, vm] = value && /^\d{4}-\d{2}$/.test(value) ? value.split('-').map(Number) : [cy, cm + 1]
  const selIdx = idx(vy, vm - 1)

  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(vy)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280, up: false })
  const btnRef = useRef(null)
  const popRef = useRef(null)

  function toggle() {
    if (open) return setOpen(false)
    const r = btnRef.current.getBoundingClientRect()
    const width = Math.min(window.innerWidth - 16, Math.max(300, Math.min(r.width, 340)))
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
    const up = window.innerHeight - r.bottom < 330 && r.top > 330
    setPos({ top: up ? r.top - 8 : r.bottom + 8, left, width, up })
    setYear(vy)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const down = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    const close = () => setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function pick(m) {
    onChange(key(year, m))
    setOpen(false)
  }

  return (
    <div className="ms-wrap">
      <button
        type="button"
        ref={btnRef}
        className={`${className} ms-btn${open ? ' is-open' : ''}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{value ? `${names[vm - 1]} ${vy}` : '—'}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={popRef}
          className="ms-pop"
          role="dialog"
          style={{ left: pos.left, width: pos.width, top: pos.up ? 'auto' : pos.top, bottom: pos.up ? window.innerHeight - pos.top : 'auto' }}
        >
          <div className="ms-year">
            <button type="button" className="ms-nav" disabled={year <= minYear} onClick={() => setYear(year - 1)} aria-label="‹">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <strong>{year}</strong>
            <button type="button" className="ms-nav" disabled={year >= maxYear} onClick={() => setYear(year + 1)} aria-label="›">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="ms-grid">
            {names.map((n, m) => {
              const i = idx(year, m)
              const disabled = (i < minIdx || i > maxIdx) && i !== selIdx
              const cls = `ms-cell${i === selIdx ? ' is-sel' : ''}${i === idx(cy, cm) ? ' is-now' : ''}`
              return (
                <button key={m} type="button" className={cls} disabled={disabled} onClick={() => pick(m)}>
                  {n}
                </button>
              )
            })}
          </div>
          <button type="button" className="ms-today" onClick={() => { onChange(key(cy, cm)); setOpen(false) }}>
            {THIS_MONTH[locale] || THIS_MONTH.ka}
          </button>
        </div>
      )}
    </div>
  )
}
