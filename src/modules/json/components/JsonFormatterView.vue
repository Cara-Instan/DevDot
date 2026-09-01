<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Sparkles,
  Minimize2,
  Wrench,
  ArrowDownAZ,
  ArrowLeftRight,
  RotateCcw,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Search,
  Download,
  Upload,
  Maximize2,
  Columns2,
  Rows3,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2
} from 'lucide-vue-next'
import {
  CodeEditor,
  M3Tooltip,
  SplitPane
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore, useSecurityStore } from '@/stores'
import { openNativeFileDialog, saveNativeFileDialog } from '@/core/native'
import type { IndentType, JsonFormatOptions, JsonFormatResult, SortKeysOrder } from '../types'

const { execute, isExecuting } = useExecutionEngine()
const snapshotStore = useSnapshotStore()
const securityStore = useSecurityStore()

// Sample presets for quick testing and demonstrations
const SAMPLES = {
  dirtyJson: {
    name: 'Auto-Repair Dirty JSON',
    content: `// DevDot JSON Suite with Auto-Repair Demo
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
  },
  apiResponse: {
    name: 'API Payload Migration',
    content: `{\n  "status": "success",\n  "version": "v2.4.0",\n  "timestamp": 1720000000,\n  "data": {\n    "userId": 1042,\n    "username": "ando_lead",\n    "email": "ando@devtoys.internal",\n    "roles": ["developer", "admin", "maintainer"],\n    "settings": {\n      "theme": "material-dynamic",\n      "notifications": false,\n      "timeout": 5000,\n      "twoFactorAuth": true\n    },\n    "lastLoginIp": "192.168.1.10"\n  }\n}`
  },
  cloudConfig: {
    name: 'Cloud Microservice Config',
    content: `{\n  "serviceName": "auth-gateway",\n  "environment": "production",\n  "port": 443,\n  "replicas": 8,\n  "rateLimit": {\n    "maxRequests": 500,\n    "windowMs": 60000,\n    "burstTolerance": 50\n  },\n  "corsOrigins": [\n    "https://devdot.tools",\n    "https://app.devdot.tools"\n  ],\n  "logging": {\n    "level": "info",\n    "destination": "cloudwatch"\n  },\n  "tls": {\n    "enabled": true,\n    "minVersion": "1.3"\n  }\n}`
  }
}

// Initial state from snapshot store
const initialSaved = snapshotStore.getToolState('json-format', {
  inputJson: SAMPLES.dirtyJson.content,
  outputJson: '',
  indentType: '2-spaces' as IndentType,
  autoRepair: true,
  sortKeys: 'none' as SortKeysOrder,
  isMinified: false,
  autoPrettify: true,
  splitDirection: 'horizontal' as 'horizontal' | 'vertical'
})

const inputJson = ref(initialSaved.inputJson)
const outputJson = ref(initialSaved.outputJson)
const indentType = ref<IndentType>(initialSaved.indentType)
const autoRepair = ref(initialSaved.autoRepair)
const sortKeys = ref<SortKeysOrder>(initialSaved.sortKeys)
const isMinified = ref(initialSaved.isMinified)
const autoPrettify = ref<boolean>(initialSaved.autoPrettify ?? true)
const splitDirection = ref<'horizontal' | 'vertical'>(initialSaved.splitDirection || 'horizontal')

// UI States
const rootRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)
const mobileTab = ref<'both' | 'input' | 'output'>('both')
const isOutputCopied = ref(false)
const isInputCopied = ref(false)

const lastResult = ref<JsonFormatResult | null>(null)
const formatError = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)
const repairNotices = ref<string[]>([])
const dismissRepairNotice = ref(false)

// Editor Refs & Find States
const inputEditorRef = ref<any>(null)
const outputEditorRef = ref<any>(null)

const inputFindOpen = ref(false)
const inputFindQuery = ref('')
const inputFindCase = ref(false)
const inputFindIndex = ref(0)
const inputFindInputRef = ref<HTMLInputElement | null>(null)

const outputFindOpen = ref(false)
const outputFindQuery = ref('')
const outputFindCase = ref(false)
const outputFindIndex = ref(0)
const outputFindInputRef = ref<HTMLInputElement | null>(null)

const activeEditorPane = ref<'input' | 'output'>('input')

// Sync changes to snapshot store
watch(
  [inputJson, outputJson, indentType, autoRepair, sortKeys, isMinified, splitDirection, autoPrettify],
  () => {
    snapshotStore.setToolState('json-format', {
      inputJson: inputJson.value,
      outputJson: outputJson.value,
      indentType: indentType.value,
      autoRepair: autoRepair.value,
      sortKeys: sortKeys.value,
      isMinified: isMinified.value,
      splitDirection: splitDirection.value,
      autoPrettify: autoPrettify.value
    })
  },
  { deep: true }
)

// Hydrate from snapshot store
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
      if (newState.autoPrettify !== undefined && newState.autoPrettify !== autoPrettify.value) {
        autoPrettify.value = newState.autoPrettify
      }
      if (newState.splitDirection !== undefined && newState.splitDirection !== splitDirection.value) {
        splitDirection.value = newState.splitDirection
      }
    }
  },
  { deep: true }
)

// Structural stats display
const stats = computed(() => lastResult.value?.stats || null)
const inputByteSize = computed(() => {
  if (stats.value?.originalSizeBytes !== undefined && stats.value.originalSizeBytes > 0) {
    return stats.value.originalSizeBytes
  }
  return new Blob([inputJson.value || '']).size
})
const outputByteSize = computed(() => {
  if (stats.value?.formattedSizeBytes !== undefined && stats.value.formattedSizeBytes > 0) {
    return stats.value.formattedSizeBytes
  }
  return new Blob([outputJson.value || '']).size
})

// Find Match Computations for Input & Output
interface TextMatch {
  index: number
  start: number
  length: number
}

function findMatchesInText(text: string, query: string, caseSensitive: boolean): TextMatch[] {
  if (!query.trim() || !text) return []
  const matches: TextMatch[] = []
  const flags = caseSensitive ? 'g' : 'gi'
  let regex: RegExp
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    regex = new RegExp(escaped, flags)
  } catch {
    return []
  }

  let counter = 1
  let m: RegExpExecArray | null
  regex.lastIndex = 0
  while ((m = regex.exec(text)) !== null) {
    matches.push({
      index: counter++,
      start: m.index,
      length: m[0].length
    })
    if (regex.lastIndex === m.index) {
      regex.lastIndex++
    }
  }
  return matches
}

const inputMatches = computed(() => findMatchesInText(inputJson.value, inputFindQuery.value, inputFindCase.value))
const inputMatchCount = computed(() => inputMatches.value.length)

const outputMatches = computed(() => findMatchesInText(outputJson.value, outputFindQuery.value, outputFindCase.value))
const outputMatchCount = computed(() => outputMatches.value.length)

watch(inputMatchCount, (newCount) => {
  if (newCount === 0) inputFindIndex.value = 0
  else if (inputFindIndex.value === 0 || inputFindIndex.value > newCount) inputFindIndex.value = 1
})

watch(outputMatchCount, (newCount) => {
  if (newCount === 0) outputFindIndex.value = 0
  else if (outputFindIndex.value === 0 || outputFindIndex.value > newCount) outputFindIndex.value = 1
})

function navigateInputMatch(direction: 'next' | 'prev') {
  if (inputMatchCount.value === 0) return
  if (direction === 'next') {
    inputFindIndex.value = inputFindIndex.value >= inputMatchCount.value ? 1 : inputFindIndex.value + 1
  } else {
    inputFindIndex.value = inputFindIndex.value <= 1 ? inputMatchCount.value : inputFindIndex.value - 1
  }
  // If CodeEditor instance supports search panel sync
  if (inputEditorRef.value?.openFind) {
    inputEditorRef.value.openFind()
  }
}

function navigateOutputMatch(direction: 'next' | 'prev') {
  if (outputMatchCount.value === 0) return
  if (direction === 'next') {
    outputFindIndex.value = outputFindIndex.value >= outputMatchCount.value ? 1 : outputFindIndex.value + 1
  } else {
    outputFindIndex.value = outputFindIndex.value <= 1 ? outputMatchCount.value : outputFindIndex.value - 1
  }
  if (outputEditorRef.value?.openFind) {
    outputEditorRef.value.openFind()
  }
}

function toggleInputFind() {
  inputFindOpen.value = !inputFindOpen.value
  if (inputFindOpen.value) {
    activeEditorPane.value = 'input'
    nextTick(() => {
      inputFindInputRef.value?.focus()
      inputFindInputRef.value?.select()
    })
  }
}

function toggleOutputFind() {
  outputFindOpen.value = !outputFindOpen.value
  if (outputFindOpen.value) {
    activeEditorPane.value = 'output'
    nextTick(() => {
      outputFindInputRef.value?.focus()
      outputFindInputRef.value?.select()
    })
  }
}

// Formatting Engine Actions
async function handleFormat(minify = false) {
  formatError.value = null
  repairNotices.value = []
  dismissRepairNotice.value = false
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

function toggleAutoPrettify() {
  autoPrettify.value = !autoPrettify.value
  if (autoPrettify.value) {
    handleFormat(isMinified.value)
  }
}

function handlePrettifyClick() {
  isMinified.value = false
  handleFormat(false)
}

function handleMinifyClick() {
  isMinified.value = true
  handleFormat(true)
}

function handleIndentChange(type: IndentType) {
  indentType.value = type
  isMinified.value = false
  if (autoPrettify.value) {
    handleFormat(false)
  }
}

function handleSortKeysChange(order: SortKeysOrder) {
  sortKeys.value = order
  if (autoPrettify.value) {
    handleFormat(isMinified.value)
  }
}

function handleToggleAutoRepair() {
  autoRepair.value = !autoRepair.value
  if (autoPrettify.value) {
    handleFormat(isMinified.value)
  }
}

async function handleExplicitRepair() {
  formatError.value = null
  repairNotices.value = []
  dismissRepairNotice.value = false

  try {
    const res = await execute<{ input: string }, any>('json', 'repair', {
      input: inputJson.value
    })

    if (res.success && res.result) {
      inputJson.value = res.result.repairedText
      repairNotices.value = res.result.repairs.length > 0
        ? res.result.repairs
        : ['Input was already valid standard JSON']
      await handleFormat(isMinified.value)
    } else {
      formatError.value = res.error || 'Repair failed'
    }
  } catch (err: any) {
    formatError.value = err.message || 'Repair error'
  }
}

function handleLoadPreset(presetKey: keyof typeof SAMPLES) {
  const preset = SAMPLES[presetKey]
  if (preset) {
    inputJson.value = preset.content
    if (autoPrettify.value) {
      handleFormat(isMinified.value)
    }
  }
}

function handleSwap() {
  if (!outputJson.value) return
  const temp = inputJson.value
  inputJson.value = outputJson.value
  outputJson.value = temp
  if (autoPrettify.value) {
    handleFormat(isMinified.value)
  }
}

function handleClear() {
  inputJson.value = ''
  outputJson.value = ''
  lastResult.value = null
  formatError.value = null
  repairNotices.value = []
  executionTimeMs.value = null
}

async function handleCopyOutput() {
  if (!outputJson.value) return
  try {
    const ok = await securityStore.copyToClipboard(outputJson.value, { label: 'Formatted JSON' })
    if (ok) {
      isOutputCopied.value = true
      setTimeout(() => {
        isOutputCopied.value = false
      }, 2000)
    }
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

async function handleCopyInput() {
  if (!inputJson.value) return
  try {
    const ok = await securityStore.copyToClipboard(inputJson.value, { label: 'Input JSON' })
    if (ok) {
      isInputCopied.value = true
      setTimeout(() => {
        isInputCopied.value = false
      }, 2000)
    }
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

async function handleUploadInput() {
  const files = await openNativeFileDialog({
    title: 'Open JSON File - DevDot',
    multiple: false,
    filters: [
      { name: 'JSON Files (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  })

  if (files && files.length > 0) {
    inputJson.value = files[0].content
    if (autoPrettify.value) {
      handleFormat(isMinified.value)
    }
  }
}

async function handleDownloadOutput() {
  if (!outputJson.value) return
  const filename = isMinified.value ? 'formatted.min.json' : 'formatted.json'
  await saveNativeFileDialog(outputJson.value, {
    title: 'Save Formatted JSON - DevDot',
    defaultPath: filename,
    filters: [
      { name: 'JSON Files (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  })
}

// Fullscreen
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    if (rootRef.value?.requestFullscreen) {
      rootRef.value.requestFullscreen().catch(() => {})
    }
  } else {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isFullscreen.value) {
      toggleFullscreen()
    } else if (inputFindOpen.value || outputFindOpen.value) {
      inputFindOpen.value = false
      outputFindOpen.value = false
    }
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
    e.preventDefault()
    if (activeEditorPane.value === 'output') {
      toggleOutputFind()
    } else {
      toggleInputFind()
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    handlePrettifyClick()
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
    e.preventDefault()
    handleMinifyClick()
  } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
    e.preventDefault()
    handleExplicitRepair()
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Live auto-format on input changes (debounced)
let liveFormatTimer: any = null
watch(inputJson, () => {
  if (!autoPrettify.value) return
  clearTimeout(liveFormatTimer)
  liveFormatTimer = setTimeout(() => {
    handleFormat(isMinified.value)
  }, 250)
})

onMounted(() => {
  if (autoPrettify.value) {
    handleFormat(isMinified.value)
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    ref="rootRef"
    class="json-formatter-container"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <!-- Compact 1-Line Top Toolbar -->
    <div class="formatter-toolbar">
      <div class="toolbar-left">
        <!-- Indent Selector Segment Group -->
        <div class="control-group">
          <label class="control-label">Indent:</label>
          <div class="segment-group" role="group" aria-label="Indentation">
            <M3Tooltip text="2 Spaces Indentation" placement="bottom">
              <button
                type="button"
                class="segment-btn"
                :class="{ active: indentType === '2-spaces' && !isMinified }"
                @click="handleIndentChange('2-spaces')"
              >
                2 sp
              </button>
            </M3Tooltip>
            <M3Tooltip text="4 Spaces Indentation" placement="bottom">
              <button
                type="button"
                class="segment-btn"
                :class="{ active: indentType === '4-spaces' && !isMinified }"
                @click="handleIndentChange('4-spaces')"
              >
                4 sp
              </button>
            </M3Tooltip>
            <M3Tooltip text="Tab Indentation" placement="bottom">
              <button
                type="button"
                class="segment-btn"
                :class="{ active: indentType === 'tab' && !isMinified }"
                @click="handleIndentChange('tab')"
              >
                Tab
              </button>
            </M3Tooltip>
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Sort Keys Selector -->
        <div class="control-group">
          <label class="control-label">Sort:</label>
          <div class="segment-group" role="group" aria-label="Sort Keys">
            <M3Tooltip text="Preserve Original Key Order" placement="bottom">
              <button
                type="button"
                class="segment-btn"
                :class="{ active: sortKeys === 'none' }"
                @click="handleSortKeysChange('none')"
              >
                None
              </button>
            </M3Tooltip>
            <M3Tooltip text="Sort Object Keys Alphabetically (A-Z)" placement="bottom">
              <button
                type="button"
                class="segment-btn"
                :class="{ active: sortKeys === 'asc' }"
                @click="handleSortKeysChange('asc')"
              >
                <ArrowDownAZ :size="13" />
                <span>A-Z</span>
              </button>
            </M3Tooltip>
            <M3Tooltip text="Sort Object Keys Reverse Alphabetically (Z-A)" placement="bottom">
              <button
                type="button"
                class="segment-btn"
                :class="{ active: sortKeys === 'desc' }"
                @click="handleSortKeysChange('desc')"
              >
                Z-A
              </button>
            </M3Tooltip>
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Auto-Repair Toggle -->
        <M3Tooltip
          :text="autoRepair ? 'Auto-Repair: ON (Fixes trailing commas, single quotes, comments)' : 'Auto-Repair: OFF (Strict RFC 8259 mode)'"
          placement="bottom"
        >
          <button
            type="button"
            class="icon-toggle-btn"
            :class="{ active: autoRepair }"
            aria-label="Toggle Auto-Repair"
            @click="handleToggleAutoRepair"
          >
            <Wrench :size="13" />
            <span class="toggle-text">Auto-Repair</span>
          </button>
        </M3Tooltip>

        <div class="toolbar-divider"></div>

        <!-- Sample Presets -->
        <div class="samples-group">
          <M3Tooltip text="Auto-Repair Demo (Dirty JSON with comments, hex, single quotes)" placement="bottom">
            <button
              type="button"
              class="pill-sample-btn"
              @click="handleLoadPreset('dirtyJson')"
            >
              <Sparkles :size="12" />
              <span>Dirty JSON</span>
            </button>
          </M3Tooltip>
          <M3Tooltip text="Load API Response Payload Sample" placement="bottom">
            <button
              type="button"
              class="pill-sample-btn"
              @click="handleLoadPreset('apiResponse')"
            >
              <Code2 :size="12" />
              <span>API Sample</span>
            </button>
          </M3Tooltip>
          <M3Tooltip text="Load Cloud Service Config Sample" placement="bottom">
            <button
              type="button"
              class="pill-sample-btn"
              @click="handleLoadPreset('cloudConfig')"
            >
              <FileCode :size="12" />
              <span>Config Sample</span>
            </button>
          </M3Tooltip>
        </div>

        <!-- Split Direction Toggle -->
        <div class="segment-group" role="group" aria-label="Split Direction">
          <M3Tooltip text="Side-by-Side Split" placement="bottom">
            <button
              type="button"
              class="icon-toggle-btn"
              :class="{ active: splitDirection === 'horizontal' }"
              aria-label="Horizontal Split"
              @click="splitDirection = 'horizontal'"
            >
              <Columns2 :size="13" />
            </button>
          </M3Tooltip>
          <M3Tooltip text="Stacked Split (Top / Bottom)" placement="bottom">
            <button
              type="button"
              class="icon-toggle-btn"
              :class="{ active: splitDirection === 'vertical' }"
              aria-label="Vertical Split"
              @click="splitDirection = 'vertical'"
            >
              <Rows3 :size="13" />
            </button>
          </M3Tooltip>
        </div>

        <!-- Mobile Column Switcher -->
        <div class="segment-group mobile-column-tabs">
          <button
            type="button"
            class="segment-text-btn"
            :class="{ active: mobileTab === 'both' }"
            @click="mobileTab = 'both'"
          >
            Split
          </button>
          <button
            type="button"
            class="segment-text-btn"
            :class="{ active: mobileTab === 'input' }"
            @click="mobileTab = 'input'"
          >
            Input
          </button>
          <button
            type="button"
            class="segment-text-btn"
            :class="{ active: mobileTab === 'output' }"
            @click="mobileTab = 'output'"
          >
            Output
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Exec Time Badge -->
        <span v-if="executionTimeMs !== null" class="exec-badge">
          <Clock :size="11" />
          {{ executionTimeMs }} ms
        </span>

        <!-- Auto-Prettify Toggle Chip -->
        <M3Tooltip
          :text="autoPrettify ? 'Auto-Prettify: ON (Automatically formats JSON as you type or change options)' : 'Auto-Prettify: OFF (Manual formatting mode)'"
          placement="bottom"
        >
          <button
            type="button"
            class="compact-toggle-chip"
            :class="{ active: autoPrettify }"
            aria-label="Toggle Auto-Prettify"
            @click="toggleAutoPrettify"
          >
            <div class="toggle-checkbox" :class="{ checked: autoPrettify }">
              <Check v-if="autoPrettify" :size="10" :stroke-width="3" />
            </div>
            <span>Auto</span>
          </button>
        </M3Tooltip>

        <!-- Primary Prettify Action -->
        <M3Tooltip text="Format & Indent JSON (Ctrl+Enter)" placement="bottom">
          <button
            type="button"
            class="compact-action-btn primary-btn"
            :disabled="isExecuting"
            @click="handlePrettifyClick"
          >
            <Sparkles :size="13" />
            <span>Prettify</span>
          </button>
        </M3Tooltip>

        <!-- Minify Action -->
        <M3Tooltip text="Compact / Minify JSON (Ctrl+Shift+M)" placement="bottom">
          <button
            type="button"
            class="compact-action-btn tonal-btn"
            :class="{ active: isMinified }"
            :disabled="isExecuting"
            @click="handleMinifyClick"
          >
            <Minimize2 :size="13" />
            <span>Minify</span>
          </button>
        </M3Tooltip>

        <!-- Explicit Repair Action -->
        <M3Tooltip text="Auto-fix quotes, comments, trailing commas & reload (Ctrl+Shift+R)" placement="bottom">
          <button
            type="button"
            class="compact-action-btn outline-btn"
            :disabled="isExecuting"
            @click="handleExplicitRepair"
          >
            <Wrench :size="12" />
            <span>Repair</span>
          </button>
        </M3Tooltip>

        <div class="toolbar-divider"></div>

        <!-- Swap Input & Output -->
        <M3Tooltip text="Swap Input and Output JSON" placement="bottom">
          <button
            type="button"
            class="icon-action-btn"
            :disabled="!outputJson"
            aria-label="Swap JSON"
            @click="handleSwap"
          >
            <ArrowLeftRight :size="13" />
          </button>
        </M3Tooltip>

        <!-- Clear -->
        <M3Tooltip text="Clear Input and Output" placement="bottom">
          <button
            type="button"
            class="icon-action-btn btn-danger-hover"
            aria-label="Clear Editor"
            @click="handleClear"
          >
            <RotateCcw :size="13" />
          </button>
        </M3Tooltip>

        <div class="toolbar-divider"></div>

        <!-- Fullscreen -->
        <M3Tooltip :text="isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Mode'" placement="bottom">
          <button
            type="button"
            class="icon-action-btn fullscreen-btn"
            :class="{ active: isFullscreen }"
            aria-label="Toggle Fullscreen"
            @click="toggleFullscreen"
          >
            <component :is="isFullscreen ? Minimize2 : Maximize2" :size="13" />
          </button>
        </M3Tooltip>
      </div>
    </div>

    <!-- Auto-Repair Notice Banner -->
    <div v-if="repairNotices.length > 0 && !dismissRepairNotice" class="repair-banner">
      <div class="banner-icon">
        <Wrench :size="13" />
      </div>
      <div class="banner-content">
        <span class="banner-title">Auto-Repair Active:</span>
        <span class="banner-text">{{ repairNotices.join(' • ') }}</span>
      </div>
      <button
        type="button"
        class="banner-close-btn"
        title="Dismiss notice"
        @click="dismissRepairNotice = true"
      >
        ✕
      </button>
    </div>

    <!-- Error Banner -->
    <div v-if="formatError" class="error-banner">
      <AlertCircle :size="15" class="error-icon" />
      <div class="error-text-container">
        <strong>JSON Syntax Error:</strong>
        <span>{{ formatError }}</span>
      </div>
      <button
        type="button"
        class="compact-action-btn tonal-btn error-repair-btn"
        @click="handleExplicitRepair"
      >
        <Wrench :size="12" />
        <span>Auto-Repair Now</span>
      </button>
    </div>

    <!-- Editor Area with Side-by-Side / Stacked Split -->
    <div class="editor-area">
      <SplitPane
        :direction="splitDirection"
        :initial-split="50"
        class="formatter-split-pane"
        :class="`mobile-${mobileTab}`"
      >
        <!-- Mobile Pane Labels -->
        <template #pane-1-tab-label>
          Input JSON
        </template>
        <template #pane-2-tab-label>
          Formatted Output
        </template>

        <!-- INPUT PANE (Left / Top) -->
        <template #pane-1>
          <div
            class="pane-wrapper"
            :class="{ hidden: mobileTab === 'output' }"
            @click="activeEditorPane = 'input'"
          >
            <!-- Input Pane Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <span class="pane-title">Input JSON</span>
                <span class="size-tag">{{ formatBytes(inputByteSize) }}</span>
                <span v-if="formatError" class="badge-error">Invalid</span>
                <span v-else-if="inputJson.trim()" class="badge-valid">Parsed</span>
              </div>

              <div class="pane-header-right">
                <!-- Find Toggle in Header -->
                <M3Tooltip text="Find in Input (Ctrl+F)" placement="top">
                  <button
                    type="button"
                    class="col-find-toggle-btn"
                    :class="{ active: inputFindOpen }"
                    aria-label="Find in Input"
                    @click="toggleInputFind"
                  >
                    <Search :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Copy Input -->
                <M3Tooltip :text="isInputCopied ? 'Copied!' : 'Copy Input'" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :class="{ active: isInputCopied }"
                    aria-label="Copy Input"
                    @click="handleCopyInput"
                  >
                    <component :is="isInputCopied ? Check : Copy" :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Open File -->
                <M3Tooltip text="Open JSON File" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    aria-label="Open File"
                    @click="handleUploadInput"
                  >
                    <Upload :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Clear Input -->
                <M3Tooltip text="Clear Input" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn btn-danger-hover"
                    aria-label="Clear Input"
                    @click="inputJson = ''; handleFormat(isMinified)"
                  >
                    <RotateCcw :size="13" />
                  </button>
                </M3Tooltip>
              </div>
            </div>

            <!-- Custom Input Find Bar -->
            <div v-if="inputFindOpen" class="column-find-bar">
              <div class="find-input-wrap">
                <Search :size="12" class="find-icon" />
                <input
                  ref="inputFindInputRef"
                  v-model="inputFindQuery"
                  type="text"
                  class="find-input"
                  placeholder="Find in Input JSON..."
                  spellcheck="false"
                  @keydown.enter.exact="navigateInputMatch('next')"
                  @keydown.shift.enter="navigateInputMatch('prev')"
                  @keydown.esc="inputFindOpen = false"
                />
                <span v-if="inputFindQuery" class="find-count">
                  {{ inputMatchCount > 0 ? `${inputFindIndex} of ${inputMatchCount}` : '0 results' }}
                </span>
              </div>
              <button
                type="button"
                class="find-opt-btn"
                :class="{ active: inputFindCase }"
                title="Match Case"
                @click="inputFindCase = !inputFindCase"
              >
                Aa
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Previous Match (Shift+Enter)"
                :disabled="inputMatchCount === 0"
                @click="navigateInputMatch('prev')"
              >
                <ChevronUp :size="13" />
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Next Match (Enter)"
                :disabled="inputMatchCount === 0"
                @click="navigateInputMatch('next')"
              >
                <ChevronDown :size="13" />
              </button>
              <button
                type="button"
                class="find-close-btn"
                title="Close (Esc)"
                @click="inputFindOpen = false"
              >
                ✕
              </button>
            </div>

            <!-- CodeEditor Host -->
            <div class="editor-host-wrapper">
              <CodeEditor
                ref="inputEditorRef"
                v-model="inputJson"
                language="json"
                placeholder="Paste or type raw JSON here..."
                :show-toolbar="false"
                :show-status-bar="true"
                height="100%"
              />
            </div>
          </div>
        </template>

        <!-- OUTPUT PANE (Right / Bottom) -->
        <template #pane-2>
          <div
            class="pane-wrapper"
            :class="{ hidden: mobileTab === 'input' }"
            @click="activeEditorPane = 'output'"
          >
            <!-- Output Pane Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <span class="pane-title">{{ isMinified ? 'Minified Output' : 'Formatted Output' }}</span>
                <span class="size-tag">{{ formatBytes(outputByteSize) }}</span>
                <span
                  v-if="stats && stats.byteSavingsPercent !== 0"
                  class="savings-tag"
                  :class="{ reduction: stats.byteSavingsPercent > 0 }"
                >
                  {{ stats.byteSavingsPercent > 0 ? `-${stats.byteSavingsPercent}%` : `+${Math.abs(stats.byteSavingsPercent)}%` }}
                </span>
              </div>

              <div class="pane-header-right">
                <!-- Find Toggle in Header -->
                <M3Tooltip text="Find in Output (Ctrl+F)" placement="top">
                  <button
                    type="button"
                    class="col-find-toggle-btn"
                    :class="{ active: outputFindOpen }"
                    aria-label="Find in Output"
                    @click="toggleOutputFind"
                  >
                    <Search :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Copy Output -->
                <M3Tooltip :text="isOutputCopied ? 'Copied to Clipboard!' : 'Copy Formatted JSON'" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :class="{ active: isOutputCopied }"
                    :disabled="!outputJson"
                    aria-label="Copy Output"
                    @click="handleCopyOutput"
                  >
                    <component :is="isOutputCopied ? Check : Copy" :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Download Output -->
                <M3Tooltip text="Download Formatted JSON File" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :disabled="!outputJson"
                    aria-label="Download JSON"
                    @click="handleDownloadOutput"
                  >
                    <Download :size="13" />
                  </button>
                </M3Tooltip>
              </div>
            </div>

            <!-- Custom Output Find Bar -->
            <div v-if="outputFindOpen" class="column-find-bar">
              <div class="find-input-wrap">
                <Search :size="12" class="find-icon" />
                <input
                  ref="outputFindInputRef"
                  v-model="outputFindQuery"
                  type="text"
                  class="find-input"
                  placeholder="Find in Output JSON..."
                  spellcheck="false"
                  @keydown.enter.exact="navigateOutputMatch('next')"
                  @keydown.shift.enter="navigateOutputMatch('prev')"
                  @keydown.esc="outputFindOpen = false"
                />
                <span v-if="outputFindQuery" class="find-count">
                  {{ outputMatchCount > 0 ? `${outputFindIndex} of ${outputMatchCount}` : '0 results' }}
                </span>
              </div>
              <button
                type="button"
                class="find-opt-btn"
                :class="{ active: outputFindCase }"
                title="Match Case"
                @click="outputFindCase = !outputFindCase"
              >
                Aa
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Previous Match (Shift+Enter)"
                :disabled="outputMatchCount === 0"
                @click="navigateOutputMatch('prev')"
              >
                <ChevronUp :size="13" />
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Next Match (Enter)"
                :disabled="outputMatchCount === 0"
                @click="navigateOutputMatch('next')"
              >
                <ChevronDown :size="13" />
              </button>
              <button
                type="button"
                class="find-close-btn"
                title="Close (Esc)"
                @click="outputFindOpen = false"
              >
                ✕
              </button>
            </div>

            <!-- CodeEditor Host -->
            <div class="editor-host-wrapper">
              <CodeEditor
                ref="outputEditorRef"
                v-model="outputJson"
                language="json"
                placeholder="Formatted output will appear here..."
                :readonly="true"
                :show-toolbar="false"
                :show-status-bar="true"
                height="100%"
              />
            </div>
          </div>
        </template>
      </SplitPane>
    </div>

    <!-- JSON Statistics Footer -->
    <div v-if="stats && !formatError" class="stats-footer">
      <div class="stats-left">
        <div class="stat-pill success-tag">
          <CheckCircle2 :size="12" />
          <span>RFC 8259 Standard</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Size:</span>
          <span class="stat-val">{{ formatBytes(stats.originalSizeBytes) }} &rarr; {{ formatBytes(stats.formattedSizeBytes) }}</span>
          <span v-if="stats.byteSavingsPercent !== 0" class="savings-mini-tag" :class="{ reduction: stats.byteSavingsPercent > 0 }">
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
      </div>

      <div class="stats-right">
        <span class="stat-type-badge">
          {{ stats.dataType.toUpperCase() }}
        </span>
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
  box-sizing: border-box;
}

.json-formatter-container.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: var(--md-sys-color-surface);
  padding: 10px;
}

/* Compact 1-Line Desktop Toolbar */
.formatter-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  min-height: 36px;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium, 8px);
  overflow-x: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--md-sys-color-outline-variant);
  margin: 0 2px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.control-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-right: 1px;
}

/* Segment Group */
.segment-group {
  display: inline-flex;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 1px;
  gap: 1px;
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 7px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.segment-btn:hover {
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface-container-highest);
}

.segment-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 700;
}

/* Icon Toggle Buttons */
.icon-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  height: 24px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.6875rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.icon-toggle-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.icon-toggle-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.toggle-text {
  font-size: 0.6875rem;
}

/* Auto-Prettify Toggle Chip */
.compact-toggle-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  height: 24px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.6875rem;
  font-weight: 600;
  transition: all 0.15s ease;
  user-select: none;
}

.compact-toggle-chip:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.compact-toggle-chip.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.toggle-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border: 1.5px solid var(--md-sys-color-outline);
  border-radius: 3px;
  background: transparent;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.compact-toggle-chip.active .toggle-checkbox {
  background: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* Sample Presets */
.samples-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.pill-sample-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.pill-sample-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}

/* Action Buttons */
.compact-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.compact-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-btn {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: 1px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.92;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.tonal-btn {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  border: 1px solid transparent;
}

.tonal-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-highest);
}

.tonal-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.outline-btn {
  background: transparent;
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline);
}

.outline-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-high);
}

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-action-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.icon-action-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.icon-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-danger-hover:hover:not(:disabled) {
  color: var(--md-sys-color-error);
  border-color: var(--md-sys-color-error);
}

.exec-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-high);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

/* Mobile Tabs */
.mobile-column-tabs {
  display: none;
}

.segment-text-btn {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 3px;
  cursor: pointer;
}

.segment-text-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

/* Notice & Error Banners */
.repair-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  background: rgba(33, 150, 243, 0.08);
  border: 1px solid rgba(33, 150, 243, 0.25);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  font-size: 0.75rem;
}

.banner-icon {
  color: #2196f3;
  display: flex;
  align-items: center;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  overflow: hidden;
}

.banner-title {
  font-weight: 700;
  color: #2196f3;
  white-space: nowrap;
}

.banner-text {
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-close-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0 4px;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  border: 1px solid var(--md-sys-color-error);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  font-size: 0.75rem;
}

.error-icon {
  color: var(--md-sys-color-error);
  flex-shrink: 0;
}

.error-text-container {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  overflow: hidden;
}

.error-repair-btn {
  flex-shrink: 0;
}

/* Editor Area */
.editor-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.formatter-split-pane {
  height: 100%;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.pane-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium, 8px);
  overflow: hidden;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.75rem;
  font-weight: 600;
  min-height: 32px;
}

.pane-header-left,
.pane-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pane-title {
  color: var(--md-sys-color-on-surface);
  font-weight: 700;
}

.size-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-highest);
  padding: 1px 5px;
  border-radius: 4px;
}

.badge-valid {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.25);
  padding: 1px 5px;
  border-radius: 4px;
}

.badge-error {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: 1px 5px;
  border-radius: 4px;
}

.savings-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: 1px 5px;
  border-radius: 4px;
}

.savings-tag.reduction {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.25);
}

.col-find-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.col-find-toggle-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.col-find-toggle-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.pane-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.pane-icon-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.pane-icon-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.pane-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Custom In-Editor Find Bar (Matching JSON Diff) */
.column-find-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
  animation: slide-down 0.15s ease-out;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.find-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 4px;
  padding: 0 6px;
  min-width: 0;
}

.find-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
  margin-right: 4px;
}

.find-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-size: 0.6875rem;
  font-family: inherit;
  padding: 3px 0;
  outline: none;
  min-width: 60px;
}

.find-count {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  margin-left: 6px;
  white-space: nowrap;
}

.find-opt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 4px;
  height: 22px;
  min-width: 22px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
}

.find-opt-btn:hover {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.find-opt-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.find-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.find-nav-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-highest);
}

.find-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.find-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.6875rem;
}

.find-close-btn:hover {
  color: var(--md-sys-color-error);
}

.editor-host-wrapper {
  flex: 1;
  height: 100%;
  min-height: 0;
  position: relative;
}

/* Stats Footer */
.stats-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium, 6px);
  min-height: 28px;
}

.stats-left,
.stats-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  padding: 1px 5px;
  border-radius: 4px;
}

.stat-label {
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 500;
}

.stat-val {
  font-weight: 700;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.savings-mini-tag {
  font-size: 0.625rem;
  font-weight: 700;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  padding: 0 4px;
  border-radius: 3px;
}

.savings-mini-tag.reduction {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.25);
}

.success-tag {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
  font-weight: 700;
}

.stat-type-badge {
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--md-sys-color-primary);
  background: var(--md-sys-color-primary-container);
  padding: 1px 6px;
  border-radius: 4px;
}

/* Responsive Breakpoints */
@media (max-width: 900px) {
  .samples-group {
    display: none;
  }
}

@media (max-width: 768px) {
  .mobile-column-tabs {
    display: inline-flex;
  }
  .formatter-split-pane.mobile-input :deep(.split-pane-second) {
    display: none !important;
  }
  .formatter-split-pane.mobile-output :deep(.split-pane-first) {
    display: none !important;
  }
  .formatter-split-pane.mobile-input :deep(.split-pane-divider),
  .formatter-split-pane.mobile-output :deep(.split-pane-divider) {
    display: none !important;
  }
}
</style>
