'use client'

import { useEffect, useRef, useState } from 'react'

export default function SearchableSelect({ options, value, onChange, getLabel, placeholder, onCreate }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
        setCreateError('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const safeLabel = (o) => getLabel(o) || ''

  const selected = options.find((o) => o._id === value)
  const displayValue = open ? query : selected ? safeLabel(selected) : ''

  const filtered = options
    .filter((o) => safeLabel(o).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40)

  const exactMatch = options.some((o) => safeLabel(o).toLowerCase() === query.trim().toLowerCase())
  const showCreateOption = onCreate && query.trim().length > 0 && !exactMatch

  function pick(opt) {
    onChange(opt._id)
    setQuery('')
    setOpen(false)
    setCreateError('')
  }

  function clear() {
    onChange('')
    setQuery('')
  }

  async function handleCreate() {
    setCreating(true)
    setCreateError('')
    try {
      const created = await onCreate(query.trim())
      pick(created)
    } catch (err) {
      setCreateError(err.message || 'ვერ შეიქმნა')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="searchable-select" ref={wrapRef}>
      <div className="searchable-select-control">
        <input
          type="text"
          className="field-input"
          style={{ width: '100%' }}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setCreateError('')
          }}
          onFocus={() => {
            setQuery('')
            setOpen(true)
          }}
        />
        {selected && !open && (
          <button type="button" className="searchable-select-clear" onClick={clear}>
            ×
          </button>
        )}
      </div>

      {open && (filtered.length > 0 || showCreateOption) && (
        <div className="searchable-select-dropdown">
          {filtered.map((opt) => (
            <button
              key={opt._id}
              type="button"
              className="searchable-select-option"
              onClick={() => pick(opt)}
            >
              {safeLabel(opt)}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              className="searchable-select-create"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? '...' : `+ შექმენი "${query.trim()}"`}
            </button>
          )}
        </div>
      )}

      {open && query && filtered.length === 0 && !showCreateOption && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-empty">ვერაფერი მოიძებნა</div>
        </div>
      )}

      {createError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{createError}</p>}
    </div>
  )
}
