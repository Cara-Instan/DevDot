import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSettingsStore } from './settings'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export const usePwaStore = defineStore('pwa', () => {
  const settingsStore = useSettingsStore()
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstalled = ref(false)
  const isInstallable = ref(false)
  const isDismissed = ref(false)
  const isOffline = ref(false)
  const needRefresh = ref(false)
  const isUpdating = ref(false)
  const updateSWFunction = ref<((reloadPage?: boolean) => Promise<void>) | null>(null)

  // Initialize listeners
  function initPwa() {
    if (typeof window === 'undefined') return

    // Check standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    isInstalled.value = !!isStandalone
    isOffline.value = !window.navigator.onLine

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e as BeforeInstallPromptEvent
      isInstallable.value = true
    })

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      deferredPrompt.value = null
      isInstallable.value = false
      isInstalled.value = true
    })

    // Online / Offline tracking
    window.addEventListener('online', () => {
      isOffline.value = false
    })

    window.addEventListener('offline', () => {
      isOffline.value = true
    })
  }

  // Trigger browser install dialog
  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt.value) {
      return 'unavailable'
    }

    try {
      await deferredPrompt.value.prompt()
      const choice = await deferredPrompt.value.userChoice
      if (choice.outcome === 'accepted') {
        isInstallable.value = false
        deferredPrompt.value = null
      }
      return choice.outcome
    } catch {
      return 'unavailable'
    }
  }

  function dismissInstall(dontAskAgain = false) {
    isDismissed.value = true
    if (dontAskAgain) {
      settingsStore.setDontAskInstall(true)
    }
  }

  function dismissUpdate() {
    needRefresh.value = false
  }

  function registerUpdateHandler(updateFn: (reloadPage?: boolean) => Promise<void>) {
    updateSWFunction.value = updateFn
    needRefresh.value = true
  }

  async function updateApp() {
    isUpdating.value = true
    try {
      if (updateSWFunction.value) {
        await updateSWFunction.value(true)
      } else if (typeof window !== 'undefined') {
        await hardResetAppCaches()
      }
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * Complete emergency wipe of service worker registrations & CacheStorage caches,
   * followed by an unconditional fresh page reload.
   */
  async function hardResetAppCaches(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }
      }

      if ('caches' in window) {
        const cacheKeys = await window.caches.keys()
        for (const key of cacheKeys) {
          await window.caches.delete(key)
        }
      }
    } catch (err) {
      console.warn('[PwaStore] Error during hard cache reset:', err)
    } finally {
      window.location.reload()
    }
  }

  const showInstallBanner = computed(() => {
    if (settingsStore.dontAskAgainInstallPrompt) {
      return false
    }
    return isInstallable.value && !isInstalled.value && !isDismissed.value
  })

  return {
    deferredPrompt,
    isInstalled,
    isInstallable,
    isDismissed,
    isOffline,
    needRefresh,
    isUpdating,
    showInstallBanner,
    initPwa,
    promptInstall,
    dismissInstall,
    dismissUpdate,
    registerUpdateHandler,
    updateApp,
    hardResetAppCaches
  }
})
