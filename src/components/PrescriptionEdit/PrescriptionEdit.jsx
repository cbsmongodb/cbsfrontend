'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import './PrescriptionEdit.css'

export default function PrescriptionEdit() {
  const { id, locale } = useParams()
  const router = useRouter()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [addDrugId, setAddDrugId] = useState('')
  const [addBoxes, setAddBoxes] = useState('')

  const [multiMode, setMultiMode] = useState(false)
  const [multiRows, setMultiRows] = useState([{ drugId: '', totalNoOfBoxes: '' }])

  const [editingLineId, setEditingLineId] = useState(null)
  const [editingSaleBoxes, setEditingSaleBoxes] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch(`/api/prescriptions/${id}`)
      setData(result)
      setDate(result.date ? new Date(result.date).toISOString().slice(0, 10) : '')
      setIsActive(result.isActive)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSaveHeader() {
    setSaving(true)
    setError('')
    try {
      await apiFetch(`/api/prescriptions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ date, isActive }),
      })
      router.push(`/${locale}/dashboard/prescriptions`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSingle() {
    if (!addDrugId || !addBoxes) return
    setError('')
    try {
      await apiFetch(`/api/prescriptions/${id}/drugs`, {
        method: 'POST',
        body: JSON.stringify({ drugId: addDrugId, totalNoOfBoxes: addBoxes }),
      })
      setAddDrugId('')
      setAddBoxes('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  function addMultiRow() {
    setMultiRows((rows) => [...rows, { drugId: '', totalNoOfBoxes: '' }])
  }

  function updateMultiRow(index, field, value) {
    setMultiRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function removeMultiRow(index) {
    setMultiRows((rows) => rows.filter((_, i) => i !== index))
  }

  async function handleSaveMulti() {
    const items = multiRows.filter((r) => r.drugId && r.totalNoOfBoxes)
    if (items.length === 0) return
    setError('')
    try {
      await apiFetch(`/api/prescriptions/${id}/drugs`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      })
      setMultiRows([{ drugId: '', totalNoOfBoxes: '' }])
      setMultiMode(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemoveLine(lineId) {
    if (!confirm('წავშალოთ ეს ხაზი?')) return
    setError('')
    try {
      await apiFetch(`/api/prescriptions/${id}/drugs/${lineId}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEditSaleBoxes(line) {
    setEditingLineId(line._id)
    setEditingSaleBoxes(String(line.saleBoxes))
  }

  async function saveSaleBoxes(lineId) {
    setError('')
    try {
      await apiFetch(`/api/prescriptions/drug-lines/${lineId}`, {
        method: 'PUT',
        body: JSON.stringify({ saleBoxes: editingSaleBoxes }),
      })
      setEditingLineId(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="prescedit-page">იტვირთება...</div>
  if (!data) return <div className="prescedit-page">{error || 'ვერ მოიძებნა'}</div>

  return (
    <div className="prescedit-page">
      <div className="prescedit-card">
        <div className="prescedit-card-header">
          <h1>Update Prescription</h1>
          <div className="prescedit-header-actions">
            <button type="button" className="btn" onClick={handleSaveHeader} disabled={saving}>
              <span>{saving ? '...' : 'Save'}</span>
            </button>
            <button type="button" className="btn-gray" onClick={() => router.push(`/${locale}/dashboard/prescriptions`)}>
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {error && <p className="resource-error">{error}</p>}

        <div className="prescedit-fields">
          <div className="prescedit-field">
            <label>Period</label>
            <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="prescedit-field">
            <label>Employee</label>
            <div className="prescedit-readonly">{data.employee?.name || '—'}</div>
          </div>
          <div className="prescedit-field">
            <label>Doctor</label>
            <div className="prescedit-readonly">
              {data.doctor?.name} {data.doctor?.uniqueNumber ? `(${data.doctor.uniqueNumber})` : ''}
            </div>
          </div>
        </div>

        <label className="prescedit-status-toggle">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className={`prescedit-toggle-track ${isActive ? 'on' : ''}`}>
            <span className="prescedit-toggle-thumb" />
          </span>
          Status
        </label>
      </div>

      <div className="prescedit-card">
        <div className="prescedit-add-row">
          <div className="prescedit-add-select">
            <SearchableSelect
              options={data.activeDrugs}
              value={addDrugId}
              onChange={setAddDrugId}
              getLabel={(o) => o.name}
              placeholder="აირჩიეთ წამალი..."
            />
          </div>
          <input
            type="number"
            className="field-input prescedit-add-boxes"
            placeholder="ყუთები"
            value={addBoxes}
            onChange={(e) => setAddBoxes(e.target.value)}
          />
          <button type="button" className="btn prescedit-add-btn" onClick={handleAddSingle}>
            <span>+ Add Medicine</span>
          </button>
          <button type="button" className="btn prescedit-multi-btn" onClick={() => setMultiMode((v) => !v)}>
            <span>+ Add Multiple Medicines</span>
          </button>
        </div>

        {multiMode && (
          <div className="prescedit-multi-panel">
            {multiRows.map((row, i) => (
              <div className="prescedit-multi-row" key={i}>
                <div className="prescedit-add-select">
                  <SearchableSelect
                    options={data.activeDrugs}
                    value={row.drugId}
                    onChange={(v) => updateMultiRow(i, 'drugId', v)}
                    getLabel={(o) => o.name}
                    placeholder="წამალი..."
                  />
                </div>
                <input
                  type="number"
                  className="field-input prescedit-add-boxes"
                  placeholder="ყუთები"
                  value={row.totalNoOfBoxes}
                  onChange={(e) => updateMultiRow(i, 'totalNoOfBoxes', e.target.value)}
                />
                <button type="button" className="btn-gray btn-sm" onClick={() => removeMultiRow(i)}>
                  <span>✕</span>
                </button>
              </div>
            ))}
            <div className="prescedit-multi-actions">
              <button type="button" className="btn-gray btn-sm" onClick={addMultiRow}>
                <span>+ ხაზის დამატება</span>
              </button>
              <button type="button" className="btn" onClick={handleSaveMulti}>
                <span>Save All</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="prescedit-card prescedit-table-card">
        <table className="prescedit-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Total no of boxes</th>
              <th>Sale Boxes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.drugLines.map((line) => (
              <tr key={line._id}>
                <td>{line.drugName}</td>
                <td>{line.totalNoOfBoxes}</td>
                <td>
                  {editingLineId === line._id ? (
                    <div className="prescedit-inline-edit">
                      <input
                        type="number"
                        className="field-input"
                        value={editingSaleBoxes}
                        max={line.totalNoOfBoxes}
                        onChange={(e) => setEditingSaleBoxes(e.target.value)}
                      />
                      <button type="button" className="btn-gray btn-sm" onClick={() => saveSaleBoxes(line._id)}>
                        <span>✓</span>
                      </button>
                      <button type="button" className="btn-gray btn-sm" onClick={() => setEditingLineId(null)}>
                        <span>✕</span>
                      </button>
                    </div>
                  ) : (
                    line.saleBoxes
                  )}
                </td>
                <td>
                  <button type="button" className="prescedit-icon-btn" onClick={() => startEditSaleBoxes(line)} title="რედაქტირება">
                    ✎
                  </button>
                  <button type="button" className="prescedit-icon-btn prescedit-icon-danger" onClick={() => handleRemoveLine(line._id)} title="წაშლა">
                    🗑
                  </button>
                </td>
              </tr>
            ))}
            {data.drugLines.length === 0 && (
              <tr>
                <td colSpan={4}>ჯერ არ არის დამატებული წამალი</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
