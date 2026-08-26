'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import './Sidebar.css'
import CheckInButton from './CheckInButton'

const NAV = [
  { type: 'link', href: 'dashboard', label: 'დეშბორდი' },
  { type: 'link', href: 'dashboard/notifications', label: 'შეტყობინებები' },
    { type: 'link', href: 'dashboard/live-feeds', label: 'Live Feed' },
  {
    type: 'group',
    id: 'configureProduct',
    label: 'პროდუქტის კონფიგურაცია',
    items: [
      { href: 'dashboard/drugs', label: 'მედიკამენტები' },
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
      { href: 'dashboard/pharmacies', label: 'აფთიაქები' },
      { href: 'dashboard/profiles', label: 'პროფილები' },
    ],
  },
  {
    // planning (checkin/checkout, live feed source) + everything money-related
    // that flows from it — kept together since they're used in the same
    // daily workflow by field reps
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

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">CBS Admin</div>
        <CheckInButton />

      <nav className="sidebar-nav">
        {NAV.map((entry) => {
          if (entry.type === 'link') {
            const href = `/${locale}/${entry.href}`
            const active = pathname === href
            return (
              <Link key={href} href={href} className={active ? 'active' : ''}>
                {entry.label}
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
                      <Link key={href} href={href} className={active ? 'active' : ''}>
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
  )
}