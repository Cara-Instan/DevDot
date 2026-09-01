<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  ArrowLeftRight,
  Download,
  Upload,
  RotateCcw,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Columns2,
  Rows3,
  Maximize2,
  Minimize2,
  EyeOff,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Image as ImageIcon,
  ChevronDown
} from 'lucide-vue-next'
import {
  CodeEditor,
  SplitPane,
  M3Tooltip
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore, useSecurityStore } from '@/stores'
import { openNativeFileDialog, saveNativeFileDialog } from '@/core/native'
import type {
  EncoderMode,
  ConversionDirection,
  Base64Options,
  UrlOptions,
  HexOptions,
  HtmlEntitiesOptions
} from '../types'

const { execute } = useExecutionEngine()
const snapshotStore = useSnapshotStore()
const securityStore = useSecurityStore()

// Rich Presets per Mode
const PRESETS: Record<EncoderMode, { name: string; content: string; direction?: ConversionDirection }[]> = {
  base64: [
    {
      name: 'Welcome Text',
      content: 'Hello DevDot! 100% Privacy-First Universal Developer Toolkit 🚀',
      direction: 'encode'
    },
    {
      name: 'JWT Token',
      content: '{"sub":"1234567890","name":"DevDot Lead","admin":true,"iat":1720000000,"role":"developer"}',
      direction: 'encode'
    },
    {
      name: 'Basic Auth Header',
      content: 'user_admin:secret_pass_2026!#',
      direction: 'encode'
    },
    {
      name: 'SVG Icon Data URI',
      content: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
      direction: 'encode'
    }
  ],
  url: [
    {
      name: 'Query Parameters',
      content: 'query=material design 3 & clean compact=100% & symbols=@#$&+/?=',
      direction: 'encode'
    },
    {
      name: 'Full Endpoint URI',
      content: 'https://api.devdot.tools/v1/search?q=json format & filters=air-gapped#top',
      direction: 'encode'
    },
    {
      name: 'Unicode URI',
      content: 'https://devdot.tools/wiki/Universal Code Toolkit 🚀 & 100% Offline',
      direction: 'encode'
    }
  ],
  hex: [
    {
      name: 'Plain Text',
      content: 'DevDot Universal Toolkit 2026',
      direction: 'encode'
    },
    {
      name: 'UTF-8 Multi-byte',
      content: 'Hello 🌍 世界 🚀 — Privacy First',
      direction: 'encode'
    },
    {
      name: 'Sample Hex Bytes',
      content: '44 65 76 44 6f 74 20 54 6f 6f 6c 6b 69 74',
      direction: 'decode'
    }
  ],
  'html-entities': [
    {
      name: 'HTML Elements',
      content: '<div class="badge" id="item-1">&copy; 2026 DevDot "Universal Toolkit" & \'High Performance\'</div>',
      direction: 'encode'
    },
    {
      name: 'Symbols & Math',
      content: '© ® ™ € £ ¥ § ¶ • … — ≠ ≤ ≥ ± × ÷',
      direction: 'encode'
    },
    {
      name: 'Accented European',
      content: 'Café Münsterberg España façade crème brûlée',
      direction: 'encode'
    }
  ]
}

const DEFAULT_SAMPLE = PRESETS.base64[0].content

// Initial State from Snapshot Store
const initialSaved = snapshotStore.getToolState('encoders-decoders', {
  activeMode: 'base64' as EncoderMode,
  direction: 'encode' as ConversionDirection,
  inputText: DEFAULT_SAMPLE,
  outputText: '',
  liveTransform: true,
  splitDirection: 'horizontal' as 'horizontal' | 'vertical',
  base64UrlSafe: false,
  base64Pad: true,
  base64DataUri: false,
  base64Mime: 'text/plain;charset=utf-8',
  base64Wrap: 'none' as 'none' | '64' | '76',
  urlMode: 'component' as const,
  urlSpaceAsPlus: false,
  hexDelimiter: 'space' as const,
  hexUppercase: false,
  htmlMode: 'named' as const,
  htmlNonAsciiOnly: false
})

// Main State
const rootRef = ref<HTMLDivElement | null>(null)
const triggerBtnRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLDivElement | null>(null)
const isPresetMenuOpen = ref(false)
const menuCoords = ref({ top: 0, left: 0 })

