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

const NAV = [
  { type: 'link', href: 'dashboard', key: 'dashboard' },
  { type: 'link', href: 'dashboard/notifications', key: 'notifications' },
  { type: 'link', href: 'dashboard/live-feeds', key: 'liveFeed' },
  { type: 'link', href: 'dashboard/team-status', key: 'teamStatus' },
  {
    type: 'group',
    id: 'configureProduct',
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
    items: [
      { href: 'dashboard/plannings', key: 'plannings' },
      { href: 'dashboard/doctor-entry-items', key: 'doctorEntryItems' },
      { href: 'dashboard/sales-listing', key: 'salesListing' },
    ],
  },
  {
    type: 'group',
    id: 'reports',
    items: [
      { href: 'dashboard/reports/efficiency', key: 'efficiency' },
      { href: 'dashboard/reports/reimbursement', key: 'reimbursement' },
      { href: 'dashboard/reports/attendances', key: 'attendances' },
    ],
  },
  {
    type: 'group',
    id: 'administration',
    items: [
      { href: 'dashboard/employees', key: 'employees' },
      { href: 'dashboard/roles', key: 'roles' },
      { href: 'dashboard/designations', key: 'designations' },
      { href: 'dashboard/sections', key: 'sections' },
      { href: 'dashboard/groups', key: 'groups' },
      { href: 'dashboard/regions', key: 'regions' },
      { href: 'dashboard/divisions', key: 'divisions' },
      { href: 'dashboard/leaves', key: 'leaves' },
      { href: 'dashboard/settings', key: 'settings' },
    ],
  },
]

export default function Sidebar() {
  const { locale } = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('sidebar')

  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
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
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="brand-header">
          <div className="brand-text">
            <span className="brand-cbs">Global CBS</span>
          </div>
        </div>

        <div className="lang-switcher">
          {['en', 'ka', 'ru'].map((l) => (
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

        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label={t('closeMenu')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <CheckInButton />

        <nav className="sidebar-nav">
          {NAV.map((entry) => {
            if (entry.type === 'link') {
              const href = `/${locale}/${entry.href}`
              const active = pathname === href
              return (
                <Link key={href} href={href} className={active ? 'active' : ''} onClick={handleNavigate}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    {t(entry.key)}
                    {entry.href === 'dashboard/notifications' && unreadCount > 0 && (
                      <span className="sidebar-nav-badge">{unreadCount}</span>
                    )}
                  </span>
                </Link>
              )
            }

            const isOpen = openGroups[entry.id]
            return (
              <div key={entry.id} className="sidebar-group">
                <button
                  type="button"
                  className={`sidebar-group-header${isOpen ? ' open' : ''}`}
                  onClick={() => toggleGroup(entry.id)}
                >
                  <span>{t(`groups.${entry.id}.label`)}</span>
                  <span className="sidebar-chevron">{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <div className="sidebar-group-items">
                    {entry.items.map((item) => {
                      const href = `/${locale}/${item.href}`
                      const active = pathname === href
                      return (
                        <Link key={href} href={href} className={active ? 'active' : ''} onClick={handleNavigate}>
                          {t(`groups.${entry.id}.${item.key}`)}
                        </Link>
                      )
                    })}
                  </div>
                )}
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
