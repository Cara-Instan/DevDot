<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Sparkles,
  Wrench,
  Minimize2,
  ArrowDownAZ,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-vue-next'
import {
  M3Switch,
  SplitEditor
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore } from '@/stores'
import type { IndentType, JsonFormatOptions, JsonFormatResult, SortKeysOrder } from '../types'

const { execute, isExecuting } = useExecutionEngine()
const snapshotStore = useSnapshotStore()

const sampleMalformedJson = `// DevDot JSON Suite with Auto-Repair Demo
{
  name: 'DevDot Developer Toolkit',
  version: "0.1.0",
  /* Features list */
  features: [
    '100% Offline Air-Gapped',
    'Material Design 3 Shell',
    'Web Worker Background Pipeline',
  ],
  stats: {
    activeUsers: 1000,
    isProductionReady: True,
    hexCode: 0xFF,
  },
  // Trailing comma below:
}
`

const initialSaved = snapshotStore.getToolState('json-format', {
  inputJson: sampleMalformedJson,
  outputJson: '',
  indentType: '2-spaces' as IndentType,
  autoRepair: true,
  sortKeys: 'none' as SortKeysOrder,
  isMinified: false
})

const inputJson = ref(initialSaved.inputJson)
const outputJson = ref(initialSaved.outputJson)
const indentType = ref<IndentType>(initialSaved.indentType)
const autoRepair = ref(initialSaved.autoRepair)
const sortKeys = ref<SortKeysOrder>(initialSaved.sortKeys)
const isMinified = ref(initialSaved.isMinified)

// Sync changes to snapshot store
watch(
  [inputJson, outputJson, indentType, autoRepair, sortKeys, isMinified],
  () => {
    snapshotStore.setToolState('json-format', {
      inputJson: inputJson.value,
      outputJson: outputJson.value,
      indentType: indentType.value,
      autoRepair: autoRepair.value,
      sortKeys: sortKeys.value,
      isMinified: isMinified.value
    })
  },
  { deep: true }
)

// Hydrate if snapshot store state is externally updated (e.g. on snapshot import)
watch(
  () => snapshotStore.toolStates['json-format'],
  (newState) => {
    if (newState) {
      if (newState.inputJson !== undefined && newState.inputJson !== inputJson.value) {
        inputJson.value = newState.inputJson
      }
      if (newState.outputJson !== undefined && newState.outputJson !== outputJson.value) {
        outputJson.value = newState.outputJson
      }
      if (newState.indentType !== undefined && newState.indentType !== indentType.value) {
        indentType.value = newState.indentType
      }
      if (newState.autoRepair !== undefined && newState.autoRepair !== autoRepair.value) {
        autoRepair.value = newState.autoRepair
      }
      if (newState.sortKeys !== undefined && newState.sortKeys !== sortKeys.value) {
        sortKeys.value = newState.sortKeys
      }
      if (newState.isMinified !== undefined && newState.isMinified !== isMinified.value) {
        isMinified.value = newState.isMinified
      }
    }
  },
  { deep: true }
)

const lastResult = ref<JsonFormatResult | null>(null)
const formatError = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)
const repairNotices = ref<string[]>([])

// Compute stats display
const stats = computed(() => lastResult.value?.stats || null)

async function handleFormat(minify = false) {
  formatError.value = null
  repairNotices.value = []
  isMinified.value = minify

  if (!inputJson.value.trim()) {
    outputJson.value = ''
    lastResult.value = null
    executionTimeMs.value = null
    return
  }

  const options: JsonFormatOptions = {
    indentType: indentType.value,
    minify,
    sortKeys: sortKeys.value,
    autoRepair: autoRepair.value
  }

  try {
    const res = await execute<
      { input: string; options: JsonFormatOptions },
      JsonFormatResult
    >('json', 'format', {
      input: inputJson.value,
      options
    })

    if (res.success && res.result) {
      lastResult.value = res.result
      executionTimeMs.value = res.executionTimeMs

      if (res.result.isValid) {
        outputJson.value = res.result.formatted
        if (res.result.repaired && res.result.repairs.length > 0) {
          repairNotices.value = res.result.repairs
        }
      } else {
        formatError.value = res.result.error || 'Invalid JSON syntax'
      }
    } else {
      formatError.value = res.error || 'Execution failed'
    }
  } catch (err: any) {
    formatError.value = err.message || 'Formatting failed'
  }
}

