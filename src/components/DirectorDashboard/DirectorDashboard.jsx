'use client'

import { useEffect, useState, Fragment } from 'react'
import { apiFetch } from '@/lib/api'
import SearchableSelect from '@/components/ResourceTable/SearchableSelect'
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

const KA_WEEKDAYS = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი']
const KA_MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი']

function formatTodayKa() {
  const d = new Date()
  return `${KA_WEEKDAYS[d.getDay()]}, ${d.getDate()} ${KA_MONTHS[d.getMonth()]}`
}

function timeAgoKa(date) {
  if (!date) return ''
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return 'ახლახანს'
  if (seconds < 60) return `${seconds} წამის წინ`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} წუთის წინ`
  const hours = Math.floor(minutes / 60)
  return `${hours} საათის წინ`
}

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function weatherKind(code) {
  if (code === 0) return 'sunny'
  if ([1, 2].includes(code)) return 'partly'
  if (code === 3) return 'cloudy'
  if ([45, 48].includes(code)) return 'fog'
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 85, 86].includes(code)) return 'snow'
  if ([95, 96, 99].includes(code)) return 'storm'
  return 'partly'
}

function WeatherIcon({ code }) {
  const kind = weatherKind(code)
  if (kind === 'sunny') {
    return (
      <svg viewBox="0 0 40 40" width="26" height="26">
        <circle cx="20" cy="20" r="8" fill="#f4b740" />
        <g stroke="#f4b740" strokeWidth="2.5" strokeLinecap="round">
          <line x1="20" y1="4" x2="20" y2="8" /><line x1="20" y1="32" x2="20" y2="36" />
          <line x1="4" y1="20" x2="8" y2="20" /><line x1="32" y1="20" x2="36" y2="20" />
          <line x1="8.3" y1="8.3" x2="11.1" y2="11.1" /><line x1="28.9" y1="28.9" x2="31.7" y2="31.7" />
          <line x1="8.3" y1="31.7" x2="11.1" y2="28.9" /><line x1="28.9" y1="11.1" x2="31.7" y2="8.3" />
        </g>
      </svg>
    )
  }
  if (kind === 'partly') {
    return (
      <svg viewBox="0 0 40 40" width="26" height="26">
        <circle cx="15" cy="16" r="6.5" fill="#f4b740" />
        <path d="M11 26a7.5 7.5 0 0 1 1-14.9 9 9 0 0 1 17 3.2 6 6 0 0 1-1 10.7H11z" fill="#b9c4d4" />
      </svg>
    )
  }
  if (kind === 'cloudy') {
    return (
      <svg viewBox="0 0 40 40" width="26" height="26">
        <path d="M9 27a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#9aa7ba" />
      </svg>
    )
  }
  if (kind === 'rain') {
    return (
      <svg viewBox="0 0 40 40" width="26" height="26">
        <path d="M9 20a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#9aa7ba" />
        <g stroke="#3f74d6" strokeWidth="2.5" strokeLinecap="round">
          <line x1="14" y1="26" x2="12" y2="33" /><line x1="20" y1="26" x2="18" y2="33" /><line x1="26" y1="26" x2="24" y2="33" />
        </g>
      </svg>
    )
  }
  if (kind === 'snow') {
    return (
      <svg viewBox="0 0 40 40" width="26" height="26">
        <path d="M9 20a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#b9c4d4" />
        <g fill="#7fb3ff"><circle cx="14" cy="30" r="2" /><circle cx="20" cy="34" r="2" /><circle cx="26" cy="30" r="2" /></g>
      </svg>
    )
  }
  if (kind === 'storm') {
    return (
      <svg viewBox="0 0 40 40" width="26" height="26">
        <path d="M9 22a8 8 0 0 1 1-16 9.5 9.5 0 0 1 18 3 6.5 6.5 0 0 1-1 13H9z" fill="#8792a3" />
        <path d="M21 24l-6 9h5l-3 7 9-11h-5l4-5z" fill="#f4b740" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 40 40" width="26" height="26">
      <g stroke="#aab3c0" strokeWidth="3" strokeLinecap="round">
        <line x1="6" y1="14" x2="34" y2="14" /><line x1="6" y1="20" x2="34" y2="20" /><line x1="6" y1="26" x2="26" y2="26" />
      </g>
    </svg>
  )
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
            <stop offset="0%" stopColor="#3f74d6" /><stop offset="100%" stopColor="#2f9e6e" />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke="#eceef2" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={labelKey} width={130} tick={{ fontSize: 12, fontWeight: 600, fill: '#0f2744' }} axisLine={false} tickLine={false} />
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
            <stop offset="0%" stopColor="#3f74d6" /><stop offset="100%" stopColor="#2f9e6e" />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke="#eceef2" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={labelKey} width={130} tick={{ fontSize: 12, fontWeight: 600, fill: '#0f2744' }} axisLine={false} tickLine={false} />
        <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'rgba(63, 116, 214, 0.05)' }} />
        <Legend verticalAlign="top" align="left" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600, color: '#5b6b82' }} />
        <Bar dataKey={targetKey} name="Monthly Target" fill="#c3cad4" radius={[0, 6, 6, 0]} maxBarSize={14} animationDuration={700} />
        <Bar dataKey={soldKey} name="Boxes Sold" fill="url(#soldBarGradient)" radius={[0, 6, 6, 0]} maxBarSize={14} animationDuration={700} animationBegin={150} />
      </RBarChart>
    </ResponsiveContainer>
  )
}

function StockChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <RBarChart data={data} margin={{ top: 4, right: 12, bottom: 70, left: 4 }} barCategoryGap="30%">
        <defs>
          <linearGradient id="stockBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f74d6" /><stop offset="100%" stopColor="#2f9e6e" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eceef2" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#5b6b82' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} height={80} />
        <YAxis tick={{ fontSize: 11, fill: '#9aa7ba' }} axisLine={false} tickLine={false} />
        <Tooltip content={<PremiumTooltip />} cursor={{ fill: 'rgba(63, 116, 214, 0.05)' }} />
        <Bar dataKey="stocks" name="Stocks" fill="url(#stockBarGradient)" radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={700} />
      </RBarChart>
    </ResponsiveContainer>
  )
}

function Skeleton({ rows = 5 }) {
  return (
    <div className="director-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="director-skeleton-row" key={i} />
      ))}
    </div>
  )
}

function EmptyState({ text = 'მონაცემი ვერ მოიძებნა' }) {
  return (
    <div className="director-empty-state">
      <svg viewBox="0 0 64 64" width="48" height="48">
        <rect x="10" y="18" width="44" height="34" rx="4" fill="none" stroke="#c3cad4" strokeWidth="2.5" />
        <line x1="10" y1="28" x2="54" y2="28" stroke="#c3cad4" strokeWidth="2.5" />
        <circle cx="32" cy="40" r="6" fill="none" stroke="#c3cad4" strokeWidth="2.5" />
        <line x1="36.5" y1="44.5" x2="41" y2="49" stroke="#c3cad4" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p>{text}</p>
    </div>
  )
}

function QuickDateButtons({ onPick }) {
  const [selected, setSelected] = useState(null)
  const now = new Date()
  const ranges = [
    {
      label: 'ამ თვეს',
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    },
    {
      label: 'წინა თვე',
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    },
    {
      label: 'ბოლო 3 თვე',
      from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    },
  ]
  const fmt = (d) => d.toISOString().slice(0, 10)
  return (
    <div className="director-quick-dates">
      {ranges.map((r) => (
        <button
          type="button"
          key={r.label}
          className={selected === r.label ? 'active' : ''}
          onClick={() => {
            setSelected(r.label)
            onPick(fmt(r.from), fmt(r.to))
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

export default function DirectorDashboard() {
  const [tab, setTab] = useState('product-sale')
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=41.7151&longitude=44.8271&current_weather=true')
      .then((r) => r.json())
      .then((data) => setWeather(data.current_weather))
      .catch(() => {})
  }, [])

  const today = formatTodayKa()

  return (
    <div className="director-dashboard-page">
      <div className="director-header">
        <div className="director-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
        </div>
        <div className="director-header-text">
          <span className="director-header-eyebrow">დირექტორის პანელი</span>
          <h1>Dashboard</h1>
          <p className="director-header-subtitle">{today}</p>
        </div>
        {weather && (
          <div className="director-header-weather">
            <span className="director-header-weather-icon"><WeatherIcon code={weather.weathercode} /></span>
            <span className="director-header-weather-temp">{Math.round(weather.temperature)}°</span>
          </div>
        )}
      </div>

      <div className="director-tabs">
        <button type="button" className={tab === 'product-sale' ? 'active' : ''} onClick={() => setTab('product-sale')}>Monthly Product Sales</button>
        <button type="button" className={tab === 'stock-availability' ? 'active' : ''} onClick={() => setTab('stock-availability')}>Stock Availability</button>
        <button type="button" className={tab === 'order' ? 'active' : ''} onClick={() => setTab('order')}>Order</button>
        <button type="button" className={tab === 'doctors-report' ? 'active' : ''} onClick={() => setTab('doctors-report')}>Doctors Report</button>
      </div>

      {tab === 'product-sale' && <ProductSaleTab />}
      {tab === 'stock-availability' && <StockAvailabilityTab />}
      {tab === 'order' && <OrderTab />}
      {tab === 'doctors-report' && <DoctorsReportTab />}
    </div>
  )
}

const saleColumns = [
  { accessorKey: 'drugName', header: 'Drug Name' },
  { accessorKey: 'openingStocks', header: 'Opening Stocks' },
  { accessorKey: 'monthlyTarget', header: 'Monthly Target' },
  { accessorKey: 'saleBoxes', header: 'Sale Boxes' },
  {
    accessorKey: 'closingStocks',
    header: 'Closing Stocks',
    cell: (info) => {
      const v = info.getValue()
      return <span className={v < 0 ? 'director-negative' : ''}>{v}</span>
    },
  },
  { accessorKey: 'totalSaleAmount', header: 'Total Sale Amount', cell: (info) => fmtMoney(info.getValue()) },
]

function ProductSaleTab() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState(null)
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')

  async function load(fd = fromDate, td = toDate) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', 1)
      params.set('limit', 500)
      if (fd) params.set('fromDate', fd)
      if (td) params.set('toDate', td)
      const result = await apiFetch(`/api/director-dashboard/product-sale?${params}`)
      setData(result)
      setLastLoaded(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pickRange(fd, td) {
    setFromDate(fd)
    setToDate(td)
    load(fd, td)
  }

  const rows = data?.docs || []
  const totalAmount = rows.reduce((s, r) => s + (r.totalSaleAmount || 0), 0)
  const totalBoxes = rows.reduce((s, r) => s + (r.saleBoxes || 0), 0)
  const topProduct = rows.length ? [...rows].sort((a, b) => b.saleBoxes - a.saleBoxes)[0] : null

  const table = useReactTable({
    data: rows,
    columns: saleColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

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
        <button type="button" className={`btn director-submit-btn${loading ? ' is-loading' : ''}`} onClick={() => load()} disabled={loading}>
          <span>Submit</span>
        </button>
        <QuickDateButtons onPick={pickRange} />
      </div>

      {error && <p className="resource-error">{error}</p>}

      {loading && !data && <Skeleton />}

      {data && rows.length > 0 && (
        <div className="director-kpi-row">
          <div className="director-kpi-card">
            <span className="director-kpi-label">სულ გაყიდვა</span>
            <span className="director-kpi-value">{fmtMoney(totalAmount)} ₾</span>
          </div>
          <div className="director-kpi-card">
            <span className="director-kpi-label">გაყიდული ყუთები</span>
            <span className="director-kpi-value">{totalBoxes.toLocaleString()}</span>
          </div>
          <div className="director-kpi-card">
            <span className="director-kpi-label">ტოპ პროდუქტი</span>
            <span className="director-kpi-value director-kpi-value-text">{topProduct?.drugName || '—'}</span>
          </div>
        </div>
      )}

      {data && rows.length > 0 && (
        <>
          <div className="director-chart-card">
            <h3>Monthly Target vs Boxes Sold</h3>
            <DualBarChart data={rows.slice(0, 15)} labelKey="drugName" targetKey="monthlyTarget" soldKey="saleBoxes" />
          </div>
          <div className="director-chart-card">
            <h3>Monthly Product Sale Chart</h3>
            <BarChart data={rows.slice(0, 15)} valueKey="saleBoxes" labelKey="drugName" />
          </div>
        </>
      )}

      {data && rows.length === 0 && !loading && <EmptyState text="გაყიდვების მონაცემი ვერ მოიძებნა ამ პერიოდისთვის" />}

      {data && rows.length > 0 && (
        <div className="director-datagrid">
          <div className="director-datagrid-toolbar">
            <input
              type="text"
              className="field-input"
              placeholder="ძებნა პროდუქტის სახელით..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <div className="director-toolbar-right">
              {lastLoaded && <span className="director-last-updated">განახლდა: {timeAgoKa(lastLoaded)}</span>}
              <button type="button" className="btn-gray btn-sm director-export-btn" onClick={() => downloadCSV('monthly-product-sales.csv', rows)}>
                <span>⬇ CSV</span>
              </button>
            </div>
          </div>

          <div className="director-table-wrap">
            <table className="director-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="director-th-sortable">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="director-sort-indicator">{{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted()] ?? ''}</span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell ?? cell.getValue(), cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="director-pagination">
            <button type="button" className="btn-gray btn-sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><span>←</span></button>
            <span>{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
            <button type="button" className="btn-gray btn-sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><span>→</span></button>
          </div>
        </div>
      )}
    </div>
  )
}

const stockColumns = [
  { accessorKey: 'name', header: 'Drug Name' },
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

function StockAvailabilityTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState(null)
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [chartMode, setChartMode] = useState('low')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch('/api/director-dashboard/stock-availability')
      setData(result)
      setLastLoaded(new Date())
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
      {loading && !data && <Skeleton />}

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
              <button type="button" className={chartMode === 'low' ? 'active' : ''} onClick={() => setChartMode('low')}>დაბალი მარაგი</button>
              <button type="button" className={chartMode === 'all' ? 'active' : ''} onClick={() => setChartMode('all')}>ყველა</button>
            </div>
          </div>
          <StockChart
            data={
              chartMode === 'low'
                ? [...(data.docs || [])].filter((d) => d.stocks > 0).sort((a, b) => a.stocks - b.stocks).slice(0, 15)
                : [...(data.docs || [])].sort((a, b) => b.stocks - a.stocks).slice(0, 15)
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
                <span className="director-chip director-chip-danger" key={d.id}>{d.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {data && data.docs?.length === 0 && !loading && <EmptyState text="პროდუქტის მონაცემი ვერ მოიძებნა" />}

      {data && data.docs?.length > 0 && (
        <div className="director-datagrid">
          <div className="director-datagrid-toolbar">
            <input
              type="text"
              className="field-input"
              placeholder="ძებნა პროდუქტის სახელით..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
            <div className="director-toolbar-right">
              {lastLoaded && <span className="director-last-updated">განახლდა: {timeAgoKa(lastLoaded)}</span>}
              <button type="button" className="btn-gray btn-sm director-export-btn" onClick={() => downloadCSV('stock-availability.csv', data.docs)}>
                <span>⬇ CSV</span>
              </button>
            </div>
          </div>

          <div className="director-table-wrap">
            <table className="director-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="director-th-sortable">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="director-sort-indicator">{{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted()] ?? ''}</span>
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
                  <tr><td colSpan={2}>ჩანაწერები არ მოიძებნა</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="director-pagination">
            <button type="button" className="btn-gray btn-sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><span>←</span></button>
            <span>{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
            <button type="button" className="btn-gray btn-sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><span>→</span></button>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderTab() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastLoaded, setLastLoaded] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', 1)
      params.set('limit', 200)
      const result = await apiFetch(`/api/director-dashboard/orders?${params}`)
      setData(result)
      setLastLoaded(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const dayEntries = data?.ordersByDay ? Object.entries(data.ordersByDay).sort() : []

  const filteredDocs = (data?.docs || []).filter((row) => {
    if (search && !row.drugName?.toLowerCase().includes(search.toLowerCase())) return false
    if (fromDate && new Date(row.createdAt) < new Date(fromDate)) return false
    if (toDate && new Date(row.createdAt) > new Date(toDate + 'T23:59:59')) return false
    return true
  })

  return (
    <div className="director-tab-panel">
      {error && <p className="resource-error">{error}</p>}
      {loading && !data && <Skeleton />}

      <div className="director-filters">
        <div className="director-field">
          <label>Start Date</label>
          <input type="date" className="field-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="director-field">
          <label>End Date</label>
          <input type="date" className="field-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="director-field director-field-grow">
          <label>ძებნა</label>
          <input type="text" className="field-input" placeholder="წამლის სახელით..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {dayEntries.length > 0 && (
        <div className="director-chart-card">
          <h3>შეკვეთები ამ თვეში, დღეების მიხედვით</h3>
          <BarChart data={dayEntries.map(([date, count]) => ({ date, count }))} valueKey="count" labelKey="date" />
        </div>
      )}

      {data && filteredDocs.length === 0 && !loading && <EmptyState text="შეკვეთა ვერ მოიძებნა" />}

      {data && filteredDocs.length > 0 && (
        <div className="director-datagrid">
          <div className="director-datagrid-toolbar">
            <span />
            <div className="director-toolbar-right">
              {lastLoaded && <span className="director-last-updated">განახლდა: {timeAgoKa(lastLoaded)}</span>}
              <button type="button" className="btn-gray btn-sm director-export-btn" onClick={() => downloadCSV('orders.csv', filteredDocs)}>
                <span>⬇ CSV</span>
              </button>
            </div>
          </div>

          <div className="director-table-wrap">
            <table className="director-table">
              <thead>
                <tr>
                  <th>Drug</th><th>Pack</th><th>Price FOB (USD)</th><th>Quantity</th><th>Amount (USD)</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((row) => (
                  <tr key={row._id}>
                    <td>{row.drugName}</td>
                    <td>{row.pack}</td>
                    <td>{row.priceFobUsd}</td>
                    <td>{row.quantity}</td>
                    <td>{row.amountUsd}</td>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString('ka-GE') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function DoctorDrugBreakdown({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className="director-empty-inline">ამ პერიოდში გაყიდვების მონაცემი არ არის</p>
  }
  return (
    <div className="director-doctor-breakdown">
      {rows.map((d, i) => (
        <div className="director-doctor-breakdown-row" key={i}>
          <span className="director-doctor-breakdown-name">{d.drugName}</span>
          <span className="director-doctor-breakdown-boxes">{d.saleBoxes} ყუთი</span>
          <span className="director-doctor-breakdown-amount">{d.salesAmount.toLocaleString()} ₾</span>
        </div>
      ))}
    </div>
  )
}

function DoctorsReportTab() {
  const [doctors, setDoctors] = useState([])
  const [divisions, setDivisions] = useState([])
  const [groups, setGroups] = useState([])

  const [doctorId, setDoctorId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedRows, setExpandedRows] = useState(new Set())

  useEffect(() => {
    Promise.all([
      apiFetch('/api/doctors'),
      apiFetch('/api/divisions'),
      apiFetch('/api/admin/groups'),
    ])
      .then(([d, div, g]) => {
        setDoctors(d)
        setDivisions(div)
        setGroups(g)
      })
      .catch((err) => setError(err.message))
  }, [])

  async function load(targetPage = 1) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', targetPage)
      params.set('limit', 25)
      if (doctorId) params.set('doctor', doctorId)
      if (divisionId) params.set('division', divisionId)
      if (groupId) params.set('group', groupId)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
      const result = await apiFetch(`/api/director-dashboard/doctors-report?${params}`)
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

  function toggleExpand(id) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
        <div className="director-field director-field-grow">
          <label>ექიმი</label>
          <SearchableSelect options={doctors} value={doctorId} onChange={setDoctorId} getLabel={(o) => o.name} placeholder="ყველა" />
        </div>
        <div className="director-field director-field-grow">
          <label>დივიზიონი</label>
          <SearchableSelect options={divisions} value={divisionId} onChange={setDivisionId} getLabel={(o) => o.name} placeholder="ყველა" />
        </div>
        <div className="director-field director-field-grow">
          <label>ჯგუფი</label>
          <SearchableSelect options={groups} value={groupId} onChange={setGroupId} getLabel={(o) => o.name} placeholder="ყველა" />
        </div>
        <button type="button" className="btn director-submit-btn" onClick={() => load(1)} disabled={loading}>
          <span>Submit</span>
        </button>
      </div>

      {error && <p className="resource-error">{error}</p>}
      {loading && !data && <Skeleton />}

      {data && (
        <div className="director-kpi-row">
          <div className="director-kpi-card">
            <span className="director-kpi-label">ახლად დამატებული</span>
            <span className="director-kpi-value">{data.kpis.newlyAddedCount.toLocaleString()}</span>
          </div>
          <div className="director-kpi-card">
            <span className="director-kpi-label">აქტიური ექიმები</span>
            <span className="director-kpi-value">{data.kpis.activeCount.toLocaleString()}</span>
          </div>
          <div className="director-kpi-card">
            <span className="director-kpi-label">დაბიუჯეტებული</span>
            <span className="director-kpi-value">{data.kpis.budgetedCount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {data && data.docs.length === 0 && !loading && <EmptyState text="ექიმები ვერ მოიძებნა" />}

      {data && data.docs.length > 0 && (
        <div className="director-chart-card">
          <h3>გაყიდვები ექიმების მიხედვით</h3>
          <BarChart
            data={[...data.docs].sort((a, b) => b.totalSalesAmount - a.totalSalesAmount).slice(0, 15)}
            valueKey="totalSalesAmount"
            labelKey="name"
          />
        </div>
      )}

      {data && data.docs.length > 0 && (
        <div className="director-table-wrap">
          <table className="director-table">
            <thead>
              <tr>
                <th></th>
                <th>ექიმი</th>
                <th>ნომერი</th>
                <th>პროფილი</th>
                <th>აქტიური</th>
                <th>ბიუჯეტი</th>
                <th>გაყიდვა (ყუთი)</th>
                <th>გაყიდვა (თანხა)</th>
              </tr>
            </thead>
            <tbody>
              {data.docs.map((d) => {
                const isExpanded = expandedRows.has(d._id)
                return (
                  <Fragment key={d._id}>
                    <tr>
                      <td>
                        <button type="button" className="analytics-expand-btn" onClick={() => toggleExpand(d._id)}>
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
                      <td>{d.name}</td>
                      <td>{d.uniqueNumber}</td>
                      <td>{d.profileName}</td>
                      <td>{d.isActive ? '✓' : '✕'}</td>
                      <td>{d.isBudgeted ? '✓' : '✕'}</td>
                      <td className="director-num">{d.totalSaleBoxes}</td>
                      <td className="director-num">{d.totalSalesAmount.toLocaleString()} ₾</td>
                    </tr>
                    {isExpanded && (
                      <tr className="analytics-breakdown-row">
                        <td colSpan={8}>
                          <DoctorDrugBreakdown rows={d.drugBreakdown} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="director-pagination">
          <button type="button" className="btn-gray btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}><span>←</span></button>
          <span>{page} / {data.pages}</span>
          <button type="button" className="btn-gray btn-sm" disabled={page >= data.pages} onClick={() => load(page + 1)}><span>→</span></button>
        </div>
      )}
    </div>
  )
}
