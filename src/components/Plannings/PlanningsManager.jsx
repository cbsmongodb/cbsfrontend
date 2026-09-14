'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import TodayVisits from './TodayVisits'
import './PlanningsManager.css'

const PLAN_TYPE_IDS = ['hospital', 'pharmacy', 'general', 'double visit']
const STATUS_IDS = ['planned', 'i_went', 'i_left', 'canceled', 'completed']

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm() {
  return {
    planType: 'hospital',
    period: todayValue(),
    hospital: '',
    pharmacy: '',
    performer: '',
    status: 'planned',
  }
}

export default function PlanningsManager() {
  const t = useTranslations('plannings')

  const PLAN_TYPES = PLAN_TYPE_IDS.map((id) => ({ _id: id, name: t(`planTypes.${id === 'double visit' ? 'doubleVisit' : id}`) }))
  const STATUSES = STATUS_IDS.map((id) => ({ _id: id, name: t(`statuses.${id}`) }))

  function statusLabel(id) {
    return STATUSES.find((s) => s._id === id)?.name || id
  }

  function typeLabel(id) {
    return PLAN_TYPES.find((p) => p._id === id)?.name || id
  }

  function doctorLabel(doc) {
    return `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || doc.name || t('unknownDoctor')
  }

  const [employees, setEmployees] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [pharmacies, setPharmacies] = useState([])

  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [plans, setPlans] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  const [filterType, setFilterType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterPerformer, setFilterPerformer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(100)

  // doctors editing (only shown while editing an existing plan)
  const [availableDoctors, setAvailableDoctors] = useState([])
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([])
  const [originalDoctorIds, setOriginalDoctorIds] = useState([])
  const [pcdByDoctorId, setPcdByDoctorId] = useState(new Map())
  const [doctorSearch, setDoctorSearch] = useState('')
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  useEffect(() => {
    async function loadOptions() {
      try {
        const [e, h, p] = await Promise.all([
          apiFetch('/api/employees'),
          apiFetch('/api/hospitals'),
          apiFetch('/api/pharmacies'),
        ])
        setEmployees(e)
        setHospitals(h)
        setPharmacies(p)
      } catch (err) {
        setError(err.message)
      }
    }
    loadOptions()
    loadPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPlans() {
    setLoadingList(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterPerformer) params.set('performer', filterPerformer)
      if (filterStatus) params.set('status', filterStatus)
      if (filterFrom) params.set('period_from', new Date(filterFrom).toISOString())
      if (filterTo) params.set('period_to', new Date(filterTo).toISOString())
      const data = await apiFetch(`/api/plannings?${params}`)
      setPlans(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingList(false)
    }
  }

  const visiblePlans = useMemo(() => {
    let list = plans
    if (filterType) list = list.filter((p) => p.planType === filterType)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => {
        const name = p.hospital?.name || p.pharmacy?.pharmacyName || ''
        const performerName = p.performer?.name || `${p.performer?.firstName || ''} ${p.performer?.lastName || ''}`
        return name.toLowerCase().includes(q) || performerName.toLowerCase().includes(q)
      })
    }
    return list.slice(0, showCount)
  }, [plans, filterType, search, showCount])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function startEdit(plan) {
    setEditingId(plan._id)
    setForm({
      planType: plan.planType || 'hospital',
      period: plan.period ? new Date(plan.period).toISOString().slice(0, 10) : todayValue(),
      hospital: plan.hospital?._id || '',
      pharmacy: plan.pharmacy?._id || '',
      performer: plan.performer?._id || '',
      status: plan.status || 'planned',
    })
    setDoctorSearch('')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const existingIds = (plan.doctors || []).map((d) => d._id)
    setSelectedDoctorIds(existingIds)
    setOriginalDoctorIds(existingIds)

    setLoadingDoctors(true)
    try {
      const [available, full] = await Promise.all([
        apiFetch(`/api/plannings/${plan._id}/doctors-available`),
        apiFetch(`/api/plannings/${plan._id}`),
      ])
      // merge in already-selected doctors even if they fall outside the
      // hospital filter, so nothing "disappears" from the list
      const byId = new Map(available.map((d) => [d._id, d]))
      ;(plan.doctors || []).forEach((d) => {
        if (!byId.has(d._id)) byId.set(d._id, d)
      })
      setAvailableDoctors([...byId.values()])

      const pcdMap = new Map(
        (full.planConfigurationDoctors || []).map((pcd) => [String(pcd.doctor?._id), pcd._id])
      )
      setPcdByDoctorId(pcdMap)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingDoctors(false)
    }
  }

  function toggleDoctor(id) {
    setSelectedDoctorIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setSelectedDoctorIds([])
    setOriginalDoctorIds([])
    setAvailableDoctors([])
    setPcdByDoctorId(new Map())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.performer) {
      setError(t('validation.performerRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        planType: form.planType,
        period: form.period,
        performer: form.performer,
        status: form.status,
        hospital: form.planType === 'pharmacy' ? undefined : form.hospital || undefined,
        pharmacy: form.planType === 'pharmacy' ? form.pharmacy || undefined : undefined,
      }

      if (editingId) {
        await apiFetch(`/api/plannings/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })

        // sync doctor selection: add newly checked, remove newly unchecked
        const toAdd = selectedDoctorIds.filter((id) => !originalDoctorIds.includes(id))
        const toRemove = originalDoctorIds.filter((id) => !selectedDoctorIds.includes(id))

        for (const doctorId of toAdd) {
          await apiFetch(`/api/plannings/${editingId}/doctors`, {
            method: 'POST',
            body: JSON.stringify({ doctorId }),
          })
        }
        for (const doctorId of toRemove) {
          const pcdId = pcdByDoctorId.get(String(doctorId))
          if (pcdId) {
            await apiFetch(`/api/plannings/${editingId}/doctors/${pcdId}`, { method: 'DELETE' })
          }
        }
      } else {
        await apiFetch('/api/plannings', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      cancelEdit()
      await loadPlans()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await apiFetch(`/api/plannings/${id}`, { method: 'DELETE' })
      await loadPlans()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreateHospital(name) {
    const created = await apiFetch('/api/hospitals', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    setHospitals((prev) => [...prev, created])
    return created
  }

  async function handleCreatePharmacy(name) {
    const created = await apiFetch('/api/pharmacies', {
      method: 'POST',
      body: JSON.stringify({ pharmacyName: name }),
    })
    setPharmacies((prev) => [...prev, created])
    return created
  }

  const filteredDoctors = availableDoctors.filter((d) =>
    doctorLabel(d).toLowerCase().includes(doctorSearch.toLowerCase())
  )

  return (
    <div>
      <TodayVisits />

      <div className="planning-form-card">
        <h2>{editingId ? t('title.edit') : t('title.new')}</h2>
        <form onSubmit={handleSubmit} className="planning-form-grid">
          <div className="planning-field">
            <label>{t('fields.planType')}</label>
            <SearchableSelect
              options={PLAN_TYPES}
              value={form.planType}
              onChange={(v) => updateField('planType', v)}
              getLabel={(o) => o.name}
              placeholder={t('placeholders.select')}
            />
          </div>

          <div className="planning-field">
            <label>{t('fields.period')}</label>
            <input
              type="date"
              className="field-input"
              value={form.period}
              onChange={(e) => updateField('period', e.target.value)}
            />
          </div>

          {form.planType === 'pharmacy' ? (
            <div className="planning-field">
              <label>{t('fields.pharmacy')}</label>
              <SearchableSelect
                options={pharmacies}
                value={form.pharmacy}
                onChange={(v) => updateField('pharmacy', v)}
                getLabel={(o) => o.pharmacyName}
                placeholder={t('placeholders.typeName')}
                onCreate={handleCreatePharmacy}
              />
            </div>
          ) : (
            <div className="planning-field">
              <label>{t('fields.hospital')}</label>
              <SearchableSelect
                options={hospitals}
                value={form.hospital}
                onChange={(v) => updateField('hospital', v)}
                getLabel={(o) => o.name}
                placeholder={t('placeholders.typeName')}
                onCreate={handleCreateHospital}
              />
            </div>
          )}

          <div className="planning-field">
            <label>{t('fields.performer')}</label>
            <SearchableSelect
              options={employees}
              value={form.performer}
              onChange={(v) => updateField('performer', v)}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={t('placeholders.typeName')}
            />
          </div>

          <div className="planning-field">
            <label>{t('fields.status')}</label>
            <SearchableSelect
              options={STATUSES}
              value={form.status}
              onChange={(v) => updateField('status', v)}
              getLabel={(o) => o.name}
              placeholder={t('placeholders.select')}
            />
          </div>

          {editingId && (
            <div className="planning-field" style={{ gridColumn: '1 / -1' }}>
              <label>{t('fields.doctorsVisited')}</label>
              <input
                type="text"
                className="field-input"
                placeholder={t('placeholders.typeName')}
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div className="planning-doctor-list">
                {loadingDoctors && <p style={{ fontSize: 13, color: '#64748b' }}>{t('loading')}</p>}
                {!loadingDoctors && filteredDoctors.length === 0 && (
                  <p style={{ fontSize: 13, color: '#64748b' }}>{t('noDoctorsFound')}</p>
                )}
                {filteredDoctors.map((doc) => (
                  <label key={doc._id} className="planning-doctor-row">
                    <input
                      type="checkbox"
                      checked={selectedDoctorIds.includes(doc._id)}
                      onChange={() => toggleDoctor(doc._id)}
                    />
                    <span>{doctorLabel(doc)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="planning-field planning-field-actions">
            <button type="submit" className="btn" disabled={saving}>
              <span>{saving ? '...' : editingId ? t('buttons.update') : t('buttons.add')}</span>
            </button>
            {editingId && (
              <button type="button" className="btn-gray" onClick={cancelEdit}>
                <span>{t('buttons.cancel')}</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="planning-filters-card">
        <div className="planning-filters-grid">
          <div className="planning-field">
            <label>{t('fields.planType')}</label>
            <SearchableSelect
              options={PLAN_TYPES}
              value={filterType}
              onChange={setFilterType}
              getLabel={(o) => o.name}
              placeholder={t('filters.all')}
            />
          </div>

          <div className="planning-field">
            <label>{t('fields.period')}</label>
            <div className="planning-date-range">
              <input type="date" className="field-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
              <span>–</span>
              <input type="date" className="field-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
          </div>

          <div className="planning-field">
            <label>{t('fields.performer')}</label>
            <SearchableSelect
              options={employees}
              value={filterPerformer}
              onChange={setFilterPerformer}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder={t('filters.all')}
            />
          </div>

          <div className="planning-field">
            <label>{t('fields.status')}</label>
            <SearchableSelect
              options={STATUSES}
              value={filterStatus}
              onChange={setFilterStatus}
              getLabel={(o) => o.name}
              placeholder={t('filters.all')}
            />
          </div>

          <button type="button" className="btn planning-search-btn" onClick={loadPlans} disabled={loadingList}>
            <span>{loadingList ? '...' : t('buttons.search')}</span>
          </button>
        </div>

        <div className="planning-quicksearch-row">
          <input
            type="text"
            className="field-input"
            placeholder={t('placeholders.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <div className="planning-showcount">
            <span>{t('showCount.prefix')}</span>
            <select value={showCount} onChange={(e) => setShowCount(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
            <span>{t('showCount.suffix')}</span>
          </div>
        </div>
      </div>

      <div className="planning-table-scroll">
        <table className="planning-table">
          <thead>
            <tr>
              <th>{t('table.type')}</th>
              <th>{t('table.period')}</th>
              <th>{t('table.place')}</th>
              <th>{t('table.performer')}</th>
              <th>{t('table.doctors')}</th>
              <th>{t('table.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visiblePlans.map((plan) => (
              <tr key={plan._id}>
                <td>{typeLabel(plan.planType)}</td>
                <td>{plan.period ? new Date(plan.period).toLocaleDateString('ka-GE') : '—'}</td>
                <td>{plan.hospital?.name || plan.pharmacy?.pharmacyName || '—'}</td>
                <td>{plan.performer?.name || `${plan.performer?.firstName || ''} ${plan.performer?.lastName || ''}`}</td>
                <td>{plan.doctors?.length > 0 ? plan.doctors.map(doctorLabel).join(', ') : '—'}</td>
                <td>{statusLabel(plan.status)}</td>
                <td>
                  <button type="button" className="btn-gray btn-sm" onClick={() => startEdit(plan)}>
                    <span>{t('buttons.edit')}</span>
                  </button>
                  <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(plan._id)}>
                    <span>{t('buttons.delete')}</span>
                  </button>
                </td>
              </tr>
            ))}
            {visiblePlans.length === 0 && (
              <tr>
                <td colSpan={7}>{t('table.noRecords')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}