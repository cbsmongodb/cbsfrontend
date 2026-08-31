'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './Notifications.css'

const TYPE_LABELS = {
  Task: 'დავალება',
  BudgetRequest: 'ბიუჯეტის მოთხოვნა',
  BudgetRequird: 'საჭირო ბიუჯეტი',
  StockAlert: 'მარაგის გაფრთხილება',
}

function NotificationIcon({ type }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'Task') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="8" y1="16" x2="12" y2="16" />
      </svg>
    )
  }
  if (type === 'BudgetRequest' || type === 'BudgetRequird') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1 3 2.3c0 2.7-6 1.3-6 4 0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5" />
      </svg>
    )
  }
  if (type === 'StockAlert') {
    return (
      <svg {...common}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  return null
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      const data = await apiFetch('/api/notifications')
      setNotifications(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleMarkRead(id) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' })
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleClearAll() {
    if (!confirm('წავშალო ყველა შეტყობინება?')) return
    try {
      await apiFetch('/api/notifications', { method: 'DELETE' })
      setNotifications([])
      window.dispatchEvent(new Event('notifications-updated'))
    } catch (err) {
      setError(err.message)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>
          შეტყობინებები
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-gray btn-sm" onClick={handleMarkAllRead}>
            <span>ყველას წაკითხულად მონიშვნა</span>
          </button>
          <button type="button" className="btn-gray btn-sm" onClick={handleClearAll}>
            <span>ყველას წაშლა</span>
          </button>
        </div>
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loading ? (
        <p>იტვირთება...</p>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <div className="notifications-empty-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="notifications-empty-title">შეტყობინებები არ არის</div>
          <div className="notifications-empty-sub">ახალი შეტყობინების მოსვლისას, აქ გამოჩნდება</div>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`notification-card ${n.read ? '' : 'unread'}`}
              data-type={n.notifiableType}
              onClick={() => !n.read && handleMarkRead(n._id)}
            >
              <div className="notification-type">
                <NotificationIcon type={n.notifiableType} />
                {TYPE_LABELS[n.notifiableType] || n.notifiableType}
              </div>
              <div className="notification-message">{n.message}</div>
              <div className="notification-time">
                {new Date(n.createdAt).toLocaleString('ka-GE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {!n.read && <span className="notification-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
