'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './Notifications.css'

const TYPE_LABELS = {
  Task: '📋 დავალება',
  BudgetRequest: '💰 ბიუჯეტის მოთხოვნა',
  BudgetRequird: '💰 საჭირო ბიუჯეტი',
  StockAlert: '⚠️ მარაგის გაფრთხილება',
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
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleClearAll() {
    if (!confirm('წავშალო ყველა შეტყობინება?')) return
    try {
      await apiFetch('/api/notifications', { method: 'DELETE' })
      setNotifications([])
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
        <p style={{ color: '#64748b', fontSize: 14 }}>შეტყობინებები არ არის</p>
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`notification-card ${n.read ? '' : 'unread'}`}
              onClick={() => !n.read && handleMarkRead(n._id)}
            >
              <div className="notification-type">{TYPE_LABELS[n.notifiableType] || n.notifiableType}</div>
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
