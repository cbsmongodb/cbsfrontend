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

const WEEKDAYS = {
  ka: ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
}

const MONTHS = {
  ka: ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
}

function formatToday(locale) {
  const now = new Date()
  const weekdays = WEEKDAYS[locale] || WEEKDAYS.en
  const months = MONTHS[locale] || MONTHS.en
  const weekday = weekdays[now.getDay()]
  const month = months[now.getMonth()]
  const day = now.getDate()
  if (locale === 'en') return `${weekday}, ${month} ${day}`
  return `${weekday}, ${day} ${month}`
}

// WMO weather codes (Open-Meteo) collapsed into a few icon buckets
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
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="9" fill="#f4b740" />
        <g stroke="#f4b740" strokeWidth="2.4" strokeLinecap="round">
          <line x1="20" y1="2" x2="20" y2="7" />
          <line x1="20" y1="33" x2="20" y2="38" />
          <line x1="2" y1="20" x2="7" y2="20" />
          <line x1="33" y1="20" x2="38" y2="20" />
          <line x1="7" y1="7" x2="10.5" y2="10.5" />
          <line x1="29.5" y1="29.5" x2="33" y2="33" />
          <line x1="7" y1="33" x2="10.5" y2="29.5" />
          <line x1="29.5" y1="10.5" x2="33" y2="7" />
        </g>
      </svg>
    )
  }
  if (kind === 'cloud-sun') {
    return (
      <svg viewBox="0 0 40 40">
        <circle cx="15" cy="14" r="7" fill="#f4b740" />
        <path d="M10 30a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H10z" fill="#b9c4d4" />
      </svg>
    )
  }
  if (kind === 'rain') {
    return (
      <svg viewBox="0 0 40 40">
        <path d="M9 24a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#9aa7ba" />
        <g stroke="#4a90d9" strokeWidth="2.2" strokeLinecap="round">
          <line x1="13" y1="30" x2="11" y2="35" />
          <line x1="20" y1="30" x2="18" y2="35" />
          <line x1="27" y1="30" x2="25" y2="35" />
        </g>
      </svg>
    )
  }
  if (kind === 'snow') {
    return (
      <svg viewBox="0 0 40 40">
        <path d="M9 24a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#b9c4d4" />
        <g fill="#9fd3f0">
          <circle cx="13" cy="32" r="1.8" />
          <circle cx="20" cy="35" r="1.8" />
          <circle cx="27" cy="32" r="1.8" />
        </g>
      </svg>
    )
  }
  if (kind === 'storm') {
    return (
      <svg viewBox="0 0 40 40">
        <path d="M9 22a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#8792a3" />
        <path d="M21 24l-6 9h5l-3 7 9-11h-5l4-5z" fill="#f4b740" />
      </svg>
    )
  }
  if (kind === 'fog') {
    return (
      <svg viewBox="0 0 40 40">
        <g stroke="#aab3c0" strokeWidth="3" strokeLinecap="round">
          <line x1="6" y1="14" x2="34" y2="14" />
          <line x1="6" y1="20" x2="34" y2="20" />
          <line x1="6" y1="26" x2="26" y2="26" />
        </g>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 40">
      <path d="M9 24a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#b9c4d4" />
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

  const todayLabel = formatToday(locale)

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