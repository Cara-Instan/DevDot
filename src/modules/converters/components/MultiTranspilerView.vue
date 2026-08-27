<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  ArrowRightLeft,
  Copy,
  Check,
  Trash2,
  Sparkles,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-vue-next'
import {
  M3Button,
  M3Checkbox
} from '@/components'
import { CodeEditor } from '@/components/editor'
import { useSnapshotStore } from '@/stores'
import { transpileData } from '../services/transpiler-service'
import type { DataFormat, TranspileOptions, TranspileResult } from '../types'

const snapshotStore = useSnapshotStore()

// State
const sourceFormat = ref<DataFormat>('json')
const targetFormat = ref<DataFormat>('yaml')
const inputText = ref('')
const outputText = ref('')
const isCopied = ref(false)
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
const FORMATS: { id: DataFormat; label: string; badge: string }[] = [
  { id: 'json', label: 'JSON', badge: '.json' },
  { id: 'yaml', label: 'YAML', badge: '.yaml' },
  { id: 'toml', label: 'TOML', badge: '.toml' },
  { id: 'csv', label: 'CSV', badge: '.csv' }
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

// Copy output to clipboard
async function copyOutput() {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch {
    // fallback
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

// Debounced reactive update
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
    }, 200)
  }
)

// Hydrate from snapshot on mount
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
    // Default initial sample
    loadSample('users')
  }
})
</script>

