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
  producttype: 'productType',
  profile: 'profile',
  manufacturer: 'manufacturer',
  country: 'country',
  generaldescription: 'generalDescription',
  inputcomponents: 'inputComponent',
  inputcomponent: 'inputComponent',
}

function parseDrugRows(text) {
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
      productType: (cols[fieldIndexes.productType] || '').trim(),
      profile: (cols[fieldIndexes.profile] || '').trim(),
      manufacturer: (cols[fieldIndexes.manufacturer] || '').trim(),
      country: (cols[fieldIndexes.country] || '').trim(),
      generalDescription: (cols[fieldIndexes.generalDescription] || '').trim(),
      inputComponent: (cols[fieldIndexes.inputComponent] || '').trim(),
    }))
    .filter((row) => row.name)
}

export default function DrugImport() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const preview = parseDrugRows(text)

  async function handleImport() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await apiFetch('/api/drugs/bulk-import', {
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
      <h1>მედიკამენტების მასობრივი დამატება (CSV)</h1>

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        ჩასვით CSV ფაილის სრული შემცველობა (თავზე სათაურის ხაზით): <strong>Name, Product type,
        Profile, Manufacturer, Country, General description, Input components</strong>. ერთი და იგივე
        სახელის მედიკამენტი, თუ უკვე არსებობს, ავტომატურად გამოტოვდება.
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
          ამოცნობილია {preview.length} მედიკამენტი. მაგალითი: {preview[0].name} ({preview[0].productType || 'ტიპის გარეშე'})
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
          {(result.createdEntities?.productTypes?.length > 0 ||
            result.createdEntities?.profiles?.length > 0 ||
            result.createdEntities?.countries?.length > 0 ||
            result.createdEntities?.manufacturers?.length > 0) && (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
              ავტომატურად შეიქმნა:
              {result.createdEntities.productTypes.length > 0 && (
                <> პროდუქტის ტიპები: {result.createdEntities.productTypes.join(', ')}; </>
              )}
              {result.createdEntities.profiles.length > 0 && (
                <> პროფილები: {result.createdEntities.profiles.join(', ')}; </>
              )}
              {result.createdEntities.countries.length > 0 && (
                <> ქვეყნები: {result.createdEntities.countries.join(', ')}; </>
              )}
              {result.createdEntities.manufacturers.length > 0 && (
                <> მწარმოებლები: {result.createdEntities.manufacturers.join(', ')}</>
              )}
            </p>
          )}
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
