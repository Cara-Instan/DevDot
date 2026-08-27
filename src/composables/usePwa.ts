import { onMounted } from 'vue'
import { usePwaStore } from '@/stores/pwa'

export function usePwa() {
  const pwaStore = usePwaStore()

  onMounted(() => {
    pwaStore.initPwa()
  })

  return {
    isInstalled: pwaStore.isInstalled,
    isInstallable: pwaStore.isInstallable,
    isOffline: pwaStore.isOffline,
    needRefresh: pwaStore.needRefresh,
    showInstallBanner: pwaStore.showInstallBanner,
    promptInstall: pwaStore.promptInstall,
    dismissInstall: pwaStore.dismissInstall,
    updateApp: pwaStore.updateApp
  }
}
