'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

// the drug / hospital import pages open only for admin, director and Tea Kobelashvili
export default function ImportGate({ children }) {
  const [ok, setOk] = useState(null)
  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((me) => setOk(!!me?.canImport))
      .catch(() => setOk(false))
  }, [])
  if (ok === null) return null
  if (!ok) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
        ამ გვერდზე წვდომა არ გაქვთ
      </div>
    )
  }
  return children
}
