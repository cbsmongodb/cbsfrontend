'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './ResourceTable.css'

export default function ResourceTable({ title, endpoint, fields }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [optionsByField, setOptionsByField] = useState({})

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
    const optionFields = fields.filter((f) => f.type === 'select' || f.type === 'multiselect')
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
      const raw = item[f.name]
      if (f.type === 'select') next[f.name] = relationId(raw)
      else if (f.type === 'multiselect') next[f.name] = relationIds(raw)
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
    if (!confirm('წავშალო?')) return
    try {
      await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  function renderInput(f) {
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
        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
        step={f.type === 'number' ? 'any' : undefined}
        placeholder={f.label}
        value={form[f.name] ?? ''}
        onChange={(e) =>
          handleChange(f.name, f.type === 'number' ? e.target.valueAsNumber : e.target.value)
        }
        required={f.type !== 'checkbox'}
      />
    )
  }

  function renderCell(f, item) {
    const value = item[f.name]
    if (f.type === 'select') {
      if (value && typeof value === 'object') return value[f.optionsLabel || 'name'] || '—'
      return '—'
    }
    if (f.type === 'multiselect') {
      if (!Array.isArray(value) || value.length === 0) return '—'
      return value.map((v) => (v && typeof v === 'object' ? v[f.optionsLabel || 'name'] : v)).join(', ')
    }
    if (f.type === 'checkbox') return value ? '✓' : '—'
    if (f.type === 'date') return value ? String(value).slice(0, 10) : ''
    return value ?? ''
  }

  return (
    <div className="resource-table">
      <h1>{title}</h1>

      <form className="resource-form" onSubmit={handleSubmit}>
        {fields.map((f) => renderInput(f))}
        <button type="submit" className="btn">
          <span>{editingId ? 'შენახვა' : 'დამატება'}</span>
        </button>
        {editingId && (
          <button type="button" className="btn-gray" onClick={cancelEdit}>
            <span>გაუქმება</span>
          </button>
        )}
      </form>

      {error && <p className="resource-error">{error}</p>}

      {loading ? (
        <p>იტვირთება...</p>
      ) : (
        <table>
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f.name}>{f.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                {fields.map((f) => (
                  <td key={f.name}>{renderCell(f, item)}</td>
                ))}
                <td className="resource-actions">
                  <button className="btn-gray btn-sm" onClick={() => startEdit(item)}>
                    <span>რედაქტირება</span>
                  </button>
                  <button className="btn-gray btn-sm" onClick={() => handleDelete(item._id)}>
                    <span>წაშლა</span>
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1}>ცარიელია</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
