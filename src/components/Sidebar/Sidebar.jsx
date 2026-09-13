'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import CheckInButton from './CheckInButton'
import './Sidebar.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const RESOURCE_KEY = {
  'dashboard/live-feeds': 'attendances',
  'dashboard/team-status': 'attendances',
  'dashboard/attendance-status': 'attendances',
  'dashboard/drugs': 'drugs',
  'dashboard/drugs/import': 'drugs',
  'dashboard/product-types': 'product_types',
  'dashboard/manufacturers': 'manufacturers',
  'dashboard/producing-countries': 'manufacturer_countries',
  'dashboard/doctors': 'doctors',
  'dashboard/doctor-categories': 'doctor_categories',
  'dashboard/doctor-subcategories': 'doctor_sub_categories',
  'dashboard/hospitals': 'hospitals',
  'dashboard/hospitals/import': 'hospitals',
  'dashboard/pharmacies': 'pharmacies',
  'dashboard/profiles': 'profiles',
  'dashboard/plannings': 'plannings',
  'dashboard/doctor-entry-items': 'sales',
  'dashboard/sales-listing': 'sales',
  'dashboard/reports/efficiency': 'efficiency_report',
  'dashboard/reports/reimbursement': 'reimbursement_report',
  'dashboard/reports/attendances': 'attendances',
  'dashboard/employees': 'employees',
  'dashboard/employees/import': 'employees',
  'dashboard/roles': 'roles',
  'dashboard/designations': 'designations',
  'dashboard/sections': 'sections',
  'dashboard/groups': 'groups',
  'dashboard/regions': 'regions',
  'dashboard/divisions': 'regions',
  'dashboard/leaves': 'leaves',
}

function hasAccess(privileges, isAdmin, href) {
  if (isAdmin) return true
  const key = RESOURCE_KEY[href]
  if (!key) return true
  if (!privileges) return false
  return !!privileges[key]?.read
}

// --- icons — one per top-level link and per group, stroke-based, 18px ---
const Icon = {
  dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  liveFeed: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.2" />
      <path d="M7.5 7.5a6.5 6.5 0 0 0 0 9M16.5 7.5a6.5 6.5 0 0 1 0 9M4.5 4.5a11 11 0 0 0 0 15M19.5 4.5a11 11 0 0 1 0 15" />
    </svg>
  ),
  teamStatus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
      <circle cx="17.5" cy="8.5" r="2.3" />
      <path d="M15.7 14.2c2.7.4 4.8 2.4 4.8 5.3" />
    </svg>
  ),
  attendanceStatus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2.2" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
      <path d="M8.5 14.2l2 2 4-4.2" />
    </svg>
  ),
  configureProduct: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="9.5" width="15" height="8" rx="4" transform="rotate(-35 12 13.5)" />
      <line x1="10.2" y1="10.5" x2="13.6" y2="16.3" transform="rotate(-35 12 13.5)" />
    </svg>
  ),
  configureMarket: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V8l8-4 8 4v13" />
      <path d="M9 21v-6h6v6M4 21h16" />
      <line x1="12" y1="7" x2="12" y2="10.5" />
      <line x1="10.3" y1="8.7" x2="13.7" y2="8.7" />
    </svg>
  ),
  planningSales: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.2" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
      <path d="M7.5 13.2l2.6 2.6 6-6.2" />
    </svg>
  ),
  reports: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="20" x2="5" y2="12" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="19" y1="20" x2="19" y2="15" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  ),
  administration: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3.2v5.3c0 4.4-3 8.2-7 9.3-4-1.1-7-4.9-7-9.3V6.2L12 3z" />
      <path d="M9.3 12.2l1.9 1.9 3.6-3.8" />
    </svg>
  ),
}

