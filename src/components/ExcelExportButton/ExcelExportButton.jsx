'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { exportXlsx, readTable } from '@/lib/excelExport'
import './ExcelExportButton.css'

// <ExcelExportButton title="..." fileName="..." tableSelector=".my-table" />   (reads the table on screen)
// <ExcelExportButton title="..." build={() => ({ headers, rows })} />           (gives the data directly)
export default function ExcelExportButton({ title, fileName, tableSelector, build, subtitle }) {
  const t = useTranslations('reports')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    setBusy(true); setMsg('')
    try {
      let data
      if (build) data = build()
      else {
        const table = document.querySelector(tableSelector)
        data = table ? readTable(table) : { headers: [], rows: [] }
      }
      if (!data.headers.length || !data.rows.length) { setMsg(t('common.exportNothing')); return }
      const stamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      await exportXlsx({
        title,
        subtitle: subtitle || `Global CBS · ${t('common.exportedAt')} ${stamp} · ${data.rows.length} ${t('common.exportRows')}`,
        fileName: `${fileName || title} ${new Date().toISOString().slice(0, 10)}`,
        totalLabel: t('common.exportTotal'),
        ...data,
      })
    } catch (e) {
      console.error(e); setMsg(t('common.exportFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="excel-export">
      <button type="button" className="excel-export-btn" onClick={run} disabled={busy}>
        {busy ? <span className="btn-spinner" aria-hidden="true" /> : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="#1D7A45" />
            <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        )}
        <span>{t('common.exportExcel')}</span>
      </button>
      {msg && <em className="excel-export-msg">{msg}</em>}
    </span>
  )
}
