'use client'

import { useEffect, useState } from 'react'
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

export default function RolePermissions() {
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [privileges, setPrivileges] = useState(emptyPrivileges())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadRoles() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/roles')
      setRoles(data)
      if (data.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data[0]._id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const role = roles.find((r) => r._id === selectedRoleId)
    if (!role) return
    const merged = emptyPrivileges()
    const rolePrivileges = role.privileges || {}
    Object.keys(rolePrivileges).forEach((key) => {
      if (merged[key]) merged[key] = { ...merged[key], ...rolePrivileges[key] }
    })
    setPrivileges(merged)
  }, [selectedRoleId, roles])

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

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await apiFetch(`/api/admin/roles/${selectedRoleId}`, {
        method: 'PUT',
        body: JSON.stringify({ privileges }),
      })
      loadRoles()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateRole(e) {
    e.preventDefault()
    if (!newRoleName.trim()) return
    setError('')
    try {
      const created = await apiFetch('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name: newRoleName.trim(), privileges: emptyPrivileges() }),
      })
      setNewRoleName('')
      await loadRoles()
      setSelectedRoleId(created._id)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteRole() {
    if (!selectedRoleId) return
    if (!confirm('წავშალო ეს როლი?')) return
    try {
      await apiFetch(`/api/admin/roles/${selectedRoleId}`, { method: 'DELETE' })
      setSelectedRoleId('')
      loadRoles()
    } catch (err) {
      setError(err.message)
    }
  }

  const selectedRole = roles.find((r) => r._id === selectedRoleId)

  if (loading) return <p>იტვირთება...</p>

  return (
    <div className="role-permissions">
      <h1>როლები და უფლებები</h1>

      <div className="role-permissions-toolbar">
        <select
          className="field-select"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
            </option>
          ))}
        </select>

        <form onSubmit={handleCreateRole} style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            className="field-input"
            placeholder="ახალი როლის სახელი"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
          <button type="submit" className="btn-gray btn-sm">
            <span>ახალი როლი</span>
          </button>
        </form>

        {selectedRole && selectedRole.name !== 'admin' && (
          <button type="button" className="btn-gray btn-sm" onClick={handleDeleteRole}>
            <span>როლის წაშლა</span>
          </button>
        )}
      </div>

      {error && <p className="resource-error">{error}</p>}

      {selectedRole?.name === 'admin' ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>
          "admin" როლს ავტომატურად აქვს სრული წვდომა ყველგან — ცალკე უფლებების მართვა არ სჭირდება.
        </p>
      ) : selectedRoleId ? (
        <>
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
                {RESOURCES.map((r) => (
                  <tr key={r.key}>
                    <td className="role-permissions-resource" onClick={() => toggleRow(r.key)}>
                      {r.label}
                    </td>
                    {ACTIONS.map((a) => (
                      <td key={a.key} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={privileges[r.key]?.[a.key] === 1}
                          onChange={() => toggle(r.key, a.key)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn" onClick={handleSave} disabled={saving} style={{ marginTop: 14 }}>
            <span>{saving ? '...' : 'უფლებების შენახვა'}</span>
          </button>
        </>
      ) : (
        <p>ჯერ აირჩიეთ ან შექმენით როლი</p>
      )}
    </div>
  )
}
