<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Globe,
  Lock
} from 'lucide-vue-next'
import { SplitEditor } from '@/components'
import { useSnapshotStore } from '@/stores'
import { convertCurlCommand } from '../services/curl-parser-service'
import type {
  CurlTargetLanguage,
  CurlConvertOptions,
  ParsedCurlRequest
} from '../types'

const props = defineProps<{
  tabId?: string
}>()

const snapshotStore = useSnapshotStore()
const currentTabId = computed(() => props.tabId || 'curl-converter')

// State
const rawCurl = ref('')
const targetLanguage = ref<CurlTargetLanguage>('fetch')
const outputCode = ref('')
const errorMsg = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)

// Conversion Options
const includeComments = ref(true)
const useAsyncAwait = ref(true)
const includeErrorHandling = ref(true)

// Parsed Inspector Data
const parsedRequest = ref<ParsedCurlRequest | null>(null)

// Target Languages
const TARGET_LANGUAGES: { id: CurlTargetLanguage; label: string; iconLabel: string; langExtension: string; dotClass: string }[] = [
  { id: 'fetch', label: 'JavaScript Fetch', iconLabel: 'JS', langExtension: 'javascript', dotClass: 'js-dot' },
  { id: 'axios', label: 'Axios (TS/JS)', iconLabel: 'TS', langExtension: 'typescript', dotClass: 'ts-dot' },
  { id: 'python', label: 'Python Requests', iconLabel: 'PY', langExtension: 'python', dotClass: 'py-dot' },
  { id: 'go', label: 'Go net/http', iconLabel: 'GO', langExtension: 'go', dotClass: 'go-dot' }
]

// Preset cURL samples
const SAMPLES: Record<string, { title: string; curl: string }> = {
  jsonPost: {
    title: 'POST + JSON',
    curl: `curl -X POST https://api.devdot.local/v1/projects \\
  -H "Authorization: Bearer devdot_sec_991823abf4" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "DevDot 3.3", "active": true, "tags": ["tools", "privacy"]}'`
  },
  getQueryParams: {
    title: 'GET + Query',
    curl: `curl -X GET "https://api.github.com/repos/vuejs/core/issues?state=open&sort=created&per_page=10" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "User-Agent: DevDot-Agent/1.0"`
  },
  basicAuth: {
    title: 'Basic Auth',
    curl: `curl -u "admin:supersecret123" \\
  -X POST https://auth.company.net/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&scope=read:write"`
  },
  multiHeaders: {
    title: 'Headers & Cookies',
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

function clearAll() {
  rawCurl.value = ''
  outputCode.value = ''
  parsedRequest.value = null
  errorMsg.value = null
  executionTimeMs.value = null
}

let isHydrating = false

// Debounced reactive update
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [rawCurl, targetLanguage, includeComments, useAsyncAwait, includeErrorHandling],
  () => {
    if (isHydrating) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      handleConvert()

      // Save state to snapshot store
      snapshotStore.setTabState(currentTabId.value, 'curl-converter', {
        rawCurl: rawCurl.value,
        targetLanguage: targetLanguage.value,
        includeComments: includeComments.value,
        useAsyncAwait: useAsyncAwait.value,
        includeErrorHandling: includeErrorHandling.value
      })
    }, 150)
  }
)

// Hydrate from snapshot on mount and external update
watch(
  () => snapshotStore.toolStates[currentTabId.value],
  (newState) => {
    if (newState && !isHydrating) {
      isHydrating = true
      if (newState.rawCurl !== undefined) rawCurl.value = newState.rawCurl
      if (newState.targetLanguage) targetLanguage.value = newState.targetLanguage
      if (newState.includeComments !== undefined) includeComments.value = newState.includeComments
      if (newState.useAsyncAwait !== undefined) useAsyncAwait.value = newState.useAsyncAwait
      if (newState.includeErrorHandling !== undefined) includeErrorHandling.value = newState.includeErrorHandling
      isHydrating = false
    }
  },
  { deep: true }
)

onMounted(() => {
  const saved = snapshotStore.getTabOrToolState<Record<string, any> | null>(props.tabId, 'curl-converter', null)
  if (saved) {
    if (saved.rawCurl !== undefined) rawCurl.value = saved.rawCurl
    if (saved.targetLanguage) targetLanguage.value = saved.targetLanguage
    if (saved.includeComments !== undefined) includeComments.value = saved.includeComments
    if (saved.useAsyncAwait !== undefined) useAsyncAwait.value = saved.useAsyncAwait
    if (saved.includeErrorHandling !== undefined) includeErrorHandling.value = saved.includeErrorHandling
  } else {
    loadSample('jsonPost')
  }
  handleConvert()
})
</script>

