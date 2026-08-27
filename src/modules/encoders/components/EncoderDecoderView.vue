<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Binary,
  Globe,
  Hash,
  Code,
  ArrowLeftRight,
  Download,
  RotateCcw,
  CheckCircle2
} from 'lucide-vue-next'
import {
  SplitEditor
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore } from '@/stores'
import type {
  EncoderMode,
  ConversionDirection,
  Base64Options,
  UrlOptions,
  HexOptions,
  HtmlEntitiesOptions
} from '../types'

const { isExecuting, execute } = useExecutionEngine()
const snapshotStore = useSnapshotStore()

const DEFAULT_SAMPLE = 'Hello DevDot! 100% Privacy-First Universal Developer Toolkit 🚀'

const initialSaved = snapshotStore.getToolState('encoders-decoders', {
  activeMode: 'base64' as EncoderMode,
  direction: 'encode' as ConversionDirection,
  inputText: DEFAULT_SAMPLE,
  outputText: '',
  liveTransform: true,
  base64UrlSafe: false,
  base64Pad: true,
  base64DataUri: false,
  base64Mime: 'text/plain;charset=utf-8',
  urlMode: 'component' as const,
  urlSpaceAsPlus: false,
  hexDelimiter: 'space' as const,
  hexUppercase: false,
  htmlMode: 'named' as const,
  htmlNonAsciiOnly: false
})

// Mode and Direction State
const activeMode = ref<EncoderMode>(initialSaved.activeMode)
const direction = ref<ConversionDirection>(initialSaved.direction)

// Content
const inputText = ref(initialSaved.inputText)
const outputText = ref(initialSaved.outputText)
const error = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)
const liveTransform = ref(initialSaved.liveTransform)

// Options per mode
const base64UrlSafe = ref(initialSaved.base64UrlSafe)
const base64Pad = ref(initialSaved.base64Pad)
const base64DataUri = ref(initialSaved.base64DataUri)
const base64Mime = ref(initialSaved.base64Mime)

const urlMode = ref<'component' | 'full-uri' | 'rfc3986'>(initialSaved.urlMode)
const urlSpaceAsPlus = ref(initialSaved.urlSpaceAsPlus)

const hexDelimiter = ref<'none' | 'space' | 'comma' | 'colon' | '0x'>(initialSaved.hexDelimiter)
const hexUppercase = ref(initialSaved.hexUppercase)

const htmlMode = ref<'named' | 'decimal' | 'hex'>(initialSaved.htmlMode)
const htmlNonAsciiOnly = ref(initialSaved.htmlNonAsciiOnly)

let isHydrating = false

