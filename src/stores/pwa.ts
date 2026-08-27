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

  function registerUpdateHandler(updateFn: (reloadPage?: boolean) => Promise<void>) {
    updateSWFunction.value = updateFn
    needRefresh.value = true
  }

  async function updateApp() {
    if (updateSWFunction.value) {
      await updateSWFunction.value(true)
    } else if (typeof window !== 'undefined') {
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
    showInstallBanner,
    initPwa,
    promptInstall,
    dismissInstall,
    registerUpdateHandler,
    updateApp
  }
})
