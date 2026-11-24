// One date format for the whole site: day/month/year (24/11/2026).
// Accepts a Date, an ISO string or "YYYY-MM-DD" (taken as that calendar day, no timezone shift).
export function fmtDate(v) {
  if (!v) return ''
  let d
  const m = typeof v === 'string' && v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) d = new Date(+m[1], +m[2] - 1, +m[3])
  else d = v instanceof Date ? v : new Date(v)
  if (isNaN(d)) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
