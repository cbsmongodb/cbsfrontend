// Georgia's sales zones: where each one sits on the map, and the names it may have in the Excel.
export const ZONES = [
  { key: 'tbilisi', ka: 'თბილისი', en: 'Tbilisi', lat: 41.7151, lng: 44.8271, aliases: ['tbilisi', 'თბილისი', 'tb'] },
  { key: 'kakheti', ka: 'კახეთი', en: 'Kakheti', lat: 41.78, lng: 45.75, aliases: ['kakheti', 'კახეთი', 'telavi', 'თელავი'] },
  { key: 'imereti', ka: 'იმერეთი', en: 'Imereti', lat: 42.2, lng: 42.9, aliases: ['imereti', 'იმერეთი', 'kutaisi', 'ქუთაისი'] },
  { key: 'samegrelo', ka: 'სამეგრელო', en: 'Samegrelo', lat: 42.5, lng: 41.95, aliases: ['samegrelo', 'სამეგრელო', 'samegrelo-zemo svaneti', 'სამეგრელო-ზემო სვანეთი', 'zugdidi', 'ზუგდიდი', 'senaki', 'სენაკი', 'poti', 'ფოთი'] },
  { key: 'adjara', ka: 'აჭარა', en: 'Adjara', lat: 41.62, lng: 41.75, aliases: ['adjara', 'ajara', 'აჭარა', 'batumi', 'ბათუმი'] },
  { key: 'guria', ka: 'გურია', en: 'Guria', lat: 41.93, lng: 42.1, aliases: ['guria', 'გურია', 'ozurgeti', 'ოზურგეთი'] },
  { key: 'shida', ka: 'შიდა ქართლი', en: 'Shida Kartli', lat: 42.08, lng: 43.85, aliases: ['shida kartli', 'შიდა ქართლი', 'gori', 'გორი'] },
  { key: 'kvemo', ka: 'ქვემო ქართლი', en: 'Kvemo Kartli', lat: 41.33, lng: 44.15, aliases: ['kvemo kartli', 'ქვემო ქართლი', 'rustavi', 'რუსთავი', 'marneuli', 'მარნეული'] },
  { key: 'mtskheta', ka: 'მცხეთა-მთიანეთი', en: 'Mtskheta-Mtianeti', lat: 42.5, lng: 44.75, aliases: ['mtskheta-mtianeti', 'mtskheta', 'მცხეთა-მთიანეთი', 'მცხეთა', 'dusheti', 'დუშეთი'] },
  { key: 'samtskhe', ka: 'სამცხე-ჯავახეთი', en: 'Samtskhe-Javakheti', lat: 41.5, lng: 43.35, aliases: ['samtskhe-javakheti', 'სამცხე-ჯავახეთი', 'akhaltsikhe', 'ახალციხე', 'borjomi', 'ბორჯომი'] },
  { key: 'racha', ka: 'რაჭა-ლეჩხუმი', en: 'Racha-Lechkhumi', lat: 42.62, lng: 43.15, aliases: ['racha', 'racha-lechkhumi', 'რაჭა', 'რაჭა-ლეჩხუმი', 'ambrolauri', 'ამბროლაური'] },
  { key: 'svaneti', ka: 'სვანეთი', en: 'Svaneti', lat: 43.0, lng: 42.6, aliases: ['svaneti', 'სვანეთი', 'mestia', 'მესტია'] },
]

const norm = (s) => String(s || '').toLowerCase().replace(/[\s_]+/g, ' ').trim()

// "Tbilisi 1", "თბილისი", "ქ. თბილისი" -> the Tbilisi zone (null if unknown)
export function matchZone(name) {
  const n = norm(name)
  if (!n) return null
  return (
    ZONES.find((z) => z.aliases.some((a) => n === a)) ||
    ZONES.find((z) => z.aliases.some((a) => n.includes(a))) ||
    null
  )
}
