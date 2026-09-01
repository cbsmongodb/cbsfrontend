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

function initials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()
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
          const hospitalName =
            openVisit.hospitalName === 'სტანდარტული ჩექინი'
              ? t('status.standaloneCheckin')
              : openVisit.hospitalName
          setCheckinStatus({ state: 'open', hospitalName })
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

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 6) return t('greeting.night')
    if (h < 12) return t('greeting.morning')
    if (h < 18) return t('greeting.day')
    return t('greeting.evening')
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-avatar">{initials(employee?.firstName, employee?.lastName)}</div>
        <div className="dashboard-hero-text">
          <div className="dashboard-greeting">{getGreeting()}</div>
          <h1 className="dashboard-name">
            {employee?.firstName} {employee?.lastName}
          </h1>
          {employee?.role?.name && <span className="dashboard-role-badge">{employee.role.name}</span>}
        </div>
      </div>

      {!loading && (
        <div className="dashboard-widgets">
          {checkinStatus && (
            <div className={`dashboard-widget ${checkinStatus.state === 'open' ? 'accent-green' : checkinStatus.state === 'done' ? 'accent-blue' : 'accent-gray'}`}>
              <div className="dashboard-widget-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="dashboard-widget-label">{t('status.label')}</div>
              {checkinStatus.state === 'open' && (
                <>
                  <div className="dashboard-widget-main live">{t('status.live')}</div>
                  {checkinStatus.hospitalName && (
                    <div className="dashboard-widget-sub">{checkinStatus.hospitalName}</div>
                  )}
                </>
              )}
              {checkinStatus.state === 'done' && (
                <div className="dashboard-widget-main">{t('status.done', { count: checkinStatus.count })}</div>
              )}
              {checkinStatus.state === 'none' && (
                <div className="dashboard-widget-main muted">{t('status.none')}</div>
              )}
            </div>
          )}

          {balance && (
            <div className="dashboard-widget accent-blue">
              <div className="dashboard-widget-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="dashboard-widget-label">{t('leaveBalance.label')}</div>
              <div className="dashboard-widget-leave-row">
                <span>{t('leaveBalance.paid')}</span>
                <strong>{balance.paid.remaining} / {balance.paid.total}</strong>
              </div>
              <div className="dashboard-widget-leave-row">
                <span>{t('leaveBalance.sick')}</span>
                <strong>{balance.sick.remaining} / {balance.sick.total}</strong>
              </div>
            </div>
          )}

          <Link href={`/${locale}/dashboard/notifications`} className="dashboard-widget dashboard-widget-link accent-gray">
            <div className="dashboard-widget-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="dashboard-widget-label">{t('notifications.label')}</div>
            <div className="dashboard-widget-main">
              {unreadCount > 0 ? (
                <span className="dashboard-widget-badge">{t('notifications.unread', { count: unreadCount })}</span>
              ) : (
                <span className="muted">{t('notifications.none')}</span>
              )}
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
