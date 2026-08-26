<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  lineNumbers,
  highlightActiveLineGutter
} from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap
} from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import {
  Copy,
  Check,
  Trash2,
  Upload,
  Download,
  WrapText,
  FileCode,
  Lock,
  Sparkles
} from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'
import { getEditorTheme } from './theme'
import { getLanguageExtension, SupportedLanguage } from './languages'

interface Props {
  modelValue?: string
  language?: SupportedLanguage | string
  readonly?: boolean
  lineNumbers?: boolean
  wordWrap?: boolean
  placeholder?: string
  title?: string
  badge?: string
  height?: string
  minHeight?: string
  maxHeight?: string
  showToolbar?: boolean
  showStatusBar?: boolean
  showClear?: boolean
  showCopy?: boolean
  showUpload?: boolean
  showDownload?: boolean
  showWrapToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'json',
  readonly: false,
  lineNumbers: true,
  wordWrap: false,
  placeholder: '',
  height: '100%',
  minHeight: '200px',
  maxHeight: 'none',
  showToolbar: true,
  showStatusBar: true,
  showClear: true,
  showCopy: true,
  showUpload: true,
  showDownload: true,
  showWrapToggle: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'clear'): void
  (e: 'copy', text: string): void
  (e: 'upload', file: File, content: string): void
  (e: 'download'): void
}>()

const editorHost = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDraggingOver = ref(false)
const isCopied = ref(false)
const localWordWrap = ref(props.wordWrap)

// Status metadata
const cursorLine = ref(1)
const cursorCol = ref(1)
const selectionLength = ref(0)

const { isDark } = useTheme()

// Compartments for dynamic configuration
const themeCompartment = new Compartment()
const languageCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const wrapCompartment = new Compartment()

let editorView: EditorView | null = null
let isUpdatingFromProp = false

// Formatted file size / character counts
const charCount = computed(() => props.modelValue ? props.modelValue.length : 0)
const lineCount = computed(() => {
  if (!props.modelValue) return 0
  return props.modelValue.split('\n').length
})

const formattedSize = computed(() => {
  const bytes = new Blob([props.modelValue || '']).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
})

// Initialize CodeMirror 6 Editor
function initEditor() {
  if (!editorHost.value) return

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      props.lineNumbers ? lineNumbers() : [],
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap
      ]),
      // Dynamic compartments
      themeCompartment.of(getEditorTheme(isDark.value)),
      languageCompartment.of(getLanguageExtension(props.language)),
      readOnlyCompartment.of([
        EditorState.readOnly.of(props.readonly),
        EditorView.editable.of(!props.readonly)
      ]),
      wrapCompartment.of(localWordWrap.value ? EditorView.lineWrapping : []),
      // Listen to state changes
      EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          const mainSelection = update.state.selection.main
          const line = update.state.doc.lineAt(mainSelection.head)
          cursorLine.value = line.number
          cursorCol.value = mainSelection.head - line.from + 1
          selectionLength.value = Math.abs(mainSelection.to - mainSelection.from)
        }

        if (update.docChanged && !isUpdatingFromProp) {
          const docString = update.state.doc.toString()
          emit('update:modelValue', docString)
          emit('change', docString)
        }
      }),
      // Custom placeholder if provided
      props.placeholder
        ? EditorView.theme({
            '.cm-placeholder': {
              color: 'var(--md-sys-color-outline)',
              fontStyle: 'italic'
            }
          })
        : []
    ]
  })

  editorView = new EditorView({
    state,
    parent: editorHost.value
  })
}

// Watch props for reactive re-configuration
watch(
  () => props.modelValue,
  (newVal) => {
    if (!editorView) return
    const currentDoc = editorView.state.doc.toString()
    if (newVal !== currentDoc) {
      isUpdatingFromProp = true
      editorView.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: newVal || ''
        }
      })
      isUpdatingFromProp = false
    }
  }
)

watch(isDark, (newDark) => {
  if (!editorView) return
  editorView.dispatch({
    effects: themeCompartment.reconfigure(getEditorTheme(newDark))
  })
})

