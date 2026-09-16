'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table'
import './DirectorDashboard.css'

function fmtMoney(n) {
  const num = Number(n) || 0
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PremiumTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="director-recharts-tooltip">
      <div className="director-recharts-tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="director-recharts-tooltip-row">
          <span className="director-recharts-tooltip-dot" style={{ background: p.color }} />
          <span className="director-recharts-tooltip-name">{p.name}</span>
          <span className="director-recharts-tooltip-value">{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function BarChart({ data, valueKey, labelKey }) {
  const height = Math.max(data.length * 42, 200)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barCategoryGap="28%">
        <defs>
          <linearGradient id="salesBarGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3f74d6" />
            <stop offset="100%" stopColor="#2f9e6e" />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke="#eceef2" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={130}
          tick={{ fontSize: 12, fontWeight: 600, fill: '#0f2744' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'rgba(63, 116, 214, 0.05)' }} />
        <Bar dataKey={valueKey} name="Sale Boxes" fill="url(#salesBarGradient)" radius={[0, 8, 8, 0]} maxBarSize={22} animationDuration={700} animationEasing="ease-out" />
      </RBarChart>
    </ResponsiveContainer>
  )
}

function DualBarChart({ data, labelKey, targetKey, soldKey }) {
  const height = Math.max(data.length * 42, 200)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barCategoryGap="28%" barGap={4}>
        <defs>
          <linearGradient id="soldBarGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3f74d6" />
            <stop offset="100%" stopColor="#2f9e6e" />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke="#eceef2" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={130}
          tick={{ fontSize: 12, fontWeight: 600, fill: '#0f2744' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'rgba(63, 116, 214, 0.05)' }} />
        <Legend
          verticalAlign="top"
          align="left"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#5b6b82' }}
        />
        <Bar dataKey={targetKey} name="Monthly Target" fill="#c3cad4" radius={[0, 6, 6, 0]} maxBarSize={14} animationDuration={700} />
        <Bar dataKey={soldKey} name="Boxes Sold" fill="url(#soldBarGradient)" radius={[0, 6, 6, 0]} maxBarSize={14} animationDuration={700} animationBegin={150} />
      </RBarChart>
    </ResponsiveContainer>
  )
}

export default function DirectorDashboard() {
  const [tab, setTab] = useState('product-sale')

  const today = new Date().toLocaleDateString('ka-GE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="director-dashboard-page">
      <div className="director-header">
        <h1>Dashboard</h1>
        <p className="director-header-subtitle">{today}</p>
      </div>

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

const stockColumns = [
  {
    accessorKey: 'name',
    header: 'Drug Name',
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: 'stocks',
    header: 'Stocks',
    cell: (info) => {
      const v = info.getValue()
      const level = v <= 0 ? 'zero' : v < 20 ? 'low' : 'ok'
      return <span className={`director-stock-badge director-stock-badge-${level}`}>{v}</span>
    },
  },
]

function StockChart({ data }) {
  const height = 380
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 4, right: 12, bottom: 70, left: 4 }} barCategoryGap="30%">
        <defs>
          <linearGradient id="stockBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f74d6" />
            <stop offset="100%" stopColor="#2f9e6e" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eceef2" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fontWeight: 600, fill: '#5b6b82' }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
          height={80}
        />
        <YAxis tick={{ fontSize: 11, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
        <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'rgba(63, 116, 214, 0.05)' }} />
        <Bar dataKey="stocks" name="Stocks" fill="url(#stockBarGradient)" radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={700} />
      </RBarChart>
    </ResponsiveContainer>
  )
}

function StockAvailabilityTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [chartMode, setChartMode] = useState('low')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch('/api/director-dashboard/stock-availability')
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const table = useReactTable({
    data: data?.docs || [],
    columns: stockColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } },
  })

  return (
    <div className="director-tab-panel">
      {error && <p className="resource-error">{error}</p>}

      {data && (
        <div className="director-kpi-row">
          <div className="director-kpi-card">
            <span className="director-kpi-label">სულ პროდუქტი</span>
            <span className="director-kpi-value">{data.total?.toLocaleString()}</span>
          </div>
          <div className="director-kpi-card director-kpi-warning">
            <span className="director-kpi-label">დაბალი მარაგი</span>
            <span className="director-kpi-value">{data.lowStock?.length?.toLocaleString() || 0}</span>
          </div>
          <div className="director-kpi-card director-kpi-danger">
            <span className="director-kpi-label">ვადაგასული</span>
            <span className="director-kpi-value">{data.expired?.length?.toLocaleString() || 0}</span>
          </div>
        </div>
      )}

      {data && (
        <div className="director-chart-card">
          <div className="director-chart-toolbar">
            <h3>{chartMode === 'low' ? 'Low Stock Drugs' : 'ყველა პროდუქტი'}</h3>
            <div className="director-chart-toggle">
              <button
                type="button"
                className={chartMode === 'low' ? 'active' : ''}
                onClick={() => setChartMode('low')}
              >
                დაბალი მარაგი
              </button>
              <button
                type="button"
                className={chartMode === 'all' ? 'active' : ''}
                onClick={() => setChartMode('all')}
              >
                ყველა
              </button>
            </div>
          </div>
          <StockChart
            data={
              chartMode === 'low'
                ? [...(data.docs || [])]
                    .filter((d) => d.stocks > 0)
                    .sort((a, b) => a.stocks - b.stocks)
                    .slice(0, 15)
                : [...(data.docs || [])]
                    .sort((a, b) => b.stocks - a.stocks)
                    .slice(0, 15)
            }
          />
        </div>
      )}

      {data?.expired?.length > 0 && (
        <div className="director-alert-card director-alert-danger">
          <h4>ვადაგასული ({data.expired.length})</h4>
          <div className="director-alert-scroll">
            <div className="director-chip-grid">
              {data.expired.map((d) => (
                <span className="director-chip director-chip-danger" key={d.id}>
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="director-datagrid">
        <div className="director-datagrid-search">
          <input
            type="text"
            className="field-input"
            placeholder="ძებნა პროდუქტის სახელით..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>

        <div className="director-table-wrap">
          <table className="director-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="director-th-sortable"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="director-sort-indicator">
                        {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted()] ?? ''}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={2}>ჩანაწერები არ მოიძებნა</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="director-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
            <span>←</span>
          </button>
          <span>{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
          <button type="button" className="btn-gray btn-sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            <span>→</span>
          </button>
        </div>
      </div>
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
