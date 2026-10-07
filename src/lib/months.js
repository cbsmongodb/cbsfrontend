'use client'

import { useLocale } from 'next-intl'

const TAG = { ka: 'ka-GE', en: 'en-GB', ru: 'ru-RU' }

// month names (January..December) in the given language, capitalised
export function monthNames(locale) {
  return Array.from({ length: 12 }, (_, i) => {
    const name = new Date(2000, i, 1).toLocaleString(TAG[locale] || 'ka-GE', { month: 'long' })
    return name.charAt(0).toUpperCase() + name.slice(1)
  })
}

export function useMonthNames() {
  return monthNames(useLocale())
}
