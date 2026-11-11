'use client'

// Month filter: one field, a panel with the year and a 3×4 grid of months.
// value = "YYYY-MM" or "" (all months). onChange gets the same.
import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import './MonthPicker.css'

const MONTHS = {
  ka: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
}
const SHORT = {
  ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
}
const TEXT = {
  ka: { all: 'ყველა თვე', now: 'მიმდინარე თვე', prev: 'წინა წელი', next: 'შემდეგი წელი' },
  en: { all: 'All months', now: 'This month', prev: 'Previous year', next: 'Next year' },
  ru: { all: 'Все месяцы', now: 'Текущий месяц', prev: 'Предыдущий год', next: 'Следующий год' },
}
const parse = (v) => (/^\d{4}-\d{2}$/.test(v || '') ? { y: +v.slice(0, 4), m: +v.slice(5, 7) - 1 } : null)
const key = ({ y, m }) => `${y}-${String(m + 1).padStart(2, '0')}`

export default function MonthPicker({ value, onChange }) {
  const locale = useLocale()
  const tx = TEXT[locale] || TEXT.ka
  const sel = parse(value)
  const d = new Date()
  const now = { y: d.getFullYear(), m: d.getMonth() }
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState((sel || now).y)
  const ref = useRef(null)

  useEffect(() => { if (open) setYear((parse(value) || now).y) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const out = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc) }
  }, [open])

  const pick = (v) => { onChange(v); setOpen(false) }
  const label = sel ? `${(MONTHS[locale] || MONTHS.ka)[sel.m]} ${sel.y}` : tx.all

  return (
    <div className="mpk" ref={ref}>
      <button type="button" className={`mpk-btn ${open ? 'is-open' : ''} ${sel ? '' : 'is-empty'}`} onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open}>
        <svg className="mpk-ico" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
        <span className="mpk-text">{label}</span>
        <svg className="mpk-caret" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="mpk-panel" role="dialog">
          <div className="mpk-year">
            <button type="button" onClick={() => setYear((y) => y - 1)} aria-label={tx.prev}>‹</button>
            <strong>{year}</strong>
            <button type="button" onClick={() => setYear((y) => y + 1)} aria-label={tx.next}>›</button>
          </div>
          <div className="mpk-grid">
            {(SHORT[locale] || SHORT.ka).map((n, i) => {
              const isSel = sel && sel.y === year && sel.m === i
              const isNow = now.y === year && now.m === i
              return (
                <button key={i} type="button" className={`mpk-month ${isSel ? 'is-selected' : ''} ${isNow ? 'is-current' : ''}`} onClick={() => pick(key({ y: year, m: i }))}>
                  {n}
                </button>
              )
            })}
          </div>
          <div className="mpk-actions">
            <button type="button" onClick={() => pick(key(now))}>{tx.now}</button>
            <button type="button" onClick={() => pick('')}>{tx.all}</button>
          </div>
        </div>
      )}
    </div>
  )
}
