'use client'

import { useTranslations } from 'next-intl'
import { geoPlatform } from '@/lib/geo'
import './GeoHelp.css'

// friendly message + "how to turn location back on" for this device
export default function GeoHelp({ kind, onRetry, onClose }) {
  const t = useTranslations('geo')
  if (!kind) return null
  const platform = geoPlatform()
  const steps = kind === 'denied' ? t.raw(`steps.${platform}`) : null

  return (
    <div className={`geo-help geo-help--${kind}`} role="alert">
      <div className="geo-help-head">
        <span className="geo-help-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.4" fill="currentColor" />
          </svg>
        </span>
        <strong>{t(`title.${kind}`)}</strong>
        {onClose && (
          <button type="button" className="geo-help-close" onClick={onClose} aria-label="close">×</button>
        )}
      </div>
      <p className="geo-help-text">{t(`text.${kind}`)}</p>
      {Array.isArray(steps) && (
        <ol className="geo-help-steps">
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {onRetry && (
        <button type="button" className="geo-help-retry" onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </div>
  )
}
