'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import './RolePermissions.css'

// grouped to mirror the Sidebar's own structure, so it's clear which
// checkbox controls which menu section
const RESOURCE_GROUPS = [
  { label: 'ძირითადი', keys: ['home', 'attendances'] },
  { label: 'პროდუქტის კონფიგურაცია', keys: ['drugs', 'product_types', 'manufacturers', 'manufacturer_countries'] },
  { label: 'ბაზრის კონფიგურაცია', keys: ['doctors', 'doctor_categories', 'doctor_sub_categories', 'hospitals', 'pharmacies', 'profiles'] },
  { label: 'დაგეგმვა და გაყიდვები', keys: ['plannings', 'sales', 'budgets'] },
  { label: 'რეპორტები', keys: ['efficiency_report', 'reimbursement_report'] },
  { label: 'ადმინისტრაცია', keys: ['employees', 'roles', 'designations', 'sections', 'groups', 'regions', 'leaves'] },
]

const RESOURCE_KEYS = RESOURCE_GROUPS.flatMap((g) => g.keys)
const ACTION_KEYS = ['read', 'add', 'update', 'delete']

function emptyPrivileges() {
  const p = {}
  RESOURCE_KEYS.forEach((key) => {
    p[key] = { read: 0, add: 0, update: 0, delete: 0, import: 0, export: 0, dashboard: 0, live_feeds: 0, last_locations: 0, analytics: 0 }
  })
  return p
}

function countActiveResources(privileges) {
  if (!privileges) return 0
  return Object.values(privileges).filter((p) => p && Object.values(p).some((v) => v === 1)).length
}

export default function RolePermissions() {
  const t = useTranslations('roles')
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
      const allOn = ACTION_KEYS.every((a) => prev[resourceKey][a] === 1)
      const next = { ...prev[resourceKey] }
      ACTION_KEYS.forEach((a) => {
        next[a] = allOn ? 0 : 1
      })
      return { ...prev, [resourceKey]: next }
    })
  }

  // quick action — set "read" for every resource at once (or clear it)
  function setAllRead(value) {
    setPrivilegesDraft((prev) => {
      const next = { ...prev }
      RESOURCE_KEYS.forEach((key) => {
        next[key] = { ...next[key], read: value ? 1 : 0 }
      })
      return next
    })
  }

  // quick action — set "read" for every resource within one group
  function setGroupRead(keys, value) {
    setPrivilegesDraft((prev) => {
      const next = { ...prev }
      keys.forEach((key) => {
        next[key] = { ...next[key], read: value ? 1 : 0 }
      })
      return next
    })
  }

  // quick action — set every permission (read/add/update/delete) for
  // every resource within one group at once
  function setGroupAll(keys, value) {
    setPrivilegesDraft((prev) => {
      const next = { ...prev }
      keys.forEach((key) => {
        const updated = { ...next[key] }
        ACTION_KEYS.forEach((a) => {
          updated[a] = value ? 1 : 0
        })
        next[key] = updated
      })
      return next
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
    if (!confirm(t('confirmDeleteRole'))) return
    try {
      await apiFetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' })
      if (expandedRoleId === roleId) setExpandedRoleId(null)
      loadRoles()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>{t('loading')}</p>

  return (
    <div className="role-permissions">
      <div className="role-permissions-header">
        <h1>{t('listTitle')}</h1>
        <Link href={`/${locale}/dashboard/roles/new`} className="btn">
          <span>{t('addRoleButton')}</span>
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
                    {isAdmin ? t('fullAccess') : t('hasAccessTo', { count: countActiveResources(r.privileges) })}
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
                      {t('delete')}
                    </span>
                  )}
                  {!isAdmin && <span className="role-accordion-chevron">{isExpanded ? '▾' : '▸'}</span>}
                </div>
              </button>

              {isExpanded && (
                <div className="role-accordion-body">
                  <div className="role-quick-actions">
                    <button type="button" className="btn-gray btn-sm" onClick={() => setAllRead(true)}>
                      <span>✓ ყველას ნახვა</span>
                    </button>
                    <button type="button" className="btn-gray btn-sm" onClick={() => setAllRead(false)}>
                      <span>ყველას მოხსნა</span>
                    </button>
                  </div>

                  {RESOURCE_GROUPS.map((group) => (
                    <div key={group.label} className="role-group">
                      <div className="role-group-header">
                        <span>{group.label}</span>
                        <div className="role-group-actions">
                          <button type="button" onClick={() => setGroupRead(group.keys, true)}>
                            ✓ ნახვა
                          </button>
                          <button type="button" onClick={() => setGroupAll(group.keys, true)}>
                            ✓ ყველა უფლება
                          </button>
                          <button type="button" onClick={() => setGroupAll(group.keys, false)}>
                            მოხსნა
                          </button>
                        </div>
                      </div>
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
                            {group.keys.map((res) => (
                              <tr key={res}>
                                <td className="role-permissions-resource" onClick={() => toggleRow(res)}>
                                  {t(`resources.${res}`)}
                                </td>
                                {ACTION_KEYS.map((a) => (
                                  <td key={a} style={{ textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={privilegesDraft[res]?.[a] === 1}
                                      onChange={() => toggle(res, a)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleSave(r._id)}
                      disabled={savingId === r._id}
                    >
                      <span>{savingId === r._id ? '...' : t('savePermissions')}</span>
                    </button>
                    {successRoleId === r._id && (
                      <span style={{ color: '#16a34a', fontSize: 13 }}>{t('saved')}</span>
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