const NAV = [
  { type: 'link', href: 'dashboard', key: 'dashboard', icon: 'dashboard' },
  { type: 'link', href: 'dashboard/live-feeds', key: 'liveFeed', icon: 'liveFeed' },
  { type: 'link', href: 'dashboard/team-status', key: 'teamStatus', icon: 'teamStatus' },
  { type: 'link', href: 'dashboard/attendance-status', key: 'attendanceStatus', icon: 'attendanceStatus' },
  {
    type: 'group',
    id: 'configureProduct',
    icon: 'configureProduct',
    items: [
      { href: 'dashboard/drugs', key: 'drugs' },
      { href: 'dashboard/drugs/import', key: 'drugsImport' },
      { href: 'dashboard/product-types', key: 'productTypes' },
      { href: 'dashboard/manufacturers', key: 'manufacturers' },
      { href: 'dashboard/producing-countries', key: 'producingCountries' },
    ],
  },
  {
    type: 'group',
    id: 'configureMarket',
    icon: 'configureMarket',
    items: [
      { href: 'dashboard/doctors', key: 'doctors' },
      { href: 'dashboard/doctor-categories', key: 'doctorCategories' },
      { href: 'dashboard/doctor-subcategories', key: 'doctorSubcategories' },
      { href: 'dashboard/hospitals', key: 'hospitals' },
      { href: 'dashboard/hospitals/import', key: 'hospitalsImport' },
      { href: 'dashboard/pharmacies', key: 'pharmacies' },
      { href: 'dashboard/profiles', key: 'profiles' },
    ],
  },
  {
    type: 'group',
    id: 'planningSales',
    icon: 'planningSales',
    items: [
      { href: 'dashboard/plannings', key: 'plannings' },
      { href: 'dashboard/doctor-entry-items', key: 'doctorEntryItems' },
      { href: 'dashboard/sales-listing', key: 'salesListing' },
    ],
  },
  {
    type: 'group',
    id: 'reports',
    icon: 'reports',
    items: [
      { href: 'dashboard/reports/efficiency', key: 'efficiency' },
      { href: 'dashboard/reports/reimbursement', key: 'reimbursement' },
      { href: 'dashboard/reports/attendances', key: 'attendances' },
    ],
  },
  {
    type: 'group',
    id: 'administration',
    icon: 'administration',
    items: [
      { href: 'dashboard/employees', key: 'employees' },
      { href: 'dashboard/employees/import', key: 'employeesImport' },
      { href: 'dashboard/roles', key: 'roles' },
      { href: 'dashboard/designations', key: 'designations' },
      { href: 'dashboard/sections', key: 'sections' },
      { href: 'dashboard/groups', key: 'groups' },
      { href: 'dashboard/regions', key: 'regions' },
      { href: 'dashboard/divisions', key: 'divisions' },
      { href: 'dashboard/leaves', key: 'leaves' },
    ],
  },
]

function initials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()
}

