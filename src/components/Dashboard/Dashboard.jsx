'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import TodayVisits from '@/components/Plannings/TodayVisits'
import './Dashboard.css'

function currentYear() {
  return new Date().getFullYear()
}

function initials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()
}

const DATE_LOCALES = { ka: 'ka-GE', en: 'en-US', ru: 'ru-RU' }

// WMO weather codes (Open-Meteo) collapsed into a few simple icon buckets
function weatherIconKind(code) {
  if (code === 0) return 'sun'
  if ([1, 2, 3].includes(code)) return 'cloud-sun'
  if ([45, 48].includes(code)) return 'fog'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  if ([95, 96, 99].includes(code)) return 'storm'
  return 'cloud-sun'
}

function WeatherIcon({ kind }) {
  if (kind === 'sun') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
      </svg>
    )
  }
  if (kind === 'rain') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16.5a4.5 4.5 0 0 1 .5-8.97A6 6 0 0 1 19 9.5a4 4 0 0 1-1 7.9H7z" />
        <path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" />
      </svg>
    )
  }
  if (kind === 'snow') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16.5a4.5 4.5 0 0 1 .5-8.97A6 6 0 0 1 19 9.5a4 4 0 0 1-1 7.9H7z" />
        <path d="M9 19v3M12 19v3M15 19v3" strokeDasharray="1 2" />
      </svg>
    )
  }
  if (kind === 'storm') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 15.5a4.5 4.5 0 0 1 .5-8.97A6 6 0 0 1 19 8.5a4 4 0 0 1-1 7h-3" />
        <path d="M13 14l-2.5 4h2L11 21" />
      </svg>
    )
  }
  if (kind === 'fog') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h13M3 12h18M3 16h13" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="10" r="3.2" />
      <path d="M13 16.5a3.5 3.5 0 0 0-.5-6.97A5 5 0 0 0 3 11" />
      <path d="M6.5 17h11a3 3 0 0 0 0-6 4.7 4.7 0 0 0-.4.02" />
    </svg>
  )
}

export default function Dashboard() {
  const t = useTranslations('dashboard')
  const { locale } = useParams()
  const [employee, setEmployee] = useState(null)

  const [balance, setBalance] = useState(null)
  const [checkinStatus, setCheckinStatus] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&current_weather=true')
      .then((r) => r.json())
      .then((data) => setWeather(data.current_weather))
      .catch(() => {})
  }, [])

  const dateLocale = DATE_LOCALES[locale] || 'en-US'
  const todayLabel = new Intl.DateTimeFormat(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

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
        <div className="dashboard-hero-left">
          <div className="dashboard-avatar">{initials(employee?.firstName, employee?.lastName)}</div>
          <div className="dashboard-hero-text">
            <div className="dashboard-greeting">{getGreeting()}</div>
            <h1 className="dashboard-name">
              {employee?.firstName} {employee?.lastName}
            </h1>
            {employee?.role?.name && <span className="dashboard-role-badge">{employee.role.name}</span>}
          </div>
        </div>
        <div className="dashboard-hero-right">
          <div className="dashboard-date-weather">
            <span className="ddw-date">{todayLabel}</span>
            {weather && (
              <>
                <span className="ddw-sep" />
                <span className="ddw-weather">
                  <span className="ddw-weather-icon">
                    <WeatherIcon kind={weatherIconKind(weather.weathercode)} />
                  </span>
                  {Math.round(weather.temperature)}°
                </span>
              </>
            )}
          </div>
          <Link href={`/${locale}/dashboard/change-password`} className="dashboard-change-password-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            პაროლის შეცვლა
          </Link>
        </div>
      </div>

      {!loading && (checkinStatus || balance) && (
        <div className="dashboard-stat-strip">
          {checkinStatus && (
            <div className={`dashboard-stat ${checkinStatus.state === 'open' ? 'is-live' : ''}`}>
              <span className="dashboard-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div className="dashboard-stat-text">
                <span className="dashboard-stat-label">{t('status.label')}</span>
                {checkinStatus.state === 'open' && (
                  <>
                    <span className="dashboard-stat-value is-live">
                      <span className="live-dot" />
                      {t('status.live')}
                    </span>
                    {checkinStatus.hospitalName && (
                      <span className="dashboard-stat-sub">{checkinStatus.hospitalName}</span>
                    )}
                  </>
                )}
                {checkinStatus.state === 'done' && (
                  <span className="dashboard-stat-value">{t('status.done', { count: checkinStatus.count })}</span>
                )}
                {checkinStatus.state === 'none' && (
                  <span className="dashboard-stat-value muted">{t('status.none')}</span>
                )}
              </div>
            </div>
          )}

          {balance && (
            <div className="dashboard-stat">
              <span className="dashboard-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div className="dashboard-stat-text">
                <span className="dashboard-stat-label">{t('leaveBalance.label')}</span>
                <div className="dashboard-stat-leave-rows">
                  <span className="dashboard-stat-leave-row">
                    <span>{t('leaveBalance.paid')}</span>
                    <strong>{balance.paid.remaining} / {balance.paid.total}</strong>
                  </span>
                  <span className="dashboard-stat-leave-row">
                    <span>{t('leaveBalance.sick')}</span>
                    <strong>{balance.sick.remaining} / {balance.sick.total}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* temporarily hidden — flip to `true` to bring back */}
          {false && (
            <Link href={`/${locale}/dashboard/notifications`} className="dashboard-stat dashboard-stat-link">
              <span className="dashboard-stat-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </span>
              <div className="dashboard-stat-text">
                <span className="dashboard-stat-label">{t('notifications.label')}</span>
                {unreadCount > 0 ? (
                  <span className="dashboard-stat-badge">{t('notifications.unread', { count: unreadCount })}</span>
                ) : (
                  <span className="dashboard-stat-value muted">{t('notifications.none')}</span>
                )}
              </div>
            </Link>
          )}
        </div>
      )}

      {!loading && employee?.employeeType === 'field' && (
        <div className="dashboard-today-visits-section">
          <TodayVisits />
        </div>
      )}
    </div>
  )
}