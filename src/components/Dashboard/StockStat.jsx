'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'

// Dashboard tile for whoever can see the Stocks page (Accountant's assistant,
// Director, admin): latest uploaded month + a reminder if this month is missing.
function canSee() {
  try {
    const emp = JSON.parse(localStorage.getItem('employee') || 'null')
    if (emp?.role?.name?.toLowerCase() === 'admin') return true
    return emp?.role?.privileges?.stock_upload?.read === 1
  } catch {
    return false
  }
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function StockStat({ locale }) {
  const t = useTranslations('stockUpload')
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (!canSee()) return
    apiFetch('/api/stocks/periods')
      .then((periods) => {
        const cur = currentMonth()
        setInfo({ latest: periods[0] || null, currentUploaded: periods.some((p) => p.period === cur) })
      })
      .catch(() => {})
  }, [])

  if (!info) return null

  return (
    <Link href={`/${locale}/dashboard/stocks`} className="dashboard-stat dashboard-stat-link">
      <span className="dashboard-stat-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      </span>
      <div className="dashboard-stat-text">
        <span className="dashboard-stat-label">{t('title')}</span>
        {info.latest ? (
          <span className="dashboard-stat-value">{t('dashLatest', { period: info.latest.period, count: info.latest.count })}</span>
        ) : (
          <span className="dashboard-stat-value muted">{t('noHistory')}</span>
        )}
        {!info.currentUploaded && (
          <span className="dashboard-stat-sub" style={{ color: '#b45309' }}>{t('dashMissing')}</span>
        )}
      </div>
    </Link>
  )
}
