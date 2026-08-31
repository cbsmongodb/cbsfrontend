'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import './RolePermissions.css'

const RESOURCES = [
  { key: 'home', label: 'დეშბორდი' },
  { key: 'attendances', label: 'Live Feed / დასწრება' },
  { key: 'plannings', label: 'ვიზიტების დაგეგმვა' },
  { key: 'sales', label: 'გაყიდვების შეყვანა' },
  { key: 'budgets', label: 'ბიუჯეტები' },
  { key: 'drugs', label: 'მედიკამენტები' },
  { key: 'product_types', label: 'პროდუქტის ტიპები' },
  { key: 'manufacturers', label: 'მწარმოებლები' },
  { key: 'manufacturer_countries', label: 'მწარმოებელი ქვეყნები' },
  { key: 'doctors', label: 'ექიმები' },
  { key: 'doctor_categories', label: 'ექიმის კატეგორიები' },
  { key: 'doctor_sub_categories', label: 'ექიმის ქვეკატეგორიები' },
  { key: 'hospitals', label: 'ჰოსპიტლები' },
  { key: 'pharmacies', label: 'აფთიაქები' },
  { key: 'profiles', label: 'პროფილები' },
  { key: 'efficiency_report', label: 'ეფექტურობის რეპორტი' },
  { key: 'reimbursement_report', label: 'ანაზღაურების რეპორტი' },
  { key: 'employees', label: 'თანამშრომლები' },
  { key: 'roles', label: 'როლები' },
  { key: 'designations', label: 'პოზიციები' },
  { key: 'sections', label: 'სექციები' },
  { key: 'groups', label: 'ჯგუფები' },
  { key: 'regions', label: 'რეგიონები' },
  { key: 'leaves', label: 'შვებულებები' },
]

const ACTIONS = [
  { key: 'read', label: 'ნახვა' },
  { key: 'add', label: 'დამატება' },
  { key: 'update', label: 'რედაქტირება' },
  { key: 'delete', label: 'წაშლა' },
]

function emptyPrivileges() {
  const p = {}
  RESOURCES.forEach((r) => {
    p[r.key] = { read: 0, add: 0, update: 0, delete: 0, import: 0, export: 0, dashboard: 0, live_feeds: 0, last_locations: 0, analytics: 0 }
  })
  return p
}

export default function CreateRole() {
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
      const allOn = ACTIONS.every((a) => prev[resourceKey][a.key] === 1)
      const next = { ...prev[resourceKey] }
      ACTIONS.forEach((a) => {
        next[a.key] = allOn ? 0 : 1
      })
      return { ...prev, [resourceKey]: next }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('ჯერ ჩაწერეთ როლის სახელი')
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
      <h1>ახალი როლის დამატება</h1>

      <form onSubmit={handleSubmit}>
        <div className="role-create-box">
          <div className="role-create-label">
            როლის სახელი <span style={{ color: '#dc2626' }}>*</span>
          </div>
          <input
            type="text"
            className="field-input"
            placeholder="მაგ. საწყობის მენეჯერი"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            style={{ width: '100%', maxWidth: 320 }}
          />
        </div>

        {error && <p className="resource-error">{error}</p>}

        <div className="role-create-label">მონიშნეთ რისი ნახვა/მართვა შეუძლია ამ როლს</div>
        <div className="role-permissions-table-wrap">
          <table className="role-permissions-table">
            <thead>
              <tr>
                <th>გვერდი</th>
                {ACTIONS.map((a) => (
                  <th key={a.key}>{a.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((res) => (
                <tr key={res.key}>
                  <td className="role-permissions-resource" onClick={() => toggleRow(res.key)}>
                    {res.label}
                  </td>
                  {ACTIONS.map((a) => (
                    <td key={a.key} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={privileges[res.key]?.[a.key] === 1}
                        onChange={() => toggle(res.key, a.key)}
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
            <span>{creating ? '...' : 'როლის შექმნა'}</span>
          </button>
          <button type="button" className="btn-gray" onClick={() => router.push(`/${locale}/dashboard/roles`)}>
            <span>გაუქმება</span>
          </button>
        </div>
      </form>
    </div>
  )
}
