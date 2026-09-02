'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import './ChangePassword.css'

export default function ChangePassword() {
  const { locale } = useParams()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('ახალი პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('ახალი პაროლები არ ემთხვევა ერთმანეთს')
      return
    }

    setSaving(true)
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setSuccess('პაროლი წარმატებით შეიცვალა')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="change-password-page">
      <Link href={`/${locale}/dashboard`} className="change-password-back">
        ← უკან დეშბორდზე
      </Link>
      <h1>პაროლის შეცვლა</h1>

      <form className="change-password-form" onSubmit={handleSubmit}>
        <div className="change-password-field">
          <label>მიმდინარე პაროლი</label>
          <input
            type="password"
            className="field-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div className="change-password-field">
          <label>ახალი პაროლი</label>
          <input
            type="password"
            className="field-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="change-password-field">
          <label>გაიმეორეთ ახალი პაროლი</label>
          <input
            type="password"
            className="field-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && <p className="resource-error">{error}</p>}
        {success && <p className="change-password-success">{success}</p>}

        <button type="submit" className="btn" disabled={saving}>
          <span>{saving ? '...' : 'შენახვა'}</span>
        </button>
      </form>
    </div>
  )
}
