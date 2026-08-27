<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next'
import { SplitEditor } from '@/components'
import { useSnapshotStore } from '@/stores'
import { transpileData } from '../services/transpiler-service'
import type { DataFormat, TranspileOptions, TranspileResult } from '../types'

const snapshotStore = useSnapshotStore()

// State
const sourceFormat = ref<DataFormat>('json')
const targetFormat = ref<DataFormat>('yaml')
const inputText = ref('')
const outputText = ref('')
const errorMsg = ref<string | null>(null)
const warnings = ref<string[]>([])
const executionTimeMs = ref<number | null>(null)
const itemCount = ref<number | null>(null)

// Transpile Options
const jsonIndent = ref<2 | 4 | 'tab' | 0>(2)
const yamlIndent = ref<2 | 4>(2)
const yamlSortKeys = ref(false)
const csvDelimiter = ref<',' | ';' | '\t' | '|'>(',')
const csvHeader = ref(true)
const csvDynamicTyping = ref(true)
const csvQuotes = ref(false)
const flattenNested = ref(true)

// Available formats
const FORMATS: { id: DataFormat; label: string; badge: string; dotClass: string }[] = [
  { id: 'json', label: 'JSON', badge: '.json', dotClass: 'json-dot' },
  { id: 'yaml', label: 'YAML', badge: '.yaml', dotClass: 'yaml-dot' },
  { id: 'toml', label: 'TOML', badge: '.toml', dotClass: 'toml-dot' },
  { id: 'csv', label: 'CSV', badge: '.csv', dotClass: 'csv-dot' }
]

// Preset Samples
const SAMPLES: Record<string, { title: string; format: DataFormat; content: string }> = {
  users: {
    title: 'Users List (Array)',
    format: 'json',
    content: JSON.stringify(
      [
        { id: 101, name: 'Alice Smith', email: 'alice@example.com', role: 'admin', active: true },
        { id: 102, name: 'Bob Jones', email: 'bob@example.com', role: 'developer', active: true },
        { id: 103, name: 'Charlie Kim', email: 'charlie@example.com', role: 'designer', active: false }
      ],
      null,
      2
    )
  },
  serverConfig: {
    title: 'Server Config (Nested)',
    format: 'yaml',
    content: `server:
  host: "0.0.0.0"
  port: 8080
  tls:
    enabled: true
    cert: "/etc/ssl/cert.pem"
    key: "/etc/ssl/key.pem"
database:
  connection_limit: 25
  timeout_seconds: 30
logging:
  level: "info"
  format: "json"`
  },
  tomlPackage: {
    title: 'Project Manifest (TOML)',
    format: 'toml',
    content: `[package]
name = "devdot"
version = "0.1.0"
authors = ["DevDot Community <community@devdot.local>"]
edition = "2024"

[dependencies]
smol-toml = "1.0.0"
yaml = "2.7.0"
papaparse = "5.4.0"`
  },
  csvInventory: {
    title: 'Inventory Data (CSV)',
    format: 'csv',
    content: `sku,name,category,quantity,price_usd,in_stock
SKU-001,Mechanical Keyboard,Hardware,45,129.99,true
SKU-002,Ergonomic Mouse,Hardware,120,49.50,true
SKU-003,USB-C Docking Hub,Accessories,0,89.00,false`
  }
}

// Compute editor languages
const sourceEditorLang = computed(() => {
  if (sourceFormat.value === 'json') return 'json'
  if (sourceFormat.value === 'yaml') return 'yaml'
  return 'text'
})

const targetEditorLang = computed(() => {
  if (targetFormat.value === 'json') return 'json'
  if (targetFormat.value === 'yaml') return 'yaml'
  return 'text'
})

