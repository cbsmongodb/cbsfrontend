'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

const HEADER_MAP = {
  name: 'name',
  designation: 'designation',
  email: 'email',
  phonenumber: 'phoneNumber',
  status: 'status',
}

function parseEmployeeRows(text) {
  const rows = parseCSV(text)
  if (rows.length < 2) return []

  const headerRow = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, ''))
  const fieldIndexes = {}
  headerRow.forEach((h, i) => {
    const field = HEADER_MAP[h]
    if (field) fieldIndexes[field] = i
  })

  return rows
    .slice(1)
    .map((cols) => ({
      name: (cols[fieldIndexes.name] || '').trim(),
      designation: (cols[fieldIndexes.designation] || '').trim(),
      email: (cols[fieldIndexes.email] || '').trim(),
      phoneNumber: (cols[fieldIndexes.phoneNumber] || '').trim(),
      status: (cols[fieldIndexes.status] || '').trim(),
    }))
    .filter((row) => row.name && row.email)
}

export default function EmployeeImport() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const preview = parseEmployeeRows(text)

  async function handleImport() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await apiFetch('/api/employees/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ rows: preview }),
      })
      setResult(data)
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="resource-table">
      <h1>თანამშრომლების მასობრივი დამატება (CSV)</h1>

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        ჩასვით CSV ფაილის სრული შემცველობა (თავზე სათაურის ხაზით): <strong>Name, Designation,
        Email, Phone Number, Status</strong>. ერთი და იგივე ელფოსტის თანამშრომელი, თუ უკვე
        არსებობს, ავტომატურად გამოტოვდება. ყველა ახალ თანამშრომელს დაუყენდება საწყისი პაროლი{' '}
        <strong>123456</strong>. <strong>Designation</strong> უნდა ემთხვეოდეს უკვე არსებული როლის
        სახელს (მაგ. "Representative", "Sales Manager") — თუ ემთხვევა არ მოიძებნა, ის მწკრივი
        გამოტოვდება და "ვერ დაემატა" სიაში ჩნდება.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ჩასვით CSV ტექსტი აქ (თავზე header-ითურთ)..."
        rows={12}
        className="field-input"
        style={{ width: '100%', minWidth: '100%', height: 'auto', padding: 12, fontFamily: 'monospace', fontSize: 12 }}
      />

      {preview.length > 0 && (
        <p style={{ fontSize: 13, color: '#64748b', margin: '8px 0' }}>
          ამოცნობილია {preview.length} თანამშრომელი. მაგალითი: {preview[0].name} ({preview[0].designation || 'დანიშნულების გარეშე'})
        </p>
      )}

      <button
        type="button"
        className="btn"
        onClick={handleImport}
        disabled={loading || preview.length === 0}
        style={{ marginTop: 8 }}
      >
        <span>{loading ? 'იტვირთება...' : `დამატება (${preview.length})`}</span>
      </button>

      {error && <p className="resource-error" style={{ marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <p>
            ✅ დაემატა: {result.created} | გამოტოვებული (უკვე არსებობდა): {result.skipped}
            {result.failed > 0 && <> | ვერ დაემატა: {result.failed}</>}
          </p>
          {result.failedRows?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 13 }}>ვერ დაემატა:</strong>
              <ul style={{ fontSize: 12.5, color: '#b45309', marginTop: 4 }}>
                {result.failedRows.map((f, i) => (
                  <li key={i}>{f.name} — {f.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
