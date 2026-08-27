<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Terminal,
  Copy,
  Check,
  Trash2,
  Sparkles,
  AlertCircle,
  Clock,
  Globe,
  Lock,
  FileCode2
} from 'lucide-vue-next'
import {
  M3Button,
  M3Checkbox
} from '@/components'
import { CodeEditor } from '@/components/editor'
import { useSnapshotStore } from '@/stores'
import { convertCurlCommand } from '../services/curl-parser-service'
import type {
  CurlTargetLanguage,
  CurlConvertOptions,
  ParsedCurlRequest
} from '../types'

const snapshotStore = useSnapshotStore()

// State
const rawCurl = ref('')
const targetLanguage = ref<CurlTargetLanguage>('fetch')
const outputCode = ref('')
const isCopied = ref(false)
const errorMsg = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)

// Conversion Options
const includeComments = ref(true)
const useAsyncAwait = ref(true)
const includeErrorHandling = ref(true)

// Parsed Inspector Data
const parsedRequest = ref<ParsedCurlRequest | null>(null)

// Target Languages
const TARGET_LANGUAGES: { id: CurlTargetLanguage; label: string; iconLabel: string; langExtension: string }[] = [
  { id: 'fetch', label: 'JavaScript Fetch', iconLabel: 'JS', langExtension: 'javascript' },
  { id: 'axios', label: 'Axios (JS / TS)', iconLabel: 'TS', langExtension: 'javascript' },
  { id: 'python', label: 'Python requests', iconLabel: 'PY', langExtension: 'text' },
  { id: 'go', label: 'Go net/http', iconLabel: 'GO', langExtension: 'text' }
]

// Preset cURL samples
const SAMPLES: Record<string, { title: string; curl: string }> = {
  jsonPost: {
    title: 'JSON POST + Bearer Auth',
    curl: `curl -X POST https://api.devdot.local/v1/projects \\
  -H "Authorization: Bearer devdot_sec_991823abf4" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "DevDot 3.3", "active": true, "tags": ["tools", "privacy"]}'`
  },
  getQueryParams: {
    title: 'GET + Query Params',
    curl: `curl -X GET "https://api.github.com/repos/vuejs/core/issues?state=open&sort=created&per_page=10" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "User-Agent: DevDot-Agent/1.0"`
  },
  basicAuth: {
    title: 'Basic Auth POST',
    curl: `curl -u "admin:supersecret123" \\
  -X POST https://auth.company.net/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&scope=read:write"`
  },
  multiHeaders: {
    title: 'Multi-Headers & Custom Cookies',
    curl: `curl -X PUT https://api.service.io/data/42 \\
  -H "X-API-Key: 9a7b5c3d-1e2f" \\
  -H "X-Client-Version: 2.1.0" \\
  -b "session_id=sess_88327a; theme=dark" \\
  -d '{"status": "archived"}'`
  }
}

// Compute code editor syntax language
const outputEditorLang = computed(() => {
  const found = TARGET_LANGUAGES.find((t) => t.id === targetLanguage.value)
  return found?.langExtension || 'text'
})

// Conversion execution
function handleConvert() {
  errorMsg.value = null

  if (!rawCurl.value.trim()) {
    outputCode.value = ''
    parsedRequest.value = null
    executionTimeMs.value = null
    return
  }

  const options: CurlConvertOptions = {
    targetLanguage: targetLanguage.value,
    includeComments: includeComments.value,
    useAsyncAwait: useAsyncAwait.value,
    includeErrorHandling: includeErrorHandling.value
  }

  try {
    const res = convertCurlCommand(rawCurl.value, options)
    outputCode.value = res.code
    parsedRequest.value = res.parsed
    executionTimeMs.value = res.executionTimeMs || 0
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to parse cURL command'
    outputCode.value = ''
    parsedRequest.value = null
  }
}

// Load sample preset
function loadSample(key: string) {
  const sample = SAMPLES[key]
  if (sample) {
    rawCurl.value = sample.curl
    handleConvert()
  }
}

