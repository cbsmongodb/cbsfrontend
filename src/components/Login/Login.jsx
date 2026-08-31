'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import './Login.css'

export default function Login() {
  const t = useTranslations('login')
  const router = useRouter()
  const { locale } = useParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      localStorage.setItem('token', data.token)
      localStorage.setItem('employee', JSON.stringify(data.employee))

      router.push(`/${locale}/dashboard`)
    } catch (err) {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-text">Global CBS</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h1>{t('title')}</h1>

          <div className="login-field">
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="login-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            <span>{loading ? '...' : t('submit')}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