// Core Transpile Execution
function handleTranspile() {
  errorMsg.value = null
  warnings.value = []

  if (!inputText.value.trim()) {
    outputText.value = ''
    executionTimeMs.value = null
    itemCount.value = null
    return
  }

  const options: TranspileOptions = {
    jsonIndent: jsonIndent.value,
    yamlIndent: yamlIndent.value,
    yamlSortKeys: yamlSortKeys.value,
    csvDelimiter: csvDelimiter.value,
    csvHeader: csvHeader.value,
    csvDynamicTyping: csvDynamicTyping.value,
    csvQuotes: csvQuotes.value,
    flattenNested: flattenNested.value
  }

  try {
    const res: TranspileResult = transpileData(
      inputText.value,
      sourceFormat.value,
      targetFormat.value,
      options
    )
    outputText.value = res.output
    executionTimeMs.value = res.executionTimeMs || 0
    itemCount.value = res.itemCount ?? null
    if (res.warnings) {
      warnings.value = res.warnings
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Transpilation error'
    outputText.value = ''
  }
}

// Swap source and target
function handleSwapFormats() {
  const prevSource = sourceFormat.value
  const prevTarget = targetFormat.value
  const prevOutput = outputText.value

  sourceFormat.value = prevTarget
  targetFormat.value = prevSource

  if (prevOutput) {
    inputText.value = prevOutput
  }
  handleTranspile()
}

// Load sample preset
function loadSample(key: string) {
  const sample = SAMPLES[key]
  if (sample) {
    sourceFormat.value = sample.format
    if (targetFormat.value === sample.format) {
      targetFormat.value = sample.format === 'json' ? 'yaml' : 'json'
    }
    inputText.value = sample.content
    handleTranspile()
  }
}

function clearAll() {
  inputText.value = ''
  outputText.value = ''
  errorMsg.value = null
  warnings.value = []
  executionTimeMs.value = null
  itemCount.value = null
}

let isHydrating = false

// Debounced reactive update & snapshot sync
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [
    inputText,
    sourceFormat,
    targetFormat,
    jsonIndent,
    yamlIndent,
    yamlSortKeys,
    csvDelimiter,
    csvHeader,
    csvDynamicTyping,
    csvQuotes,
    flattenNested
  ],
  () => {
    if (isHydrating) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      handleTranspile()

      // Save state to snapshot store
      snapshotStore.setToolState('multi-transpiler', {
        sourceFormat: sourceFormat.value,
        targetFormat: targetFormat.value,
        inputText: inputText.value,
        jsonIndent: jsonIndent.value,
        yamlIndent: yamlIndent.value,
        yamlSortKeys: yamlSortKeys.value,
        csvDelimiter: csvDelimiter.value,
        csvHeader: csvHeader.value,
        csvDynamicTyping: csvDynamicTyping.value,
        csvQuotes: csvQuotes.value,
        flattenNested: flattenNested.value
      })
    }, 150)
  }
)

// Hydrate from snapshot on mount and external update
watch(
  () => snapshotStore.toolStates['multi-transpiler'],
  (newState) => {
    if (newState && !isHydrating) {
      isHydrating = true
      if (newState.sourceFormat) sourceFormat.value = newState.sourceFormat
      if (newState.targetFormat) targetFormat.value = newState.targetFormat
      if (newState.inputText !== undefined) inputText.value = newState.inputText
      if (newState.jsonIndent !== undefined) jsonIndent.value = newState.jsonIndent
      if (newState.yamlIndent !== undefined) yamlIndent.value = newState.yamlIndent
      if (newState.yamlSortKeys !== undefined) yamlSortKeys.value = newState.yamlSortKeys
      if (newState.csvDelimiter !== undefined) csvDelimiter.value = newState.csvDelimiter
      if (newState.csvHeader !== undefined) csvHeader.value = newState.csvHeader
      if (newState.csvDynamicTyping !== undefined) csvDynamicTyping.value = newState.csvDynamicTyping
      if (newState.csvQuotes !== undefined) csvQuotes.value = newState.csvQuotes
      if (newState.flattenNested !== undefined) flattenNested.value = newState.flattenNested
      isHydrating = false
    }
  },
  { deep: true }
)

