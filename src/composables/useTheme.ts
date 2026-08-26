import { computed, watch } from 'vue'
import { usePreferredColorScheme, usePreferredContrast, useStorage } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'system'

const themeMode = useStorage<ThemeMode>('devdot-theme-mode', 'system')
const isHighContrast = useStorage<boolean>('devdot-high-contrast', false)

export function useTheme() {
  const preferredColor = usePreferredColorScheme()
  const preferredContrast = usePreferredContrast()

  // System high contrast check
  const systemHighContrast = computed(() => preferredContrast.value === 'more')

  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (themeMode.value === 'system') {
      return preferredColor.value === 'dark' ? 'dark' : 'light'
    }
    return themeMode.value
  })

  const isDark = computed(() => effectiveTheme.value === 'dark')

  const isHighContrastActive = computed(() => {
    return isHighContrast.value || systemHighContrast.value
  })

  const applyTheme = () => {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    // Toggle dark class
    if (effectiveTheme.value === 'dark') {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }

    // Toggle high-contrast class
    if (isHighContrastActive.value) {
      root.classList.add('high-contrast')
      root.setAttribute('data-contrast', 'high')
    } else {
      root.classList.remove('high-contrast')
      root.removeAttribute('data-contrast')
    }
  }

  // Watch for changes and apply immediately
  watch([effectiveTheme, isHighContrastActive], () => {
    applyTheme()
  }, { immediate: true })

  const setThemeMode = (mode: ThemeMode) => {
    themeMode.value = mode
    applyTheme()
  }

  const toggleTheme = () => {
    if (effectiveTheme.value === 'dark') {
      setThemeMode('light')
    } else {
      setThemeMode('dark')
    }
  }

  const setHighContrast = (enable: boolean) => {
    isHighContrast.value = enable
    applyTheme()
  }

  const toggleHighContrast = () => {
    setHighContrast(!isHighContrast.value)
  }

  return {
    themeMode,
    isDark,
    effectiveTheme,
    isHighContrast,
    isHighContrastActive,
    setThemeMode,
    toggleTheme,
    setHighContrast,
    toggleHighContrast,
    applyTheme
  }
}
