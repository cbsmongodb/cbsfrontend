'use client'

import { useEffect, useState } from 'react'
import Dashboard from "@/components/Dashboard/Dashboard"
import DirectorDashboard from "@/components/DirectorDashboard/DirectorDashboard"

const DEVELOPER_EMAIL = 'lbogveradze12@gmail.com'

export default function DashboardPage() {
  const [employee, setEmployee] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('employee')
    if (stored) setEmployee(JSON.parse(stored))
  }, [])

  if (!employee) return <Dashboard />

  const position = employee.designation?.position
  const isDeveloper = employee.email?.toLowerCase() === DEVELOPER_EMAIL

  if (isDeveloper) {
    return (
      <>
        <DirectorDashboard />
        <div style={{ height: 32, borderTop: '1px solid #e9ebef', marginTop: 32 }} />
        <Dashboard />
      </>
    )
  }

  if (position === 'Director') {
    return <DirectorDashboard />
  }

  return <Dashboard />
}
