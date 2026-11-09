// One label for every doctor dropdown, so doctors with the same name can be told apart:
// "Nino Ciskarishvili · რევმატოლოგია · #01011042416"  (you can also type the number to search)
export function formatDoctorLabel(d) {
  if (!d) return ''
  const name = d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || '—'
  const profile = d.profile && typeof d.profile === 'object' ? d.profile.name : ''
  return [name, profile, d.uniqueNumber ? `#${d.uniqueNumber}` : ''].filter(Boolean).join(' · ')
}
