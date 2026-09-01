'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import './RolePermissions.css'

const RESOURCE_KEYS = [
  'home', 'attendances', 'plannings', 'sales', 'budgets', 'drugs', 'product_types',
  'manufacturers', 'manufacturer_countries', 'doctors', 'doctor_categories', 'doctor_sub_categories',
  'hospitals', 'pharmacies', 'profiles', 'efficiency_report', 'reimbursement_report',
  'employees', 'roles', 'designations', 'sections', 'groups', 'regions', 'leaves',
]

const ACTION_KEYS = ['read', 'add', 'update', 'delete']

function emptyPrivileges() {
  const p = {}
  RESOURCE_KEYS.forEach((key) => {
    p[key] = { read: 0, add: 0, update: 0, delete: 0, import: 0, export: 0, dashboard: 0, live_feeds: 0, last_locations: 0, analytics: 0 }
  })
  return p
}

export default function CreateRole() {
  const t = useTranslations('roles')
  const { locale } = useParams()
  const router = useRouter()
  const [name, setName] = useState('')
  const [privileges, setPrivileges] = useState(emptyPrivileges())
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  function toggle(resourceKey, actionKey) {
    setPrivileges((prev) => ({
      ...prev,
      [resourceKey]: {
        ...prev[resourceKey],
        [actionKey]: prev[resourceKey][actionKey] === 1 ? 0 : 1,
      },
    }))
  }

  function toggleRow(resourceKey) {
    setPrivileges((prev) => {
      const allOn = ACTION_KEYS.every((a) => prev[resourceKey][a] === 1)
      const next = { ...prev[resourceKey] }
      ACTION_KEYS.forEach((a) => {
        next[a] = allOn ? 0 : 1
      })
      return { ...prev, [resourceKey]: next }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError(t('nameRequired'))
      return
    }
    setCreating(true)
    try {
      await apiFetch('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), privileges }),
      })
      router.push(`/${locale}/dashboard/roles`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="role-permissions">
      <h1>{t('createTitle')}</h1>

      <form onSubmit={handleSubmit}>
        <div className="role-create-box">
          <div className="role-create-label">
            {t('nameLabel')} <span style={{ color: '#dc2626' }}>*</span>
          </div>
          <input
            type="text"
            className="field-input"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            style={{ width: '100%', maxWidth: 320 }}
          />
        </div>

        {error && <p className="resource-error">{error}</p>}

        <div className="role-create-label">{t('permissionsLabel')}</div>
        <div className="role-permissions-table-wrap">
          <table className="role-permissions-table">
            <thead>
              <tr>
                <th>{t('pageHeader')}</th>
                {ACTION_KEYS.map((a) => (
                  <th key={a}>{t(`actions.${a}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCE_KEYS.map((res) => (
                <tr key={res}>
                  <td className="role-permissions-resource" onClick={() => toggleRow(res)}>
                    {t(`resources.${res}`)}
                  </td>
                  {ACTION_KEYS.map((a) => (
                    <td key={a} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={privileges[res]?.[a] === 1}
                        onChange={() => toggle(res, a)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="btn" disabled={creating}>
            <span>{creating ? '...' : t('createButton')}</span>
          </button>
          <button type="button" className="btn-gray" onClick={() => router.push(`/${locale}/dashboard/roles`)}>
            <span>{t('cancel')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
