'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './DevErrorsWidget.css'

const DEVELOPER_EMAIL = 'lbogveradze12@gmail.com'

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function DevErrorsWidget() {
  const [isDev, setIsDev] = useState(false)
  const [errors, setErrors] = useState(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const stored = localStorage.getItem('employee')
    if (stored) {
      const emp = JSON.parse(stored)
      setIsDev(emp.email?.toLowerCase() === DEVELOPER_EMAIL)
    }
  }, [])

  useEffect(() => {
    if (!isDev) return
    load()
    const poll = setInterval(load, 30000)
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(poll)
      clearInterval(clock)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDev])

  async function load() {
    try {
      const data = await apiFetch('/api/dev/errors')
      setErrors(data)
    } catch {
      // silently ignore — this is a dev-only convenience widget
    }
  }

  async function handleMarkRead() {
    try {
      await apiFetch('/api/dev/errors/mark-read', { method: 'PUT' })
      load()
    } catch {
      // ignore
    }
  }

  if (!isDev) return null

  const unreadCount = errors?.filter((e) => !e.read).length || 0

  return (
    <div className="devterm">
      <div className="devterm-titlebar">
        <span className="devterm-dot devterm-dot-red" />
        <span className="devterm-dot devterm-dot-yellow" />
        <span className="devterm-dot devterm-dot-green" />
        <span className="devterm-title">root@cbs-backend — error-monitor</span>
        {unreadCount > 0 && <span className="devterm-badge">{unreadCount} NEW</span>}
      </div>

      <div className="devterm-body">
        <div className="devterm-line">
          <span className="devterm-prompt">root@cbs</span>
          <span className="devterm-path">:~$</span>
          <span className="devterm-cmd"> tail -f error.log</span>
        </div>

        {errors === null && (
          <div className="devterm-line devterm-dim">connecting...</div>
        )}

        {errors && errors.length === 0 && (
          <>
            <div className="devterm-line devterm-ok">✓ 0 errors detected</div>
            <div className="devterm-line devterm-dim">system nominal — all endpoints responding</div>
          </>
        )}

        {errors && errors.length > 0 && (
          <div className="devterm-log-list">
            {errors.map((e) => (
              <div className={`devterm-log-row${e.read ? '' : ' is-new'}`} key={e._id}>
                <span className="devterm-log-tag">[ERROR]</span>
                <span className="devterm-log-time">{timeAgo(e.createdAt)}</span>
                <span className="devterm-log-msg">{e.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="devterm-line">
          <span className="devterm-prompt">root@cbs</span>
          <span className="devterm-path">:~$</span>
          <span className="devterm-cursor">{now % 1000 < 500 ? '▊' : ' '}</span>
        </div>
      </div>

      {errors && unreadCount > 0 && (
        <button type="button" className="devterm-mark-read" onClick={handleMarkRead}>
          $ mark-read --all
        </button>
      )}
    </div>
  )
}