const activeMode = ref<EncoderMode>(initialSaved.activeMode)
const direction = ref<ConversionDirection>(initialSaved.direction)
const inputText = ref(initialSaved.inputText)
const outputText = ref(initialSaved.outputText)
const liveTransform = ref(initialSaved.liveTransform ?? true)
const splitDirection = ref<'horizontal' | 'vertical'>(initialSaved.splitDirection || 'horizontal')

// Mode Specific Options
const base64UrlSafe = ref(initialSaved.base64UrlSafe)
const base64Pad = ref(initialSaved.base64Pad)
const base64DataUri = ref(initialSaved.base64DataUri)
const base64Mime = ref(initialSaved.base64Mime)
const base64Wrap = ref<'none' | '64' | '76'>(initialSaved.base64Wrap || 'none')

const urlMode = ref<'component' | 'full-uri' | 'rfc3986'>(initialSaved.urlMode)
const urlSpaceAsPlus = ref(initialSaved.urlSpaceAsPlus)

const hexDelimiter = ref<'none' | 'space' | 'comma' | 'colon' | '0x'>(initialSaved.hexDelimiter)
const hexUppercase = ref(initialSaved.hexUppercase)

const htmlMode = ref<'named' | 'decimal' | 'hex'>(initialSaved.htmlMode)
const htmlNonAsciiOnly = ref(initialSaved.htmlNonAsciiOnly)

// UI Feedback States
const error = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)
const isInputCopied = ref(false)
const isOutputCopied = ref(false)
const isFullscreen = ref(false)
const mobileTab = ref<'both' | 'input' | 'output'>('both')
const showImagePreview = ref(true)

let isHydrating = false

// Sync to snapshot store
watch(
  [
    activeMode,
    direction,
    inputText,
    outputText,
    liveTransform,
    splitDirection,
    base64UrlSafe,
    base64Pad,
    base64DataUri,
    base64Mime,
    base64Wrap,
    urlMode,
    urlSpaceAsPlus,
    hexDelimiter,
    hexUppercase,
    htmlMode,
    htmlNonAsciiOnly
  ],
  () => {
    if (isHydrating) return
    snapshotStore.setToolState('encoders-decoders', {
      activeMode: activeMode.value,
      direction: direction.value,
      inputText: inputText.value,
      outputText: outputText.value,
      liveTransform: liveTransform.value,
      splitDirection: splitDirection.value,
      base64UrlSafe: base64UrlSafe.value,
      base64Pad: base64Pad.value,
      base64DataUri: base64DataUri.value,
      base64Mime: base64Mime.value,
      base64Wrap: base64Wrap.value,
      urlMode: urlMode.value,
      urlSpaceAsPlus: urlSpaceAsPlus.value,
      hexDelimiter: hexDelimiter.value,
      hexUppercase: hexUppercase.value,
      htmlMode: htmlMode.value,
      htmlNonAsciiOnly: htmlNonAsciiOnly.value
    })
  },
  { deep: true }
)

// Hydrate from snapshot store on external change
watch(
  () => snapshotStore.toolStates['encoders-decoders'],
  (newState) => {
    if (newState && !isHydrating) {
      isHydrating = true
      if (newState.activeMode !== undefined) activeMode.value = newState.activeMode
      if (newState.direction !== undefined) direction.value = newState.direction
      if (newState.inputText !== undefined) inputText.value = newState.inputText
      if (newState.outputText !== undefined) outputText.value = newState.outputText
      if (newState.liveTransform !== undefined) liveTransform.value = newState.liveTransform
      if (newState.splitDirection !== undefined) splitDirection.value = newState.splitDirection
      if (newState.base64UrlSafe !== undefined) base64UrlSafe.value = newState.base64UrlSafe
      if (newState.base64Pad !== undefined) base64Pad.value = newState.base64Pad
      if (newState.base64DataUri !== undefined) base64DataUri.value = newState.base64DataUri
      if (newState.base64Mime !== undefined) base64Mime.value = newState.base64Mime
      if (newState.base64Wrap !== undefined) base64Wrap.value = newState.base64Wrap
      if (newState.urlMode !== undefined) urlMode.value = newState.urlMode
      if (newState.urlSpaceAsPlus !== undefined) urlSpaceAsPlus.value = newState.urlSpaceAsPlus
      if (newState.hexDelimiter !== undefined) hexDelimiter.value = newState.hexDelimiter
      if (newState.hexUppercase !== undefined) hexUppercase.value = newState.hexUppercase
      if (newState.htmlMode !== undefined) htmlMode.value = newState.htmlMode
      if (newState.htmlNonAsciiOnly !== undefined) htmlNonAsciiOnly.value = newState.htmlNonAsciiOnly
      isHydrating = false
    }
  },
  { deep: true }
)

