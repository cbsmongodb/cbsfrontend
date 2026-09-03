'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import TodayVisits from './TodayVisits'
import './PlanningsManager.css'

const PLAN_TYPES = [
  { _id: 'hospital', name: 'საავადმყოფო' },
  { _id: 'pharmacy', name: 'აფთიაქი' },
  { _id: 'general', name: 'მთავარი' },
  { _id: 'double visit', name: 'ორმაგი ვიზიტი' },
]

const STATUSES = [
  { _id: 'planned', name: 'დაგეგმილია' },
  { _id: 'i_went', name: 'მივედი' },
  { _id: 'i_left', name: 'წავედი' },
  { _id: 'canceled', name: 'გაუქმებულია' },
  { _id: 'completed', name: 'დასრულებულია' },
]

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

function statusLabel(id) {
  return STATUSES.find((s) => s._id === id)?.name || id
}

function typeLabel(id) {
  return PLAN_TYPES.find((t) => t._id === id)?.name || id
}

export default function PlanningsManager() {
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

  function startEdit(plan) {
    setEditingId(plan._id)
    setForm({
      planType: plan.planType || 'hospital',
      period: plan.period ? new Date(plan.period).toISOString().slice(0, 10) : todayValue(),
      hospital: plan.hospital?._id || '',
      pharmacy: plan.pharmacy?._id || '',
      performer: plan.performer?._id || '',
      status: plan.status || 'planned',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.performer) {
      setError('შემსრულებელი სავალდებულოა')
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

  return (
    <div>
      <TodayVisits />

      <div className="planning-form-card">
        <h2>{editingId ? 'ვიზიტის რედაქტირება' : 'ახალი ვიზიტი'}</h2>
        <form onSubmit={handleSubmit} className="planning-form-grid">
          <div className="planning-field">
            <label>გეგმის ტიპი</label>
            <SearchableSelect
              options={PLAN_TYPES}
              value={form.planType}
              onChange={(v) => updateField('planType', v)}
              getLabel={(o) => o.name}
              placeholder="აირჩიეთ..."
            />
          </div>

          <div className="planning-field">
            <label>პერიოდი</label>
            <input
              type="date"
              className="field-input"
              value={form.period}
              onChange={(e) => updateField('period', e.target.value)}
            />
          </div>

          {form.planType === 'pharmacy' ? (
            <div className="planning-field">
              <label>აფთიაქი</label>
              <SearchableSelect
                options={pharmacies}
                value={form.pharmacy}
                onChange={(v) => updateField('pharmacy', v)}
                getLabel={(o) => o.pharmacyName}
                placeholder="ჩაწერეთ სახელი..."
                onCreate={handleCreatePharmacy}
              />
            </div>
          ) : (
            <div className="planning-field">
              <label>ჰოსპიტალი</label>
              <SearchableSelect
                options={hospitals}
                value={form.hospital}
                onChange={(v) => updateField('hospital', v)}
                getLabel={(o) => o.name}
                placeholder="ჩაწერეთ სახელი..."
                onCreate={handleCreateHospital}
              />
            </div>
          )}

          <div className="planning-field">
            <label>შემსრულებელი</label>
            <SearchableSelect
              options={employees}
              value={form.performer}
              onChange={(v) => updateField('performer', v)}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ჩაწერეთ სახელი..."
            />
          </div>

          <div className="planning-field">
            <label>სტატუსი</label>
            <SearchableSelect
              options={STATUSES}
              value={form.status}
              onChange={(v) => updateField('status', v)}
              getLabel={(o) => o.name}
              placeholder="აირჩიეთ..."
            />
          </div>

          <div className="planning-field planning-field-actions">
            <button type="submit" className="btn" disabled={saving}>
              <span>{saving ? '...' : editingId ? 'განახლება' : 'დამატება'}</span>
            </button>
            {editingId && (
              <button type="button" className="btn-gray" onClick={cancelEdit}>
                <span>გაუქმება</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="resource-error">{error}</p>}

      <div className="planning-filters-card">
        <div className="planning-filters-grid">
          <div className="planning-field">
            <label>გეგმის ტიპი</label>
            <SearchableSelect
              options={PLAN_TYPES}
              value={filterType}
              onChange={setFilterType}
              getLabel={(o) => o.name}
              placeholder="ყველა"
            />
          </div>

          <div className="planning-field">
            <label>პერიოდი</label>
            <div className="planning-date-range">
              <input type="date" className="field-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
              <span>–</span>
              <input type="date" className="field-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
          </div>

          <div className="planning-field">
            <label>შემსრულებელი</label>
            <SearchableSelect
              options={employees}
              value={filterPerformer}
              onChange={setFilterPerformer}
              getLabel={(o) => o.name || `${o.firstName} ${o.lastName}`}
              placeholder="ყველა"
            />
          </div>

          <div className="planning-field">
            <label>სტატუსი</label>
            <SearchableSelect
              options={STATUSES}
              value={filterStatus}
              onChange={setFilterStatus}
              getLabel={(o) => o.name}
              placeholder="ყველა"
            />
          </div>

          <button type="button" className="btn planning-search-btn" onClick={loadPlans} disabled={loadingList}>
            <span>{loadingList ? '...' : 'ძებნა'}</span>
          </button>
        </div>

        <div className="planning-quicksearch-row">
          <input
            type="text"
            className="field-input"
            placeholder="ძიება..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <div className="planning-showcount">
            <span>აჩვენე</span>
            <select value={showCount} onChange={(e) => setShowCount(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
            </select>
            <span>ჩანაწერი</span>
          </div>
        </div>
      </div>

      <div className="planning-table-scroll">
        <table className="planning-table">
          <thead>
            <tr>
              <th>ტიპი</th>
              <th>პერიოდი</th>
              <th>ჰოსპიტალი/აფთიაქი</th>
              <th>შემსრულებელი</th>
              <th>სტატუსი</th>
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
                <td>{statusLabel(plan.status)}</td>
                <td>
                  <button type="button" className="btn-gray btn-sm" onClick={() => startEdit(plan)}>
                    <span>რედაქტირება</span>
                  </button>
                  <button type="button" className="btn-gray btn-sm" onClick={() => handleDelete(plan._id)}>
                    <span>წაშლა</span>
                  </button>
                </td>
              </tr>
            ))}
            {visiblePlans.length === 0 && (
              <tr>
                <td colSpan={6}>ჩანაწერები არ არის</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
