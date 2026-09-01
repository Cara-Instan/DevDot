<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Search,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  Columns2,
  Rows3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  FileCode,
  ChevronUp,
  ChevronDown,
  Wrench
} from 'lucide-vue-next'
import {
  CodeEditor,
  M3Tooltip,
  SplitPane
} from '@/components'
import { useSnapshotStore } from '@/stores'
import { openNativeFileDialog, saveNativeFileDialog } from '@/core/native'
import { generateTypesFromJson } from '../services/type-generators'
import { safeParseJson } from '../services/json-parser'
import type {
  TargetLanguage,
  TypeScriptOptions,
  GoOptions,
  RustOptions,
  JavaOptions,
  PythonOptions,
  CSharpOptions,
  JsonSchemaOptions,
  TypeGeneratorPayload,
  TypeGeneratorResult
} from '../types'

const snapshotStore = useSnapshotStore()

// Sample presets for quick testing and demonstrations
const SAMPLES = {
  apiResponse: {
    name: 'Universal API Payload',
    content: `{
  "id": 101,
  "name": "DevDot Universal Developer Toolkit",
  "version": "1.0.0",
  "is_active": true,
  "author": {
    "name": "Ando",
    "email": "ando@devdot.local",
    "github_handle": "devdot-core"
  },
  "tags": ["offline", "tauri-v2", "vue3", "pinia"],
  "metrics": {
    "total_modules": 12,
    "memory_usage_mb": 14.5,
    "last_synced_at": "2026-08-26T22:00:00Z"
  }
}`
  },
  cloudConfig: {
    name: 'Cloud Microservice Config',
    content: `{
  "serviceName": "auth-gateway",
  "environment": "production",
  "port": 443,
  "replicas": 8,
  "rateLimit": {
    "maxRequests": 500,
    "windowMs": 60000,
    "burstTolerance": 50
  },
  "corsOrigins": [
    "https://devdot.tools",
    "https://app.devdot.tools"
  ],
  "logging": {
    "level": "info",
    "destination": "cloudwatch"
  },
  "tls": {
    "enabled": true,
    "minVersion": "1.3"
  }
}`
  },
  dirtyJson: {
    name: 'Relaxed / Dirty JSON',
    content: `// DevDot Schema Demo with Relaxed JSON
{
  name: 'DevDot Developer Toolkit',
  version: "0.1.0",
  /* Nested features */
  features: [
    '100% Offline Air-Gapped',
    'Material Design 3 Shell',
    'Type Generation Engine',
  ],
  stats: {
    activeUsers: 1000,
    isProductionReady: True,
  },
  // Trailing comma below:
}`
  }
}

const initialSaved = snapshotStore.getToolState('json-schema', {
  inputJson: SAMPLES.apiResponse.content,
  outputCode: '',
  selectedTarget: 'typescript' as TargetLanguage,
  splitDirection: 'horizontal' as 'horizontal' | 'vertical',
  autoGenerate: true,
  tsOptions: {
    rootName: 'DevDotConfig',
    useInterface: true,
    exportTypes: true,
    optionalFields: false,
    readonlyProperties: false,
    allOptional: false
  },
  goOptions: {
    rootName: 'DevDotConfig',
    includeJsonTags: true,
    includeYamlTags: true,
    includeXmlTags: false,
    omitempty: false,
    usePointersForNullable: true
  },
  rustOptions: {
    rootName: 'DevDotConfig',
    deriveMacros: ['Default', 'Debug', 'Clone', 'PartialEq', 'Serialize', 'Deserialize'],
    useOptionForNullable: true,
    renameAll: 'none' as const
  },
  javaOptions: {
    rootName: 'DevDotConfig',
    style: 'record' as const,
    useJacksonAnnotations: true
  },
  pythonOptions: {
    rootName: 'DevDotConfig',
    style: 'pydantic' as const,
    useSnakeCase: true
  },
  csharpOptions: {
    rootName: 'DevDotConfig',
    useSystemTextJson: true,
    useRecords: false
  },
  schemaOptions: {
    schemaDraft: 'draft-07' as const,
    title: 'DevDotConfigSchema',
    includeRequired: true,
    includeExamples: true
  }
})

const inputJson = ref(initialSaved.inputJson)
const outputCode = ref(initialSaved.outputCode)
const selectedTarget = ref<TargetLanguage>(initialSaved.selectedTarget || 'typescript')
const splitDirection = ref<'horizontal' | 'vertical'>(initialSaved.splitDirection || 'horizontal')
const autoGenerate = ref<boolean>(initialSaved.autoGenerate ?? true)

