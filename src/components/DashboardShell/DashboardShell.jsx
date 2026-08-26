'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar/Sidebar'
import './DashboardShell.css'

export default function DashboardShell({ children }) {
  const { locale } = useParams()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

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
    </div>
  )
}
