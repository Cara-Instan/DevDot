import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { ALL_TOOLS } from './navigation'

export type ThemeMode = 'dark' | 'light' | 'system'

export interface SettingsState {
  themeMode: ThemeMode
  isHighContrast: boolean
  dontAskAgainInstallPrompt: boolean
  toolOrder: string[]
  clipboardAutoPurgeSeconds: number
  editorFontSize: number
  editorWordWrap: boolean
}

export const SETTINGS_STORAGE_KEY = 'devdot_settings_v1'

export const DEFAULT_TOOL_ORDER: string[] = ALL_TOOLS.map((t) => t.id)

export const DEFAULT_SETTINGS: SettingsState = {
  themeMode: 'system',
  isHighContrast: false,
  dontAskAgainInstallPrompt: false,
  toolOrder: [...DEFAULT_TOOL_ORDER],
  clipboardAutoPurgeSeconds: 60,
  editorFontSize: 13,
  editorWordWrap: true
}

function loadSettingsFromStorage(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        toolOrder: Array.isArray(parsed.toolOrder) && parsed.toolOrder.length > 0
          ? parsed.toolOrder
          : [...DEFAULT_TOOL_ORDER]
      }
    }
  } catch {
    // Fallback to default on parse failure
  }
  return { ...DEFAULT_SETTINGS }
}

export const useSettingsStore = defineStore('settings', () => {
  const initial = loadSettingsFromStorage()

  const themeMode = ref<ThemeMode>(initial.themeMode)
  const isHighContrast = ref<boolean>(initial.isHighContrast)
  const dontAskAgainInstallPrompt = ref<boolean>(initial.dontAskAgainInstallPrompt)
  const toolOrder = ref<string[]>(initial.toolOrder)
  const clipboardAutoPurgeSeconds = ref<number>(initial.clipboardAutoPurgeSeconds)
  const editorFontSize = ref<number>(initial.editorFontSize)
  const editorWordWrap = ref<boolean>(initial.editorWordWrap)

  function getSnapshot(): SettingsState {
    return {
      themeMode: themeMode.value,
      isHighContrast: isHighContrast.value,
      dontAskAgainInstallPrompt: dontAskAgainInstallPrompt.value,
      toolOrder: [...toolOrder.value],
      clipboardAutoPurgeSeconds: clipboardAutoPurgeSeconds.value,
      editorFontSize: editorFontSize.value,
      editorWordWrap: editorWordWrap.value
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(getSnapshot()))
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e)
    }
  }

  // Watch for changes and persist automatically
  watch(
    [
      themeMode,
      isHighContrast,
      dontAskAgainInstallPrompt,
      toolOrder,
      clipboardAutoPurgeSeconds,
      editorFontSize,
      editorWordWrap
    ],
    () => {
      saveSettings()
    },
    { deep: true }
  )

  function updateSettings(partial: Partial<SettingsState>) {
    if (partial.themeMode !== undefined) themeMode.value = partial.themeMode
    if (partial.isHighContrast !== undefined) isHighContrast.value = partial.isHighContrast
    if (partial.dontAskAgainInstallPrompt !== undefined) {
      dontAskAgainInstallPrompt.value = partial.dontAskAgainInstallPrompt
    }
    if (partial.toolOrder !== undefined) toolOrder.value = [...partial.toolOrder]
    if (partial.clipboardAutoPurgeSeconds !== undefined) {
      clipboardAutoPurgeSeconds.value = partial.clipboardAutoPurgeSeconds
    }
    if (partial.editorFontSize !== undefined) editorFontSize.value = partial.editorFontSize
    if (partial.editorWordWrap !== undefined) editorWordWrap.value = partial.editorWordWrap
    saveSettings()
  }

  function resetToolOrder() {
    toolOrder.value = [...DEFAULT_TOOL_ORDER]
    saveSettings()
  }

  function setDontAskInstall(val: boolean = true) {
    dontAskAgainInstallPrompt.value = val
    saveSettings()
  }

  function wipeAllData() {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      console.error('Failed to clear storage:', e)
    }

    // Reset store in-memory state to defaults
    themeMode.value = DEFAULT_SETTINGS.themeMode
    isHighContrast.value = DEFAULT_SETTINGS.isHighContrast
    dontAskAgainInstallPrompt.value = DEFAULT_SETTINGS.dontAskAgainInstallPrompt
    toolOrder.value = [...DEFAULT_SETTINGS.toolOrder]
    clipboardAutoPurgeSeconds.value = DEFAULT_SETTINGS.clipboardAutoPurgeSeconds
    editorFontSize.value = DEFAULT_SETTINGS.editorFontSize
    editorWordWrap.value = DEFAULT_SETTINGS.editorWordWrap

    saveSettings()
  }

  return {
    // State
    themeMode,
    isHighContrast,
    dontAskAgainInstallPrompt,
    toolOrder,
    clipboardAutoPurgeSeconds,
    editorFontSize,
    editorWordWrap,

    // Actions
    getSnapshot,
    updateSettings,
    resetToolOrder,
    setDontAskInstall,
    wipeAllData,
    saveSettings
  }
})