// UI States
const rootRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)
const mobileTab = ref<'both' | 'input' | 'output'>('both')
const isOutputCopied = ref(false)
const isInputCopied = ref(false)

const lastResult = ref<TypeGeneratorResult | null>(null)
const genError = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)
const repairNotices = ref<string[]>([])
const dismissRepairNotice = ref(false)

// In-Editor Find States
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

// Target Options
const tsOptions = ref<TypeScriptOptions>(initialSaved.tsOptions || {
  rootName: 'DevDotConfig',
  useInterface: true,
  exportTypes: true,
  optionalFields: false,
  readonlyProperties: false,
  allOptional: false
})

const goOptions = ref<GoOptions>(initialSaved.goOptions || {
  rootName: 'DevDotConfig',
  includeJsonTags: true,
  includeYamlTags: true,
  includeXmlTags: false,
  omitempty: false,
  usePointersForNullable: true
})

const rustOptions = ref<RustOptions>(initialSaved.rustOptions || {
  rootName: 'DevDotConfig',
  deriveMacros: ['Default', 'Debug', 'Clone', 'PartialEq', 'Serialize', 'Deserialize'],
  useOptionForNullable: true,
  renameAll: 'none' as const
})

const javaOptions = ref<JavaOptions>(initialSaved.javaOptions || {
  rootName: 'DevDotConfig',
  style: 'record',
  useJacksonAnnotations: true
})

const pythonOptions = ref<PythonOptions>(initialSaved.pythonOptions || {
  rootName: 'DevDotConfig',
  style: 'pydantic',
  useSnakeCase: true
})

const csharpOptions = ref<CSharpOptions>(initialSaved.csharpOptions || {
  rootName: 'DevDotConfig',
  useSystemTextJson: true,
  useRecords: false
})

const schemaOptions = ref<JsonSchemaOptions>(initialSaved.schemaOptions || {
  schemaDraft: 'draft-07',
  title: 'DevDotConfigSchema',
  includeRequired: true,
  includeExamples: true
})

let isHydrating = false

// Sync to snapshot store
watch(
  [
    inputJson,
    outputCode,
    selectedTarget,
    splitDirection,
    autoGenerate,
    tsOptions,
    goOptions,
    rustOptions,
    javaOptions,
    pythonOptions,
    csharpOptions,
    schemaOptions
  ],
  () => {
    if (isHydrating) return
    snapshotStore.setToolState('json-schema', {
      inputJson: inputJson.value,
      outputCode: outputCode.value,
      selectedTarget: selectedTarget.value,
      splitDirection: splitDirection.value,
      autoGenerate: autoGenerate.value,
      tsOptions: { ...tsOptions.value },
      goOptions: { ...goOptions.value },
      rustOptions: { ...rustOptions.value, deriveMacros: [...rustOptions.value.deriveMacros] },
      javaOptions: { ...javaOptions.value },
      pythonOptions: { ...pythonOptions.value },
      csharpOptions: { ...csharpOptions.value },
      schemaOptions: { ...schemaOptions.value }
    })
  },
  { deep: true }
)

// Language highligter mapping
const outputLanguage = computed(() => {
  switch (selectedTarget.value) {
    case 'typescript':
      return 'typescript'
    case 'go':
      return 'go'
    case 'rust':
      return 'rust'
    case 'java':
      return 'java'
    case 'python':
      return 'python'
    case 'csharp':
      return 'csharp'
    case 'json-schema':
      return 'json'
    default:
      return 'text'
  }
})

// Byte calculation
const inputByteSize = computed(() => new TextEncoder().encode(inputJson.value || '').length)
const outputByteSize = computed(() => new TextEncoder().encode(outputCode.value || '').length)

// Match finder helper
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

const outputMatches = computed(() => findMatchesInText(outputCode.value, outputFindQuery.value, outputFindCase.value))
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

// Generation Logic
function handleGenerate() {
  genError.value = null
  repairNotices.value = []

  if (!inputJson.value.trim()) {
    outputCode.value = ''
    lastResult.value = null
    executionTimeMs.value = null
    return
  }

  // Pre-check json validity / relaxed parsing
  let parsedCheck
  try {
    parsedCheck = safeParseJson(inputJson.value, { autoRepair: true })
    if (parsedCheck.wasRepaired && parsedCheck.repairs.length > 0) {
      repairNotices.value = parsedCheck.repairs
    }
  } catch (err: any) {
    genError.value = err.message || 'Invalid JSON syntax'
    outputCode.value = ''
    lastResult.value = null
    return
  }

  const startTime = performance.now()
  const payload: TypeGeneratorPayload = {
    input: inputJson.value,
    target: selectedTarget.value,
    tsOptions: { ...tsOptions.value },
    goOptions: { ...goOptions.value },
    rustOptions: {
      ...rustOptions.value,
      deriveMacros: [...rustOptions.value.deriveMacros]
    },
    javaOptions: { ...javaOptions.value },
    pythonOptions: { ...pythonOptions.value },
    csharpOptions: { ...csharpOptions.value },
    schemaOptions: { ...schemaOptions.value }
  }

  try {
    const res = generateTypesFromJson(payload)
    lastResult.value = res
    outputCode.value = res.code
    executionTimeMs.value = Math.round((performance.now() - startTime) * 100) / 100
  } catch (err: any) {
    genError.value = err.message || 'Generation error'
  }
}

