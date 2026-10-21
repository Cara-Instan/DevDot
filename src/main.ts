import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/styles/main.css'
import App from '@/App.vue'
import { usePwaStore } from '@/stores/pwa'
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const pwaStore = usePwaStore(pinia)

// Register Service Worker with live update handling
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] New content available, update handler registered')
      pwaStore.registerUpdateHandler(updateSW)
    },
    onOfflineReady() {
      console.log('[PWA] DevDot is ready to operate 100% offline')
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Check for updates periodically every hour
        setInterval(() => {
          registration.update().catch((err) => {
            console.debug('[PWA] Periodic update check failed:', err)
          })
        }, 60 * 60 * 1000)

        // Check for updates when user returns to this tab
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {})
          }
        })
      }
    }
  })
}

app.mount('#app')
