// "Leave for payroll" → a clean, payroll-ready .xlsx (ExcelJS, loaded only on click)
//   Sheet 1: per division, one row per person — days + exact dates (unpaid in red)
//   Sheet 2: calendar — every day of the month, coloured by leave type

const C = {
  brand: 'FF0C3557', head: 'FF13608F', line: 'FFD5DCE6', zebra: 'FFF6F9FC', text: 'FF1E293B', muted: 'FF64748B',
  divBand: 'FFE8EEF7', weekend: 'FFEEF1F5', white: 'FFFFFFFF',
  unpaid: 'FFDC2626', unpaidBg: 'FFFDE2E2',
  sick: 'FFB45309', sickBg: 'FFFEF3C7',
  paid: 'FF15803D', paidBg: 'FFDCFCE7',
  pending: 'FF6D28D9', pendingBg: 'FFEDE9FE',
}
const CODES = {
  ka: { unpaid: 'უ', sick: 'ბ', paid: 'ა', pending: '?' },
  en: { unpaid: 'U', sick: 'S', paid: 'P', pending: '?' },
  ru: { unpaid: 'Н', sick: 'Б', paid: 'О', pending: '?' },
}
const TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }
const WD = { ka: ['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'], en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] }

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const font = (o = {}) => ({ name: 'Calibri', size: 11, color: { argb: C.text }, ...o })
const thin = (argb = C.line) => ({ style: 'thin', color: { argb } })
const box = (argb) => ({ top: thin(argb), bottom: thin(argb), left: thin(argb), right: thin(argb) })

// ["2026-10-05","2026-10-06","2026-10-12"] → "5, 6, 12"  (days of the chosen month)
export function listDays(keys) {
  return [...new Set(keys.map((k) => Number(k.slice(8, 10))))].sort((a, b) => a - b).join(', ')
}

/**
 * divisions: [{ name, rows: [{ employeeName, isActive, paid, unpaid, sick, paidDates, unpaidDates, sickDates, pending:[{date,type}] }] }]
 * month: "YYYY-MM";  L: translated labels (see LeavePayrollReport.jsx)
 */