// Modes configuration (Short labels for compact UI)
const MODES: { id: EncoderMode; label: string; dotClass: string; desc: string }[] = [
  {
    id: 'base64',
    label: 'Base64',
    dotClass: 'b64-dot',
    desc: 'Base64 (UTF-8, URL-Safe & Data URI)'
  },
  {
    id: 'url',
    label: 'URL',
    dotClass: 'url-dot',
    desc: 'URL Component & URI Encoder'
  },
  {
    id: 'hex',
    label: 'Hex',
    dotClass: 'hex-dot',
    desc: 'Hexadecimal Byte Converter'
  },
  {
    id: 'html-entities',
    label: 'HTML',
    dotClass: 'html-dot',
    desc: 'HTML Named & Numeric Entities'
  }
]

const currentModeDetails = computed(() => {
  return MODES.find((m) => m.id === activeMode.value) || MODES[0]
})

// Current mode preset list
const currentPresets = computed(() => {
  return PRESETS[activeMode.value] || []
})

// Detect Data URI Image in Output or Input
const dataUriImageSrc = computed(() => {
  const text = outputText.value.trim() || inputText.value.trim()
  if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/i.test(text)) {
    return text
  }
  return null
})

// Byte and character calculations
const inputByteSize = computed(() => new Blob([inputText.value || '']).size)
const outputByteSize = computed(() => new Blob([outputText.value || '']).size)