watch(
  () => props.language,
  (newLang) => {
    if (!editorView) return
    editorView.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension(newLang))
    })
  }
)

watch(
  () => props.readonly,
  (isReadonly) => {
    if (!editorView) return
    editorView.dispatch({
      effects: readOnlyCompartment.reconfigure([
        EditorState.readOnly.of(isReadonly),
        EditorView.editable.of(!isReadonly)
      ])
    })
  }
)

watch(localWordWrap, (wrap) => {
  if (!editorView) return
  editorView.dispatch({
    effects: wrapCompartment.reconfigure(wrap ? EditorView.lineWrapping : [])
  })
})

// Toolbar Actions
async function handleCopy() {
  if (!props.modelValue) return
  try {
    await navigator.clipboard.writeText(props.modelValue)
    isCopied.value = true
    emit('copy', props.modelValue)
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch {
    // Fallback if clipboard API unavailable
    const textArea = document.createElement('textarea')
    textArea.value = props.modelValue
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
}

function toggleWordWrap() {
  localWordWrap.value = !localWordWrap.value
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await readFile(file)
  }
  // Reset input
  target.value = ''
}

async function readFile(file: File) {
  try {
    const text = await file.text()
    emit('update:modelValue', text)
    emit('upload', file, text)
  } catch (err) {
    console.error('Error reading file:', err)
  }
}

// Drag and drop handler
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDraggingOver.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDraggingOver.value = false
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDraggingOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    await readFile(file)
  }
}

function handleDownload() {
  if (!props.modelValue) return
  const extensionMap: Record<string, string> = {
    json: 'json',
    javascript: 'js',
    typescript: 'ts',
    xml: 'xml',
    yaml: 'yaml',
    markdown: 'md',
    html: 'html',
    css: 'css',
    text: 'txt'
  }
  const ext = extensionMap[props.language || 'text'] || 'txt'
  const blob = new Blob([props.modelValue], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.title ? props.title.toLowerCase().replace(/\s+/g, '_') : 'devdot_export'}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
  emit('download')
}

function focus() {
  editorView?.focus()
}

defineExpose({
  focus,
  editorView,
  copy: handleCopy,
  clear: handleClear
})

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  editorView?.destroy()
})
</script>

