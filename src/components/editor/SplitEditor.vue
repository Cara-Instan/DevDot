<script setup lang="ts">
import { computed } from 'vue'
import {
  Play,
  RotateCcw,
  AlertCircle,
  Clock,
  TrendingDown,
  TrendingUp
} from 'lucide-vue-next'
import CodeEditor from './CodeEditor.vue'
import SplitPane from './SplitPane.vue'
import { SupportedLanguage } from './languages'

interface Props {
  input: string
  output: string
  inputLanguage?: SupportedLanguage | string
  outputLanguage?: SupportedLanguage | string
  inputTitle?: string
  outputTitle?: string
  inputPlaceholder?: string
  outputPlaceholder?: string
  inputReadonly?: boolean
  outputReadonly?: boolean
  isExecuting?: boolean
  error?: string | null
  executionTimeMs?: number | null
  direction?: 'horizontal' | 'vertical'
  initialSplit?: number
  height?: string
  showExecuteButton?: boolean
  executeButtonLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  inputTitle: 'Input',
  outputTitle: 'Output',
  inputLanguage: 'json',
  outputLanguage: 'json',
  inputPlaceholder: 'Enter or paste input here...',
  outputPlaceholder: 'Result will appear here...',
  inputReadonly: false,
  outputReadonly: true,
  isExecuting: false,
  error: null,
  executionTimeMs: null,
  direction: 'horizontal',
  initialSplit: 50,
  height: '100%',
  showExecuteButton: false,
  executeButtonLabel: 'Transform'
})

const emit = defineEmits<{
  (e: 'update:input', value: string): void
  (e: 'update:output', value: string): void
  (e: 'execute'): void
  (e: 'clear-input'): void
  (e: 'clear-output'): void
  (e: 'swap'): void
}>()

// Size comparison analytics
const inputBytes = computed(() => new Blob([props.input || '']).size)
const outputBytes = computed(() => new Blob([props.output || '']).size)

const sizeDiffPercent = computed(() => {
  if (!inputBytes.value || !outputBytes.value) return null
  const diff = ((outputBytes.value - inputBytes.value) / inputBytes.value) * 100
  return Math.round(diff)
})

function handleInputChange(val: string) {
  emit('update:input', val)
}

function handleOutputChange(val: string) {
  emit('update:output', val)
}

function handleExecute() {
  emit('execute')
}

function handleSwap() {
  const currentIn = props.input
  const currentOut = props.output
  emit('update:input', currentOut)
  emit('update:output', currentIn)
  emit('swap')
}
</script>

<template>
  <div class="m3-split-editor-wrapper" :style="{ height: height }">
    <!-- Top Action / Control Bar if custom actions or execute button provided -->
    <div v-if="showExecuteButton || error || executionTimeMs !== null || $slots['top-bar']" class="split-editor-top-bar">
      <div class="top-bar-left">
        <slot name="top-bar-left" />

        <button
          v-if="showExecuteButton"
          type="button"
          class="execute-btn"
          :disabled="isExecuting || !input"
          @click="handleExecute"
        >
          <Play :size="15" />
          <span>{{ isExecuting ? 'Processing...' : executeButtonLabel }}</span>
        </button>

        <!-- Swap input and output button -->
        <button
          v-if="output && !inputReadonly"
          type="button"
          class="action-pill-btn"
          title="Swap Input & Output"
          @click="handleSwap"
        >
          <RotateCcw :size="13" />
          <span>Swap</span>
        </button>

        <slot name="top-bar" />
      </div>

      <div class="top-bar-right">
        <!-- Execution Performance Badge -->
        <div v-if="executionTimeMs !== null" class="stat-pill">
          <Clock :size="13" class="stat-icon" />
          <span>{{ executionTimeMs }} ms</span>
        </div>

        <!-- Size Reduction/Expansion Comparison Badge -->
        <div
          v-if="sizeDiffPercent !== null && sizeDiffPercent !== 0"
          class="stat-pill"
          :class="sizeDiffPercent < 0 ? 'stat-savings' : 'stat-expansion'"
        >
          <component :is="sizeDiffPercent < 0 ? TrendingDown : TrendingUp" :size="13" />
          <span>{{ sizeDiffPercent > 0 ? `+${sizeDiffPercent}%` : `${sizeDiffPercent}%` }}</span>
        </div>

        <slot name="top-bar-right" />
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="error-banner">
      <AlertCircle :size="16" class="error-icon" />
      <span class="error-text">{{ error }}</span>
    </div>

    <!-- Resizable Split Pane with Two Virtualized CodeEditors -->
    <SplitPane
      :direction="direction"
      :initial-split="initialSplit"
      class="editor-split-container"
    >
      <!-- Pane 1 Tab Label for Mobile -->
      <template #pane-1-tab-label>
        {{ inputTitle }} ({{ inputLanguage.toUpperCase() }})
      </template>

      <!-- Pane 2 Tab Label for Mobile -->
      <template #pane-2-tab-label>
        {{ outputTitle }} ({{ outputLanguage.toUpperCase() }})
      </template>

      <!-- Input Pane (Left / Top) -->
      <template #pane-1>
        <CodeEditor
          :model-value="input"
          :language="inputLanguage"
          :title="inputTitle"
          :placeholder="inputPlaceholder"
          :readonly="inputReadonly"
          height="100%"
          @update:model-value="handleInputChange"
          @clear="emit('clear-input')"
        >
          <template #actions>
            <slot name="input-actions" />
          </template>
        </CodeEditor>
      </template>

      <!-- Output Pane (Right / Bottom) -->
      <template #pane-2>
        <div class="output-pane-wrapper">
          <!-- Loading Progress Overlay when worker is processing -->
          <div v-if="isExecuting" class="executing-overlay">
            <div class="spinner-container">
              <div class="m3-spinner" />
              <span>Executing via Worker...</span>
            </div>
          </div>

          <CodeEditor
            :model-value="output"
            :language="outputLanguage"
            :title="outputTitle"
            :placeholder="outputPlaceholder"
            :readonly="outputReadonly"
            :show-clear="!outputReadonly"
            :show-upload="!outputReadonly"
            height="100%"
            @update:model-value="handleOutputChange"
            @clear="emit('clear-output')"
          >
            <template #actions>
              <slot name="output-actions" />
            </template>
          </CodeEditor>
        </div>
      </template>
    </SplitPane>
  </div>
</template>

<style scoped>
.m3-split-editor-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  gap: 0.375rem;
}

.split-editor-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  gap: 0.75rem;
  flex-wrap: wrap;
}

.top-bar-left,
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.execute-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.875rem;
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.execute-btn:hover:not(:disabled) {
  opacity: 0.92;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.execute-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-pill-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.6875rem;
  font-weight: 600;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.stat-icon {
  color: var(--md-sys-color-primary);
}

.stat-savings {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.stat-expansion {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.8125rem;
}

.error-icon {
  color: var(--md-sys-color-error);
  flex-shrink: 0;
}

.editor-split-container {
  flex: 1;
  min-height: 0;
}

.output-pane-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Executing Overlay */
.executing-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--md-sys-shape-corner-medium);
}

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.75rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-medium);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.m3-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--md-sys-color-surface-container-highest);
  border-top-color: var(--md-sys-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
