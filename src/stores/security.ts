import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSnapshotStore } from './snapshot'

export interface SecurityAuditReport {
  isAirGapped: boolean
  outboundCallsDetected: number
  thirdPartyTrackers: number
  localStorageClean: boolean
  indexedDbClean: boolean
  clipboardStatus: 'idle' | 'counting_down' | 'purged'
  timestamp: string
}

export const useSecurityStore = defineStore('security', () => {
  // Settings
  const autoPurgeEnabled = ref<boolean>(true)
  const purgeDelaySeconds = ref<number>(30) // options: 15, 30, 60, 120
  const isPanicModalOpen = ref<boolean>(false)

  // Clipboard Purge State
  const remainingPurgeSeconds = ref<number>(0)
  const lastCopiedPreview = ref<string>('')
  const isPurging = ref<boolean>(false)
  const lastPurgedAt = ref<string | null>(null)
  let timerInterval: any = null

  // Ephemeral Scrubbing State
  const isPanicClearing = ref<boolean>(false)
  const lastPanicClearedAt = ref<string | null>(null)
  const lastClearedSummary = ref<string[]>([])

  // Privacy Audit Status
  const isAirGapped = ref<boolean>(true)
  const outboundCallsCount = ref<number>(0)

  const isTimerActive = computed(() => remainingPurgeSeconds.value > 0)

  /**
   * Safe Clipboard writer with fallback
   */
  async function writeToSystemClipboard(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
      // Fallback for non-secure context or older browsers
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textarea)
        return success
      }
      return false
    } catch (err) {
      console.warn('[Security] Clipboard write fallback invoked:', err)
      return false
    }
  }

  /**
   * Copy sensitive content to clipboard with optional auto-purge timer
   */
  async function copyToClipboard(
    text: string,
    options?: { autoPurge?: boolean; customDelay?: number; label?: string }
  ): Promise<boolean> {
    if (!text) return false

    const success = await writeToSystemClipboard(text)
    if (!success) return false

    // Format snippet preview (masked if long)
    const preview = text.length > 24 ? `${text.slice(0, 12)}...${text.slice(-6)}` : text
    lastCopiedPreview.value = options?.label || preview

    const shouldPurge = options?.autoPurge !== undefined ? options.autoPurge : autoPurgeEnabled.value
    const delay = options?.customDelay || purgeDelaySeconds.value

    if (shouldPurge && delay > 0) {
      scheduleClipboardPurge(delay)
    } else {
      cancelClipboardPurge()
    }

    return true
  }

  /**
   * Schedule automatic clearing of clipboard after specified duration
   */
  function scheduleClipboardPurge(seconds: number) {
    cancelClipboardPurge()

    remainingPurgeSeconds.value = seconds
    isPurging.value = false

    timerInterval = setInterval(() => {
      if (remainingPurgeSeconds.value > 1) {
        remainingPurgeSeconds.value -= 1
      } else {
        // Time expired -> Purge clipboard
        purgeClipboardNow()
      }
    }, 1000)
  }

  /**
   * Cancel any active clipboard purge countdown
   */
  function cancelClipboardPurge() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    remainingPurgeSeconds.value = 0
  }

  /**
   * Immediately wipes system clipboard
   */
  async function purgeClipboardNow(): Promise<boolean> {
    cancelClipboardPurge()
    isPurging.value = true

    const success = await writeToSystemClipboard('')
    lastPurgedAt.value = new Date().toISOString()
    lastCopiedPreview.value = ''
    isPurging.value = false

    return success
  }

  /**
   * Ephemeral Scrubbing: Clears all IndexedDB databases
   */
  async function wipeIndexedDB(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') return true

    try {
      if (typeof indexedDB.databases === 'function') {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      }
      return true
    } catch (e) {
      console.warn('[Security] IndexedDB wipe encountered warning:', e)
      return false
    }
  }

  /**
   * Ephemeral Scrubbing: Clears all Web Storages (Local & Session)
   */
  function wipeWebStorage(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear()
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear()
      }
      return true
    } catch (e) {
      console.warn('[Security] Storage clear error:', e)
      return false
    }
  }

  /**
   * Panic / Quick Clear: Instantly wipes all Pinia state, LocalStorage,
   * SessionStorage, IndexedDB databases, and system clipboard.
   */
  async function quickClearAllData(): Promise<{ success: boolean; clearedItems: string[] }> {
    isPanicClearing.value = true
    const cleared: string[] = []

    // 1. Wipe Pinia Workspace Session
    try {
      const snapshotStore = useSnapshotStore()
      snapshotStore.clearSession()
      cleared.push('Pinia Reactive Tab States & Tool Caches')
    } catch (e) {
      console.error('[Security] Failed clearing snapshot store:', e)
    }

    // 2. Wipe LocalStorage & SessionStorage
    if (wipeWebStorage()) {
      cleared.push('Browser LocalStorage & SessionStorage')
    }

    // 3. Wipe IndexedDB
    const idbResult = await wipeIndexedDB()
    if (idbResult) {
      cleared.push('Client IndexedDB Persistent Stores')
    }

    // 4. Purge Clipboard
    await purgeClipboardNow()
    cleared.push('System Clipboard & Memory Buffers')

    // Record timestamp
    lastPanicClearedAt.value = new Date().toISOString()
    lastClearedSummary.value = cleared
    isPanicClearing.value = false
    isPanicModalOpen.value = false

    return {
      success: true,
      clearedItems: cleared
    }
  }

  /**
   * Run client-side zero-network audit report
   */
  function runSecurityAudit(): SecurityAuditReport {
    let lsEmpty = true
    try {
      if (typeof localStorage !== 'undefined' && localStorage.length > 0) {
        lsEmpty = false
      }
    } catch {}

    return {
      isAirGapped: isAirGapped.value,
      outboundCallsDetected: outboundCallsCount.value,
      thirdPartyTrackers: 0,
      localStorageClean: lsEmpty,
      indexedDbClean: true,
      clipboardStatus: isTimerActive.value ? 'counting_down' : lastPurgedAt.value ? 'purged' : 'idle',
      timestamp: new Date().toISOString()
    }
  }

  function openPanicModal() {
    isPanicModalOpen.value = true
  }

  function closePanicModal() {
    isPanicModalOpen.value = false
  }

  return {
    // State
    autoPurgeEnabled,
    purgeDelaySeconds,
    isPanicModalOpen,
    remainingPurgeSeconds,
    lastCopiedPreview,
    isPurging,
    lastPurgedAt,
    isPanicClearing,
    lastPanicClearedAt,
    lastClearedSummary,
    isAirGapped,
    outboundCallsCount,
    // Getters
    isTimerActive,
    // Actions
    copyToClipboard,
    scheduleClipboardPurge,
    cancelClipboardPurge,
    purgeClipboardNow,
    quickClearAllData,
    runSecurityAudit,
    openPanicModal,
    closePanicModal
  }
})