export default function Sidebar() {
  const { locale } = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('sidebar')

  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const [employee, setEmployee] = useState(null)
  useEffect(() => {
    const stored = localStorage.getItem('employee')
    if (stored) setEmployee(JSON.parse(stored))
  }, [])
  const isAdmin = employee?.role?.name?.toLowerCase() === 'admin'
  const privileges = employee?.role?.privileges

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    async function loadUnread() {
      try {
        const data = await apiFetch('/api/notifications')
        setUnreadCount(data.filter((n) => !n.read).length)
      } catch (err) {
        console.error('loadUnread failed:', err)
      }
    }
    loadUnread()
    const interval = setInterval(loadUnread, 60000)

    let socket
    if (API_URL) {
      socket = io(API_URL, { transports: ['websocket'] })
      socket.on('notification:new', (payload) => {
        const stored = localStorage.getItem('employee')
        const myId = stored ? JSON.parse(stored)?._id : null
        if (myId && String(payload.employeeId) === String(myId)) {
          loadUnread()
        }
      })
    }

    window.addEventListener('notifications-updated', loadUnread)

    return () => {
      clearInterval(interval)
      if (socket) socket.disconnect()
      window.removeEventListener('notifications-updated', loadUnread)
    }
  }, [])

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {}
    NAV.forEach((entry) => {
      if (entry.type === 'group') {
        initial[entry.id] = entry.items.some(
          (item) => pathname === `/${locale}/${item.href}`
        )
      }
    })
    return initial
  })

  function toggleGroup(id) {
    setOpenGroups((prev) => {
      const isCurrentlyOpen = prev[id]
      const next = {}
      NAV.forEach((entry) => {
        if (entry.type === 'group') next[entry.id] = false
      })
      next[id] = !isCurrentlyOpen
      return next
    })
  }

  function switchLocale(newLocale) {
    const segments = pathname.split('/')
    segments[1] = newLocale
    router.push(segments.join('/'))
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('employee')
    router.replace(`/${locale}/login`)
  }

  function handleNavigate() {
    setMobileOpen(false)
  }

  return (
    <>
      {!mobileOpen && (
        <button
          type="button"
          className="sidebar-hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label={t('openMenu')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="14" y2="17" />
          </svg>
        </button>
      )}

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label={t('closeMenu')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="brand-row">
          <span className="brand-cbs">Global CBS</span>
          <div className="lang-switcher">
            {['ka', 'en', 'ru'].map((l) => (
              <button
                key={l}
                type="button"
                className={locale === l ? 'active' : ''}
                onClick={() => switchLocale(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {employee && (
          <div className="identity-chip">
            <span className="identity-avatar">{initials(employee.firstName, employee.lastName)}</span>
            <div className="identity-text">
              <span className="identity-name">
                {employee.firstName} {employee.lastName}
              </span>
              {employee.role?.name && <span className="identity-role">{employee.role.name}</span>}
            </div>
          </div>
        )}

        <div className="checkin-slot">
          <CheckInButton />
        </div>

        <nav className="sidebar-nav">
          {NAV.map((entry) => {
            if (entry.type === 'link') {
              if (!hasAccess(privileges, isAdmin, entry.href)) return null
              const href = `/${locale}/${entry.href}`
              const active = pathname === href
              const IconComp = Icon[entry.icon]
              return (
                <Link key={href} href={href} className={active ? 'active' : ''} onClick={handleNavigate}>
                  <span className="nav-icon">{IconComp && <IconComp />}</span>
                  <span className="nav-label">{t(entry.key)}</span>
                  {entry.href === 'dashboard/notifications' && unreadCount > 0 && (
                    <span className="sidebar-nav-badge">{unreadCount}</span>
                  )}
                </Link>
              )
            }

            const visibleItems = entry.items.filter((item) => hasAccess(privileges, isAdmin, item.href))
            if (visibleItems.length === 0) return null

            const isOpen = openGroups[entry.id]
            const GroupIcon = Icon[entry.icon]
            return (
              <div key={entry.id} className="sidebar-group">
                <button
                  type="button"
                  className={`sidebar-group-header${isOpen ? ' open' : ''}`}
                  onClick={() => toggleGroup(entry.id)}
                >
                  <span className="nav-icon">{GroupIcon && <GroupIcon />}</span>
                  <span className="nav-label">{t(`groups.${entry.id}.label`)}</span>
                  <span className="sidebar-chevron">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 6 15 12 9 18" />
                    </svg>
                  </span>
                </button>

                <div className={`sidebar-group-items-wrapper${isOpen ? ' open' : ''}`}>
                  <div className="sidebar-group-items">
                    {visibleItems.map((item) => {
                      const href = `/${locale}/${item.href}`
                      const active = pathname === href
                      return (
                        <Link key={href} href={href} className={active ? 'active' : ''} onClick={handleNavigate}>
                          {t(`groups.${entry.id}.${item.key}`)}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{t('logout')}</span>
        </button>
      </aside>
    </>
  )
}