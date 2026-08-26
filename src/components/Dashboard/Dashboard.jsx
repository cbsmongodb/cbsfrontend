'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export default function Dashboard() {
  const t = useTranslations('dashboard')
  const [employee, setEmployee] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('employee')
    if (stored) setEmployee(JSON.parse(stored))
  }, [])

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>
        {employee?.firstName} {employee?.lastName} — {employee?.role?.name}
      </p>
    </div>
  )
}
