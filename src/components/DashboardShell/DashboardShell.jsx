'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar/Sidebar'
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle'
import './DashboardShell.css'

export default function DashboardShell({ children }) {
  const { locale } = useParams()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  // noWheelNumbers: scrolling the mouse over a number box must NOT change it
  // (100 -> 99) - the box loses focus and the page scrolls instead
  useEffect(() => {
    function onWheel(e) {
      const el = e.target
      if (el instanceof HTMLInputElement && el.type === 'number' && el === document.activeElement) {
        el.blur()
      }
    }
    document.addEventListener('wheel', onWheel, { passive: true, capture: true })
    return () => document.removeEventListener('wheel', onWheel, { capture: true })
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace(`/${locale}/login`)
      return
    }
    setChecked(true)
  }, [locale, router])

  if (!checked) return null

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="dashboard-content">{children}</main>
      <ThemeToggle />
    </div>
  )
}