function selectTarget(target: TargetLanguage) {
  selectedTarget.value = target
  handleGenerate()
}

function handleExplicitRepair() {
  try {
    const parsedCheck = safeParseJson(inputJson.value, { autoRepair: true })
    inputJson.value = JSON.stringify(parsedCheck.data, null, 2)
    repairNotices.value = parsedCheck.repairs.length > 0
      ? parsedCheck.repairs
      : ['JSON reformatted cleanly']
    handleGenerate()
  } catch (err: any) {
    genError.value = err.message || 'Unable to repair JSON syntax'
  }
}

// Live auto-generate debounced watch
let liveGenTimer: any = null
watch(
  [
    inputJson,
    selectedTarget,
    tsOptions,
    goOptions,
    rustOptions,
    javaOptions,
    pythonOptions,
    csharpOptions,
    schemaOptions
  ],
  () => {
    if (isHydrating || !autoGenerate.value) return
    clearTimeout(liveGenTimer)
    liveGenTimer = setTimeout(() => {
      handleGenerate()
    }, 200)
  },
  { deep: true }
)

function handleLoadPreset(key: keyof typeof SAMPLES) {
  inputJson.value = SAMPLES[key].content
  dismissRepairNotice.value = false
  handleGenerate()
}

function handleClear() {
  inputJson.value = ''
  outputCode.value = ''
  lastResult.value = null
  genError.value = null
  executionTimeMs.value = null
  repairNotices.value = []
}

// Copy Handlers
async function handleCopyInput() {
  if (!inputJson.value) return
  await navigator.clipboard.writeText(inputJson.value)
  isInputCopied.value = true
  setTimeout(() => {
    isInputCopied.value = false
  }, 1800)
}

async function handleCopyOutput() {
  if (!outputCode.value) return
  await navigator.clipboard.writeText(outputCode.value)
  isOutputCopied.value = true
  setTimeout(() => {
    isOutputCopied.value = false
  }, 1800)
}

