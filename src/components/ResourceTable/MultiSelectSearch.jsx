'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import './MultiSelectSearch.css'

export default function MultiSelectSearch({ options, selected, optionsLabel, placeholder, onChange }) {
  const t = useTranslations('resourceTable')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const labelKey = optionsLabel || 'name'
  const selectedList = selected || []
  const selectedSet = useMemo(() => new Set(selectedList), [selectedList])
  const selectedItems = options.filter((o) => selectedSet.has(o._id))

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter((o) => (o[labelKey] || '').toLowerCase().includes(q))
  }, [options, query, labelKey])

  const allFilteredSelected =
    filteredOptions.length > 0 && filteredOptions.every((o) => selectedSet.has(o._id))

  function toggleOne(id) {
    if (selectedSet.has(id)) {
      onChange(selectedList.filter((v) => v !== id))
    } else {
      onChange([...selectedList, id])
    }
  }

  function toggleAllFiltered() {
    const filteredIds = filteredOptions.map((o) => o._id)
    if (allFilteredSelected) {
      onChange(selectedList.filter((v) => !filteredIds.includes(v)))
    } else {
      const merged = new Set([...selectedList, ...filteredIds])
      onChange([...merged])
    }
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div className="mss-root">
      <button type="button" className="mss-trigger" onClick={() => setOpen(true)}>
        <span className="mss-trigger-text">
          {selectedItems.length > 0 ? `არჩეულია: ${selectedItems.length}` : placeholder}
        </span>
        <span className="mss-trigger-icon">+</span>
      </button>

      {open && (
        <div className="mss-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="mss-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mss-modal-header">
              <span>{placeholder}</span>
              <button type="button" className="mss-modal-close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <input
              autoFocus
              type="text"
              className="mss-search-input"
              placeholder="ძებნა..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="mss-modal-toolbar">
              <label className="mss-row mss-row-all">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />
                <span>ყველას მონიშვნა{query.trim() ? ' (გაფილტრული)' : ''}</span>
              </label>
              {selectedItems.length > 0 && (
                <button type="button" className="mss-clear-all" onClick={clearAll}>
                  ყველას გასუფთავება
                </button>
              )}
            </div>

            <div className="mss-list">
              {filteredOptions.length === 0 ? (
                <div className="mss-empty">{t('noOptionsFound')}</div>
              ) : (
                filteredOptions.map((o) => (
                  <label key={o._id} className="mss-row">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(o._id)}
                      onChange={() => toggleOne(o._id)}
                    />
                    <span>{o[labelKey]}</span>
                  </label>
                ))
              )}
            </div>

            <div className="mss-modal-footer">
              <span className="mss-modal-count">არჩეულია: {selectedItems.length}</span>
              <button type="button" className="mss-modal-done" onClick={() => setOpen(false)}>
                დასრულება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