<template>
  <div class="transpiler-view">
    <!-- Top Action & Format Selection Bar -->
    <section class="format-selection-card">
      <div class="format-selector-row">
        <!-- Source Format Select -->
        <div class="format-group">
          <label class="group-label">Source Format</label>
          <div class="format-chips">
            <button
              v-for="fmt in FORMATS"
              :key="'src-' + fmt.id"
              class="format-chip"
              :class="{ active: sourceFormat === fmt.id }"
              @click="sourceFormat = fmt.id"
            >
              <span>{{ fmt.label }}</span>
              <span class="chip-badge">{{ fmt.badge }}</span>
            </button>
          </div>
        </div>

        <!-- Swap Button -->
        <div class="swap-action-container">
          <button
            class="swap-btn"
            title="Swap Source and Target formats & content"
            @click="handleSwapFormats"
          >
            <ArrowRightLeft :size="18" />
          </button>
        </div>

        <!-- Target Format Select -->
        <div class="format-group">
          <label class="group-label">Target Format</label>
          <div class="format-chips">
            <button
              v-for="fmt in FORMATS"
              :key="'tgt-' + fmt.id"
              class="format-chip"
              :class="{ active: targetFormat === fmt.id }"
              @click="targetFormat = fmt.id"
            >
              <span>{{ fmt.label }}</span>
              <span class="chip-badge">{{ fmt.badge }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Presets & Quick Actions Row -->
      <div class="presets-row">
        <div class="presets-group">
          <span class="presets-label">Presets:</span>
          <button
            v-for="(sample, key) in SAMPLES"
            :key="key"
            class="preset-btn"
            @click="loadSample(String(key))"
          >
            <Sparkles :size="13" />
            <span>{{ sample.title }}</span>
          </button>
        </div>

        <div class="header-stats">
          <div v-if="executionTimeMs !== null" class="stat-badge">
            <Clock :size="13" />
            <span>{{ executionTimeMs }} ms</span>
          </div>
          <div v-if="itemCount !== null" class="stat-badge">
            <Layers :size="13" />
            <span>{{ itemCount }} {{ itemCount === 1 ? 'record' : 'records' }}</span>
          </div>
          <M3Button variant="text" size="small" @click="clearAll">
            <template #icon>
              <Trash2 :size="14" />
            </template>
            Clear
          </M3Button>
        </div>
      </div>
    </section>

    <!-- Format Options Toolbar -->
    <section class="options-bar">
      <!-- Target JSON Options -->
      <div v-if="targetFormat === 'json'" class="opt-segment">
        <span class="opt-label">JSON Indent:</span>
        <div class="sub-chips">
          <button
            class="sub-chip"
            :class="{ active: jsonIndent === 2 }"
            @click="jsonIndent = 2"
          >
            2 Spaces
          </button>
          <button
            class="sub-chip"
            :class="{ active: jsonIndent === 4 }"
            @click="jsonIndent = 4"
          >
            4 Spaces
          </button>
          <button
            class="sub-chip"
            :class="{ active: jsonIndent === 'tab' }"
            @click="jsonIndent = 'tab'"
          >
            Tab
          </button>
          <button
            class="sub-chip"
            :class="{ active: jsonIndent === 0 }"
            @click="jsonIndent = 0"
          >
            Compact (Minify)
          </button>
        </div>
      </div>

      <!-- Target YAML Options -->
      <div v-if="targetFormat === 'yaml'" class="opt-segment">
        <span class="opt-label">YAML Indent:</span>
        <div class="sub-chips">
          <button
            class="sub-chip"
            :class="{ active: yamlIndent === 2 }"
            @click="yamlIndent = 2"
          >
            2 Spaces
          </button>
          <button
            class="sub-chip"
            :class="{ active: yamlIndent === 4 }"
            @click="yamlIndent = 4"
          >
            4 Spaces
          </button>
        </div>
        <M3Checkbox
          v-model="yamlSortKeys"
          label="Sort Keys"
        />
      </div>

      <!-- CSV Options (for source or target CSV) -->
      <div v-if="sourceFormat === 'csv' || targetFormat === 'csv'" class="opt-segment">
        <span class="opt-label">CSV Delimiter:</span>
        <div class="sub-chips">
          <button
            class="sub-chip"
            :class="{ active: csvDelimiter === ',' }"
            @click="csvDelimiter = ','"
          >
            Comma (,)
          </button>
          <button
            class="sub-chip"
            :class="{ active: csvDelimiter === ';' }"
            @click="csvDelimiter = ';'"
          >
            Semicolon (;)
          </button>
          <button
            class="sub-chip"
            :class="{ active: csvDelimiter === '\t' }"
            @click="csvDelimiter = '\t'"
          >
            Tab (\t)
          </button>
          <button
            class="sub-chip"
            :class="{ active: csvDelimiter === '|' }"
            @click="csvDelimiter = '|'"
          >
            Pipe (|)
          </button>
        </div>

        <M3Checkbox
          v-model="csvHeader"
          label="Header Row"
        />
        <M3Checkbox
          v-if="targetFormat === 'csv'"
          v-model="flattenNested"
          label="Flatten Nested Keys"
        />
        <M3Checkbox
          v-if="targetFormat === 'csv'"
          v-model="csvQuotes"
          label="Quote All Fields"
        />
      </div>
    </section>

    <!-- Error / Warning Messages -->
    <div v-if="errorMsg" class="alert-banner error-banner">
      <AlertCircle :size="18" />
      <div class="alert-content">
        <strong>Transpilation Failed:</strong> {{ errorMsg }}
      </div>
    </div>

    <div v-if="warnings.length > 0" class="alert-banner warning-banner">
      <AlertCircle :size="18" />
      <div class="alert-content">
        <div v-for="(warn, i) in warnings" :key="i">
          {{ warn }}
        </div>
      </div>
    </div>

    <!-- Dual Split Editor Grid -->
    <div class="editors-grid">
      <!-- Input Panel -->
      <div class="editor-pane input-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="dot-indicator input-dot"></span>
            <strong>Source ({{ sourceFormat.toUpperCase() }})</strong>
          </div>
          <div class="pane-actions">
            <span class="format-badge-pill">{{ sourceFormat.toUpperCase() }}</span>
          </div>
        </div>

        <div class="pane-body">
          <CodeEditor
            v-model="inputText"
            :language="sourceEditorLang"
            placeholder="Paste or type your input data here..."
            height="100%"
          />
        </div>
      </div>

      <!-- Output Panel -->
      <div class="editor-pane output-pane">
        <div class="pane-header">
          <div class="pane-title">
            <span class="dot-indicator output-dot"></span>
            <strong>Target ({{ targetFormat.toUpperCase() }})</strong>
          </div>
          <div class="pane-actions">
            <span class="format-badge-pill highlight">{{ targetFormat.toUpperCase() }}</span>
            <M3Button
              variant="tonal"
              size="small"
              :disabled="!outputText"
              @click="copyOutput"
            >
              <template #icon>
                <Check v-if="isCopied" :size="14" class="copy-success-icon" />
                <Copy v-else :size="14" />
              </template>
              {{ isCopied ? 'Copied!' : 'Copy Result' }}
            </M3Button>
          </div>
        </div>

        <div class="pane-body">
          <CodeEditor
            :model-value="outputText"
            :language="targetEditorLang"
            :read-only="true"
            placeholder="Converted output will appear here in real-time..."
            height="100%"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transpiler-view {
  display: flex;
  flex-direction: column;
  gap: var(--md-sys-spacing-md, 16px);
  width: 100%;
  height: calc(100vh - 210px);
  min-height: 540px;
}

/* Format Selection Card */
.format-selection-card {
  background: var(--md-sys-color-surface-container-low, #1e1f22);
  border: 1px solid var(--md-sys-color-outline-variant, #444746);
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.format-selector-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.format-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 260px;
}

.group-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
}

.format-chips {
  display: flex;
  gap: 6px;
  background: var(--md-sys-color-surface-container, #141518);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--md-sys-color-outline-variant, #333538);
}

.format-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.format-chip:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--md-sys-color-on-surface, #e3e3e3);
}

.format-chip.active {
  background: var(--md-sys-color-primary, #a8c7fa);
  color: var(--md-sys-color-on-primary, #062e6f);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.chip-badge {
  font-size: 10px;
  opacity: 0.75;
  font-family: monospace;
}

.swap-action-container {
  display: flex;
  align-items: flex-end;
  padding-bottom: 2px;
}

.swap-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--md-sys-color-surface-container-high, #2b2d31);
  border: 1px solid var(--md-sys-color-outline-variant, #444746);
  color: var(--md-sys-color-primary, #a8c7fa);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.swap-btn:hover {
  background: var(--md-sys-color-primary-container, #0842a0);
  color: var(--md-sys-color-on-primary-container, #d3e3fd);
  transform: rotate(180deg);
}

/* Presets & Stats Row */
.presets-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.presets-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.presets-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant, #8e918f);
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--md-sys-color-outline-variant, #444746);
  background: var(--md-sys-color-surface-container, #141518);
  color: var(--md-sys-color-on-surface, #e3e3e3);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border-color: var(--md-sys-color-primary, #a8c7fa);
  color: var(--md-sys-color-primary, #a8c7fa);
  background: rgba(168, 199, 250, 0.08);
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-family: monospace;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--md-sys-color-surface-container-high, #2b2d31);
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
}

/* Options Bar */
.options-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 8px 14px;
  background: var(--md-sys-color-surface-container-lowest, #0e0f12);
  border: 1px solid var(--md-sys-color-outline-variant, #333538);
  border-radius: 8px;
}

.opt-segment {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.opt-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
}

.sub-chips {
  display: flex;
  gap: 4px;
  background: var(--md-sys-color-surface-container, #1e1f22);
  padding: 2px;
  border-radius: 6px;
}

.sub-chip {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
  cursor: pointer;
  transition: all 0.12s ease;
}

.sub-chip:hover {
  color: var(--md-sys-color-on-surface, #ffffff);
}

.sub-chip.active {
  background: var(--md-sys-color-primary-container, #0842a0);
  color: var(--md-sys-color-on-primary-container, #d3e3fd);
  font-weight: 600;
}

/* Alert Banners */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.error-banner {
  background: rgba(242, 184, 181, 0.12);
  border: 1px solid var(--md-sys-color-error, #f2b8b5);
  color: var(--md-sys-color-error, #f2b8b5);
}

.warning-banner {
  background: rgba(247, 206, 105, 0.12);
  border: 1px solid #f7ce69;
  color: #f7ce69;
}

/* Dual Editor Grid */
.editors-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--md-sys-spacing-md, 16px);
  flex: 1;
  min-height: 380px;
  width: 100%;
}

.editor-pane {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--md-sys-color-outline-variant, #444746);
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  background: var(--md-sys-color-surface-container-lowest, #0e0f12);
  overflow: hidden;
  min-width: 0;
}


.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--md-sys-color-surface-container-low, #1e1f22);
  border-bottom: 1px solid var(--md-sys-color-outline-variant, #333538);
}

.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--md-sys-color-on-surface, #e3e3e3);
}

.dot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.input-dot {
  background: #a8c7fa;
}

.output-dot {
  background: #6dd58c;
}

.pane-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.format-badge-pill {
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--md-sys-color-surface-container-high, #2b2d31);
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
}

.format-badge-pill.highlight {
  background: var(--md-sys-color-primary-container, #0842a0);
  color: var(--md-sys-color-on-primary-container, #d3e3fd);
}

.copy-success-icon {
  color: #6dd58c;
}

.pane-body {
  flex: 1;
  height: calc(100% - 44px);
  position: relative;
}

@media (max-width: 860px) {
  .editors-grid {
    grid-template-columns: 1fr;
  }
}
</style>