const byteDeltaPercent = computed(() => {
  if (!inputByteSize.value || !outputByteSize.value) return null
  const diff = ((outputByteSize.value - inputByteSize.value) / inputByteSize.value) * 100
  return Math.round(diff)
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Build options based on active mode
function getActiveOptions(): Record<string, any> {
  if (activeMode.value === 'base64') {
    return {
      urlSafe: base64UrlSafe.value,
      pad: base64Pad.value,
      dataUriPrefix: base64DataUri.value,
      mimeType: base64Mime.value,
      wrap: base64Wrap.value
    } as Base64Options
  }
  if (activeMode.value === 'url') {
    return {
      mode: urlMode.value,
      spaceAsPlus: urlSpaceAsPlus.value
    } as UrlOptions
  }
  if (activeMode.value === 'hex') {
    return {
      delimiter: hexDelimiter.value,
      uppercase: hexUppercase.value
    } as HexOptions
  }
  if (activeMode.value === 'html-entities') {
    return {
      mode: htmlMode.value,
      encodeNonAsciiOnly: htmlNonAsciiOnly.value
    } as HtmlEntitiesOptions
  }
  return {}
}

// Execute transformation
async function handleTransform() {
  error.value = null
  if (!inputText.value) {
    outputText.value = ''
    executionTimeMs.value = 0
    return
  }

  try {
    const res = await execute('encoders', 'transform', {
      input: inputText.value,
      mode: activeMode.value,
      direction: direction.value,
      options: getActiveOptions()
    })

    if (res.success && res.result) {
      outputText.value = res.result.output
      executionTimeMs.value = res.executionTimeMs
    } else {
      error.value = res.error || 'Transformation failed'
      outputText.value = ''
    }
  } catch (err: any) {
    error.value = err.message || 'Transformation failed'
    outputText.value = ''
  }
}

// Swap input and output, toggle direction
function handleSwap() {
  if (outputText.value) {
    const temp = outputText.value
    inputText.value = temp
    direction.value = direction.value === 'encode' ? 'decode' : 'encode'
  }
}

function togglePresetMenu() {
  isPresetMenuOpen.value = !isPresetMenuOpen.value
  if (isPresetMenuOpen.value && triggerBtnRef.value) {
    const rect = triggerBtnRef.value.getBoundingClientRect()
    menuCoords.value = {
      top: rect.bottom + 4,
      left: rect.left
    }
  }
}

function handleSelectPreset(preset: { content: string; direction?: ConversionDirection }) {
  inputText.value = preset.content
  if (preset.direction) {
    direction.value = preset.direction
  }
  handleTransform()
  isPresetMenuOpen.value = false
}

function handlePointerDownOutside(event: PointerEvent) {
  const target = event.target as Node
  if (
    triggerBtnRef.value &&
    !triggerBtnRef.value.contains(target) &&
    menuRef.value &&
    !menuRef.value.contains(target)
  ) {
    isPresetMenuOpen.value = false
  }
}

function handleWindowScroll() {
  if (isPresetMenuOpen.value && triggerBtnRef.value) {
    const rect = triggerBtnRef.value.getBoundingClientRect()
    menuCoords.value = {
      top: rect.bottom + 4,
      left: rect.left
    }
  }
}

function handleClear() {
  inputText.value = ''
  outputText.value = ''
  error.value = null
  executionTimeMs.value = null
}

// Copy Handlers
async function handleCopyOutput() {
  if (!outputText.value) return
  try {
    const ok = await securityStore.copyToClipboard(outputText.value, { label: 'Encoded/Decoded Output' })
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
  if (!inputText.value) return
  try {
    const ok = await securityStore.copyToClipboard(inputText.value, { label: 'Input Text' })
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

// File Upload
async function handleUploadInput() {
  try {
    const files = await openNativeFileDialog({
      title: 'Open File for Encoding',
      multiple: false
    })
    if (files && files.length > 0) {
      inputText.value = files[0].content
      handleTransform()
    }
  } catch (err) {
    console.error('Failed to open file', err)
  }
}

// File Download
async function handleDownloadOutput() {
  if (!outputText.value) return
  const filename = `${direction.value}d-${activeMode.value}-${Date.now()}.txt`
  try {
    await saveNativeFileDialog(outputText.value, {
      title: 'Save Transformed Output',
      defaultPath: filename,
      filters: [{ name: 'Text File', extensions: ['txt'] }]
    })
  } catch {
    // Fallback Blob download
    const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Fullscreen Toggle
function toggleFullscreen() {
  if (!rootRef.value) return
  if (!document.fullscreenElement) {
    rootRef.value.requestFullscreen().then(() => {
      isFullscreen.value = true
    }).catch(() => {})
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false
    }).catch(() => {})
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isPresetMenuOpen.value) {
      isPresetMenuOpen.value = false
    } else if (isFullscreen.value && document.fullscreenElement) {
      document.exitFullscreen()
    }
  }
}

// Watchers for reactive auto-transformation with debounce
let debounceTimer: any = null
watch(
  [
    inputText,
    activeMode,
    direction,
    base64UrlSafe,
    base64Pad,
    base64DataUri,
    base64Mime,
    base64Wrap,
    urlMode,
    urlSpaceAsPlus,
    hexDelimiter,
    hexUppercase,
    htmlMode,
    htmlNonAsciiOnly
  ],
  () => {
    if (liveTransform.value) {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        handleTransform()
      }, 50)
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDownOutside)
  window.addEventListener('scroll', handleWindowScroll, { capture: true, passive: true })
  window.addEventListener('resize', handleWindowScroll, { passive: true })
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDownOutside)
  window.removeEventListener('scroll', handleWindowScroll, { capture: true })
  window.removeEventListener('resize', handleWindowScroll)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    ref="rootRef"
    class="encoder-decoder-view"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <!-- Ultra-Compact 1-Line Top Toolbar -->
    <div class="encoder-toolbar">
      <!-- Left Group: Mode Tabs, Direction, Inline Options, Presets -->
      <div class="toolbar-left">
        <!-- Mode Tabs -->
        <div class="segment-group" role="group" aria-label="Encoder Modes">
          <M3Tooltip
            v-for="mode in MODES"
            :key="mode.id"
            :text="mode.desc"
            placement="bottom"
          >
            <button
              type="button"
              class="mode-segment-btn"
              :class="{ active: activeMode === mode.id }"
              @click="activeMode = mode.id"
            >
              <span class="mode-dot" :class="mode.dotClass"></span>
              <span>{{ mode.label }}</span>
            </button>
          </M3Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Direction Segment Switch -->
        <div class="segment-group" role="group" aria-label="Conversion Direction">
          <M3Tooltip text="Encode raw text to format" placement="bottom">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: direction === 'encode' }"
              @click="direction = 'encode'"
            >
              Encode
            </button>
          </M3Tooltip>

          <M3Tooltip text="Decode back to text" placement="bottom">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: direction === 'decode' }"
              @click="direction = 'decode'"
            >
              Decode
            </button>
          </M3Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Mode Specific Contextual Options -->
        <div class="mode-options-wrap">
          <!-- Base64 Options -->
          <template v-if="activeMode === 'base64'">
            <M3Tooltip text="URL-safe characters (- and _)" placement="bottom">
              <label class="compact-check">
                <input v-model="base64UrlSafe" type="checkbox" />
                <span>URL-Safe</span>
              </label>
            </M3Tooltip>

            <M3Tooltip text="Standard '=' padding" placement="bottom">
              <label class="compact-check">
                <input v-model="base64Pad" type="checkbox" />
                <span>Padding</span>
              </label>
            </M3Tooltip>

            <M3Tooltip text="Format as Data URI (data:...;base64,...)" placement="bottom">
              <label class="compact-check">
                <input v-model="base64DataUri" type="checkbox" />
                <span>Data URI</span>
              </label>
            </M3Tooltip>

            <template v-if="direction === 'encode' && !base64DataUri">
              <M3Tooltip text="Split output into fixed line length" placement="bottom">
                <select v-model="base64Wrap" class="compact-select">
                  <option value="none">Wrap: None</option>
                  <option value="64">Wrap: 64 (PEM)</option>
                  <option value="76">Wrap: 76 (MIME)</option>
                </select>
              </M3Tooltip>
            </template>
          </template>

          <!-- URL Options -->
          <template v-else-if="activeMode === 'url'">
            <M3Tooltip text="Encoding Scope (Component vs Full URI vs Strict RFC 3986)" placement="bottom">
              <select v-model="urlMode" class="compact-select">
                <option value="component">Component</option>
                <option value="full-uri">Full URI</option>
                <option value="rfc3986">RFC 3986</option>
              </select>
            </M3Tooltip>

            <M3Tooltip text="Encode spaces as '+'" placement="bottom">
              <label class="compact-check">
                <input v-model="urlSpaceAsPlus" type="checkbox" />
                <span>Space '+'</span>
              </label>
            </M3Tooltip>
          </template>

          <!-- Hex Options -->
          <template v-else-if="activeMode === 'hex'">
            <M3Tooltip text="Byte separator delimiter" placement="bottom">
              <select v-model="hexDelimiter" class="compact-select">
                <option value="space">Space</option>
                <option value="none">None</option>
                <option value="0x">0x Prefix</option>
                <option value="comma">Comma</option>
                <option value="colon">Colon</option>
              </select>
            </M3Tooltip>

            <M3Tooltip text="Uppercase hex letters" placement="bottom">
              <label class="compact-check">
                <input v-model="hexUppercase" type="checkbox" />
                <span>Upper</span>
              </label>
            </M3Tooltip>
          </template>

          <!-- HTML Entities Options -->
          <template v-else-if="activeMode === 'html-entities'">
            <M3Tooltip text="Entity format: Named vs Decimal vs Hex" placement="bottom">
              <select v-model="htmlMode" class="compact-select">
                <option value="named">Named (&amp;copy;)</option>
                <option value="decimal">Decimal (&amp;#169;)</option>
                <option value="hex">Hex (&amp;#xA9;)</option>
              </select>
            </M3Tooltip>

            <M3Tooltip text="Only encode non-ASCII characters" placement="bottom">
              <label class="compact-check">
                <input v-model="htmlNonAsciiOnly" type="checkbox" />
                <span>Non-ASCII</span>
              </label>
            </M3Tooltip>
          </template>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Custom M3 Preset Dropdown Menu -->
        <div class="preset-dropdown-wrap">
          <M3Tooltip text="Load preset sample payload" placement="bottom">
            <button
              ref="triggerBtnRef"
              type="button"
              class="preset-trigger-btn"
              :class="{ active: isPresetMenuOpen }"
              @click="togglePresetMenu"
            >
              <Sparkles :size="12" class="preset-icon" />
              <span>Sample</span>
              <ChevronDown :size="11" class="dropdown-chevron" :class="{ open: isPresetMenuOpen }" />
            </button>
          </M3Tooltip>

          <!-- Teleported Floating M3 Menu (No container overflow/clipping) -->
          <Teleport to="body">
            <Transition name="fade-dropdown">
              <div
                v-if="isPresetMenuOpen"
                ref="menuRef"
                class="preset-dropdown-menu"
                :style="{
                  position: 'fixed',
                  top: `${menuCoords.top}px`,
                  left: `${menuCoords.left}px`,
                  zIndex: 99999
                }"
              >
                <button
                  v-for="(preset, idx) in currentPresets"
                  :key="idx"
                  type="button"
                  class="preset-menu-item"
                  @click="handleSelectPreset(preset)"
                >
                  <Sparkles :size="12" class="menu-item-icon" />
                  <span class="menu-item-text">{{ preset.name }}</span>
                </button>
              </div>
            </Transition>
          </Teleport>
        </div>

        <!-- Split Orientation Toggle -->
        <div class="segment-group" role="group" aria-label="Split Orientation">
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

      <!-- Right Group: Execution Benchmark & Action Buttons -->
      <div class="toolbar-right">
        <span v-if="executionTimeMs !== null" class="exec-badge">
          <Clock :size="11" />
          <span>{{ executionTimeMs }} ms</span>
        </span>

        <!-- Swap Input & Output -->
        <M3Tooltip text="Swap Input & Output (Ctrl+Shift+S)" placement="bottom">
          <button
            type="button"
            class="icon-action-btn"
            :disabled="!outputText"
            aria-label="Swap Input and Output"
            @click="handleSwap"
          >
            <ArrowLeftRight :size="13" />
          </button>
        </M3Tooltip>

        <!-- Clear -->
        <M3Tooltip text="Clear Editor" placement="bottom">
          <button
            type="button"
            class="icon-action-btn btn-danger-hover"
            aria-label="Clear Workspace"
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

    <!-- Error Banner -->
    <div v-if="error" class="error-banner">
      <AlertCircle :size="14" class="error-icon" />
      <div class="error-text-container">
        <strong>Transformation Error:</strong>
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Image Preview Bar (if base64 data URI image detected) -->
    <div v-if="dataUriImageSrc && showImagePreview" class="image-preview-banner">
      <div class="preview-header">
        <div class="preview-title">
          <ImageIcon :size="14" />
          <span>Image Data URI Preview</span>
        </div>
        <button
          type="button"
          class="preview-close-btn"
          title="Hide Preview"
          @click="showImagePreview = false"
        >
          <EyeOff :size="13" />
          <span>Hide</span>
        </button>
      </div>
      <div class="preview-thumbnail-wrap">
        <img :src="dataUriImageSrc" alt="Base64 Preview" class="preview-thumbnail" />
      </div>
    </div>

    <!-- Main Workspace with SplitPane -->
    <div class="editor-workspace">
      <SplitPane
        :direction="splitDirection"
        :initial-split="50"
        class="encoder-split-pane"
        :class="`mobile-${mobileTab}`"
      >
        <!-- Mobile Pane Labels -->
        <template #pane-1-tab-label>
          Input ({{ direction === 'encode' ? 'Raw' : 'Encoded' }})
        </template>
        <template #pane-2-tab-label>
          Result ({{ direction === 'encode' ? 'Encoded' : 'Decoded' }})
        </template>

        <!-- INPUT PANE (Left / Top) -->
        <template #pane-1>
          <div
            class="pane-wrapper"
            :class="{ hidden: mobileTab === 'output' }"
          >
            <!-- Input Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <span class="pane-title">
                  {{ currentModeDetails.label }} Input
                  <span class="pane-subtitle">({{ direction === 'encode' ? 'Raw Text' : 'Encoded' }})</span>
                </span>
                <span class="size-tag">{{ formatBytes(inputByteSize) }}</span>
                <span class="count-tag">{{ inputText.length }} chars</span>
              </div>

              <div class="pane-header-right">
                <!-- Open File -->
                <M3Tooltip text="Open Text File" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    aria-label="Open File"
                    @click="handleUploadInput"
                  >
                    <Upload :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Copy Input -->
                <M3Tooltip :text="isInputCopied ? 'Copied!' : 'Copy Input'" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :class="{ active: isInputCopied }"
                    :disabled="!inputText"
                    aria-label="Copy Input"
                    @click="handleCopyInput"
                  >
                    <component :is="isInputCopied ? Check : Copy" :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Clear Input -->
                <M3Tooltip text="Clear Input" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn btn-danger-hover"
                    :disabled="!inputText"
                    aria-label="Clear Input"
                    @click="inputText = ''; handleTransform()"
                  >
                    <RotateCcw :size="13" />
                  </button>
                </M3Tooltip>
              </div>
            </div>

            <!-- Code Editor Host -->
            <div class="editor-host-wrapper">
              <CodeEditor
                v-model="inputText"
                language="text"
                :placeholder="direction === 'encode' ? 'Enter or paste raw text here to encode...' : 'Paste encoded string here to decode...'"
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
          >
            <!-- Output Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <span class="pane-title">
                  {{ currentModeDetails.label }} Result
                  <span class="pane-subtitle">({{ direction === 'encode' ? 'Encoded' : 'Decoded' }})</span>
                </span>
                <span class="size-tag">{{ formatBytes(outputByteSize) }}</span>
                <span class="count-tag">{{ outputText.length }} chars</span>

                <!-- Byte delta percentage badge -->
                <span
                  v-if="byteDeltaPercent !== null && byteDeltaPercent !== 0"
                  class="delta-badge"
                  :class="byteDeltaPercent > 0 ? 'delta-expansion' : 'delta-savings'"
                >
                  <component :is="byteDeltaPercent > 0 ? TrendingUp : TrendingDown" :size="11" />
                  <span>{{ byteDeltaPercent > 0 ? `+${byteDeltaPercent}%` : `${byteDeltaPercent}%` }}</span>
                </span>
              </div>

              <div class="pane-header-right">
                <!-- Toggle Image Preview if Data URI -->
                <M3Tooltip
                  v-if="dataUriImageSrc"
                  :text="showImagePreview ? 'Hide Image Preview' : 'Show Image Preview'"
                  placement="top"
                >
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :class="{ active: showImagePreview }"
                    aria-label="Toggle Image Preview"
                    @click="showImagePreview = !showImagePreview"
                  >
                    <ImageIcon :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Copy Output -->
                <M3Tooltip :text="isOutputCopied ? 'Copied to Clipboard!' : 'Copy Result'" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn copy-primary-btn"
                    :class="{ active: isOutputCopied }"
                    :disabled="!outputText"
                    aria-label="Copy Output"
                    @click="handleCopyOutput"
                  >
                    <component :is="isOutputCopied ? Check : Copy" :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Download Output -->
                <M3Tooltip text="Download Result File" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :disabled="!outputText"
                    aria-label="Download Result"
                    @click="handleDownloadOutput"
                  >
                    <Download :size="13" />
                  </button>
                </M3Tooltip>
              </div>
            </div>

            <!-- Code Editor Host -->
            <div class="editor-host-wrapper">
              <CodeEditor
                v-model="outputText"
                language="text"
                :placeholder="direction === 'encode' ? 'Encoded result will appear here automatically...' : 'Decoded text will appear here automatically...'"
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

    <!-- Status & Information Bar Footer -->
    <div class="stats-footer">
      <div class="stat-pill">
        <span class="stat-label">Mode:</span>
        <span class="stat-val uppercase">{{ activeMode }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Direction:</span>
        <span class="stat-val uppercase">{{ direction }}</span>
      </div>

      <div v-if="outputText && !error" class="stat-pill">
        <span class="stat-label">Length:</span>
        <span class="stat-val">{{ outputText.length }} chars</span>
      </div>

      <div class="stat-pill privacy-tag">
        <ShieldCheck :size="13" />
        <span>100% Client-Side Air-Gapped</span>
      </div>

      <div v-if="outputText && !error" class="stat-pill success-tag">
        <CheckCircle2 :size="13" />
        <span>Transformed Cleanly</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.encoder-decoder-view {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}

.encoder-decoder-view.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: var(--md-sys-color-background, #121316);
  padding: 0.75rem;
}

/* ==========================================================================
   Compact 1-Line Top Toolbar (M3 Standard)
   ========================================================================== */
.encoder-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 8px);
  padding: 0.2rem 0.45rem;
  min-height: 36px;
  height: 36px;
  flex-shrink: 0;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: visible;
}

.encoder-toolbar::-webkit-scrollbar {
  display: none;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: var(--md-sys-color-outline-variant);
  margin: 0 0.1rem;
  flex-shrink: 0;
}

/* Mode Tabs */
.mode-segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-full, 16px);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
  user-select: none;
}

