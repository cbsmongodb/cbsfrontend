'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import './ReportLoader.css'

// big loader for reports (squares chasing each other), in the user's theme colours.
// Drawn straight into <body>, so no parent animation / transform can hide it.
export default function ReportLoader() {
  const t = useTranslations('reports')
  const id = useId().replace(/:/g, '')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const squares = (
    <g className="rl__g">
      <g transform="translate(20,20) rotate(0,44,44)">
        <g className="rl__rect-g">
          <rect height="40" width="40" ry="8" rx="8" className="rl__rect" />
          <rect transform="translate(0,48)" height="40" width="40" ry="8" rx="8" className="rl__rect" />
        </g>
        <g transform="rotate(180,44,44)" className="rl__rect-g">
          <rect height="40" width="40" ry="8" rx="8" className="rl__rect" />
          <rect transform="translate(0,48)" height="40" width="40" ry="8" rx="8" className="rl__rect" />
        </g>
      </g>
    </g>
  )
  return createPortal(
    <div className="report-loader" role="status" aria-live="polite">
      <div className="report-loader-card">
        <svg height="128" width="128" viewBox="0 0 128 128" className="rl" aria-hidden="true">
          <defs>
            <linearGradient y2="1" x2="1" y1="0" x1="0" id={`g${id}`}>
              <stop stopColor="#000" offset="0%" />
              <stop stopColor="#fff" offset="100%" />
            </linearGradient>
            <mask id={`m${id}`}>
              <rect fill={`url(#g${id})`} height="128" width="128" y="0" x="0" />
            </mask>
          </defs>
          <g className="rl__base">{squares}</g>
          <g mask={`url(#m${id})`} className="rl__accent">{squares}</g>
        </svg>
        <span className="report-loader-text">{t('common.reportLoading')}</span>
      </div>
    </div>,
    document.body
  )
}
