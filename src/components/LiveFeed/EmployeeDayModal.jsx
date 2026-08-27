'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './EmployeeDayModal.css'

const FAR_THRESHOLD_METERS = 300

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(minutes) {
  if (minutes == null) return '—'
  if (minutes < 60) return `${minutes} წთ`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} სთ ${m} წთ` : `${h} სთ`
}

export default function EmployeeDayModal({ employeeId, employeeName, date, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ employeeId })
        if (date) params.set('date', date)
        const result = await apiFetch(`/api/attendance/employee-day?${params}`)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [employeeId, date])

  return (
    <div className="employee-day-overlay" onClick={onClose}>
      <div className="employee-day-modal" onClick={(e) => e.stopPropagation()}>
        <div className="employee-day-header">
          <h2>{employeeName}</h2>
          <button type="button" className="employee-day-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading && <p>იტვირთება...</p>}
        {error && <p className="employee-day-error">{error}</p>}

        {data && data.visits.length === 0 && !loading && (
          <p>დღეს ვიზიტები არ დაფიქსირებულა</p>
        )}

        {data && data.visits.length > 0 && (
          <div className="employee-day-timeline">
            {data.visits.map((visit, i) => (
              <div key={i} className="employee-day-visit">
                {visit.travelMinutesFromPrevious != null && (
                  <div className="employee-day-travel">
                    გადაადგილება: {formatDuration(visit.travelMinutesFromPrevious)}
                  </div>
                )}
                <div className="employee-day-card">
                  <div className="employee-day-hospital">{visit.hospitalName}</div>
                  <div className="employee-day-times">
                    <span>ჩექინი: {formatTime(visit.checkinTime)}</span>
                    <span>ჩექაუთი: {formatTime(visit.checkoutTime)}</span>
                    <span>ხანგრძლივობა: {formatDuration(visit.durationMinutes)}</span>
                  </div>
                  <div className="employee-day-distances">
                    {visit.checkinDistance != null && (
                      <span className={visit.checkinDistance > FAR_THRESHOLD_METERS ? 'far' : ''}>
                        ჩექინის მანძილი: {visit.checkinDistance}მ
                      </span>
                    )}
                    {visit.checkoutDistance != null && (
                      <span className={visit.checkoutDistance > FAR_THRESHOLD_METERS ? 'far' : ''}>
                        ჩექაუთის მანძილი: {visit.checkoutDistance}მ
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
