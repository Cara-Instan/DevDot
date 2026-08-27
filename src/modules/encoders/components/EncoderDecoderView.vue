<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Binary,
  Globe,
  Hash,
  Code,
  ArrowLeftRight,
  Upload,
  Download,
  Sparkles
} from 'lucide-vue-next'
import {
  M3Button,
  M3Card,
  M3Switch,
  M3TextField,
  SplitEditor
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore } from '@/stores'
import { fileToBase64 } from '../services/base64-service'
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

const initialSaved = snapshotStore.getToolState('encoders-decoders', {
  activeMode: 'base64' as EncoderMode,
  direction: 'encode' as ConversionDirection,
  inputText: 'Hello DevDot! 100% Privacy-First Universal Developer Toolkit 🚀',
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

// File Upload State for Base64
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadedFileName = ref<string | null>(null)
const uploadedFileSize = ref<number | null>(null)
const isDragging = ref(false)

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
    if (newState) {
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
    }
  },
  { deep: true }
)

// Modes configuration
const MODES: { id: EncoderMode; label: string; icon: any; description: string }[] = [
  {
    id: 'base64',
    label: 'Base64',
    icon: Binary,
    description: 'UTF-8 Unicode Safe, URL-Safe Base64, and File Data URI encoder/decoder'
  },
  {
    id: 'url',
    label: 'URL',
    icon: Globe,
    description: 'URL Component, Full URI, and RFC 3986 compliant encoder/decoder'
  },
  {
    id: 'hex',
    label: 'Hexadecimal',
    icon: Hash,
    description: 'UTF-8 text to Hex byte representations with custom delimiters'
  },
  {
    id: 'html-entities',
    label: 'HTML Entities',
    icon: Code,
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

// File drop & upload handling for Base64
async function processFile(file: File) {
  try {
    uploadedFileName.value = file.name
    uploadedFileSize.value = file.size
    base64Mime.value = file.type || 'application/octet-stream'

    const res = await fileToBase64(file)
    if (base64DataUri.value) {
      inputText.value = res.dataUri
    } else {
      inputText.value = res.base64
    }
    // Set to decode if user uploaded base64 data, or encode if viewing file
    if (direction.value === 'decode') {
      await handleTransform()
    }
  } catch (err: any) {
    error.value = `Failed to process file: ${err.message}`
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processFile(target.files[0])
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    processFile(e.dataTransfer.files[0])
  }
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
    <!-- Mode Selection Header Bar -->
    <div class="mode-selector-bar">
      <div class="mode-tabs">
        <button
          v-for="mode in MODES"
          :key="mode.id"
          type="button"
          class="mode-tab-btn"
          :class="{ active: activeMode === mode.id }"
          @click="activeMode = mode.id"
        >
          <component :is="mode.icon" :size="16" class="tab-icon" />
          <span>{{ mode.label }}</span>
        </button>
      </div>

      <div class="direction-control">
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

        <M3Button
          variant="tonal"
          class="swap-btn"
          title="Swap Output to Input and invert direction"
          :disabled="!outputText"
          @click="handleSwap"
        >
          <template #icon>
            <ArrowLeftRight :size="14" />
          </template>
          Swap
        </M3Button>
      </div>
    </div>

    <!-- Mode Options Configuration Card -->
    <M3Card variant="filled" padding="medium" class="options-card">
      <div class="options-header">
        <div class="desc-row">
          <Sparkles :size="16" class="sparkle-icon" />
          <span class="mode-desc-text">{{ currentModeDetails.description }}</span>
        </div>

        <div class="live-toggle">
          <M3Switch v-model="liveTransform" label="Live Conversion" />
        </div>
      </div>

      <div class="options-grid">
        <!-- BASE64 OPTIONS -->
        <template v-if="activeMode === 'base64'">
          <div class="option-item">
            <M3Switch
              v-model="base64UrlSafe"
              label="URL-Safe Base64 (+ to -, / to _)"
            />
          </div>
          <div class="option-item">
            <M3Switch
              v-model="base64Pad"
              label="Keep Padding (=)"
            />
          </div>
          <div class="option-item">
            <M3Switch
              v-model="base64DataUri"
              label="Data URI Format (data:...;base64,...)"
            />
          </div>
          <div v-if="base64DataUri" class="option-item full-width">
            <M3TextField
              v-model="base64Mime"
              label="MIME Type"
              supporting-text="e.g. text/plain, image/png, application/json"
            />
          </div>

          <!-- File Dropzone for Base64 -->
          <div class="file-dropzone-row full-width">
            <input
              ref="fileInputRef"
              type="file"
              class="hidden-file-input"
              @change="handleFileSelect"
            />
            <div
              class="dropzone-box"
              :class="{ 'is-dragging': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <Upload :size="20" class="upload-icon" />
              <div class="dropzone-text">
                <span class="drop-title">
                  {{ uploadedFileName ? `File Loaded: ${uploadedFileName} (${uploadedFileSize} bytes)` : 'Click or Drag & Drop file to convert to Base64 / Data URI' }}
                </span>
                <span class="drop-subtitle">
                  100% processed in local browser memory (zero network upload)
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- URL OPTIONS -->
        <template v-if="activeMode === 'url'">
          <div class="option-item">
            <label class="custom-select-label">Encoding Standard</label>
            <select v-model="urlMode" class="custom-select">
              <option value="component">Component (encodeURIComponent)</option>
              <option value="full-uri">Full URI (encodeURI)</option>
              <option value="rfc3986">RFC 3986 (Strict)</option>
            </select>
          </div>
          <div class="option-item">
            <M3Switch
              v-model="urlSpaceAsPlus"
              label="Encode spaces as '+' (Form style)"
            />
          </div>
        </template>

        <!-- HEX OPTIONS -->
        <template v-if="activeMode === 'hex'">
          <div class="option-item">
            <label class="custom-select-label">Byte Delimiter</label>
            <select v-model="hexDelimiter" class="custom-select">
              <option value="space">Space (FF 00 AB)</option>
              <option value="none">None (FF00AB)</option>
              <option value="0x">0x Prefix (0xFF 0x00 0xAB)</option>
              <option value="comma">Comma (FF, 00, AB)</option>
              <option value="colon">Colon (FF:00:AB)</option>
            </select>
          </div>
          <div class="option-item">
            <M3Switch
              v-model="hexUppercase"
              label="Uppercase Hex Characters (A-F)"
            />
          </div>
        </template>

        <!-- HTML ENTITIES OPTIONS -->
        <template v-if="activeMode === 'html-entities'">
          <div class="option-item">
            <label class="custom-select-label">Entity Format</label>
            <select v-model="htmlMode" class="custom-select">
              <option value="named">Named Entities (&amp;lt;, &amp;copy;)</option>
              <option value="decimal">Decimal Numeric (&amp;#60;, &amp;#169;)</option>
              <option value="hex">Hexadecimal Numeric (&amp;#x3C;, &amp;#xA9;)</option>
            </select>
          </div>
          <div class="option-item">
            <M3Switch
              v-model="htmlNonAsciiOnly"
              label="Encode Non-ASCII / Special Only"
            />
          </div>
        </template>
      </div>
    </M3Card>

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
        :execute-button-label="`${direction === 'encode' ? 'Encode' : 'Decode'} ${currentModeDetails.label}`"
        height="calc(100vh - 360px)"
        @execute="handleTransform"
      >
        <template #extra-actions>
          <M3Button
            v-if="outputText"
            variant="tonal"
            title="Download Result as Text File"
            @click="handleDownloadDecoded"
          >
            <template #icon>
              <Download :size="14" />
            </template>
            Save File
          </M3Button>
        </template>
      </SplitEditor>
    </div>
  </div>
</template>

<style scoped>
.encoder-decoder-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.mode-selector-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 0.5rem 0.75rem;
  flex-wrap: wrap;
}

.mode-tabs {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.mode-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid transparent;
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.mode-tab-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.tab-icon {
  flex-shrink: 0;
}

.direction-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.direction-toggle {
  display: flex;
  background-color: var(--md-sys-color-surface-container-highest);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.2rem;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.dir-btn {
  padding: 0.35rem 0.75rem;
  border-radius: calc(var(--md-sys-shape-corner-small) - 2px);
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.dir-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.swap-btn {
  font-size: 0.75rem;
}

.options-card {
  border-radius: var(--md-sys-shape-corner-medium);
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.desc-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sparkle-icon {
  color: var(--md-sys-color-primary);
}

.mode-desc-text {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  align-items: center;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.option-item.full-width {
  grid-column: 1 / -1;
}

.custom-select-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.custom-select {
  padding: 0.5rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  font-size: 0.8125rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
}

.custom-select:focus {
  border-color: var(--md-sys-color-primary);
}

.hidden-file-input {
  display: none;
}

.file-dropzone-row {
  margin-top: 0.25rem;
}

.dropzone-box {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  border: 1.5px dashed var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropzone-box:hover,
.dropzone-box.is-dragging {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-high);
}

.upload-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.dropzone-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.drop-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.drop-subtitle {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.editor-workspace {
  width: 100%;
}
</style>
