'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import '@/components/ResourceTable/ResourceTable.css'

// Employee picker grouped by group: open it -> every group is a heading with its people under it.
// Typing searches names AND group names ("M1" shows the whole M1 group).
export default function GroupedEmployeePicker({ employees, groups = [], sections = [], value, onChange, placeholder, otherLabel = 'სხვა' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    const out = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [])

  const nameOf = (e) => e?.name || `${e?.firstName || ''} ${e?.lastName || ''}`.trim()
  const byId = useMemo(() => new Map(employees.map((e) => [String(e._id), e])), [employees])
  const selected = byId.get(String(value || ''))

  // groups in division order, each with the people this user may pick
  const buckets = useMemo(() => {
    const secName = new Map(sections.map((s) => [s.id, s.name]))
    const used = new Set()
    const list = groups
      .map((g) => {
        const people = (g.employees || []).map((id) => byId.get(String(id))).filter(Boolean)
          .sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
        people.forEach((p) => used.add(String(p._id)))
        return { id: g.id, name: g.name, sec: secName.get(g.section) || '', people }
      })
      .filter((b) => b.people.length)
      .sort((a, b) => (a.sec || 'я').localeCompare(b.sec || 'я') || a.name.localeCompare(b.name))
    const rest = employees.filter((e) => !used.has(String(e._id))).sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
    if (rest.length) list.push({ id: '_other', name: otherLabel, sec: '', people: rest })
    return list
  }, [groups, sections, employees, byId, otherLabel])

  const q = query.trim().toLowerCase()
  const shown = buckets
    .map((b) => (!q || b.name.toLowerCase().includes(q) ? b : { ...b, people: b.people.filter((p) => nameOf(p).toLowerCase().includes(q)) }))
    .filter((b) => b.people.length)
  const multiDiv = new Set(buckets.map((b) => b.sec).filter(Boolean)).size > 1

  function pick(id) { onChange(String(id)); setOpen(false); setQuery('') }

  return (
    <div className="searchable-select gep" ref={wrapRef}>
      <div className="searchable-select-control">
        <input
          type="text"
          className="field-input"
          style={{ width: '100%' }}
          placeholder={placeholder}
          value={open ? query : selected ? nameOf(selected) : ''}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
        />
        {selected && !open && (
          <button type="button" className="searchable-select-clear" onClick={() => onChange('')}>×</button>
        )}
        <span className={`gep-caret${open ? ' is-open' : ''}`} aria-hidden="true">▾</span>
      </div>
      {open && (
        <div className="searchable-select-dropdown gep-dropdown">
          {shown.map((b) => (
            <div key={b.id} className="gep-group">
              <div className="gep-head">
                <span>{b.name}</span>
                {multiDiv && b.sec && <small>{b.sec}</small>}
                <em>{b.people.length}</em>
              </div>
              {b.people.map((p) => (
                <button
                  key={`${b.id}-${p._id}`}
                  type="button"
                  className={`searchable-select-option gep-option${String(p._id) === String(value) ? ' is-selected' : ''}`}
                  onClick={() => pick(p._id)}
                >
                  {nameOf(p)}
                </button>
              ))}
            </div>
          ))}
          {shown.length === 0 && <div className="searchable-select-empty">—</div>}
        </div>
      )}
    </div>
  )
}
