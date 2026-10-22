// Beautiful .xlsx exports (ExcelJS, loaded only when someone presses the button)
const BRAND = 'FF0C3557', HEAD = 'FF13608F', ZEBRA = 'FFF3F7FC', LINE = 'FFD5DCE6', TOTAL = 'FFE8EEF7'

// "1,234.50 ₾" -> {value: 1234.5, kind: 'money'};  "45%" -> {value: 0.45, kind: 'pct'};  "21/10/2026" -> Date
export function parseCell(text) {
  const raw = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!raw || raw === '—' || raw === '-') return { value: raw === '—' ? '' : raw, kind: 'text' }
  const d = raw.match(/^(\d{2})[./](\d{2})[./](\d{4})$/)
  if (d) return { value: new Date(Date.UTC(+d[3], +d[2] - 1, +d[1])), kind: 'date' }
  const money = /₾|GEL/i.test(raw), pct = /%$/.test(raw)
  const n = raw.replace(/[₾%~]|GEL/gi, '').replace(/,/g, '').replace(/\s/g, '')
  if (/^-?\d+(\.\d+)?$/.test(n)) {
    const v = Number(n)
    return pct ? { value: v / 100, kind: 'pct' } : { value: v, kind: money ? 'money' : 'number' }
  }
  return { value: raw, kind: 'text' }
}

// headers: ['Date', ...]; rows: [[cell, ...]] (strings, numbers or {value, kind})
export async function exportXlsx({ title, subtitle, fileName, headers, rows, totalLabel = 'Total' }) {
  const mod = await import('exceljs')
  const ExcelJS = mod.default || mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Global CBS'
  wb.created = new Date()
  const ws = wb.addWorksheet(String(title || 'Report').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  })
  const cols = headers.length
  const cells = rows.map((r) => r.map((c) => (c && typeof c === 'object' && 'kind' in c ? c : typeof c === 'number' ? { value: c, kind: 'number' } : parseCell(c))))
  // a column's type = what most of its filled cells are
  const kinds = headers.map((_, i) => {
    const count = {}
    cells.forEach((r) => { const k = r[i]?.kind; if (k && r[i].value !== '') count[k] = (count[k] || 0) + 1 })
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || 'text'
  })

  // 1) title band
  ws.mergeCells(1, 1, 1, cols)
  const t = ws.getCell(1, 1)
  t.value = title
  t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 34
  // 2) subtitle
  ws.mergeCells(2, 1, 2, cols)
  const st = ws.getCell(2, 1)
  st.value = subtitle || ''
  st.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } }
  st.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 20
  // 4) header
  const hr = ws.getRow(4)
  headers.forEach((h, i) => {
    const c = hr.getCell(i + 1)
    c.value = h
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } }
    c.alignment = { vertical: 'middle', horizontal: kinds[i] === 'text' ? 'left' : 'center', wrapText: true }
    c.border = { top: { style: 'thin', color: { argb: HEAD } }, bottom: { style: 'medium', color: { argb: BRAND } }, left: { style: 'thin', color: { argb: 'FF2A93C4' } }, right: { style: 'thin', color: { argb: 'FF2A93C4' } } }
  })
  hr.height = 30

  // data
  const FMT = { money: '#,##0.00 "₾"', number: '#,##0.##', pct: '0.0%', date: 'dd.mm.yyyy' }
  cells.forEach((r, ri) => {
    const row = ws.getRow(5 + ri)
    for (let i = 0; i < cols; i++) {
      const v = r[i] || { value: '', kind: 'text' }
      const c = row.getCell(i + 1)
      c.value = v.value
      if (FMT[v.kind]) c.numFmt = FMT[v.kind]
      c.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' }, bold: i === 0 && kinds[0] === 'text' }
      c.alignment = { vertical: 'top', horizontal: v.kind === 'text' ? 'left' : 'right', wrapText: true }
      c.border = { bottom: { style: 'hair', color: { argb: LINE } }, left: { style: 'hair', color: { argb: LINE } }, right: { style: 'hair', color: { argb: LINE } } }
      if (ri % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
    }
  })

  // totals for money / number columns
  const sumCols = kinds.map((k, i) => (k === 'money' || k === 'number') && i > 0)
  if (rows.length > 1 && sumCols.some(Boolean)) {
    const tr = ws.getRow(5 + rows.length)
    for (let i = 0; i < cols; i++) {
      const c = tr.getCell(i + 1)
      if (i === 0) c.value = totalLabel
      else if (sumCols[i]) {
        const L = ws.getColumn(i + 1).letter
        c.value = { formula: `SUBTOTAL(9,${L}5:${L}${4 + rows.length})` }
        c.numFmt = FMT[kinds[i]]
      }
      c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: BRAND } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL } }
      c.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'right' }
      c.border = { top: { style: 'medium', color: { argb: BRAND } } }
    }
    tr.height = 24
  }

  // widths: from the content, sensible limits
  headers.forEach((h, i) => {
    let w = String(h).length + 4
    cells.slice(0, 500).forEach((r) => {
      const v = r[i]?.value
      const len = v instanceof Date ? 11 : String(v ?? '').length
      w = Math.max(w, Math.min(len, 60) + 2)
    })
    if (kinds[i] === 'money') w = Math.max(w, 14)
    ws.getColumn(i + 1).width = Math.min(Math.max(w, 10), 55)
  })
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + rows.length, column: cols } }

  const buf = await wb.xlsx.writeBuffer()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = `${fileName || 'report'}.xlsx`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

// read a rendered <table>: header texts + rows that have one cell per header
export function readTable(table) {
  const headRow = [...table.querySelectorAll('thead tr')].pop()
  const headers = headRow ? [...headRow.children].map((th) => th.textContent.trim()) : []
  const rows = [...table.querySelectorAll('tbody tr')]
    .map((tr) => [...tr.children])
    .filter((tds) => tds.length === headers.length)
    .map((tds) => tds.map((td) => (td.querySelector('input, select') ? (td.querySelector('input, select').value || '') : td.innerText.trim())))
  // drop empty action columns (buttons only)
  const keep = headers.map((h, i) => h !== '' || rows.some((r) => r[i]))
  return { headers: headers.filter((_, i) => keep[i]), rows: rows.map((r) => r.filter((_, i) => keep[i])) }
}
