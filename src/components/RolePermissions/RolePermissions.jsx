'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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

function countActiveResources(privileges) {
  if (!privileges) return 0
  return Object.values(privileges).filter((p) => p && Object.values(p).some((v) => v === 1)).length
}

export default function RolePermissions() {
  const { locale } = useParams()
  const [roles, setRoles] = useState([])
  const [expandedRoleId, setExpandedRoleId] = useState(null)
  const [privilegesDraft, setPrivilegesDraft] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')
  const [successRoleId, setSuccessRoleId] = useState(null)

  async function loadRoles() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/roles')
      setRoles(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  function toggleExpand(role) {
    if (expandedRoleId === role._id) {
      setExpandedRoleId(null)
      return
    }
    const merged = emptyPrivileges()
    const rolePrivileges = role.privileges || {}
    Object.keys(rolePrivileges).forEach((key) => {
      if (merged[key]) merged[key] = { ...merged[key], ...rolePrivileges[key] }
    })
    setPrivilegesDraft(merged)
    setExpandedRoleId(role._id)
    setSuccessRoleId(null)
  }

  function toggle(resourceKey, actionKey) {
    setPrivilegesDraft((prev) => ({
      ...prev,
      [resourceKey]: {
        ...prev[resourceKey],
        [actionKey]: prev[resourceKey][actionKey] === 1 ? 0 : 1,
      },
    }))
  }

  function toggleRow(resourceKey) {
    setPrivilegesDraft((prev) => {
      const allOn = ACTIONS.every((a) => prev[resourceKey][a.key] === 1)
      const next = { ...prev[resourceKey] }
      ACTIONS.forEach((a) => {
        next[a.key] = allOn ? 0 : 1
      })
      return { ...prev, [resourceKey]: next }
    })
  }

  async function handleSave(roleId) {
    setSavingId(roleId)
    setError('')
    setSuccessRoleId(null)
    try {
      await apiFetch(`/api/admin/roles/${roleId}`, {
        method: 'PUT',
        body: JSON.stringify({ privileges: privilegesDraft }),
      })
      setSuccessRoleId(roleId)
      loadRoles()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  async function handleDeleteRole(roleId) {
    if (!confirm('წავშალო ეს როლი?')) return
    try {
      await apiFetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' })
      if (expandedRoleId === roleId) setExpandedRoleId(null)
      loadRoles()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>იტვირთება...</p>

  return (
    <div className="role-permissions">
      <div className="role-permissions-header">
        <h1>როლები და უფლებები</h1>
        <Link href={`/${locale}/dashboard/roles/new`} className="btn">
          <span>ახალი როლის დამატება</span>
        </Link>
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="role-accordion">
        {roles.map((r) => {
          const isExpanded = expandedRoleId === r._id
          const isAdmin = r.name === 'admin'
          return (
            <div key={r._id} className={`role-accordion-item ${isExpanded ? 'open' : ''}`}>
              <button
                type="button"
                className="role-accordion-header"
                onClick={() => !isAdmin && toggleExpand(r)}
                disabled={isAdmin}
              >
                <div className="role-accordion-header-info">
                  <div className="role-accordion-name">{r.name}</div>
                  <div className="role-accordion-sub">
                    {isAdmin ? 'სრული წვდომა ყველგან' : `${countActiveResources(r.privileges)} გვერდზე აქვს წვდომა`}
                  </div>
                </div>
                <div className="role-accordion-header-actions">
                  {!isAdmin && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="btn-gray btn-sm role-accordion-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRole(r._id)
                      }}
                    >
                      წაშლა
                    </span>
                  )}
                  {!isAdmin && <span className="role-accordion-chevron">{isExpanded ? '▾' : '▸'}</span>}
                </div>
              </button>

              {isExpanded && (
                <div className="role-accordion-body">
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
                                  checked={privilegesDraft[res.key]?.[a.key] === 1}
                                  onChange={() => toggle(res.key, a.key)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleSave(r._id)}
                      disabled={savingId === r._id}
                    >
                      <span>{savingId === r._id ? '...' : 'უფლებების შენახვა'}</span>
                    </button>
                    {successRoleId === r._id && (
                      <span style={{ color: '#16a34a', fontSize: 13 }}>შენახულია ✓</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
