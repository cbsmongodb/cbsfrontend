"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import "./MultiSelectSearch.css";

export default function MultiSelectSearch({
  value = [],
  onChange,
  optionsEndpoint,
  optionsLabel = "name",
  placeholder = "ძებნა...",
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(optionsEndpoint)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOptions(Array.isArray(data) ? data : data.items || []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [optionsEndpoint]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o._id || o.id)),
    [options, selectedSet]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) =>
      String(o[optionsLabel] ?? "").toLowerCase().includes(q)
    );
  }, [options, query, optionsLabel]);

  const allFilteredSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((o) => selectedSet.has(o._id || o.id));

  function toggleOne(id) {
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function toggleAllFiltered() {
    const filteredIds = filteredOptions.map((o) => o._id || o.id);
    if (allFilteredSelected) {
      onChange(value.filter((v) => !filteredIds.includes(v)));
    } else {
      const merged = new Set([...value, ...filteredIds]);
      onChange([...merged]);
    }
  }

  function removeChip(id) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="mss-root" ref={rootRef}>
      <button
        type="button"
        className="mss-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mss-trigger-text">
          {value.length > 0 ? `არჩეულია: ${value.length}` : placeholder}
        </span>
        <span className={`mss-chevron ${open ? "mss-chevron-open" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mss-panel">
          <input
            autoFocus
            type="text"
            className="mss-search-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {loading ? (
            <div className="mss-empty">იტვირთება...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="mss-empty">არაფერი მოიძებნა</div>
          ) : (
            <>
              <label className="mss-option mss-select-all">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                />
                <span>ყველას მონიშვნა{query.trim() ? " (გაფილტრული)" : ""}</span>
              </label>

              <div className="mss-list">
                {filteredOptions.map((o) => {
                  const id = o._id || o.id;
                  return (
                    <label key={id} className="mss-option">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(id)}
                        onChange={() => toggleOne(id)}
                      />
                      <span>{o[optionsLabel]}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div className="mss-chips">
          {selectedOptions.map((o) => {
            const id = o._id || o.id;
            return (
              <span key={id} className="mss-chip">
                {o[optionsLabel]}
                <button
                  type="button"
                  className="mss-chip-remove"
                  onClick={() => removeChip(id)}
                  aria-label={`${o[optionsLabel]} ამოშლა`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