// Sync to snapshot store
watch(
  [
    activeMode,
    direction,
    inputText,
    outputText,
    liveTransform,
    base64UrlSafe,
    base64Pad,
    base64DataUri,
    base64Mime,
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
      base64UrlSafe: base64UrlSafe.value,
      base64Pad: base64Pad.value,
      base64DataUri: base64DataUri.value,
      base64Mime: base64Mime.value,
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
      if (newState.base64UrlSafe !== undefined) base64UrlSafe.value = newState.base64UrlSafe
      if (newState.base64Pad !== undefined) base64Pad.value = newState.base64Pad
      if (newState.base64DataUri !== undefined) base64DataUri.value = newState.base64DataUri
      if (newState.base64Mime !== undefined) base64Mime.value = newState.base64Mime
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

// Modes configuration
const MODES: { id: EncoderMode; label: string; icon: any; dotClass: string; description: string }[] = [
  {
    id: 'base64',
    label: 'Base64',
    icon: Binary,
    dotClass: 'b64-dot',
    description: 'UTF-8 Unicode Safe, URL-Safe Base64, and File Data URI encoder/decoder'
  },
  {
    id: 'url',
    label: 'URL',
    icon: Globe,
    dotClass: 'url-dot',
    description: 'URL Component, Full URI, and RFC 3986 compliant encoder/decoder'
  },
  {
    id: 'hex',
    label: 'Hexadecimal',
    icon: Hash,
    dotClass: 'hex-dot',
    description: 'UTF-8 text to Hex byte representations with custom delimiters'
  },
  {
    id: 'html-entities',
    label: 'HTML Entities',
    icon: Code,
    dotClass: 'html-dot',
    description: 'Named entities (&amp;, &lt;), decimal (&#60;), and hex (&#x3C;) encoder/decoder'
  }
]

// Current active mode details
const currentModeDetails = computed(() => {
  return MODES.find((m) => m.id === activeMode.value) || MODES[0]
})

// Build options based on active mode
function getActiveOptions(): Record<string, any> {
  if (activeMode.value === 'base64') {
    return {
      urlSafe: base64UrlSafe.value,
      pad: base64Pad.value,
      dataUriPrefix: base64DataUri.value,
      mimeType: base64Mime.value
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
    inputText.value = outputText.value
    direction.value = direction.value === 'encode' ? 'decode' : 'encode'
  }
}

function handleLoadSample() {
  inputText.value = DEFAULT_SAMPLE
  direction.value = 'encode'
  handleTransform()
}

function handleClear() {
  inputText.value = ''
  outputText.value = ''
  error.value = null
  executionTimeMs.value = null
}

// Download Decoded Output as File
function handleDownloadDecoded() {
  if (!outputText.value) return

  const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `decoded-${activeMode.value}-${Date.now()}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Watchers for reactive auto-transformation
watch(
  [
    inputText,
    activeMode,
    direction,
    base64UrlSafe,
    base64Pad,
    base64DataUri,
    base64Mime,
    urlMode,
    urlSpaceAsPlus,
    hexDelimiter,
    hexUppercase,
    htmlMode,
    htmlNonAsciiOnly
  ],
  () => {
    if (liveTransform.value) {
      handleTransform()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="encoder-decoder-view">
    <!-- Compact 1-Line Mode Selection Header Bar -->
    <div class="mode-selector-bar">
      <div class="toolbar-left">
        <div class="mode-tabs">
          <button
            v-for="mode in MODES"
            :key="mode.id"
            type="button"
            class="mode-tab-btn"
            :class="{ active: activeMode === mode.id }"
            @click="activeMode = mode.id"
          >
            <span class="lang-dot" :class="mode.dotClass"></span>
            <span>{{ mode.label }}</span>
          </button>
        </div>

        <div class="direction-toggle">
          <button
            type="button"
            class="dir-btn"
            :class="{ active: direction === 'encode' }"
            @click="direction = 'encode'"
          >
            Encode
          </button>
          <button
            type="button"
            class="dir-btn"
            :class="{ active: direction === 'decode' }"
            @click="direction = 'decode'"
          >
            Decode
          </button>
        </div>

        <!-- Mode Options Inline -->
        <div class="inline-options">
          <template v-if="activeMode === 'base64'">
            <label class="compact-check"><input v-model="base64UrlSafe" type="checkbox" /> URL-Safe</label>
            <label class="compact-check"><input v-model="base64Pad" type="checkbox" /> Padding</label>
            <label class="compact-check"><input v-model="base64DataUri" type="checkbox" /> Data URI</label>
          </template>
          <template v-else-if="activeMode === 'url'">
            <select v-model="urlMode" class="compact-select">
              <option value="component">Component</option>
              <option value="full-uri">Full URI</option>
              <option value="rfc3986">RFC 3986</option>
            </select>
            <label class="compact-check"><input v-model="urlSpaceAsPlus" type="checkbox" /> Space as '+'</label>
          </template>
          <template v-else-if="activeMode === 'hex'">
            <select v-model="hexDelimiter" class="compact-select">
              <option value="space">Space (FF 00)</option>
              <option value="none">None (FF00)</option>
              <option value="0x">0x Prefix</option>
              <option value="comma">Comma</option>
              <option value="colon">Colon</option>
            </select>
            <label class="compact-check"><input v-model="hexUppercase" type="checkbox" /> Uppercase</label>
          </template>
          <template v-else-if="activeMode === 'html-entities'">
            <select v-model="htmlMode" class="compact-select">
              <option value="named">Named (&amp;lt;)</option>
              <option value="decimal">Decimal (&#60;)</option>
              <option value="hex">Hex (&#x3C;)</option>
            </select>
          </template>
        </div>
      </div>

      <div class="toolbar-right">
        <span v-if="executionTimeMs !== null" class="exec-badge">
          {{ executionTimeMs }} ms
        </span>

        <button
          type="button"
          class="compact-action-btn tonal-btn"
          title="Swap Output to Input and invert direction"
          :disabled="!outputText"
          @click="handleSwap"
        >
          <ArrowLeftRight :size="13" />
          <span>Swap</span>
        </button>

        <button
          v-if="outputText"
          type="button"
          class="compact-action-btn text-btn"
          title="Download Result as Text File"
          @click="handleDownloadDecoded"
        >
          <Download :size="13" />
          <span>Save</span>
        </button>

        <button
          type="button"
          class="compact-action-btn text-btn"
          title="Load default sample"
          @click="handleLoadSample"
        >
          Sample
        </button>

        <button
          type="button"
          class="compact-action-btn text-btn"
          title="Clear"
          @click="handleClear"
        >
          <RotateCcw :size="13" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- Main Split-Pane Editor Workspace -->
    <div class="editor-workspace">
      <SplitEditor
        v-model:input="inputText"
        v-model:output="outputText"
        input-language="text"
        output-language="text"
        :input-title="`${currentModeDetails.label} Input (${direction === 'encode' ? 'Raw Text' : 'Encoded'})`"
        :output-title="`${currentModeDetails.label} Result (${direction === 'encode' ? 'Encoded' : 'Decoded'})`"
        :is-executing="isExecuting"
        :error="error"
        :execution-time-ms="executionTimeMs"
        :show-execute-button="!liveTransform"
        :execute-button-label="`${direction === 'encode' ? 'Encode' : 'Decode'}`"
        height="100%"
        @execute="handleTransform"
      />
    </div>

    <!-- Stats & Information Bar -->
    <div v-if="outputText && !error" class="stats-footer">
      <div class="stat-pill">
        <span class="stat-label">Mode:</span>
        <span class="stat-val uppercase">{{ activeMode }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Direction:</span>
        <span class="stat-val uppercase">{{ direction }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Output Length:</span>
        <span class="stat-val">{{ outputText.length }} chars</span>
      </div>

      <div class="stat-pill success-tag">
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
}

.mode-selector-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.25rem 0.625rem;
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

.mode-tabs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.mode-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--md-sys-shape-corner-full);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.mode-tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.mode-tab-btn.active {
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

.b64-dot  { background-color: #3b82f6; }
.url-dot  { background-color: #10b981; }
.hex-dot  { background-color: #8b5cf6; }
.html-dot { background-color: #f59e0b; }

.direction-toggle {
  display: inline-flex;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-full);
  padding: 2px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.dir-btn {
  padding: 0.18rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-full);
  border: none;
  background: transparent;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.dir-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.inline-options {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-left: 0.35rem;
  border-left: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.compact-check {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  white-space: nowrap;
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

.tonal-btn {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.tonal-btn:hover:not(:disabled) {
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

.editor-workspace {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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
