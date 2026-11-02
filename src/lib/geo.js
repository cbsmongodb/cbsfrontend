// Location permission helpers (check-in, visits)
//
// Browsers do not let a site ask again once the person pressed "Block":
// getCurrentPosition() then fails straight away. So we read the permission
// state, ask when the browser still can, and otherwise show the person how
// to switch it back on for their phone / browser.

// 'granted' | 'prompt' | 'denied' | 'unknown'
export async function geoPermission() {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const s = await navigator.permissions.query({ name: 'geolocation' })
    return s.state
  } catch {
    return 'unknown'
  }
}

// calls onChange(state) whenever the person changes it in the browser
export async function watchGeoPermission(onChange) {
  try {
    if (!navigator.permissions?.query) return () => {}
    const s = await navigator.permissions.query({ name: 'geolocation' })
    onChange(s.state)
    const handler = () => onChange(s.state)
    s.addEventListener?.('change', handler)
    return () => s.removeEventListener?.('change', handler)
  } catch {
    return () => {}
  }
}

// which help text to show: 'ios' | 'android' | 'desktop'
export function geoPlatform() {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

// GeolocationPositionError -> 'denied' | 'unavailable' | 'timeout' | 'unsupported'
export function geoErrorKind(err) {
  if (!err) return 'unavailable'
  if (err.code === 1) return 'denied'
  if (err.code === 2) return 'unavailable'
  if (err.code === 3) return 'timeout'
  if (err.kind) return err.kind
  return 'unavailable'
}

export function getGeoPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const e = new Error('unsupported')
      e.kind = 'unsupported'
      reject(e)
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options,
    })
  })
}
