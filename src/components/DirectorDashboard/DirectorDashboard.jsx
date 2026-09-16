'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import './DirectorDashboard.css'

function fmtMoney(n) {
  const num = Number(n) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function BarChart({ data, valueKey, labelKey, color = '#3f74d6' }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1)
  return (
    <div className="director-bar-chart">
      {data.map((d, i) => (
        <div className="director-bar-row" key={i}>
          <div className="director-bar-track">
            <div
              className="director-bar-fill"
              style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }}
            />
          </div>
          <span className="director-bar-value">{d[valueKey]?.toLocaleString?.() ?? d[valueKey]}</span>
          <span className="director-bar-label">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  )
}

function DualBarChart({ data, labelKey, targetKey, soldKey }) {
  const max = Math.max(...data.map((d) => Math.max(d[targetKey] || 0, d[soldKey] || 0)), 1)
  return (
    <div className="director-dual-chart">
      <div className="director-dual-legend">
        <span><i className="director-dual-swatch director-dual-swatch-target" />Monthly Target</span>
        <span><i className="director-dual-swatch director-dual-swatch-sold" />Boxes Sold</span>
      </div>
      {data.map((d, i) => (
        <div className="director-dual-row" key={i}>
          <span className="director-dual-label">{d[labelKey]}</span>
          <div className="director-dual-bars">
            <div className="director-dual-track">
              <div
                className="director-dual-fill director-dual-fill-target"
                style={{ width: `${((d[targetKey] || 0) / max) * 100}%` }}
              />
              <span className="director-dual-value">{(d[targetKey] || 0).toLocaleString()}</span>
            </div>
            <div className="director-dual-track">
              <div
                className="director-dual-fill director-dual-fill-sold"
                style={{ width: `${((d[soldKey] || 0) / max) * 100}%` }}
              />
              <span className="director-dual-value">{(d[soldKey] || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DirectorDashboard() {
  const [tab, setTab] = useState('product-sale')

  return (
    <div className="director-dashboard-page">
      <h1>Dashboard</h1>

      <div className="director-tabs">
        <button type="button" className={tab === 'product-sale' ? 'active' : ''} onClick={() => setTab('product-sale')}>
          Monthly Product Sales
        </button>
        <button type="button" className={tab === 'stock-availability' ? 'active' : ''} onClick={() => setTab('stock-availability')}>
          Stock Availability
        </button>
        <button type="button" className={tab === 'order' ? 'active' : ''} onClick={() => setTab('order')}>
          Order
        </button>
      </div>

      {tab === 'product-sale' && <ProductSaleTab />}
      {tab === 'stock-availability' && <StockAvailabilityTab />}
      {tab === 'order' && <OrderTab />}
    </div>
  )
}

function ProductSaleTab() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 10)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
      const result = await apiFetch(`/api/director-dashboard/product-sale?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="director-tab-panel">
      <div className="director-filters">
        <div className="director-field">
          <label>Start Date</label>
          <input type="date" className="field-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="director-field">
          <label>End Date</label>
          <input type="date" className="field-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button type="button" className="btn director-submit-btn" onClick={() => load(1)} disabled={loading}>
          <span>{loading ? '...' : 'Submit'}</span>
        </button>
      </div>

      {error && <p className="resource-error">{error}</p>}

      {data && data.docs.length > 0 && (
        <div className="director-chart-card">
          <h3>Monthly Target vs Boxes Sold</h3>
          <DualBarChart data={data.docs} labelKey="drugName" targetKey="monthlyTarget" soldKey="saleBoxes" />
        </div>
      )}

      {data && data.docs.length > 0 && (
        <div className="director-chart-card">
          <h3>Monthly Product Sale Chart</h3>
          <BarChart data={data.docs} valueKey="saleBoxes" labelKey="drugName" color="#2f9e6e" />
        </div>
      )}

      <div className="director-table-wrap">
        <table className="director-table">
          <thead>
            <tr>
              <th>Drug Name</th>
              <th>Opening Stocks</th>
              <th>Monthly Target</th>
              <th>Sale Boxes</th>
              <th>Closing Stocks</th>
              <th>Total Sale Amount</th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row, i) => (
              <tr key={i}>
                <td>{row.drugName}</td>
                <td>{row.openingStocks}</td>
                <td>{row.monthlyTarget}</td>
                <td>{row.saleBoxes}</td>
                <td className={row.closingStocks < 0 ? 'director-negative' : ''}>{row.closingStocks}</td>
                <td>{fmtMoney(row.totalSaleAmount)}</td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={6}>No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="director-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span>{page} / {data.pages}</span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => load(page + 1)}>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}

function StockAvailabilityTab() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 10)
      const result = await apiFetch(`/api/director-dashboard/stock-availability?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="director-tab-panel">
      {error && <p className="resource-error">{error}</p>}

      {data && (data.lowStock?.length > 0 || data.expired?.length > 0) && (
        <div className="director-alert-row">
          {data.lowStock?.length > 0 && (
            <div className="director-alert-card director-alert-warning">
              <h4>დაბალი მარაგი ({data.lowStock.length})</h4>
              <ul>
                {data.lowStock.slice(0, 8).map((d) => (
                  <li key={d.id}>{d.name} — {d.stock}</li>
                ))}
              </ul>
            </div>
          )}
          {data.expired?.length > 0 && (
            <div className="director-alert-card director-alert-danger">
              <h4>ვადაგასული ({data.expired.length})</h4>
              <ul>
                {data.expired.slice(0, 8).map((d) => (
                  <li key={d.id}>{d.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="director-table-wrap">
        <table className="director-table">
          <thead>
            <tr>
              <th>Drug Name</th>
              <th>Stocks</th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row, i) => (
              <tr key={i}>
                <td>{row.name}</td>
                <td>{row.stocks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="director-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span>{page} / {data.pages}</span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => load(page + 1)}>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}

function OrderTab() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 10)
      const result = await apiFetch(`/api/director-dashboard/orders?${params}`)
      setData(result)
      setPage(targetPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dayEntries = data?.ordersByDay ? Object.entries(data.ordersByDay).sort() : []

  return (
    <div className="director-tab-panel">
      {error && <p className="resource-error">{error}</p>}

      {dayEntries.length > 0 && (
        <div className="director-chart-card">
          <h3>შეკვეთები ამ თვეში, დღეების მიხედვით</h3>
          <BarChart
            data={dayEntries.map(([date, count]) => ({ date, count }))}
            valueKey="count"
            labelKey="date"
            color="#3f74d6"
          />
        </div>
      )}

      <div className="director-table-wrap">
        <table className="director-table">
          <thead>
            <tr>
              <th>Drug</th>
              <th>Pack</th>
              <th>Price FOB (USD)</th>
              <th>Quantity</th>
              <th>Amount (USD)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.docs.map((row) => (
              <tr key={row._id}>
                <td>{row.drugName}</td>
                <td>{row.pack}</td>
                <td>{row.priceFobUsd}</td>
                <td>{row.quantity}</td>
                <td>{row.amountUsd}</td>
                <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString('ka-GE') : '—'}</td>
              </tr>
            ))}
            {data && data.docs.length === 0 && (
              <tr>
                <td colSpan={6}>No orders</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="director-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            <span>←</span>
          </button>
          <span>{page} / {data.pages}</span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => load(page + 1)}>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}
