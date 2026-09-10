<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Check } from 'lucide-vue-next'
import M3Tooltip from './M3Tooltip.vue'

interface Props {
  text?: string | (() => string | Promise<string>)
  label?: string
  copiedLabel?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  iconSize?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  label: 'Copy',
  copiedLabel: 'Copied!',
  placement: 'top',
  iconSize: 13,
  disabled: false
})

const emit = defineEmits<{
  (e: 'copied'): void
}>()

const isCopied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function handleCopy() {
  if (props.disabled) return

  let textToCopy = ''
  if (typeof props.text === 'function') {
    textToCopy = await props.text()
  } else {
    textToCopy = props.text || ''
  }

  if (!textToCopy) return

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(textToCopy)
    } else {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    isCopied.value = true
    emit('copied')

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      isCopied.value = false
    }, 1800)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}
</script>

<template>
  <M3Tooltip :text="isCopied ? copiedLabel : label" :placement="placement">
    <button
      type="button"
      class="pane-icon-btn copy-btn"
      :class="{ active: isCopied }"
      :disabled="disabled"
      :aria-label="isCopied ? copiedLabel : label"
      @click="handleCopy"
    >
      <component
        :is="isCopied ? Check : Copy"
        :size="iconSize"
        class="copy-icon"
        :class="{ 'icon-success': isCopied }"
      />
    </button>
  </M3Tooltip>
</template>

<style scoped>
.pane-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.12s ease;
  padding: 0;
  flex-shrink: 0;
}

.pane-icon-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline-variant);
}

.pane-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pane-icon-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.icon-success {
  color: var(--md-sys-color-primary);
  animation: scale-bounce 0.2s ease-out;
}

@keyframes scale-bounce {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style>
