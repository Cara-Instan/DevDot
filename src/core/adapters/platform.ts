/**
 * Platform detector utility to check if the app is running in a Tauri native window
 * or standard Web browser environment.
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // Tauri v2 sets window.__TAURI_INTERNALS__ or window.__TAURI__
  return (
    '__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window
  )
}

/**
 * Returns descriptive name of current runtime environment
 */
export function getRuntimeEnvironment(): 'tauri' | 'web' {
  return isTauri() ? 'tauri' : 'web'
}