onMounted(() => {
  const saved = snapshotStore.getToolState('multi-transpiler')
  if (saved) {
    if (saved.sourceFormat) sourceFormat.value = saved.sourceFormat
    if (saved.targetFormat) targetFormat.value = saved.targetFormat
    if (saved.inputText !== undefined) inputText.value = saved.inputText
    if (saved.jsonIndent !== undefined) jsonIndent.value = saved.jsonIndent
    if (saved.yamlIndent !== undefined) yamlIndent.value = saved.yamlIndent
    if (saved.yamlSortKeys !== undefined) yamlSortKeys.value = saved.yamlSortKeys
    if (saved.csvDelimiter !== undefined) csvDelimiter.value = saved.csvDelimiter
    if (saved.csvHeader !== undefined) csvHeader.value = saved.csvHeader
    if (saved.csvDynamicTyping !== undefined) csvDynamicTyping.value = saved.csvDynamicTyping
    if (saved.csvQuotes !== undefined) csvQuotes.value = saved.csvQuotes
    if (saved.flattenNested !== undefined) flattenNested.value = saved.flattenNested
  } else {
    loadSample('users')
  }
  handleTranspile()
})
</script>

<template>
  <div class="transpiler-view">
    <!-- Compact 1-Line Desktop Toolbar -->
    <div class="transpiler-compact-toolbar">
      <div class="toolbar-left">
        <!-- Source Format Select -->
        <div class="format-chips">
          <button
            v-for="fmt in FORMATS"
            :key="'src-' + fmt.id"
            type="button"
            class="format-chip"
            :class="{ active: sourceFormat === fmt.id }"
            @click="sourceFormat = fmt.id"
          >
            <span class="lang-dot" :class="fmt.dotClass"></span>
            <span>{{ fmt.label }}</span>
          </button>
        </div>

        <!-- Swap Button -->
        <button
          type="button"
          class="compact-swap-btn"
          title="Swap Source and Target formats & content"
          @click="handleSwapFormats"
        >
          <ArrowRightLeft :size="13" />
        </button>

        <!-- Target Format Select -->
        <div class="format-chips">
          <button
            v-for="fmt in FORMATS"
            :key="'tgt-' + fmt.id"
            type="button"
            class="format-chip"
            :class="{ active: targetFormat === fmt.id }"
            @click="targetFormat = fmt.id"
          >
            <span class="lang-dot" :class="fmt.dotClass"></span>
            <span>{{ fmt.label }}</span>
          </button>
        </div>

        <!-- Contextual Compact Options -->
        <div class="context-options-inline">
          <template v-if="targetFormat === 'json'">
            <select v-model="jsonIndent" class="compact-select">
              <option :value="2">2 Spaces</option>
              <option :value="4">4 Spaces</option>
              <option value="tab">Tab</option>
              <option :value="0">Minify</option>
            </select>
          </template>

          <template v-else-if="targetFormat === 'yaml'">
            <label class="compact-check"><input v-model="yamlSortKeys" type="checkbox" /> Sort Keys</label>
          </template>

          <template v-else-if="sourceFormat === 'csv' || targetFormat === 'csv'">
            <select v-model="csvDelimiter" class="compact-select">
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="&#9;">Tab (\t)</option>
              <option value="|">Pipe (|)</option>
            </select>
            <label class="compact-check"><input v-model="csvHeader" type="checkbox" /> Header</label>
          </template>
        </div>
      </div>

      <!-- Presets & Quick Actions -->
      <div class="toolbar-right">
        <span class="presets-label">Samples:</span>
        <button
          v-for="(sample, key) in SAMPLES"
          :key="key"
          type="button"
          class="preset-btn"
          @click="loadSample(String(key))"
        >
          <span>{{ sample.title }}</span>
        </button>

        <span v-if="executionTimeMs !== null" class="exec-badge">
          {{ executionTimeMs }} ms
        </span>

        <button
          type="button"
          class="compact-action-btn primary-btn"
          :disabled="!inputText.trim()"
          @click="handleTranspile"
        >
          <Sparkles :size="14" />
          <span>Convert</span>
        </button>

        <button
          type="button"
          class="compact-action-btn text-btn"
          title="Clear all"
          @click="clearAll"
        >
          <RotateCcw :size="13" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- Warnings Banner -->
    <div v-if="warnings.length > 0" class="alert-banner warning-banner">
      <AlertCircle :size="16" />
      <div class="alert-content">
        <div v-for="(warn, i) in warnings" :key="i">
          {{ warn }}
        </div>
      </div>
    </div>

    <!-- Split Editor Area -->
    <div class="editor-area">
      <SplitEditor
        v-model:input="inputText"
        v-model:output="outputText"
        :input-language="sourceEditorLang"
        :output-language="targetEditorLang"
        :input-title="`Source (${sourceFormat.toUpperCase()})`"
        :output-title="`Converted (${targetFormat.toUpperCase()})`"
        :is-executing="false"
        :error="errorMsg"
        :execution-time-ms="executionTimeMs"
        :show-execute-button="false"
        height="100%"
        @execute="handleTranspile"
      />
    </div>

    <!-- Stats & Information Bar -->
    <div v-if="outputText && !errorMsg" class="stats-footer">
      <div class="stat-pill">
        <span class="stat-label">Source:</span>
        <span class="stat-val uppercase">{{ sourceFormat }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Target:</span>
        <span class="stat-val uppercase">{{ targetFormat }}</span>
      </div>

      <div v-if="itemCount !== null" class="stat-pill">
        <span class="stat-label">Items:</span>
        <span class="stat-val">{{ itemCount }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Output Size:</span>
        <span class="stat-val">{{ outputText.length }} chars</span>
      </div>

      <div class="stat-pill success-tag">
        <CheckCircle2 :size="13" />
        <span>Transpiled Cleanly</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transpiler-view {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
}

/* Compact Toolbar */
.transpiler-compact-toolbar {
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.25rem 0.625rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 36px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.4rem;
  flex-shrink: 0;
}

.format-chips {
  display: flex;
  gap: 0.2rem;
  align-items: center;
}

.format-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.format-chip:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.format-chip.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.lang-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.json-dot { background-color: #f59e0b; }
.yaml-dot { background-color: #ef4444; }
.toml-dot { background-color: #a855f7; }
.csv-dot  { background-color: #10b981; }

.compact-swap-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--md-sys-shape-corner-full);
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.compact-swap-btn:hover {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.context-options-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding-left: 0.35rem;
  border-left: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.compact-select {
  height: 24px;
  padding: 0 0.35rem;
  font-size: 0.6875rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.compact-check {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  white-space: nowrap;
}

.presets-label {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 500;
}

.preset-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.preset-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
}

.exec-badge {
  font-size: 0.6875rem;
  font-family: var(--md-sys-typescale-code-font, monospace);
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.15rem 0.45rem;
  border-radius: var(--md-sys-shape-corner-small);
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
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.9;
  box-shadow: var(--md-sys-elevation-level1);
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.text-btn {
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
}

.text-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

/* Alert Banners */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.75rem;
}

.warning-banner {
  background: rgba(247, 206, 105, 0.12);
  border: 1px solid #f7ce69;
  color: #f7ce69;
}

/* Split Editor Area */
.editor-area {
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
}

/* Stats Footer */
.stats-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  flex-wrap: wrap;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.stat-label {
  font-weight: 500;
  opacity: 0.75;
}

.stat-val {
  font-family: var(--md-sys-typescale-code-font, monospace);
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.stat-val.uppercase {
  text-transform: uppercase;
}

.success-tag {
  color: var(--md-sys-color-primary, #6dd58c);
  font-weight: 500;
  margin-left: auto;
}
</style>
