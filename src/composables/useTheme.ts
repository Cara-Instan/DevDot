import { computed, watch } from 'vue'
import { usePreferredColorScheme, usePreferredContrast } from '@vueuse/core'
import { useSettingsStore, type ThemeMode } from '@/stores/settings'

export type { ThemeMode }

export function useTheme() {
  const settingsStore = useSettingsStore()
  const preferredColor = usePreferredColorScheme()
  const preferredContrast = usePreferredContrast()

  // System high contrast check
  const systemHighContrast = computed(() => preferredContrast.value === 'more')

  const themeMode = computed({
    get: () => settingsStore.themeMode,
    set: (mode: ThemeMode) => {
      settingsStore.updateSettings({ themeMode: mode })
    }
  })

  const isHighContrast = computed({
    get: () => settingsStore.isHighContrast,
    set: (val: boolean) => {
      settingsStore.updateSettings({ isHighContrast: val })
    }
  })

  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (settingsStore.themeMode === 'system') {
      return preferredColor.value === 'dark' ? 'dark' : 'light'
    }
    return settingsStore.themeMode
  })

  const isDark = computed(() => effectiveTheme.value === 'dark')

  const isHighContrastActive = computed(() => {
    return settingsStore.isHighContrast || systemHighContrast.value
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
    settingsStore.updateSettings({ themeMode: mode })
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
    settingsStore.updateSettings({ isHighContrast: enable })
    applyTheme()
  }

  const toggleHighContrast = () => {
    setHighContrast(!settingsStore.isHighContrast)
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

