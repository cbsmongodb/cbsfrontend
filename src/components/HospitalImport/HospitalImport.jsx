'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

function parseRows(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.includes('\t') ? line.split('\t') : line.split('|')
      const startIndex = /^\d+$/.test(cols[0]?.trim()) ? 1 : 0
      return {
        name: (cols[startIndex] || '').trim(),
        region: (cols[startIndex + 1] || '').trim(),
        address: (cols[startIndex + 2] || '').trim(),
        phoneNumber: (cols[startIndex + 3] || '').trim(),
        email: (cols[startIndex + 4] || '').trim(),
      }
    })
    .filter((row) => row.name)
}

export default function HospitalImport() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [geocoding, setGeocoding] = useState(false)
  const [geocodeResult, setGeocodeResult] = useState(null)
  const [geocodeError, setGeocodeError] = useState('')

  const preview = parseRows(text)

  async function handleImport() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await apiFetch('/api/hospitals/bulk-import', {
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

  async function handleGeocode() {
    setGeocoding(true)
    setGeocodeError('')
    setGeocodeResult(null)
    try {
      const data = await apiFetch('/api/hospitals/geocode-missing', { method: 'POST' })
      setGeocodeResult(data)
    } catch (err) {
      setGeocodeError(err.message)
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <div className="resource-table">
      <h1>ჰოსპიტლების მასობრივი დამატება</h1>

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        დააკოპირეთ spreadsheet-იდან რამდენიმე მწკრივი (Hospital, Region, Address, Phone, Email
        სვეტებით) და ჩასვით აქ — თითო მწკრივი ცალკე ხაზზე.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="ჩასვით მწკრივები აქ..."
        rows={10}
        className="field-input"
        style={{ width: '100%', minWidth: '100%', height: 'auto', padding: 12, fontFamily: 'monospace', fontSize: 12 }}
      />

      {preview.length > 0 && (
        <p style={{ fontSize: 13, color: '#64748b', margin: '8px 0' }}>
          ამოცნობილია {preview.length} ჰოსპიტალი. მაგალითი: {preview[0].name} ({preview[0].region || 'რეგიონის გარეშე'})
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
        <p style={{ marginTop: 12, fontSize: 14 }}>
          ✅ დაემატა: {result.created} | გამოტოვებული (უკვე არსებობდა): {result.skipped}
          {result.regionsCreated.length > 0 && (
            <> | ახალი რეგიონები: {result.regionsCreated.join(', ')}</>
          )}
        </p>
      )}

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

      <h2 style={{ fontSize: 15, marginBottom: 8 }}>რუკის კოორდინატები</h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        ყველა ჰოსპიტალს, ვისაც ჯერ არ აქვს lat/lng, მისამართის მიხედვით ავტომატურად მოვძებნით
        კოორდინატებს. 50 ჰოსპიტალზე ეს ~1 წუთს წაიღებს — გვერდიდან ნუ გახვალთ, სანამ არ დასრულდება.
      </p>

      <button type="button" className="btn-gray" onClick={handleGeocode} disabled={geocoding}>
        <span>{geocoding ? 'მიმდინარეობს...' : 'კოორდინატების მოძებნა'}</span>
      </button>

      {geocodeError && <p className="resource-error" style={{ marginTop: 12 }}>{geocodeError}</p>}

      {geocodeResult && (
        <p style={{ marginTop: 12, fontSize: 14 }}>
          ✅ სულ: {geocodeResult.total} | ნაპოვნია: {geocodeResult.geocoded} | ვერ მოიძებნა: {geocodeResult.failed}
        </p>
      )}
    </div>
  )
}