.mode-segment-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.mode-segment-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.mode-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.b64-dot  { background-color: #3b82f6; }
.url-dot  { background-color: #10b981; }
.hex-dot  { background-color: #8b5cf6; }
.html-dot { background-color: #f59e0b; }

/* Segmented Toggle Groups */
.segment-group {
  display: inline-flex;
  align-items: center;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-full, 16px);
  padding: 1px;
  gap: 1px;
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.15rem 0.45rem;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-full, 16px);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.segment-btn:hover:not(.active) {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.segment-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.icon-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.12s ease;
}

.icon-toggle-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.icon-toggle-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

/* Mode Options */
.mode-options-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.compact-check {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.compact-check input[type="checkbox"] {
  accent-color: var(--md-sys-color-primary);
  cursor: pointer;
  width: 12px;
  height: 12px;
  margin: 0;
}

.compact-select {
  height: 22px;
  padding: 0 0.3rem;
  font-size: 0.6875rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 4px);
  color: var(--md-sys-color-on-surface);
  outline: none;
  cursor: pointer;
}

.compact-select:focus {
  border-color: var(--md-sys-color-primary);
}

/* Custom M3 Preset Dropdown */
.preset-dropdown-wrap {
  position: relative;
  display: inline-flex;
}

.preset-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  height: 22px;
  padding: 0 0.45rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-small, 4px);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.preset-trigger-btn:hover,
.preset-trigger-btn.active {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.preset-trigger-btn .preset-icon {
  color: var(--md-sys-color-primary);
}

.dropdown-chevron {
  color: var(--md-sys-color-on-surface-variant);
  transition: transform 0.15s ease;
}

.dropdown-chevron.open {
  transform: rotate(180deg);
}

.preset-dropdown-menu {
  min-width: 160px;
  background-color: var(--md-sys-color-surface-container, #1e1f22);
  border: 1px solid var(--md-sys-color-outline-variant, #333);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-menu-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: all 0.1s ease;
  white-space: nowrap;
}

.preset-menu-item:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
}

.menu-item-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.fade-dropdown-enter-active,
.fade-dropdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.fade-dropdown-enter-from,
.fade-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Action Buttons */
.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.12s ease;
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
  gap: 2px;
  font-size: 0.625rem;
  font-weight: 600;
  font-family: var(--md-sys-typescale-code-font, monospace);
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-high);
  padding: 1px 5px;
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

/* ==========================================================================
   Error & Image Preview Banners
   ========================================================================== */
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  font-size: 0.75rem;
  color: var(--md-sys-color-error, #f87171);
}

.error-icon {
  flex-shrink: 0;
}

.error-text-container {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-preview-banner {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 8px);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--md-sys-color-primary);
}

.preview-close-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.preview-close-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.preview-thumbnail-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 160px;
  padding: 0.5rem;
  background: var(--md-sys-color-surface);
  border: 1px dashed var(--md-sys-color-outline-variant);
  border-radius: 6px;
  overflow: hidden;
}

.preview-thumbnail {
  max-height: 140px;
  max-width: 100%;
  object-fit: contain;
  border-radius: 4px;
}

/* ==========================================================================
   Split Editor Workspace & Pane Headers
   ========================================================================== */
.editor-workspace {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.encoder-split-pane {
  width: 100%;
  height: 100%;
}

.pane-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  overflow: hidden;
}

.pane-wrapper.hidden {
  display: none;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.45rem;
  background-color: var(--md-sys-color-surface-container-low);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  min-height: 28px;
  height: 28px;
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

.pane-subtitle {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.8;
}

.size-tag,
.count-tag {
  font-size: 0.625rem;
  font-weight: 500;
  font-family: var(--md-sys-typescale-code-font, monospace);
  padding: 1px 4px;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 3px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.delta-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.625rem;
  font-weight: 700;
  font-family: var(--md-sys-typescale-code-font, monospace);
  padding: 1px 5px;
  border-radius: 3px;
}

.delta-expansion {
  background-color: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.delta-savings {
  background-color: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.pane-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.pane-icon-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.pane-icon-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.pane-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.copy-primary-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.editor-host-wrapper {
  flex: 1;
  min-height: 0;
  width: 100%;
}

/* ==========================================================================
   Stats Footer
   ========================================================================== */
.stats-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 6px);
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

.privacy-tag {
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.85;
}

.success-tag {
  color: var(--md-sys-color-primary, #6dd58c);
  font-weight: 500;
  margin-left: auto;
}

/* Responsive Rules */
@media (max-width: 768px) {
  .mobile-column-tabs {
    display: inline-flex;
  }

  .mode-options-wrap {
    display: none;
  }
}
</style>
