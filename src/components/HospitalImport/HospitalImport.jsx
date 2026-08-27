'use client'

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import HospitalPinModal from './HospitalPinModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const FORMAT_INSTRUCTIONS = `მომეცი ჰოსპიტლების სია ზუსტად ამ ფორმატში, თითო ჰოსპიტალი ცალკე ხაზზე, სვეტები Tab-ით გამოყოფილი (არა მძიმით):

სახელი [Tab] რეგიონი [Tab] მისამართი [Tab] ტელეფონი [Tab] ელფოსტა

წესები:
- სვეტებს შორის ერთი Tab იყოს (Enter-ის ტექსტში სივრცეები არ ჩაანაცვლო Tab-ით)
- თუ ტელეფონი ან ელფოსტა არ იცი, ის სვეტი ცარიელი დატოვე, მაგრამ Tab მაინც დატოვე ადგილზე
- მისამართი რაც შეიძლება სრული და ზუსტი იყოს (ქალაქი/დაბა და ქუჩა მაინც), რომ რუკაზე სწორად მოინახოს
- ქართულად ან ინგლისურად — არა აქვს მნიშვნელობა, მთავარია ფორმატი დაცული იყოს
- არანაირი დამატებითი ტექსტი, ნუმერაცია ან სათაური არ დაამატო — მხოლოდ მწკრივები

მაგალითი:
სტომატოლოგია ლუქსი [Tab] თბილისი [Tab] 12 ჭავჭავაძის გამზირი, თბილისი [Tab] 555123456 [Tab] info@lux.ge
ჯანმრთელობის ცენტრი [Tab] ბათუმი [Tab] 5 რუსთაველის ქუჩა, ბათუმი [Tab] [Tab]`

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

function InstructionsCard() {
  const [expanded, setExpanded] = useState(false)
  const [copyLabel, setCopyLabel] = useState('კოპირება')

  function copyInstructions() {
    navigator.clipboard.writeText(FORMAT_INSTRUCTIONS).then(() => {
      setCopyLabel('დაკოპირდა ✓')
      setTimeout(() => setCopyLabel('კოპირება'), 2000)
    })
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #eff6ff, #f8fafc)',
        border: '1px solid #dbeafe',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
            გაქვთ ჰოსპიტლების სია, მაგრამ არ იცით ფორმატში მოწესრიგება?
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            დააკოპირეთ ეს ინსტრუქცია, გაუგზავნეთ ChatGPT-ს თქვენს სიასთან ერთად — ის დაგიბრუნებთ
            პირდაპირ ჩასასმელ ტექსტს.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={copyInstructions}>
          <span>📋 {copyLabel}</span>
        </button>
        <button type="button" className="btn-gray" onClick={() => setExpanded((v) => !v)}>
          <span>{expanded ? 'დამალვა' : 'ნახე რას აკოპირებ'}</span>
        </button>
      </div>

      {expanded && (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 11.5,
            color: '#475569',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {FORMAT_INSTRUCTIONS}
        </pre>
      )}
    </div>
  )
}

export default function HospitalImport() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [geocoding, setGeocoding] = useState(false)
  const [geocodeResult, setGeocodeResult] = useState(null)
  const [geocodeError, setGeocodeError] = useState('')
  const [progress, setProgress] = useState({ processed: 0, total: 0 })

  const [missing, setMissing] = useState([])
  const [missingLoading, setMissingLoading] = useState(false)
  const [missingError, setMissingError] = useState('')
  const [pinTarget, setPinTarget] = useState(null)

  const preview = parseRows(text)

  useEffect(() => {
    if (!API_URL) return
    const socket = io(API_URL, { transports: ['websocket'] })
    socket.on('geocode:progress', (data) => setProgress(data))
    return () => socket.disconnect()
  }, [])

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
    setProgress({ processed: 0, total: 0 })
    try {
      const data = await apiFetch('/api/hospitals/geocode-missing', { method: 'POST' })
      setGeocodeResult(data)
      if (data.failedHospitals?.length) {
        setMissing(data.failedHospitals)
      }
    } catch (err) {
      setGeocodeError(err.message)
    } finally {
      setGeocoding(false)
    }
  }

  async function loadMissing() {
    setMissingLoading(true)
    setMissingError('')
    try {
      const data = await apiFetch('/api/hospitals/missing-coordinates')
      setMissing(data)
    } catch (err) {
      setMissingError(err.message)
    } finally {
      setMissingLoading(false)
    }
  }

  function handlePinSaved(hospitalId) {
    setMissing((prev) => prev.filter((h) => h._id !== hospitalId))
    setPinTarget(null)
  }

  const progressPercent =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0

  return (
    <div className="resource-table">
      <h1>ჰოსპიტლების მასობრივი დამატება</h1>

      <InstructionsCard />

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        დააკოპირეთ spreadsheet-იდან (ან ChatGPT-ს მიერ მომზადებული ტექსტიდან) რამდენიმე მწკრივი
        (Hospital, Region, Address, Phone, Email სვეტებით) და ჩასვით აქ — თითო მწკრივი ცალკე ხაზზე.
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
        კოორდინატებს.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn-gray" onClick={handleGeocode} disabled={geocoding}>
          <span>{geocoding ? 'მიმდინარეობს...' : 'კოორდინატების ავტომატური მოძებნა'}</span>
        </button>
        <button type="button" className="btn-gray" onClick={loadMissing} disabled={missingLoading}>
          <span>{missingLoading ? 'იტვირთება...' : 'ვისი მდებარეობაც ჯერ არ ვიცით'}</span>
        </button>
      </div>

      {geocoding && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(to right, #34d399, #16a34a)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {progress.processed} / {progress.total || '...'} დამუშავებულია ({progressPercent}%)
          </p>
        </div>
      )}

      {geocodeError && <p className="resource-error" style={{ marginTop: 12 }}>{geocodeError}</p>}
      {missingError && <p className="resource-error" style={{ marginTop: 12 }}>{missingError}</p>}

      {geocodeResult && (
        <p style={{ marginTop: 12, fontSize: 14 }}>
          ✅ სულ: {geocodeResult.total} | ნაპოვნია: {geocodeResult.geocoded} | ვერ მოიძებნა: {geocodeResult.failed}
        </p>
      )}

      {missing.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>
            რუკაზე არ არის დამატებული ({missing.length})
          </h3>
          {missing.map((h) => (
            <div
              key={h._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '10px 0',
                borderBottom: '1px solid #f1f5f9',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 13 }}>
                <strong>{h.name}</strong>
                <div style={{ color: '#64748b', fontSize: 12 }}>{h.address}</div>
              </div>
              <button type="button" className="btn-gray btn-sm" onClick={() => setPinTarget(h)}>
                <span>📍 რუკაზე მონიშვნა</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {pinTarget && (
        <HospitalPinModal
          hospital={pinTarget}
          onClose={() => setPinTarget(null)}
          onSaved={handlePinSaved}
        />
      )}
    </div>
  )
}