// Copy output to clipboard
async function copyOutput() {
  if (!outputCode.value) return
  try {
    await navigator.clipboard.writeText(outputCode.value)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch {
    // fallback
  }
}

function clearAll() {
  rawCurl.value = ''
  outputCode.value = ''
  parsedRequest.value = null
  errorMsg.value = null
  executionTimeMs.value = null
}

// Debounced reactive update
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [rawCurl, targetLanguage, includeComments, useAsyncAwait, includeErrorHandling],
  () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      handleConvert()

      // Save state to snapshot store
      snapshotStore.setToolState('curl-converter', {
        rawCurl: rawCurl.value,
        targetLanguage: targetLanguage.value,
        includeComments: includeComments.value,
        useAsyncAwait: useAsyncAwait.value,
        includeErrorHandling: includeErrorHandling.value
      })
    }, 200)
  }
)

// Hydrate from snapshot on mount
onMounted(() => {
  const saved = snapshotStore.getToolState('curl-converter')
  if (saved) {
    if (saved.rawCurl !== undefined) rawCurl.value = saved.rawCurl
    if (saved.targetLanguage) targetLanguage.value = saved.targetLanguage
    if (saved.includeComments !== undefined) includeComments.value = saved.includeComments
    if (saved.useAsyncAwait !== undefined) useAsyncAwait.value = saved.useAsyncAwait
    if (saved.includeErrorHandling !== undefined) includeErrorHandling.value = saved.includeErrorHandling
  } else {
    // Default initial sample
    loadSample('jsonPost')
  }
})
</script>

<template>
  <div class="curl-converter-view">
    <!-- Top Action & Target Language Selection Bar -->
    <section class="language-selection-card">
      <div class="header-main-row">
        <div class="lang-group">
          <label class="group-label">Target Code Generator</label>
          <div class="lang-chips">
            <button
              v-for="target in TARGET_LANGUAGES"
              :key="target.id"
              class="lang-chip"
              :class="{ active: targetLanguage === target.id }"
              @click="targetLanguage = target.id"
            >
              <span class="icon-tag">{{ target.iconLabel }}</span>
              <span>{{ target.label }}</span>
            </button>
          </div>
        </div>

        <div class="options-group">
          <M3Checkbox
            v-model="includeComments"
            label="Include Comments"
          />
          <M3Checkbox
            v-model="includeErrorHandling"
            label="Try / Catch Block"
          />
          <M3Checkbox
            v-if="targetLanguage === 'fetch'"
            v-model="useAsyncAwait"
            label="Async / Await"
          />
        </div>
      </div>

      <!-- Presets & Stats Row -->
      <div class="presets-row">
        <div class="presets-group">
          <span class="presets-label">Samples:</span>
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
          <M3Button variant="text" size="small" @click="clearAll">
            <template #icon>
              <Trash2 :size="14" />
            </template>
            Clear
          </M3Button>
        </div>
      </div>
    </section>

    <!-- Error Banner -->
    <div v-if="errorMsg" class="alert-banner error-banner">
      <AlertCircle :size="18" />
      <div class="alert-content">
        <strong>cURL Parse Error:</strong> {{ errorMsg }}
      </div>
    </div>

    <!-- Parsed HTTP Inspector Strip (when parsed request exists) -->
    <div v-if="parsedRequest" class="http-inspector-bar">
      <div class="inspector-item method-tag" :class="parsedRequest.method.toLowerCase()">
        {{ parsedRequest.method }}
      </div>
      <div class="inspector-item url-text" :title="parsedRequest.url">
        <Globe :size="13" />
        <span class="url-truncate">{{ parsedRequest.url }}</span>
      </div>
      <div v-if="parsedRequest.auth" class="inspector-item auth-tag">
        <Lock :size="13" />
        <span>{{ parsedRequest.auth.type.toUpperCase() }} AUTH</span>
      </div>
      <div class="inspector-item stat-item">
        <span>Headers: {{ Object.keys(parsedRequest.headers).length }}</span>
      </div>
      <div v-if="parsedRequest.queryParams.length > 0" class="inspector-item stat-item">
        <span>Params: {{ parsedRequest.queryParams.length }}</span>
      </div>
      <div v-if="parsedRequest.data" class="inspector-item body-tag">
        <span>{{ parsedRequest.isJsonBody ? 'JSON Body' : 'Form/Raw Body' }}</span>
      </div>
    </div>

    <!-- Dual Split Editor Grid -->
    <div class="editors-grid">
      <!-- Input Panel (cURL) -->
      <div class="editor-pane input-pane">
        <div class="pane-header">
          <div class="pane-title">
            <Terminal :size="15" class="terminal-icon" />
            <strong>cURL Command</strong>
          </div>
          <div class="pane-actions">
            <span class="format-badge-pill">SHELL / BASH</span>
          </div>
        </div>

        <div class="pane-body">
          <CodeEditor
            v-model="rawCurl"
            language="text"
            placeholder="Paste your cURL command here (e.g. curl -X POST https://api.example.com -d '{...}')..."
            height="100%"
          />
        </div>
      </div>

      <!-- Output Panel (Generated Code) -->
      <div class="editor-pane output-pane">
        <div class="pane-header">
          <div class="pane-title">
            <FileCode2 :size="15" class="code-icon" />
            <strong>Generated {{ TARGET_LANGUAGES.find(t => t.id === targetLanguage)?.label }}</strong>
          </div>
          <div class="pane-actions">
            <span class="format-badge-pill highlight">{{ targetLanguage.toUpperCase() }}</span>
            <M3Button
              variant="tonal"
              size="small"
              :disabled="!outputCode"
              @click="copyOutput"
            >
              <template #icon>
                <Check v-if="isCopied" :size="14" class="copy-success-icon" />
                <Copy v-else :size="14" />
              </template>
              {{ isCopied ? 'Copied!' : 'Copy Code' }}
            </M3Button>
          </div>
        </div>

        <div class="pane-body">
          <CodeEditor
            :model-value="outputCode"
            :language="outputEditorLang"
            :read-only="true"
            placeholder="Generated client code will appear here in real-time..."
            height="100%"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.curl-converter-view {
  display: flex;
  flex-direction: column;
  gap: var(--md-sys-spacing-md, 16px);
  width: 100%;
  height: calc(100vh - 210px);
  min-height: 540px;
}

