'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { apiFetch } from '@/lib/api'
import CheckInButton from './CheckInButton'
import './Sidebar.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL

const NAV = [
  { type: 'link', href: 'dashboard', label: 'დეშბორდი' },
  { type: 'link', href: 'dashboard/notifications', label: 'შეტყობინებები' },
  { type: 'link', href: 'dashboard/live-feeds', label: 'Live Feed' },
  { type: 'link', href: 'dashboard/team-status', label: 'საველე გუნდის სტატუსი' },
  {
    type: 'group',
    id: 'configureProduct',
    label: 'პროდუქტის კონფიგურაცია',
    items: [
      { href: 'dashboard/drugs', label: 'მედიკამენტები' },
      { href: 'dashboard/drugs/import', label: 'მედიკამენტების იმპორტი' },
      { href: 'dashboard/product-types', label: 'პროდუქტის ტიპები' },
      { href: 'dashboard/manufacturers', label: 'მწარმოებლები' },
      { href: 'dashboard/producing-countries', label: 'მწარმოებელი ქვეყნები' },
    ],
  },
  {
    type: 'group',
    id: 'configureMarket',
    label: 'ბაზრის კონფიგურაცია',
    items: [
      { href: 'dashboard/doctors', label: 'ექიმები' },
      { href: 'dashboard/doctor-categories', label: 'ექიმის კატეგორიები' },
      { href: 'dashboard/doctor-subcategories', label: 'ექიმის ქვეკატეგორიები' },
      { href: 'dashboard/hospitals', label: 'ჰოსპიტლები' },
      { href: 'dashboard/hospitals/import', label: 'ჰოსპიტლების იმპორტი' },
      { href: 'dashboard/pharmacies', label: 'აფთიაქები' },
      { href: 'dashboard/profiles', label: 'პროფილები' },
    ],
  },
  {
    type: 'group',
    id: 'planningSales',
    label: 'დაგეგმვა და გაყიდვები',
    items: [
      { href: 'dashboard/plannings', label: 'ვიზიტების დაგეგმვა' },
      { href: 'dashboard/doctor-entry-items', label: 'გაყიდვების შეყვანა' },
      { href: 'dashboard/budgets', label: 'ბიუჯეტები' },
      { href: 'dashboard/budget-requireds', label: 'ბიუჯეტის მოთხოვნები' },
    ],
  },
  {
    type: 'group',
    id: 'reports',
    label: 'რეპორტები',
    items: [
      { href: 'dashboard/reports/efficiency', label: 'თანამშრომლის ეფექტურობა' },
      { href: 'dashboard/reports/reimbursement', label: 'ტრანსპორტის ანაზღაურება' },
      { href: 'dashboard/reports/attendances', label: 'დასწრების რეპორტი' },
    ],
  },
  {
    type: 'group',
    id: 'administration',
    label: 'ადმინისტრაცია',
    items: [
      { href: 'dashboard/employees', label: 'თანამშრომლები' },
      { href: 'dashboard/roles', label: 'როლები' },
      { href: 'dashboard/designations', label: 'პოზიციები' },
      { href: 'dashboard/sections', label: 'სექციები' },
      { href: 'dashboard/groups', label: 'ჯგუფები' },
      { href: 'dashboard/regions', label: 'რეგიონები' },
      { href: 'dashboard/divisions', label: 'დივიზიონები' },
      { href: 'dashboard/leaves', label: 'შვებულებები' },
      { href: 'dashboard/settings', label: 'სისტემის პარამეტრები' },
    ],
  },
]

export default function Sidebar() {
  const { locale } = useParams()
  const pathname = usePathname()
  const router = useRouter()

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
          aria-label="მენიუს გახსნა"
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

        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="მენიუს დახურვა"
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
                    {entry.label}
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
                  <span>{entry.label}</span>
                  <span className="sidebar-chevron">{isOpen ? '▾' : '▸'}</span>
                </button>

                {isOpen && (
                  <div className="sidebar-group-items">
                    {entry.items.map((item) => {
                      const href = `/${locale}/${item.href}`
                      const active = pathname === href
                      return (
                        <Link key={href} href={href} className={active ? 'active' : ''} onClick={handleNavigate}>
                          {item.label}
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
          <span>გასვლა</span>
        </button>
      </aside>
    </>
  )
}
