'use client'

import { useEffect, useRef, useState } from 'react'
import './ResourceTable.css'

export default function SearchableSelect({ options, value, onChange, getLabel, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = options.find((o) => o._id === value)
  const displayValue = open ? query : selected ? getLabel(selected) : ''

  const filtered = options
    .filter((o) => getLabel(o).toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40)

  function pick(opt) {
    onChange(opt._id)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange('')
    setQuery('')
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

      {open && (
        <div className="searchable-select-dropdown">
          {filtered.length === 0 && <div className="searchable-select-empty">ვერაფერი მოიძებნა</div>}
          {filtered.map((opt) => (
            <button
              key={opt._id}
              type="button"
              className="searchable-select-option"
              onClick={() => pick(opt)}
            >
              {getLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