export async function exportLeavePayrollXlsx({ divisions, month, locale = 'ka', L, fileName }) {
  const mod = await import('exceljs')
  const ExcelJS = mod.default || mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Global CBS'
  wb.created = new Date()

  const [y, m] = month.split('-').map(Number)
  const tag = TAG[locale] || TAG.ka
  const monthLong = (() => { const s = new Date(y, m - 1, 1).toLocaleDateString(tag, { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1) })()
  const code = CODES[locale] || CODES.ka
  const wdNames = WD[locale] || WD.ka
  const stamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const divName = (d) => d.name || L.noDivision
  const grand = divisions.reduce((s, d) => {
    d.rows.forEach((r) => { s.paid += r.paid; s.unpaid += r.unpaid; s.sick += r.sick; s.people += 1 })
    return s
  }, { paid: 0, unpaid: 0, sick: 0, people: 0 })

  // ───────────────────────── Sheet 1: summary with dates ─────────────────────────
  const ws = wb.addWorksheet(L.sheetSummary.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  })
  // #, name, unpaid, unpaid dates, sick, sick dates, paid, paid dates, total, pending
  const COLS = [
    { key: 'n', h: '#', w: 5 },
    { key: 'name', h: L.employee, w: 30 },
    { key: 'unpaid', h: L.unpaidDays, w: 15, tone: 'unpaid' },
    { key: 'unpaidDates', h: L.unpaidDates, w: 34, tone: 'unpaid' },
    { key: 'sickDates', h: L.sickDates, w: 30, tone: 'sick' },
    { key: 'paidDates', h: L.paidDates, w: 30, tone: 'paid' },
    { key: 'pending', h: L.pendingShort, w: 22, tone: 'pending' },
  ]
  const N = COLS.length
  COLS.forEach((c, i) => { ws.getColumn(i + 1).width = c.w })

  // title + subtitle
  ws.mergeCells(1, 1, 1, N)
  ws.getCell(1, 1).value = `${L.title} — ${monthLong}`
  ws.getCell(1, 1).font = font({ size: 17, bold: true, color: { argb: C.white } })
  ws.getCell(1, 1).fill = fill(C.brand)
  ws.getCell(1, 1).alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(1).height = 36
  ws.mergeCells(2, 1, 2, N)
  ws.getCell(2, 1).value = `Global CBS · ${L.exportedAt} ${stamp} · ${L.approvedOnly}`
  ws.getCell(2, 1).font = font({ size: 10, italic: true, color: { argb: C.muted } })
  ws.getCell(2, 1).alignment = { vertical: 'middle', indent: 1 }
  ws.getRow(2).height = 20

  // KPI cards (row 4): unpaid | sick | paid | people
  const kpis = [
    [3, 4, grand.unpaid, L.unpaidDays, C.unpaid, C.unpaidBg],
    [6, 7, grand.people, L.people, C.brand, C.divBand],
  ]
  ws.getRow(4).height = 30
  kpis.forEach(([a, b, val, label, col, bg]) => {
    ws.mergeCells(4, a, 4, b)
    const cell = ws.getCell(4, a)
    cell.value = { richText: [{ text: `${val}  `, font: font({ size: 16, bold: true, color: { argb: col } }) }, { text: label, font: font({ size: 10, color: { argb: col } }) }] }
    cell.fill = fill(bg)
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = box(col)
  })
  ws.mergeCells(4, 1, 4, 2)
  ws.getCell(4, 1).value = monthLong
  ws.getCell(4, 1).font = font({ size: 13, bold: true, color: { argb: C.brand } })
  ws.getCell(4, 1).alignment = { vertical: 'middle', indent: 1 }

  // header row (row 6) — repeated on every printed page
  const header = ws.getRow(6)
  COLS.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c.h
    cell.font = font({ size: 10.5, bold: true, color: { argb: C.white } })
    cell.fill = fill(c.tone ? C[c.tone] : C.head)
    cell.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center', wrapText: true, indent: i === 1 ? 1 : 0 }
    cell.border = box(C.white)
  })
  header.height = 34
  ws.pageSetup.printTitlesRow = '6:6'

  let r = 7
  divisions.forEach((d) => {
    const t = d.rows.reduce((s, x) => ({ paid: s.paid + x.paid, unpaid: s.unpaid + x.unpaid, sick: s.sick + x.sick }), { paid: 0, unpaid: 0, sick: 0 })
    // division band
    r += 1
    ws.mergeCells(r, 1, r, N)
    const band = ws.getCell(r, 1)
    const bits = [`${d.rows.length} ${L.peopleShort}`]
    if (t.unpaid) bits.push(`${L.unpaid}: ${t.unpaid}`)
    band.value = { richText: [
      { text: `${divName(d)}   `, font: font({ size: 13, bold: true, color: { argb: C.white } }) },
      { text: bits.join('  ·  '), font: font({ size: 10, color: { argb: 'FFD6E4F0' } }) },
    ] }
    band.fill = fill(C.head)
    band.alignment = { vertical: 'middle', indent: 1 }
    ws.getRow(r).height = 26
    r += 1

    d.rows.forEach((x, i) => {
      const row = ws.getRow(r)
      const pendingTxt = x.pending.length ? listDays(x.pending.map((p) => p.date)) : ''
      const vals = {
        n: i + 1,
        name: x.isActive ? x.employeeName : `${x.employeeName} (${L.inactive})`,
        unpaid: x.unpaid || '', unpaidDates: listDays(x.unpaidDates),
        sickDates: listDays(x.sickDates),
        paidDates: listDays(x.paidDates),
        pending: pendingTxt,
      }
      COLS.forEach((c, ci) => {
        const cell = row.getCell(ci + 1)
        cell.value = vals[c.key]
        const filled = vals[c.key] !== '' && vals[c.key] !== 0
        const isNum = ['n', 'unpaid'].includes(c.key)
        cell.alignment = { vertical: 'middle', horizontal: c.key === 'name' || c.key.endsWith('Dates') || c.key === 'pending' ? 'left' : 'center', wrapText: true, indent: c.key === 'name' ? 1 : 0 }
        cell.font = font({ size: 10.5, color: { argb: c.tone && filled ? C[c.tone] : (c.key === 'n' ? C.muted : C.text) }, bold: (isNum && filled && c.key !== 'n') || c.key === 'name' })
        cell.border = { bottom: thin(), left: { style: 'hair', color: { argb: C.line } }, right: { style: 'hair', color: { argb: C.line } } }
        if (c.tone && filled) cell.fill = fill(C[`${c.tone}Bg`])
        else if (i % 2 === 1) cell.fill = fill(C.zebra)
      })
      // whole row stands out when there is unpaid leave
      if (x.unpaid) {
        row.getCell(1).border = { ...row.getCell(1).border, left: { style: 'thick', color: { argb: C.unpaid } } }
      }
      row.height = 22
      r += 1
    })

    // division subtotal
    const sub = ws.getRow(r)
    sub.getCell(2).value = `${L.total} — ${divName(d)}`
    const subVals = { 3: t.unpaid }
    for (let ci = 1; ci <= N; ci++) {
      const cell = sub.getCell(ci)
      if (subVals[ci] !== undefined) cell.value = subVals[ci] || ''
      cell.font = font({ size: 10.5, bold: true, color: { argb: ci === 3 ? C.unpaid : C.brand } })
      cell.fill = fill(C.divBand)
      cell.alignment = { vertical: 'middle', horizontal: ci === 2 ? 'left' : 'center', indent: ci === 2 ? 1 : 0 }
      cell.border = { top: thin(C.head), bottom: thin(C.head) }
    }
    sub.height = 22
    r += 1
  })

  // grand total
  r += 1
  const g = ws.getRow(r)
  g.getCell(2).value = `${L.grandTotal} (${grand.people} ${L.peopleShort})`
  const gVals = { 3: grand.unpaid }
  for (let ci = 1; ci <= N; ci++) {
    const cell = g.getCell(ci)
    if (gVals[ci] !== undefined) cell.value = gVals[ci]
    cell.font = font({ size: 12, bold: true, color: { argb: C.white } })
    cell.fill = fill(C.brand)
    cell.alignment = { vertical: 'middle', horizontal: ci === 2 ? 'left' : 'center', indent: ci === 2 ? 1 : 0 }
  }
  g.height = 28

  // ───────────────────────── Sheet 2: calendar ─────────────────────────
  const days = new Date(y, m, 0).getDate()
  const cal = wb.addWorksheet(L.sheetCalendar.slice(0, 31), {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 5, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  })
  const CN = 1 + days + 1
  cal.getColumn(1).width = 30
  for (let i = 2; i <= days + 1; i++) cal.getColumn(i).width = 4.2
  cal.getColumn(days + 2).width = 9

  cal.mergeCells(1, 1, 1, CN)
  cal.getCell(1, 1).value = `${L.title} — ${monthLong} · ${L.sheetCalendar}`
  cal.getCell(1, 1).font = font({ size: 16, bold: true, color: { argb: C.white } })
  cal.getCell(1, 1).fill = fill(C.brand)
  cal.getCell(1, 1).alignment = { vertical: 'middle', indent: 1 }
  cal.getRow(1).height = 34

  // legend (row 2)
  const legend = [['unpaid', L.unpaid], ['sick', L.sick], ['paid', L.paid], ['pending', L.pendingShort]]
  cal.mergeCells(2, 1, 2, CN)
  cal.getCell(2, 1).value = { richText: legend.flatMap(([k, label]) => [
    { text: ` ${code[k]} `, font: font({ size: 10, bold: true, color: { argb: C.white } }) },
    { text: ` = ${label}      `, font: font({ size: 10, color: { argb: C[k] } }) },
  ]).concat([{ text: `${L.weekend}: ▒`, font: font({ size: 10, color: { argb: C.muted } }) }]) }
  cal.getCell(2, 1).alignment = { vertical: 'middle', indent: 1 }
  cal.getRow(2).height = 22

  // day header (rows 4-5)
  const weekend = []
  const h1 = cal.getRow(4), h2 = cal.getRow(5)
  h1.getCell(1).value = L.employee
  cal.mergeCells(4, 1, 5, 1)
  for (let dd = 1; dd <= days; dd++) {
    const wd = new Date(y, m - 1, dd).getDay()
    weekend[dd] = wd === 0 || wd === 6
    const a = h1.getCell(dd + 1), b = h2.getCell(dd + 1)
    a.value = dd
    b.value = wdNames[wd]
    ;[a, b].forEach((cell, k) => {
      cell.font = font({ size: k ? 8 : 10, bold: !k, color: { argb: weekend[dd] ? C.muted : C.white } })
      cell.fill = fill(weekend[dd] ? 'FFCBD5E1' : C.head)
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = box(C.white)
    })
  }
  ;[['unpaid', code.unpaid]].forEach(([k, lab], j) => {
    cal.mergeCells(4, days + 2 + j, 5, days + 2 + j)
    const cell = h1.getCell(days + 2 + j)
    cell.value = lab
    cell.font = font({ size: 11, bold: true, color: { argb: C.white } })
    cell.fill = fill(C[k])
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = box(C.white)
  })
  const hc = h1.getCell(1)
  hc.font = font({ size: 10.5, bold: true, color: { argb: C.white } })
  hc.fill = fill(C.head)
  hc.alignment = { vertical: 'middle', indent: 1 }
  h1.height = 20; h2.height = 16

  let cr = 6
  divisions.forEach((d) => {
    cal.mergeCells(cr, 1, cr, CN)
    const band = cal.getCell(cr, 1)
    band.value = `${divName(d)}  ·  ${d.rows.length} ${L.peopleShort}`
    band.font = font({ size: 12, bold: true, color: { argb: C.brand } })
    band.fill = fill(C.divBand)
    band.alignment = { vertical: 'middle', indent: 1 }
    cal.getRow(cr).height = 22
    cr += 1
    d.rows.forEach((x) => {
      const map = new Map()
      x.paidDates.forEach((k) => map.set(k, 'paid'))
      x.sickDates.forEach((k) => map.set(k, 'sick'))
      x.unpaidDates.forEach((k) => map.set(k, 'unpaid'))
      x.pending.forEach((p) => { if (!map.has(p.date)) map.set(p.date, 'pending') })
      const row = cal.getRow(cr)
      const nc = row.getCell(1)
      nc.value = x.isActive ? x.employeeName : `${x.employeeName} (${L.inactive})`
      nc.font = font({ size: 10.5, bold: true, color: { argb: x.unpaid ? C.unpaid : C.text } })
      nc.alignment = { vertical: 'middle', indent: 1 }
      nc.border = { bottom: thin(), right: thin(C.head) }
      for (let dd = 1; dd <= days; dd++) {
        const key = `${month}-${String(dd).padStart(2, '0')}`
        const type = map.get(key)
        const cell = row.getCell(dd + 1)
        cell.border = box(C.line)
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        if (type) {
          cell.value = code[type]
          cell.fill = fill(C[type])
          cell.font = font({ size: 10, bold: true, color: { argb: C.white } })
        } else if (weekend[dd]) {
          cell.fill = fill(C.weekend)
        }
      }
      ;[['unpaid', x.unpaid]].forEach(([k, v], j) => {
        const cell = row.getCell(days + 2 + j)
        cell.value = v || ''
        cell.font = font({ size: 10.5, bold: true, color: { argb: C[k] } })
        if (v) cell.fill = fill(C[`${k}Bg`])
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = box(C.line)
      })
      row.height = 20
      cr += 1
    })
  })

  const buf = await wb.xlsx.writeBuffer()
  if (typeof document === 'undefined') return buf // (used by tests)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = `${fileName || L.title} ${month}.xlsx`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return buf
}