// Native File Upload & Download
async function handleUploadInput() {
  const files = await openNativeFileDialog({
    title: 'Open JSON File',
    filters: [
      { name: 'JSON Files', extensions: ['json', 'jsonc', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (files && files.length > 0 && files[0].content) {
    inputJson.value = files[0].content
    handleGenerate()
  }
}

function getTargetFileExtension(target: TargetLanguage): string {
  switch (target) {
    case 'typescript':
      return 'ts'
    case 'go':
      return 'go'
    case 'rust':
      return 'rs'
    case 'java':
      return 'java'
    case 'python':
      return 'py'
    case 'csharp':
      return 'cs'
    case 'json-schema':
      return 'schema.json'
    default:
      return 'txt'
  }
}

async function handleDownloadOutput() {
  if (!outputCode.value) return
  const ext = getTargetFileExtension(selectedTarget.value)
  const defaultName = `${tsOptions.value.rootName || 'types'}.${ext}`

  await saveNativeFileDialog(outputCode.value, {
    title: `Save ${selectedTarget.value.toUpperCase()} Types`,
    defaultPath: defaultName,
    filters: [
      { name: `${selectedTarget.value.toUpperCase()} Files`, extensions: [ext] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
}

// Fullscreen
function toggleFullscreen() {
  if (!rootRef.value) return
  if (!document.fullscreenElement) {
    rootRef.value.requestFullscreen().catch(() => {
      isFullscreen.value = !isFullscreen.value
    })
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
    handleGenerate()
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  handleGenerate()
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
    class="json-schema-container"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <!-- Compact 1-Line Desktop Toolbar -->
    <div class="schema-toolbar">
      <div class="toolbar-left">
        <!-- Target Language Selector Pills -->
        <div class="target-tabs" role="group" aria-label="Target Language">
          <M3Tooltip text="Generate TypeScript Interfaces & Types" placement="bottom">
            <button
              type="button"
              class="target-tab-btn"
              :class="{ active: selectedTarget === 'typescript' }"
              @click="selectTarget('typescript')"
            >
              <span class="lang-dot ts-dot"></span>
              <span>TypeScript</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Generate Go Structs with JSON/YAML Tags" placement="bottom">
            <button
              type="button"
              class="target-tab-btn"
              :class="{ active: selectedTarget === 'go' }"
              @click="selectTarget('go')"
            >
              <span class="lang-dot go-dot"></span>
              <span>Go</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Generate Rust Serde Structs" placement="bottom">
            <button
              type="button"
              class="target-tab-btn"
              :class="{ active: selectedTarget === 'rust' }"
              @click="selectTarget('rust')"
            >
              <span class="lang-dot rust-dot"></span>
              <span>Rust</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Generate Java Records or POJOs" placement="bottom">
            <button
              type="button"
              class="target-tab-btn"
              :class="{ active: selectedTarget === 'java' }"
              @click="selectTarget('java')"
            >
              <span class="lang-dot java-dot"></span>
              <span>Java</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Generate Python Pydantic / Dataclasses" placement="bottom">
            <button
              type="button"
              class="target-tab-btn"
              :class="{ active: selectedTarget === 'python' }"
              @click="selectTarget('python')"
            >
              <span class="lang-dot python-dot"></span>
              <span>Python</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Generate C# Classes & Records" placement="bottom">
            <button
              type="button"
              class="target-tab-btn"
              :class="{ active: selectedTarget === 'csharp' }"
              @click="selectTarget('csharp')"
            >
              <span class="lang-dot csharp-dot"></span>
              <span>C#</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Generate JSON Schema (Draft-07 / 2020-12)" placement="bottom">
            <button
              type="button"
              class="target-tab-btn"
              :class="{ active: selectedTarget === 'json-schema' }"
              @click="selectTarget('json-schema')"
            >
              <span class="lang-dot json-dot"></span>
              <span>JSON Schema</span>
            </button>
          </M3Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Inline Target Config & Controls -->
        <div class="contextual-options-bar">
          <!-- TypeScript Specific Options -->
          <template v-if="selectedTarget === 'typescript'">
            <input
              v-model="tsOptions.rootName"
              type="text"
              class="compact-input"
              placeholder="Root Type Name"
              title="Root Interface / Type Name"
              @input="handleGenerate"
            />
            <div class="segment-group" role="group" aria-label="TypeScript Type Style">
              <M3Tooltip text="Export as Interface" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: tsOptions.useInterface }"
                  @click="tsOptions.useInterface = true; handleGenerate()"
                >
                  interface
                </button>
              </M3Tooltip>
              <M3Tooltip text="Export as Type Alias" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: !tsOptions.useInterface }"
                  @click="tsOptions.useInterface = false; handleGenerate()"
                >
                  type
                </button>
              </M3Tooltip>
            </div>
            <M3Tooltip text="Optional Properties (?)" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: tsOptions.optionalFields }"
                @click="tsOptions.optionalFields = !tsOptions.optionalFields; handleGenerate()"
              >
                <span>Opt (?)</span>
              </button>
            </M3Tooltip>
            <M3Tooltip text="Readonly Properties" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: tsOptions.readonlyProperties }"
                @click="tsOptions.readonlyProperties = !tsOptions.readonlyProperties; handleGenerate()"
              >
                <span>Readonly</span>
              </button>
            </M3Tooltip>
          </template>

          <!-- Go Specific Options -->
          <template v-else-if="selectedTarget === 'go'">
            <input
              v-model="goOptions.rootName"
              type="text"
              class="compact-input"
              placeholder="Struct Name"
              title="Root Struct Name"
              @input="handleGenerate"
            />
            <M3Tooltip text="Include json tags (`json:...`)" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: goOptions.includeJsonTags }"
                @click="goOptions.includeJsonTags = !goOptions.includeJsonTags; handleGenerate()"
              >
                <span>JSON Tags</span>
              </button>
            </M3Tooltip>
            <M3Tooltip text="Include yaml tags (`yaml:...`)" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: goOptions.includeYamlTags }"
                @click="goOptions.includeYamlTags = !goOptions.includeYamlTags; handleGenerate()"
              >
                <span>YAML Tags</span>
              </button>
            </M3Tooltip>
            <M3Tooltip text="Include omitempty in tags" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: goOptions.omitempty }"
                @click="goOptions.omitempty = !goOptions.omitempty; handleGenerate()"
              >
                <span>omitempty</span>
              </button>
            </M3Tooltip>
          </template>

          <!-- Rust Specific Options -->
          <template v-else-if="selectedTarget === 'rust'">
            <input
              v-model="rustOptions.rootName"
              type="text"
              class="compact-input"
              placeholder="Struct Name"
              title="Root Struct Name"
              @input="handleGenerate"
            />
            <div class="segment-group" role="group" aria-label="Rust Serde Rename">
              <M3Tooltip text="No serde rename" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: rustOptions.renameAll === 'none' }"
                  @click="rustOptions.renameAll = 'none'; handleGenerate()"
                >
                  raw
                </button>
              </M3Tooltip>
              <M3Tooltip text="Serde rename_all = camelCase" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: rustOptions.renameAll === 'camelCase' }"
                  @click="rustOptions.renameAll = 'camelCase'; handleGenerate()"
                >
                  camelCase
                </button>
              </M3Tooltip>
              <M3Tooltip text="Serde rename_all = snake_case" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: rustOptions.renameAll === 'snake_case' }"
                  @click="rustOptions.renameAll = 'snake_case'; handleGenerate()"
                >
                  snake_case
                </button>
              </M3Tooltip>
            </div>
            <M3Tooltip text="Use Option<T> for Nullable Fields" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: rustOptions.useOptionForNullable }"
                @click="rustOptions.useOptionForNullable = !rustOptions.useOptionForNullable; handleGenerate()"
              >
                <span>Option&lt;T&gt;</span>
              </button>
            </M3Tooltip>
          </template>

          <!-- Java Specific Options -->
          <template v-else-if="selectedTarget === 'java'">
            <input
              v-model="javaOptions.rootName"
              type="text"
              class="compact-input"
              placeholder="Class / Record Name"
              title="Root Java Name"
              @input="handleGenerate"
            />
            <div class="segment-group" role="group" aria-label="Java Style">
              <M3Tooltip text="Java 16+ Record" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: javaOptions.style === 'record' }"
                  @click="javaOptions.style = 'record'; handleGenerate()"
                >
                  Record
                </button>
              </M3Tooltip>
              <M3Tooltip text="Standard Java POJO Class" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: javaOptions.style === 'class' }"
                  @click="javaOptions.style = 'class'; handleGenerate()"
                >
                  Class
                </button>
              </M3Tooltip>
              <M3Tooltip text="Lombok @Data Class" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: javaOptions.style === 'lombok' }"
                  @click="javaOptions.style = 'lombok'; handleGenerate()"
                >
                  Lombok
                </button>
              </M3Tooltip>
            </div>
            <M3Tooltip text="Jackson @JsonProperty Annotations" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: javaOptions.useJacksonAnnotations }"
                @click="javaOptions.useJacksonAnnotations = !javaOptions.useJacksonAnnotations; handleGenerate()"
              >
                <span>Jackson</span>
              </button>
            </M3Tooltip>
          </template>

          <!-- Python Specific Options -->
          <template v-else-if="selectedTarget === 'python'">
            <input
              v-model="pythonOptions.rootName"
              type="text"
              class="compact-input"
              placeholder="Model Name"
              title="Root Python Model Name"
              @input="handleGenerate"
            />
            <div class="segment-group" role="group" aria-label="Python Style">
              <M3Tooltip text="Pydantic BaseModel" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: pythonOptions.style === 'pydantic' }"
                  @click="pythonOptions.style = 'pydantic'; handleGenerate()"
                >
                  Pydantic
                </button>
              </M3Tooltip>
              <M3Tooltip text="Standard dataclass" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: pythonOptions.style === 'dataclass' }"
                  @click="pythonOptions.style = 'dataclass'; handleGenerate()"
                >
                  Dataclass
                </button>
              </M3Tooltip>
              <M3Tooltip text="TypedDict" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: pythonOptions.style === 'typeddict' }"
                  @click="pythonOptions.style = 'typeddict'; handleGenerate()"
                >
                  TypedDict
                </button>
              </M3Tooltip>
            </div>
            <M3Tooltip text="Enforce snake_case Field Names" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: pythonOptions.useSnakeCase }"
                @click="pythonOptions.useSnakeCase = !pythonOptions.useSnakeCase; handleGenerate()"
              >
                <span>snake_case</span>
              </button>
            </M3Tooltip>
          </template>

          <!-- C# Specific Options -->
          <template v-else-if="selectedTarget === 'csharp'">
            <input
              v-model="csharpOptions.rootName"
              type="text"
              class="compact-input"
              placeholder="Class Name"
              title="Root C# Class Name"
              @input="handleGenerate"
            />
            <div class="segment-group" role="group" aria-label="C# Style">
              <M3Tooltip text="Standard C# Class" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: !csharpOptions.useRecords }"
                  @click="csharpOptions.useRecords = false; handleGenerate()"
                >
                  Class
                </button>
              </M3Tooltip>
              <M3Tooltip text="C# 9+ Record" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: csharpOptions.useRecords }"
                  @click="csharpOptions.useRecords = true; handleGenerate()"
                >
                  Record
                </button>
              </M3Tooltip>
            </div>
            <M3Tooltip text="System.Text.Json [JsonPropertyName] Attributes" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: csharpOptions.useSystemTextJson }"
                @click="csharpOptions.useSystemTextJson = !csharpOptions.useSystemTextJson; handleGenerate()"
              >
                <span>Json Attributes</span>
              </button>
            </M3Tooltip>
          </template>

          <!-- JSON Schema Specific Options -->
          <template v-else-if="selectedTarget === 'json-schema'">
            <input
              v-model="schemaOptions.title"
              type="text"
              class="compact-input"
              placeholder="Schema Title"
              title="Root Schema Title"
              @input="handleGenerate"
            />
            <div class="segment-group" role="group" aria-label="Schema Draft">
              <M3Tooltip text="JSON Schema Draft-07 (Most Compatible)" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: schemaOptions.schemaDraft === 'draft-07' }"
                  @click="schemaOptions.schemaDraft = 'draft-07'; handleGenerate()"
                >
                  Draft-07
                </button>
              </M3Tooltip>
              <M3Tooltip text="JSON Schema Draft 2020-12 (Modern Standard)" placement="bottom">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: schemaOptions.schemaDraft === '2020-12' }"
                  @click="schemaOptions.schemaDraft = '2020-12'; handleGenerate()"
                >
                  2020-12
                </button>
              </M3Tooltip>
            </div>
            <M3Tooltip text="Include required array in schema" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: schemaOptions.includeRequired }"
                @click="schemaOptions.includeRequired = !schemaOptions.includeRequired; handleGenerate()"
              >
                <span>Required</span>
              </button>
            </M3Tooltip>
            <M3Tooltip text="Include examples in schema" placement="bottom">
              <button
                type="button"
                class="icon-toggle-btn"
                :class="{ active: schemaOptions.includeExamples }"
                @click="schemaOptions.includeExamples = !schemaOptions.includeExamples; handleGenerate()"
              >
                <span>Examples</span>
              </button>
            </M3Tooltip>
          </template>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Sample Presets -->
        <div class="samples-group">
          <M3Tooltip text="Load Universal API Response Sample" placement="bottom">
            <button
              type="button"
              class="pill-sample-btn"
              @click="handleLoadPreset('apiResponse')"
            >
              <Code2 :size="12" />
              <span>API Sample</span>
            </button>
          </M3Tooltip>
          <M3Tooltip text="Load Microservice Config Sample" placement="bottom">
            <button
              type="button"
              class="pill-sample-btn"
              @click="handleLoadPreset('cloudConfig')"
            >
              <FileCode :size="12" />
              <span>Config</span>
            </button>
          </M3Tooltip>
          <M3Tooltip text="Load Relaxed / Dirty JSON Demo" placement="bottom">
            <button
              type="button"
              class="pill-sample-btn"
              @click="handleLoadPreset('dirtyJson')"
            >
              <Sparkles :size="12" />
              <span>Relaxed JSON</span>
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

        <!-- Auto-Generate Toggle Chip -->
        <M3Tooltip
          :text="autoGenerate ? 'Auto-Generate: ON (Automatically updates code as you type or change options)' : 'Auto-Generate: OFF (Manual mode)'"
          placement="bottom"
        >
          <button
            type="button"
            class="compact-toggle-chip"
            :class="{ active: autoGenerate }"
            aria-label="Toggle Auto-Generate"
            @click="autoGenerate = !autoGenerate; if (autoGenerate) handleGenerate()"
          >
            <div class="toggle-checkbox" :class="{ checked: autoGenerate }">
              <Check v-if="autoGenerate" :size="10" :stroke-width="3" />
            </div>
            <span>Auto</span>
          </button>
        </M3Tooltip>

        <!-- Primary Generate Action -->
        <M3Tooltip text="Generate Types / Schema (Ctrl+Enter)" placement="bottom">
          <button
            type="button"
            class="compact-action-btn primary-btn"
            :disabled="!inputJson.trim()"
            @click="handleGenerate"
          >
            <Sparkles :size="13" />
            <span>Generate</span>
          </button>
        </M3Tooltip>

        <div class="toolbar-divider"></div>

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
        <span class="banner-title">Relaxed JSON Parsed:</span>
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
    <div v-if="genError" class="error-banner">
      <AlertCircle :size="15" class="error-icon" />
      <div class="error-text-container">
        <strong>Syntax Error:</strong>
        <span>{{ genError }}</span>
      </div>
      <button
        type="button"
        class="compact-action-btn tonal-btn error-repair-btn"
        @click="handleExplicitRepair"
      >
        <Wrench :size="12" />
        <span>Auto-Repair JSON</span>
      </button>
    </div>

    <!-- Split Editor Area with SplitPane -->
    <div class="editor-area">
      <SplitPane
        :direction="splitDirection"
        :initial-split="50"
        class="schema-split-pane"
        :class="`mobile-${mobileTab}`"
      >
        <!-- Mobile Pane Labels -->
        <template #pane-1-tab-label>
          Input JSON
        </template>
        <template #pane-2-tab-label>
          Generated {{ selectedTarget.toUpperCase() }}
        </template>

        <!-- INPUT PANE (Left / Top) -->
        <template #pane-1>
          <div
            class="pane-wrapper"
            :class="{ hidden: mobileTab === 'output' }"
            @click="activeEditorPane = 'input'"
          >
            <!-- Input Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <span class="pane-title">Input JSON</span>
                <span class="size-tag">{{ formatBytes(inputByteSize) }}</span>
                <span v-if="genError" class="badge-error">Invalid</span>
                <span v-else-if="inputJson.trim()" class="badge-valid">Parsed</span>
              </div>

              <div class="pane-header-right">
                <!-- Find Toggle -->
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
                    @click="inputJson = ''; handleGenerate()"
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
                placeholder="Paste or type JSON here..."
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
            <!-- Output Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <span class="pane-title">Generated {{ selectedTarget.toUpperCase() }}</span>
                <span class="size-tag">{{ formatBytes(outputByteSize) }}</span>
                <span v-if="lastResult?.stats" class="badge-accent">
                  {{ lastResult.stats.typesGenerated }} Types
                </span>
              </div>

              <div class="pane-header-right">
                <!-- Find Toggle -->
                <M3Tooltip text="Find in Generated Code (Ctrl+F)" placement="top">
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
                <M3Tooltip :text="isOutputCopied ? 'Copied Code!' : 'Copy Code'" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn copy-primary-btn"
                    :class="{ active: isOutputCopied }"
                    :disabled="!outputCode"
                    aria-label="Copy Code"
                    @click="handleCopyOutput"
                  >
                    <component :is="isOutputCopied ? Check : Copy" :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Download Output -->
                <M3Tooltip text="Download Code File" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :disabled="!outputCode"
                    aria-label="Download Code"
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
                  placeholder="Find in Output Code..."
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
                v-model="outputCode"
                :language="outputLanguage"
                placeholder="Generated schema or types will appear here..."
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

    <!-- Statistics & Status Footer -->
    <div v-if="lastResult && !genError" class="stats-footer">
      <div class="stats-left">
        <div class="stat-pill success-tag">
          <CheckCircle2 :size="12" />
          <span>Cleanly Generated</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Target:</span>
          <span class="stat-val uppercase">{{ lastResult.targetLanguage }}</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Root:</span>
          <span class="stat-val">{{ lastResult.rootName }}</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Types:</span>
          <span class="stat-val">{{ lastResult.stats.typesGenerated }}</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Lines:</span>
          <span class="stat-val">{{ lastResult.stats.linesCount }}</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">Size:</span>
          <span class="stat-val">{{ formatBytes(outputByteSize) }}</span>
        </div>
      </div>

      <div class="stats-right">
        <span class="stat-type-badge">
          {{ selectedTarget.toUpperCase() }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-schema-container {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.json-schema-container.is-fullscreen {
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
.schema-toolbar {
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

.target-tabs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.target-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full, 9999px);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.target-tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.target-tab-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.lang-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.ts-dot { background-color: #3178c6; }
.go-dot { background-color: #00add8; }
.rust-dot { background-color: #dea584; }
.java-dot { background-color: #e76f00; }
.python-dot { background-color: #3572a5; }
.csharp-dot { background-color: #178600; }
.json-dot { background-color: #cb3837; }

.contextual-options-bar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.compact-input {
  height: 24px;
  width: 120px;
  padding: 0 0.45rem;
  font-size: 0.6875rem;
  font-family: var(--md-sys-typescale-code-font, monospace);
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 4px);
  color: var(--md-sys-color-on-surface);
  outline: none;
  transition: border-color 0.15s ease;
}

.compact-input:focus {
  border-color: var(--md-sys-color-primary);
}

/* Segment Button Groups */
.segment-group {
  display: inline-flex;
  align-items: center;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  padding: 1px;
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.segment-btn:hover {
  color: var(--md-sys-color-on-surface);
  background-color: var(--md-sys-color-surface-container-highest);
}

.segment-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.segment-text-btn {
  padding: 0.15rem 0.45rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
}

.segment-text-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

/* Icon & Toggle Buttons */
.icon-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 24px;
  padding: 0 0.45rem;
  border-radius: var(--md-sys-shape-corner-small, 4px);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.icon-toggle-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.icon-toggle-btn.active {
  background-color: var(--md-sys-color-secondary-container, #dbe2f9);
  color: var(--md-sys-color-on-secondary-container, #131b2e);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.samples-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pill-sample-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  height: 24px;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full, 9999px);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.pill-sample-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: var(--md-sys-color-outline-variant);
  margin: 0 0.125rem;
  flex-shrink: 0;
}

.mobile-column-tabs {
  display: none;
}

@media (max-width: 800px) {
  .mobile-column-tabs {
    display: inline-flex;
  }
  .schema-split-pane.mobile-input :deep(.split-pane-second) {
    display: none !important;
  }
  .schema-split-pane.mobile-output :deep(.split-pane-first) {
    display: none !important;
  }
}

/* Action Buttons */
.compact-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 26px;
  padding: 0 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full, 9999px);
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
  opacity: 0.9;
}

.compact-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--md-sys-shape-corner-small, 6px);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-action-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.icon-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-danger-hover:hover:not(:disabled) {
  background-color: var(--md-sys-color-error-container, #ffdad6);
  color: var(--md-sys-color-on-error-container, #410002);
  border-color: var(--md-sys-color-error, #ba1a1a);
}

.exec-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-family: var(--md-sys-typescale-code-font, monospace);
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.15rem 0.45rem;
  border-radius: var(--md-sys-shape-corner-small, 4px);
}

.compact-toggle-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 24px;
  padding: 0 0.5rem;
  border-radius: var(--md-sys-shape-corner-full, 9999px);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.compact-toggle-chip.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.toggle-checkbox {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--md-sys-color-outline);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-checkbox.checked {
  background-color: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* Repair and Error Banners */
.repair-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.65rem;
  background-color: var(--md-sys-color-tertiary-container, #dbe2f9);
  color: var(--md-sys-color-on-tertiary-container, #131b2e);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  font-size: 0.6875rem;
}

.banner-icon {
  display: flex;
  align-items: center;
}

.banner-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-title {
  font-weight: 600;
}

.banner-close-btn {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0 0.25rem;
  opacity: 0.7;
}

.banner-close-btn:hover {
  opacity: 1;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.65rem;
  background-color: var(--md-sys-color-error-container, #ffdad6);
  color: var(--md-sys-color-on-error-container, #410002);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  font-size: 0.6875rem;
}

.error-text-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.error-repair-btn {
  height: 22px;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
}

/* Editor & Split Area */
.editor-area {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.schema-split-pane {
  width: 100%;
  height: 100%;
}

.pane-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium, 8px);
  overflow: hidden;
}

.pane-wrapper.hidden {
  display: none;
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  min-height: 32px;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
}

.pane-header-left,
.pane-header-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.pane-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.size-tag {
  font-size: 0.6875rem;
  font-family: var(--md-sys-typescale-code-font, monospace);
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.badge-valid {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.badge-error {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

.badge-accent {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.col-find-toggle-btn,
.pane-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.col-find-toggle-btn:hover,
.pane-icon-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.col-find-toggle-btn.active,
.pane-icon-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.copy-primary-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.pane-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* In-Editor Find Bar */
.column-find-bar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
}

.find-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 4px;
  padding: 0 0.35rem;
  height: 24px;
}

.find-icon {
  color: var(--md-sys-color-on-surface-variant);
}

.find-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-size: 0.6875rem;
  outline: none;
}

.find-count {
  font-size: 0.625rem;
  color: var(--md-sys-color-on-surface-variant);
  font-family: var(--md-sys-typescale-code-font, monospace);
  white-space: nowrap;
}

.find-opt-btn,
.find-nav-btn,
.find-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  cursor: pointer;
  transition: all 0.12s ease;
}

.find-opt-btn:hover,
.find-nav-btn:hover:not(:disabled),
.find-close-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.find-opt-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.find-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.editor-host-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  position: relative;
}

/* Status / Statistics Footer */
.stats-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.stats-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.4rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: 4px;
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

.uppercase {
  text-transform: uppercase;
}

.success-tag {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 600;
}

.stat-type-badge {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}
</style>