/* Selection Card */
.language-selection-card {
  background: var(--md-sys-color-surface-container-low, #1e1f22);
  border: 1px solid var(--md-sys-color-outline-variant, #444746);
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.lang-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 320px;
}

.group-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
}

.lang-chips {
  display: flex;
  gap: 6px;
  background: var(--md-sys-color-surface-container, #141518);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--md-sys-color-outline-variant, #333538);
  flex-wrap: wrap;
}

.lang-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant, #c4c7c5);
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lang-chip:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--md-sys-color-on-surface, #e3e3e3);
}

.lang-chip.active {
  background: var(--md-sys-color-primary, #a8c7fa);
  color: var(--md-sys-color-on-primary, #062e6f);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.icon-tag {
  font-size: 10px;
  font-family: monospace;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.2);
  padding: 1px 4px;
  border-radius: 3px;
}

.options-group {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* Presets & Stats */
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

/* HTTP Inspector Bar */
.http-inspector-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--md-sys-color-surface-container-lowest, #0e0f12);
  border: 1px solid var(--md-sys-color-outline-variant, #333538);
  border-radius: 8px;
  font-size: 12px;
  flex-wrap: wrap;
}

.inspector-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.method-tag {
  font-weight: 800;
  font-family: monospace;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
}

.method-tag.get { background: rgba(109, 213, 140, 0.15); color: #6dd58c; }
.method-tag.post { background: rgba(168, 199, 250, 0.15); color: #a8c7fa; }
.method-tag.put { background: rgba(247, 206, 105, 0.15); color: #f7ce69; }
.method-tag.delete { background: rgba(242, 184, 181, 0.15); color: #f2b8b5; }
.method-tag.patch { background: rgba(218, 184, 242, 0.15); color: #dab8f2; }

.url-text {
  color: var(--md-sys-color-on-surface, #e3e3e3);
  font-family: monospace;
  max-width: 320px;
}

.url-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-tag {
  color: #dab8f2;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(218, 184, 242, 0.1);
}

.body-tag {
  color: #a8c7fa;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(168, 199, 250, 0.1);
}

.stat-item {
  color: var(--md-sys-color-on-surface-variant, #8e918f);
  font-size: 11px;
}

/* Alert Banner */
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

.terminal-icon {
  color: #a8c7fa;
}

.code-icon {
  color: #6dd58c;
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
