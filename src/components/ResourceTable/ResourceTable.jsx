'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import LocationPickerModal from './LocationPickerModal'
import MultiSelectSearch from './MultiSelectSearch'
import './ResourceTable.css'

export default function ResourceTable({ title, endpoint, fields }) {
  const t = useTranslations('resourceTable')
  const WEEKDAYS = [
    { value: 1, label: t('weekdaysShort.mon') },
    { value: 2, label: t('weekdaysShort.tue') },
    { value: 3, label: t('weekdaysShort.wed') },
    { value: 4, label: t('weekdaysShort.thu') },
    { value: 5, label: t('weekdaysShort.fri') },
    { value: 6, label: t('weekdaysShort.sat') },
    { value: 0, label: t('weekdaysShort.sun') },
  ]
  const WEEKDAY_LABELS_SHORT = {
    0: t('weekdaysShort.sun'), 1: t('weekdaysShort.mon'), 2: t('weekdaysShort.tue'),
    3: t('weekdaysShort.wed'), 4: t('weekdaysShort.thu'), 5: t('weekdaysShort.fri'), 6: t('weekdaysShort.sat'),
  }

  const [items, setItems] = useState([])
  const [form, setForm] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [optionsByField, setOptionsByField] = useState({})
  const [locationPickerField, setLocationPickerField] = useState(null)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch(endpoint)
      setItems(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadOptions() {
    const optionFields = fields.filter((f) => f.type === 'select' || f.type === 'multiselect' || f.type === 'multiselect-search')
    if (optionFields.length === 0) return

    const entries = await Promise.all(
      optionFields.map(async (f) => {
        try {
          const data = await apiFetch(f.optionsEndpoint)
          return [f.name, data]
        } catch {
          return [f.name, []]
        }
      })
    )
    setOptionsByField(Object.fromEntries(entries))
  }

  useEffect(() => {
    load()
    loadOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  function relationId(value) {
    if (value && typeof value === 'object') return value._id || ''
    return value || ''
  }

  function relationIds(value) {
    if (!Array.isArray(value)) return []
    return value.map(relationId)
  }

  function handleChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function toggleMultiselect(name, id) {
    setForm((prev) => {
      const current = prev[name] || []
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id]
      return { ...prev, [name]: next }
    })
  }

  function startEdit(item) {
    setEditingId(item._id)
    const next = {}
    fields.forEach((f) => {
      if (f.type === 'location') {
        next[f.latField] = item[f.latField] ?? ''
        next[f.lngField] = item[f.lngField] ?? ''
        return
      }
      const raw = item[f.name]
      if (f.type === 'weekdays') next[f.name] = Array.isArray(raw) ? raw : [1, 2, 3, 4, 5]
      else if (f.type === 'select') next[f.name] = relationId(raw)
      else if (f.type === 'multiselect' || f.type === 'multiselect-search') next[f.name] = relationIds(raw)
      else if (f.type === 'checkbox') next[f.name] = !!raw
      else if (f.type === 'date') next[f.name] = raw ? String(raw).slice(0, 10) : ''
      else next[f.name] = raw ?? ''
    })
    setForm(next)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({})
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await apiFetch(`${endpoint}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
      } else {
        await apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(form),
        })
      }
      cancelEdit()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('confirmDelete'))) return
    try {
      await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  function renderInput(f) {
    if (f.type === 'weekdays') {
      const selected = form[f.name] || []
      return (
        <div key={f.name} className="resource-field-weekdays" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>{f.label}:</span>
          {WEEKDAYS.map((d) => {
            const isChecked = selected.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  const next = isChecked
                    ? selected.filter((v) => v !== d.value)
                    : [...selected, d.value].sort()
                  handleChange(f.name, next)
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 999,
                  border: isChecked ? '1px solid #4a9dec' : '1px solid #e2e8f0',
                  background: isChecked ? '#4a9dec' : '#f8fafc',
                  color: isChecked ? '#fff' : '#64748b',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      )
    }

    if (f.type === 'location') {
      const lat = form[f.latField]
      const lng = form[f.lngField]
      const hasLocation = lat !== '' && lat != null && lng !== '' && lng != null
      return (
        <div
          key={f.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '2px solid transparent',
            background: '#f3f3f3',
            borderRadius: 10,
            padding: '0 12px',
            height: '2.5em',
            fontSize: 13,
          }}
        >
          <span style={{ color: hasLocation ? '#16a34a' : '#94a3b8' }}>
            {hasLocation ? `📍 ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : t('locationNotSet')}
          </span>
          <button
            type="button"
            className="btn-gray btn-sm"
            onClick={() => setLocationPickerField(f)}
            style={{ marginLeft: 'auto' }}
          >
            <span>{hasLocation ? t('locationEdit') : t('locationPick')}</span>
          </button>
        </div>
      )
    }

    if (f.type === 'select') {
      const options = optionsByField[f.name] || []
      return (
        <select
          key={f.name}
          className="field-select"
          value={form[f.name] || ''}
          onChange={(e) => handleChange(f.name, e.target.value)}
          required
        >
          <option value="">{f.label}...</option>
          {options.map((opt) => (
            <option key={opt._id} value={opt._id}>
              {opt[f.optionsLabel || 'name']}
            </option>
          ))}
        </select>
      )
    }

    if (f.type === 'enum') {
      return (
        <select
          key={f.name}
          className="field-select"
          value={form[f.name] || ''}
          onChange={(e) => handleChange(f.name, e.target.value)}
          required
        >
          <option value="">{f.label}...</option>
          {(f.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {f.optionLabels?.[opt] || opt}
            </option>
          ))}
        </select>
      )
    }

    if (f.type === 'multiselect-search') {
      const options = optionsByField[f.name] || []
      const selected = form[f.name] || []
      return (
        <MultiSelectSearch
          key={f.name}
          options={options}
          selected={selected}
          optionsLabel={f.optionsLabel}
          placeholder={f.label}
          onChange={(next) => handleChange(f.name, next)}
        />
      )
    }

    if (f.type === 'multiselect') {
      const options = optionsByField[f.name] || []
      const selected = form[f.name] || []
      return (
        <fieldset key={f.name} className="resource-multiselect">
          <legend>{f.label}</legend>
          {options.map((opt) => (
            <div key={opt._id} className="checkbox-wrapper-46">
              <input
                type="checkbox"
                id={`${f.name}-${opt._id}`}
                className="inp-cbx"
                checked={selected.includes(opt._id)}
                onChange={() => toggleMultiselect(f.name, opt._id)}
              />
              <label htmlFor={`${f.name}-${opt._id}`} className="cbx">
                <span>
                  <svg viewBox="0 0 12 10" height="10px" width="12px">
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                  </svg>
                </span>
                <span>{opt[f.optionsLabel || 'name']}</span>
              </label>
            </div>
          ))}
        </fieldset>
      )
    }

    if (f.type === 'checkbox') {
      return (
        <div key={f.name} className="checkbox-wrapper-46">
          <input
            type="checkbox"
            id={`field-${f.name}`}
            className="inp-cbx"
            checked={!!form[f.name]}
            onChange={(e) => handleChange(f.name, e.target.checked)}
          />
          <label htmlFor={`field-${f.name}`} className="cbx">
            <span>
              <svg viewBox="0 0 12 10" height="10px" width="12px">
                <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
              </svg>
            </span>
            <span>{f.label}</span>
          </label>
        </div>
      )
    }

    return (
      <input
        key={f.name}
        className={f.type === 'date' ? 'field-date' : 'field-input'}
        type={
          f.type === 'number'
            ? 'number'
            : f.type === 'date'
            ? 'date'
            : f.type === 'password'
            ? 'password'
            : 'text'
        }
        step={f.type === 'number' ? 'any' : undefined}
        placeholder={f.label}
        value={form[f.name] ?? ''}
        onChange={(e) =>
          handleChange(f.name, f.type === 'number' ? e.target.valueAsNumber : e.target.value)
        }
        required={f.required !== undefined ? f.required : f.type !== 'checkbox'}
      />
    )
  }

  function renderCell(f, item) {
    if (f.type === 'weekdays') {
      const value = item[f.name]
      if (!Array.isArray(value) || value.length === 0) return '—'
      const sorted = [...value].sort()
      return sorted.map((d) => WEEKDAY_LABELS_SHORT[d]).join(', ')
    }
    if (f.type === 'location') {
      const lat = item[f.latField]
      const lng = item[f.lngField]
      if (lat == null || lng == null) return '—'
      return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
    }
    const value = item[f.name]
    if (f.type === 'enum') {
      return value ? f.optionLabels?.[value] || value : '—'
    }
    if (f.type === 'select') {
      if (value && typeof value === 'object') return value[f.optionsLabel || 'name'] || '—'
      return '—'
    }
    if (f.type === 'multiselect' || f.type === 'multiselect-search') {
      if (!Array.isArray(value) || value.length === 0) return '—'
      return value.map((v) => (v && typeof v === 'object' ? v[f.optionsLabel || 'name'] : v)).join(', ')
    }
    if (f.type === 'checkbox') return value ? '✓' : '—'
    if (f.type === 'date') return value ? String(value).slice(0, 10) : ''
    return value ?? ''
  }

  function itemMatchesSearch(item) {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return fields.some((f) => {
      const cell = renderCell(f, item)
      return String(cell).toLowerCase().includes(q)
    })
  }

  const visibleItems = items.filter(itemMatchesSearch)

  return (
    <div className="resource-table">
      <h1>{title}</h1>

      <form className="resource-form" onSubmit={handleSubmit}>
        {fields.map((f) => renderInput(f))}
        <button type="submit" className="btn">
          <span>{editingId ? t('save') : t('add')}</span>
        </button>
        {editingId && (
          <button type="button" className="btn-gray" onClick={cancelEdit}>
            <span>{t('cancel')}</span>
          </button>
        )}
      </form>

      {error && <p className="resource-error">{error}</p>}

      <form className="resource-search" onSubmit={(e) => e.preventDefault()}>
        <button type="button" tabIndex={-1}>
          <svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9"
              stroke="currentColor"
              strokeWidth="1.333"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          className="resource-search-input"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="text"
        />
        <button className="resource-search-reset" type="button" onClick={() => setSearch('')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </form>

      {loading ? (
        <p>{t('loading')}</p>
      ) : (
        <div className="resource-table-scroll">
        <table>
          <thead>
            <tr>
              {fields.filter((f) => !f.hideInTable).map((f) => (
                <th key={f.name}>{f.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item._id}>
                {fields.filter((f) => !f.hideInTable).map((f) => (
                  <td key={f.name}>{renderCell(f, item)}</td>
                ))}
                <td className="resource-actions">
                  <button className="btn-gray btn-sm" onClick={() => startEdit(item)}>
                    <span>{t('edit')}</span>
                  </button>
                  <button className="btn-gray btn-sm" onClick={() => handleDelete(item._id)}>
                    <span>{t('delete')}</span>
                  </button>
                </td>
              </tr>
            ))}
            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={fields.filter((f) => !f.hideInTable).length + 1}>
                  {search ? t('noSearchResults') : t('empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      {locationPickerField && (
        <LocationPickerModal
          initialLat={form[locationPickerField.latField] || null}
          initialLng={form[locationPickerField.lngField] || null}
          initialQuery={form.address || ''}
          onPick={(lat, lng) => {
            handleChange(locationPickerField.latField, lat)
            handleChange(locationPickerField.lngField, lng)
          }}
          onClose={() => setLocationPickerField(null)}
        />
      )}
    </div>
  )
}
