'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import Aurora from '@/components/Aurora/Aurora'
import './Login.css'

export default function Login() {
  const t = useTranslations('login')
  const router = useRouter()
  const pathname = usePathname()
  const { locale } = useParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAurora, setShowAurora] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setShowAurora(mq.matches)
    const handler = (e) => setShowAurora(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function switchLocale(newLocale) {
    const segments = pathname.split('/')
    segments[1] = newLocale
    router.push(segments.join('/'))
  }

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
      {showAurora && (
        <div className="login-aurora-wrap">
          <Aurora colorStops={['#a9cbff', '#c7cdd6', '#a3e8bd']} amplitude={0.6} blend={0.6} speed={0.5} lightMode={true} />
        </div>
      )}
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-text">Global CBS</span>
        </div>

        <div className="login-lang-switcher">
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
                <line x1="12.01" y1="16" x2="12.01" y2="16" />
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