async function handleExplicitRepair() {
  formatError.value = null
  repairNotices.value = []

  try {
    const res = await execute<{ input: string }, any>('json', 'repair', {
      input: inputJson.value
    })

    if (res.success && res.result) {
      inputJson.value = res.result.repairedText
      repairNotices.value = res.result.repairs.length > 0
        ? res.result.repairs
        : ['Input was already valid standard JSON']
      await handleFormat(false)
    } else {
      formatError.value = res.error || 'Repair failed'
    }
  } catch (err: any) {
    formatError.value = err.message || 'Repair error'
  }
}

function handleLoadSample() {
  inputJson.value = sampleMalformedJson
  handleFormat(false)
}

function handleClear() {
  inputJson.value = ''
  outputJson.value = ''
  lastResult.value = null
  formatError.value = null
  repairNotices.value = []
  executionTimeMs.value = null
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  handleFormat(false)
})
</script>

<template>
  <div class="json-formatter-container">
    <!-- Compact 1-Line Desktop Toolbar -->
    <div class="formatter-toolbar">
      <div class="toolbar-left">
        <!-- Indentation selector -->
        <div class="control-group">
          <label class="control-label">Indent:</label>
          <div class="segment-group">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: indentType === '2-spaces' && !isMinified }"
              @click="indentType = '2-spaces'; isMinified = false; handleFormat(false)"
            >
              2 sp
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: indentType === '4-spaces' && !isMinified }"
              @click="indentType = '4-spaces'; isMinified = false; handleFormat(false)"
            >
              4 sp
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: indentType === 'tab' && !isMinified }"
              @click="indentType = 'tab'; isMinified = false; handleFormat(false)"
            >
              Tab
            </button>
          </div>
        </div>

        <!-- Sort Keys Selector -->
        <div class="control-group">
          <label class="control-label">Sort:</label>
          <div class="segment-group">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: sortKeys === 'none' }"
              @click="sortKeys = 'none'; handleFormat(isMinified)"
            >
              None
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: sortKeys === 'asc' }"
              title="Sort Alphabetically (A-Z)"
              @click="sortKeys = 'asc'; handleFormat(isMinified)"
            >
              <ArrowDownAZ :size="13" />
              A-Z
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: sortKeys === 'desc' }"
              title="Sort Reverse Alphabetically (Z-A)"
              @click="sortKeys = 'desc'; handleFormat(isMinified)"
            >
              Z-A
            </button>
          </div>
        </div>

        <!-- Auto-Repair Toggle -->
        <div class="toggle-control">
          <M3Switch
            v-model="autoRepair"
            label="Auto-Repair"
            @update:model-value="handleFormat(isMinified)"
          />
        </div>
      </div>

      <div class="toolbar-right">
        <span v-if="executionTimeMs !== null" class="exec-badge">
          {{ executionTimeMs }} ms
        </span>

        <button
          type="button"
          class="compact-action-btn primary-btn"
          :disabled="isExecuting"
          @click="handleFormat(false)"
        >
          <Sparkles :size="14" />
          <span>Prettify</span>
        </button>

        <button
          type="button"
          class="compact-action-btn tonal-btn"
          :disabled="isExecuting"
          @click="handleFormat(true)"
        >
          <Minimize2 :size="14" />
          <span>Minify</span>
        </button>

        <button
          type="button"
          class="compact-action-btn outline-btn"
          :disabled="isExecuting"
          title="Fix single quotes, unquoted keys, and trailing commas"
          @click="handleExplicitRepair"
        >
          <Wrench :size="13" />
          <span>Repair</span>
        </button>

        <button
          type="button"
          class="compact-action-btn text-btn"
          @click="handleLoadSample"
        >
          Sample
        </button>

        <button
          type="button"
          class="compact-action-btn text-btn"
          title="Clear Editor"
          @click="handleClear"
        >
          <RotateCcw :size="13" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- Auto-Repair Notice Banner -->
    <div v-if="repairNotices.length > 0" class="repair-banner">
      <div class="banner-icon">
        <Wrench :size="14" />
      </div>
      <div class="banner-content">
        <span class="banner-title">Auto-Repair Active:</span>
        <span class="banner-text">{{ repairNotices.join(' • ') }}</span>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="formatError" class="error-banner">
      <AlertCircle :size="16" class="error-icon" />
      <div class="error-text-container">
        <strong>JSON Syntax Error:</strong>
        <span>{{ formatError }}</span>
      </div>
      <button
        type="button"
        class="compact-action-btn tonal-btn"
        @click="handleExplicitRepair"
      >
        Force Repair
      </button>
    </div>

    <!-- Split Editor Area -->
    <div class="editor-area">
      <SplitEditor
        v-model:input="inputJson"
        v-model:output="outputJson"
        input-language="json"
        output-language="json"
        input-title="Input JSON"
        output-title="Formatted Output"
        :is-executing="isExecuting"
        :error="formatError"
        :execution-time-ms="executionTimeMs"
        :show-execute-button="false"
        height="100%"
        @execute="handleFormat(false)"
      />
    </div>

    <!-- JSON Statistics Footer -->
    <div v-if="stats && !formatError" class="stats-footer">
      <div class="stat-pill">
        <span class="stat-label">Size:</span>
        <span class="stat-val">{{ formatBytes(stats.originalSizeBytes) }} &rarr; {{ formatBytes(stats.formattedSizeBytes) }}</span>
        <span v-if="stats.byteSavingsPercent !== 0" class="savings-tag" :class="{ reduction: stats.byteSavingsPercent > 0 }">
          {{ stats.byteSavingsPercent > 0 ? `-${stats.byteSavingsPercent}%` : `+${Math.abs(stats.byteSavingsPercent)}%` }}
        </span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Lines:</span>
        <span class="stat-val">{{ stats.linesCount }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Keys:</span>
        <span class="stat-val">{{ stats.keysCount }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Arrays:</span>
        <span class="stat-val">{{ stats.arraysCount }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Objects:</span>
        <span class="stat-val">{{ stats.objectsCount }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Max Depth:</span>
        <span class="stat-val">{{ stats.maxDepth }}</span>
      </div>

      <div class="stat-pill success-tag">
        <CheckCircle2 :size="13" />
        <span>Standard JSON</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-formatter-container {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
}

.formatter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  min-height: 36px;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  overflow-x: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  flex-shrink: 0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.control-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
}

.segment-group {
  display: inline-flex;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-full);
  padding: 2px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.segment-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.segment-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.toggle-control {
  display: flex;
  align-items: center;
  padding-left: 0.35rem;
  border-left: 1px solid var(--md-sys-color-outline-variant);
}

.compact-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.primary-btn {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.tonal-btn {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.tonal-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-highest);
}

.outline-btn {
  background-color: transparent;
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
}

.outline-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-highest);
}

.text-btn {
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
}

.text-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.compact-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exec-badge {
  font-size: 0.6875rem;
  font-family: var(--md-sys-typescale-code-font, monospace);
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.15rem 0.45rem;
  border-radius: var(--md-sys-shape-corner-small);
}

.repair-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.75rem;
}

.banner-icon {
  display: flex;
  align-items: center;
  color: var(--md-sys-color-primary);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.banner-title {
  font-weight: 600;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0.75rem;
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.75rem;
}

.error-icon {
  color: var(--md-sys-color-error);
  flex-shrink: 0;
}

.error-text-container {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
}

.editor-area {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.stats-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.6875rem;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.4rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface-variant);
}

.stat-label {
  font-weight: 500;
}

.stat-val {
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-sys-typescale-code-font, monospace);
}

.savings-tag {
  padding: 0.05rem 0.3rem;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.625rem;
  font-weight: 600;
  background-color: var(--md-sys-color-surface-container-highest);
}

.savings-tag.reduction {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.success-tag {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 600;
}
</style>
