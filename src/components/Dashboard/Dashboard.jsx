'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import './Dashboard.css'

function currentYear() {
  return new Date().getFullYear()
}

export default function Dashboard() {
  const t = useTranslations('dashboard')
  const { locale } = useParams()
  const [employee, setEmployee] = useState(null)

  const [balance, setBalance] = useState(null)
  const [checkinStatus, setCheckinStatus] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('employee')
    if (stored) setEmployee(JSON.parse(stored))
  }, [])

  useEffect(() => {
    if (!employee?._id) return

    async function loadWidgets() {
      try {
        const [balanceData, dayData, notifications] = await Promise.all([
          apiFetch(`/api/leaves/balance?employee=${employee._id}&year=${currentYear()}`),
          apiFetch(`/api/attendance/employee-day?employeeId=${employee._id}`),
          apiFetch('/api/notifications'),
        ])

        setBalance(balanceData)

        const openVisit = dayData.visits?.find((v) => v.checkinTime && !v.checkoutTime)
        if (openVisit) {
          setCheckinStatus({ state: 'open', hospitalName: openVisit.hospitalName })
        } else if (dayData.visits?.length > 0) {
          setCheckinStatus({ state: 'done', count: dayData.visits.length })
        } else {
          setCheckinStatus({ state: 'none' })
        }

        setUnreadCount(notifications.filter((n) => !n.read).length)
      } catch (err) {
        console.error('dashboard widgets failed:', err)
      } finally {
        setLoading(false)
      }
    }

    loadWidgets()
  }, [employee])

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>
        {employee?.firstName} {employee?.lastName} — {employee?.role?.name}
      </p>

      {!loading && (
        <div className="dashboard-widgets">
          {checkinStatus && (
            <div className="dashboard-widget">
              <div className="dashboard-widget-label">დღევანდელი სტატუსი</div>
              {checkinStatus.state === 'open' && (
                <div className="dashboard-widget-main live">
                  🟢 ამჟამად ველზე ხართ
                  {checkinStatus.hospitalName && (
                    <div className="dashboard-widget-sub">{checkinStatus.hospitalName}</div>
                  )}
                </div>
              )}
              {checkinStatus.state === 'done' && (
                <div className="dashboard-widget-main">
                  ✓ დღეს {checkinStatus.count} ვიზიტი დაფიქსირდა
                </div>
              )}
              {checkinStatus.state === 'none' && (
                <div className="dashboard-widget-main muted">დღეს ჯერ არ დაჩექინებულხართ</div>
              )}
            </div>
          )}

          {balance && (
            <div className="dashboard-widget">
              <div className="dashboard-widget-label">შვებულების ბალანსი</div>
              <div className="dashboard-widget-leave-row">
                <span>ანაზღაურებადი</span>
                <strong>{balance.paid.remaining} / {balance.paid.total}</strong>
              </div>
              <div className="dashboard-widget-leave-row">
                <span>ავადმყოფობის</span>
                <strong>{balance.sick.remaining} / {balance.sick.total}</strong>
              </div>
            </div>
          )}

          <Link href={`/${locale}/dashboard/notifications`} className="dashboard-widget dashboard-widget-link">
            <div className="dashboard-widget-label">შეტყობინებები</div>
            <div className="dashboard-widget-main">
              {unreadCount > 0 ? (
                <span className="dashboard-widget-badge">{unreadCount} ახალი</span>
              ) : (
                <span className="muted">ახალი შეტყობინება არ არის</span>
              )}
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