<template>
  <div
    class="m3-code-editor-container"
    :class="{
      'is-dragging': isDraggingOver,
      'is-readonly': readonly
    }"
    :style="{
      height: height,
      minHeight: minHeight,
      maxHeight: maxHeight
    }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Hidden File Input for Upload -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden-file-input"
      @change="handleFileChange"
    >

    <!-- Top Toolbar Header -->
    <header v-if="showToolbar" class="editor-toolbar">
      <div class="toolbar-left">
        <div v-if="title" class="editor-title-group">
          <FileCode :size="15" class="title-icon" />
          <span class="editor-title">{{ title }}</span>
        </div>

        <span v-if="language" class="lang-badge">
          {{ language.toUpperCase() }}
        </span>

        <span v-if="badge" class="custom-badge">
          {{ badge }}
        </span>

        <span v-if="readonly" class="readonly-pill">
          <Lock :size="11" />
          Read-Only
        </span>

        <!-- Left Slot for Custom Actions / Buttons -->
        <slot name="header-left" />
      </div>

      <div class="toolbar-right">
        <!-- Extra Actions Slot -->
        <slot name="actions" />

        <!-- Word Wrap Toggle -->
        <button
          v-if="showWrapToggle"
          type="button"
          class="toolbar-btn"
          :class="{ active: localWordWrap }"
          title="Toggle Word Wrap"
          aria-label="Toggle Word Wrap"
          @click="toggleWordWrap"
        >
          <WrapText :size="14" />
          <span class="btn-text">Wrap</span>
        </button>

        <!-- Upload File -->
        <button
          v-if="showUpload && !readonly"
          type="button"
          class="toolbar-btn"
          title="Upload or Drag & Drop File"
          aria-label="Upload File"
          @click="triggerFileUpload"
        >
          <Upload :size="14" />
          <span class="btn-text">Upload</span>
        </button>

        <!-- Download File -->
        <button
          v-if="showDownload"
          type="button"
          class="toolbar-btn"
          :disabled="!modelValue"
          title="Download File"
          aria-label="Download File"
          @click="handleDownload"
        >
          <Download :size="14" />
          <span class="btn-text">Save</span>
        </button>

        <!-- Clear Content -->
        <button
          v-if="showClear && !readonly"
          type="button"
          class="toolbar-btn"
          :disabled="!modelValue"
          title="Clear Text"
          aria-label="Clear Text"
          @click="handleClear"
        >
          <Trash2 :size="14" />
          <span class="btn-text">Clear</span>
        </button>

        <!-- Copy to Clipboard -->
        <button
          v-if="showCopy"
          type="button"
          class="toolbar-btn copy-btn"
          :class="{ copied: isCopied }"
          :disabled="!modelValue"
          title="Copy to Clipboard"
          aria-label="Copy to Clipboard"
          @click="handleCopy"
        >
          <component :is="isCopied ? Check : Copy" :size="14" />
          <span class="btn-text">{{ isCopied ? 'Copied!' : 'Copy' }}</span>
        </button>
      </div>
    </header>

    <!-- CodeMirror Editor View Host -->
    <div class="editor-main-area">
      <div ref="editorHost" class="codemirror-wrapper" />

      <!-- Drag & Drop Overlay -->
      <div v-if="isDraggingOver" class="drag-drop-overlay">
        <div class="drop-badge">
          <Sparkles :size="24" />
          <span>Drop file to load content</span>
        </div>
      </div>
    </div>

    <!-- Bottom Status Bar -->
    <footer v-if="showStatusBar" class="editor-status-bar">
      <div class="status-left">
        <span class="status-item">Lines: <strong>{{ lineCount }}</strong></span>
        <span class="status-item">Chars: <strong>{{ charCount }}</strong></span>
        <span class="status-item">Size: <strong>{{ formattedSize }}</strong></span>
        <span v-if="selectionLength > 0" class="status-item selected-item">
          Selected: <strong>{{ selectionLength }}</strong>
        </span>
      </div>

      <div class="status-right">
        <span class="status-item">Ln {{ cursorLine }}, Col {{ cursorCol }}</span>
        <span class="status-item encoding-item">UTF-8</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.m3-code-editor-container {
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.m3-code-editor-container:focus-within {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 1px var(--md-sys-color-primary);
}

.m3-code-editor-container.is-dragging {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 2px var(--md-sys-color-primary);
}

.hidden-file-input {
  display: none;
}

/* Toolbar Header */
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0.625rem;
  background-color: var(--md-sys-color-surface-container-low);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  min-height: 38px;
  gap: 0.5rem;
  user-select: none;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.editor-title-group {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  margin-right: 0.25rem;
}

.title-icon {
  color: var(--md-sys-color-primary);
}

.lang-badge,
.custom-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.4rem;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.lang-badge {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.custom-badge {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.readonly-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.4rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

/* Toolbar Buttons */
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid transparent;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-extra-small);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.toolbar-btn.copy-btn.copied {
  background-color: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.btn-text {
  font-size: 0.75rem;
}

/* Main Area */
.editor-main-area {
  flex: 1;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.codemirror-wrapper {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

:deep(.cm-editor) {
  height: 100%;
  width: 100%;
}

:deep(.cm-scroller) {
  overflow: auto;
}

/* Drag overlay */
.drag-drop-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 102, 139, 0.25);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.drop-badge {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1.25rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 2px dashed var(--md-sys-color-primary);
  border-radius: var(--md-sys-shape-corner-medium);
  color: var(--md-sys-color-primary);
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Status Bar */
.editor-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.625rem;
  background-color: var(--md-sys-color-surface-container-low);
  border-top: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.6875rem;
  color: var(--md-sys-color-outline);
  user-select: none;
  gap: 0.5rem;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.status-item strong {
  color: var(--md-sys-color-on-surface-variant);
}

.status-item.selected-item {
  color: var(--md-sys-color-primary);
}

.encoding-item {
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .btn-text {
    display: none;
  }

  .editor-status-bar {
    font-size: 0.625rem;
  }
}
</style>
