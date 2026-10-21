<script setup lang="ts">
import { ref, onErrorCaptured, nextTick } from 'vue'
import { AlertTriangle, RotateCcw, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { M3Button } from '@/components/ui'
import { useSnapshotStore, useTabStore, usePwaStore } from '@/stores'

const props = defineProps<{
  tabId?: string
  toolId?: string
}>()

const emit = defineEmits<{
  (e: 'error', error: Error, info: string): void
  (e: 'recovered'): void
}>()

const hasError = ref(false)
const errorMessage = ref('')
const errorStack = ref('')
const errorInfo = ref('')
const showStack = ref(false)
const isResetting = ref(false)

const snapshotStore = useSnapshotStore()
const tabStore = useTabStore()
const pwaStore = usePwaStore()

onErrorCaptured((err: unknown, _instance, info: string) => {
  hasError.value = true
  const errorObj = err instanceof Error ? err : new Error(String(err))
  errorMessage.value = errorObj.message || 'An unexpected rendering or execution exception occurred.'
  errorStack.value = errorObj.stack || ''
  errorInfo.value = info || 'render'

  console.error('[ErrorBoundary] Captured component error:', err, 'Info:', info)
  emit('error', errorObj, info)

  // Prevent error from propagating up and breaking the entire AppLayout
  return false
})

function handleRetry() {
  hasError.value = false
  errorMessage.value = ''
  errorStack.value = ''
  emit('recovered')
}

async function handleResetToolSession() {
  isResetting.value = true
  try {
    if (props.tabId) {
      snapshotStore.removeTabState(props.tabId)
    }
    if (props.toolId) {
      snapshotStore.removeTabState(props.toolId)
    }
  } catch (e) {
    console.warn('[ErrorBoundary] Failed to remove corrupted tab state:', e)
  }

  await nextTick()
  handleRetry()
  isResetting.value = false
}

function handleGoOverview() {
  handleRetry()
  tabStore.openTab('system-overview', { activate: true })
}

async function handleHardReset() {
  await pwaStore.hardResetAppCaches()
}
</script>

<template>
  <div v-if="hasError" class="error-boundary-container" role="alert" aria-live="assertive">
    <div class="error-boundary-card">
      <div class="error-header">
        <div class="error-icon-box">
          <AlertTriangle :size="28" class="error-icon" />
        </div>
        <div class="error-title-wrap">
          <h2 class="error-headline">Tool Session Interrupted</h2>
          <p class="error-subtitle">
            An unexpected error occurred while rendering this tool. Your other open tabs and workspace remain intact.
          </p>
        </div>
      </div>

      <div class="error-message-box">
        <span class="error-message-text">{{ errorMessage }}</span>
        <button
          v-if="errorStack"
          type="button"
          class="toggle-stack-btn"
          @click="showStack = !showStack"
        >
          <span>{{ showStack ? 'Hide technical details' : 'Show technical details' }}</span>
          <ChevronUp v-if="showStack" :size="14" />
          <ChevronDown v-else :size="14" />
        </button>
      </div>

      <Transition name="fade">
        <div v-if="showStack && errorStack" class="error-stack-container">
          <pre class="error-stack-code"><code>{{ errorStack }}</code></pre>
        </div>
      </Transition>

      <div class="error-actions">
        <M3Button
          variant="filled"
          :disabled="isResetting"
          @click="handleResetToolSession"
        >
          <template #icon>
            <RotateCcw :size="15" />
          </template>
          Reset Tool State & Reload
        </M3Button>

        <M3Button
          variant="tonal"
          @click="handleGoOverview"
        >
          <template #icon>
            <Home :size="15" />
          </template>
          Return to Overview
        </M3Button>

        <M3Button
          variant="outlined"
          @click="handleHardReset"
        >
          <template #icon>
            <RefreshCw :size="15" />
          </template>
          Force Clear Cache & Hard Reload
        </M3Button>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<style scoped>
.error-boundary-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 400px;
  padding: 2rem;
  box-sizing: border-box;
}

.error-boundary-card {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 640px;
  padding: 2rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-error-container, #852221);
  border-radius: var(--md-sys-shape-corner-extra-large, 24px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
  color: var(--md-sys-color-on-surface);
}

.error-header {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.error-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  flex-shrink: 0;
}

.error-icon {
  color: #ef4444;
}

.error-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.error-headline {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  letter-spacing: -0.01em;
}

.error-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.45;
}

.error-message-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background-color: var(--md-sys-color-surface-container-lowest, #0a0e17);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  font-family: var(--md-sys-typescale-code-font-family, monospace);
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
  word-break: break-word;
}

.toggle-stack-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: none;
  color: var(--md-sys-color-primary, #818cf8);
  font-size: 0.75rem;
  font-family: var(--md-sys-typescale-font-family, inherit);
  cursor: pointer;
  padding: 0;
  margin-top: 0.25rem;
  align-self: flex-start;
}

.toggle-stack-btn:hover {
  text-decoration: underline;
}

.error-stack-container {
  max-height: 200px;
  overflow-y: auto;
  padding: 0.75rem;
  background-color: var(--md-sys-color-surface-container-lowest, #0a0e17);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 8px);
}

.error-stack-code {
  margin: 0;
  font-family: var(--md-sys-typescale-code-font-family, monospace);
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  white-space: pre-wrap;
  line-height: 1.4;
}

.error-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}
</style>
