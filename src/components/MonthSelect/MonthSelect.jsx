'use client'

// A plain dropdown of months (value "YYYY-MM") - works the same on every
// phone, unlike <input type="month"> which some Androids don't support
import { useLocale } from 'next-intl'

const NAMES = {
  ka: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
  en: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
}
const key = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`

export default function MonthSelect({ value, onChange, className = 'field-input', back = 36, ahead = 2 }) {
  const locale = useLocale()
  const names = NAMES[locale] || NAMES.ka
  const now = new Date()
  const opts = []
  for (let i = ahead; i >= -back; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    opts.push(key(d.getFullYear(), d.getMonth()))
  }
  if (value && !opts.includes(value)) opts.unshift(value)
  const label = (v) => {
    const [y, m] = v.split('-').map(Number)
    return `${names[m - 1]} ${y}`
  }
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {opts.map((v) => (
        <option key={v} value={v}>{label(v)}</option>
      ))}
    </select>
  )
}
