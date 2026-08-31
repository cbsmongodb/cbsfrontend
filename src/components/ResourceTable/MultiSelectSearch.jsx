'use client'

import { useEffect, useRef, useState } from 'react'

export default function MultiSelectSearch({ options, selected, optionsLabel, placeholder, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedSet = new Set(selected)
  const selectedItems = options.filter((o) => selectedSet.has(o._id))
  const labelKey = optionsLabel || 'name'

  const filtered = options
    .filter((o) => !selectedSet.has(o._id))
    .filter((o) => (o[labelKey] || '').toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30)

  function addItem(id) {
    onChange([...selected, id])
    setQuery('')
  }

  function removeItem(id) {
    onChange(selected.filter((v) => v !== id))
  }

  return (
    <div className="mss-wrap" ref={wrapRef}>
      <div className="mss-control" onClick={() => setOpen(true)}>
        {selectedItems.map((item) => (
          <span key={item._id} className="mss-tag">
            {item[labelKey]}
            <button
              type="button"
              className="mss-tag-remove"
              onClick={(e) => {
                e.stopPropagation()
                removeItem(item._id)
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          className="mss-input"
          placeholder={selectedItems.length === 0 ? placeholder : ''}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="mss-dropdown">
          {filtered.map((o) => (
            <button
              key={o._id}
              type="button"
              className="mss-option"
              onClick={() => addItem(o._id)}
            >
              {o[labelKey]}
            </button>
          ))}
        </div>
      )}

      {open && query && filtered.length === 0 && (
        <div className="mss-dropdown">
          <div className="mss-empty">ვერაფერი მოიძებნა</div>
        </div>
      )}
    </div>
  )
}