<template>
  <div class="curl-converter-view">
    <!-- Compact 1-Line Desktop Toolbar -->
    <div class="curl-compact-toolbar">
      <div class="toolbar-left">
        <div class="lang-chips">
          <button
            v-for="target in TARGET_LANGUAGES"
            :key="target.id"
            type="button"
            class="lang-chip"
            :class="{ active: targetLanguage === target.id }"
            @click="targetLanguage = target.id"
          >
            <span class="lang-dot" :class="target.dotClass"></span>
            <span>{{ target.label }}</span>
          </button>
        </div>

        <div class="options-inline">
          <label class="compact-check">
            <input v-model="includeComments" type="checkbox" /> Comments
          </label>
          <label class="compact-check">
            <input v-model="includeErrorHandling" type="checkbox" /> Try/Catch
          </label>
          <label v-if="targetLanguage === 'fetch'" class="compact-check">
            <input v-model="useAsyncAwait" type="checkbox" /> Async
          </label>
        </div>
      </div>

      <!-- Presets & Stats Row -->
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
          :disabled="!rawCurl.trim()"
          @click="handleConvert"
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

    <!-- Parsed HTTP Inspector Strip (when parsed request exists) -->
    <div v-if="parsedRequest" class="http-inspector-bar">
      <div class="inspector-item method-tag" :class="parsedRequest.method.toLowerCase()">
        {{ parsedRequest.method }}
      </div>
      <div class="inspector-item url-text" :title="parsedRequest.url">
        <Globe :size="12" />
        <span class="url-truncate">{{ parsedRequest.url }}</span>
      </div>
      <div v-if="parsedRequest.auth" class="inspector-item auth-tag">
        <Lock :size="12" />
        <span>{{ parsedRequest.auth.type.toUpperCase() }} AUTH</span>
      </div>
      <div class="inspector-item stat-item">
        <span>Headers: {{ Object.keys(parsedRequest.headers).length }}</span>
      </div>
      <div v-if="parsedRequest.queryParams.length > 0" class="inspector-item stat-item">
        <span>Params: {{ parsedRequest.queryParams.length }}</span>
      </div>
      <div v-if="parsedRequest.data" class="inspector-item body-tag">
        <span>{{ parsedRequest.isJsonBody ? 'JSON Body' : 'Form/Raw' }}</span>
      </div>
    </div>

    <!-- Split Editor Area -->
    <div class="editor-area">
      <SplitEditor
        v-model:input="rawCurl"
        v-model:output="outputCode"
        input-language="text"
        :output-language="outputEditorLang"
        input-title="cURL Command (Bash / Shell)"
        :output-title="`Generated ${TARGET_LANGUAGES.find(t => t.id === targetLanguage)?.label || 'Code'}`"
        :is-executing="false"
        :error="errorMsg"
        :execution-time-ms="executionTimeMs"
        :show-execute-button="false"
        :show-swap-button="false"
        height="100%"
        @execute="handleConvert"
      />
    </div>

    <!-- Stats & Information Bar -->
    <div v-if="outputCode && !errorMsg" class="stats-footer">
      <div class="stat-pill">
        <span class="stat-label">Language:</span>
        <span class="stat-val uppercase">{{ targetLanguage }}</span>
      </div>

      <div v-if="parsedRequest" class="stat-pill">
        <span class="stat-label">Method:</span>
        <span class="stat-val uppercase">{{ parsedRequest.method }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Output Size:</span>
        <span class="stat-val">{{ outputCode.length }} chars</span>
      </div>

      <div class="stat-pill success-tag">
        <CheckCircle2 :size="13" />
        <span>Converted Cleanly</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.curl-converter-view {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
}

/* Compact Toolbar */
.curl-compact-toolbar {
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

.lang-chips {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.lang-chip {
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

.lang-chip:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.lang-chip.active {
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

.js-dot { background-color: #f7df1e; }
.ts-dot { background-color: #3178c6; }
.py-dot { background-color: #3b82f6; }
.go-dot { background-color: #00add8; }

.options-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

/* HTTP Inspector Bar */
.http-inspector-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.6875rem;
  overflow-x: auto;
  white-space: nowrap;
}

.inspector-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}

.method-tag {
  font-weight: 700;
  font-family: monospace;
}

.method-tag.get { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.method-tag.post { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.method-tag.put { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.method-tag.delete { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.method-tag.patch { background: rgba(168, 85, 247, 0.15); color: #a855f7; }

.url-text {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.url-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: monospace;
}

.auth-tag {
  color: #f59e0b;
  font-weight: 600;
}

.body-tag {
  color: #10b981;
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
