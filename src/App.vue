<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  ShieldCheck,
  Cpu,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  Sparkles,
  Search,
  Code2
} from 'lucide-vue-next'
import {
  AppLayout,
  ToolIcon,
  M3Button,
  M3TextField,
  M3TextArea,
  M3Switch,
  M3Checkbox,
  M3Dialog,
  M3Card,
  M3Badge,
  SplitEditor
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useNavigationStore } from '@/stores'

const navStore = useNavigationStore()

const {
  engine,
  platform,
  isExecuting,
  lastResult,
  error,
  execute
} = useExecutionEngine()

// State for component showcase / testing
const textInput = ref('DevDot Material 3 Shell')
const textAreaInput = ref('100% offline, privacy-first developer utility suite.')
const switchChecked = ref(true)
const checkboxChecked = ref(true)
const isDialogOpen = ref(false)
const badgeCount = ref(3)

// Phase 1.4 Split-Pane Editor State for active tool canvas
const toolInput = ref(`{
  "name": "DevDot",
  "version": "0.1.0",
  "privacy": "100% Client-Side",
  "features": [
    "Material Design 3",
    "CodeMirror 6 Virtual Scrolling (>50MB support)",
    "Multi-threaded Web Worker Pipeline",
    "Air-Gapped Offline Execution"
  ],
  "author": {
    "organization": "DevDot Community",
    "license": "MIT"
  }
}`)
const toolOutput = ref('')
const lastExecTime = ref<number | null>(null)
const toolError = ref<string | null>(null)

// Reset or provide sample data based on active tool
watch(() => navStore.activeToolId, (newId) => {
  toolError.value = null
  if (newId === 'json-formatter' || newId === 'json-schema') {
    toolInput.value = `{\n  "tool": "${newId}",\n  "status": "ready",\n  "timestamp": ${Date.now()},\n  "items": [1, 2, 3, 4, 5]\n}`
    toolOutput.value = ''
  } else if (newId === 'base64' || newId === 'url-encoder') {
    toolInput.value = 'DevDot: Universal Privacy-First Developer Toolkit'
    toolOutput.value = ''
  } else if (newId === 'hash-generator' || newId === 'id-generator') {
    toolInput.value = 'DevDot Secret Payload'
    toolOutput.value = ''
  } else if (newId === 'jwt-debugger') {
    toolInput.value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFuZG8iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjJ9.4S-9A0k5hH9H0v-3l4N8hH7L8rV8G-j1J4b0_h'
    toolOutput.value = ''
  }
})

// Execution Engine actions
async function handlePing() {
  await execute('system', 'ping', {})
}

async function handleBenchmark() {
  await execute('system', 'benchmark', { count: 150000 })
}

async function handleEcho() {
  await execute('system', 'echo', {
    message: 'Hello from DevDot Web Worker Pipeline!',
    timestamp: new Date().toISOString(),
    tool: navStore.activeTool.name
  })
}

// Interactive Tool Execution
async function handleTransformTool() {
  toolError.value = null
  const startTime = performance.now()

  try {
    if (navStore.activeToolId === 'json-formatter') {
      const parsed = JSON.parse(toolInput.value)
      toolOutput.value = JSON.stringify(parsed, null, 2)
      lastExecTime.value = Math.round(performance.now() - startTime)
    } else if (navStore.activeToolId === 'base64') {
      toolOutput.value = btoa(unescape(encodeURIComponent(toolInput.value)))
      lastExecTime.value = Math.round(performance.now() - startTime)
    } else if (navStore.activeToolId === 'url-encoder') {
      toolOutput.value = encodeURIComponent(toolInput.value)
      lastExecTime.value = Math.round(performance.now() - startTime)
    } else {
      // Run through Web Worker execution adapter
      const res = await execute(navStore.activeToolId, 'transform', { input: toolInput.value })
      if (res.success) {
        toolOutput.value = typeof res.result === 'string' ? res.result : JSON.stringify(res.result, null, 2)
        lastExecTime.value = res.executionTimeMs
      } else {
        toolError.value = res.error || 'Execution failed'
      }
    }
  } catch (err: any) {
    toolError.value = err.message || 'Parsing error'
  }
}
</script>

<template>
  <AppLayout>
    <!-- Tool Header Banner -->
    <section class="tool-view-header">
      <div class="tool-header-info">
        <div class="tool-icon-large">
          <ToolIcon :name="navStore.activeTool.icon" :size="28" />
        </div>
        <div class="tool-titles">
          <div class="title-badge-row">
            <h2>{{ navStore.activeTool.name }}</h2>
            <span class="category-badge">{{ navStore.activeTool.category.toUpperCase() }}</span>
            <span
              v-if="navStore.activeTool.status"
              class="status-pill"
              :class="navStore.activeTool.status"
            >
              {{ navStore.activeTool.status === 'ready' ? 'Ready' : 'Upcoming Phase' }}
            </span>
          </div>
          <p class="tool-desc">{{ navStore.activeTool.description }}</p>
        </div>
      </div>

      <div class="header-quick-actions">
        <M3Button
          variant="tonal"
          @click="navStore.openCommandPalette()"
        >
          <template #icon>
            <Search :size="16" />
          </template>
          Search (Ctrl+K)
        </M3Button>
      </div>
    </section>

    <!-- Main View Content -->
    <div class="tool-view-content">
      <!-- SYSTEM OVERVIEW & DIAGNOSTICS DASHBOARD -->
      <template v-if="navStore.activeToolId === 'system-overview'">
        <!-- Phase 1.4 Virtualized Split-Pane Editor Showcase Card -->
        <M3Card variant="filled" padding="medium">
          <template #header>
            <div class="section-title">
              <Code2 :size="20" class="primary-icon" />
              <div class="title-with-tags">
                <h3>Phase 1.4: Virtualized Split-Pane Editor Live Preview</h3>
                <span class="engine-tag">CodeMirror 6</span>
                <span class="platform-tag">>50MB Virtualized</span>
              </div>
            </div>
          </template>

          <p class="desc-text">
            Integrated CodeMirror 6 with dynamic MD3 dark/light themes, resizable split-pane divider, drag-and-drop file upload, word-wrap toggles, copy with toast, and line/byte statistics.
          </p>

          <div class="editor-demo-container">
            <SplitEditor
              v-model:input="toolInput"
              v-model:output="toolOutput"
              input-language="json"
              output-language="json"
              input-title="Input JSON"
              output-title="Formatted Output"
              :is-executing="isExecuting"
              :error="toolError"
              :execution-time-ms="lastExecTime"
              :show-execute-button="true"
              execute-button-label="Format JSON"
              height="440px"
              @execute="handleTransformTool"
            />
          </div>
        </M3Card>

        <!-- Phase 1.3 Shell Status Card -->
        <M3Card variant="elevated" padding="medium">
          <template #header>
            <div class="section-title">
              <Sparkles :size="20" class="primary-icon" />
              <h3>Phase 1.3: Shell Layout & Navigation Active</h3>
            </div>
          </template>
          <p class="desc-text">
            Navigation Rail adaptif (Desktop), Bottom Navigation Bar (Mobile), Top App Bar dengan status 100% Offline & Snapshot Actions, serta Command Palette (Ctrl+K) siap digunakan.
          </p>
          <div class="quick-nav-chips">
            <span class="chip-label">Quick Jump:</span>
            <button
              v-for="tool in navStore.tools.filter(t => t.id !== 'system-overview')"
              :key="tool.id"
              type="button"
              class="quick-chip-btn"
              @click="navStore.selectTool(tool.id)"
            >
              <ToolIcon :name="tool.icon" :size="14" />
              {{ tool.name }}
            </button>
          </div>
        </M3Card>

        <!-- Phase 1.2 Execution Adapter & Worker Card -->
        <M3Card variant="outlined" padding="medium">
          <template #header>
            <div class="section-title">
              <Cpu :size="20" class="primary-icon" />
              <div class="title-with-tags">
                <h3>Execution Adapter & Background Worker Diagnostics</h3>
                <span class="engine-tag">{{ engine.name }}</span>
                <span class="platform-tag">{{ platform }}</span>
              </div>
            </div>
          </template>

          <p class="desc-text">
            Multi-threaded Web Worker background execution layer ensures heavy formatting, conversions, and hashing run smoothly without UI freezing.
          </p>

          <div class="worker-actions">
            <M3Button
              variant="filled"
              :disabled="isExecuting"
              @click="handlePing"
            >
              <template #icon>
                <Activity :size="16" />
              </template>
              Worker Ping
            </M3Button>

            <M3Button
              variant="tonal"
              :disabled="isExecuting"
              @click="handleBenchmark"
            >
              <template #icon>
                <Zap :size="16" />
              </template>
              Worker CPU Benchmark
            </M3Button>

            <M3Button
              variant="outlined"
              :disabled="isExecuting"
              @click="handleEcho"
            >
              <template #icon>
                <Send :size="16" />
              </template>
              Worker Echo Payload
            </M3Button>
          </div>

          <!-- Result Box -->
          <div v-if="lastResult || isExecuting" class="result-container">
            <div class="result-header">
              <div class="result-status">
                <template v-if="isExecuting">
                  <span class="executing-badge">Executing task in background worker...</span>
                </template>
                <template v-else-if="lastResult?.success">
                  <CheckCircle2 :size="16" class="success-icon" />
                  <span>Success ({{ lastResult.executionTimeMs }} ms)</span>
                </template>
                <template v-else>
                  <AlertTriangle :size="16" class="error-icon" />
                  <span>Failed ({{ lastResult?.executionTimeMs }} ms)</span>
                </template>
              </div>
            </div>

            <pre v-if="lastResult" class="result-code">{{ JSON.stringify(lastResult, null, 2) }}</pre>
            <p v-if="error" class="error-msg">{{ error }}</p>
          </div>
        </M3Card>

        <!-- Material 3 UI Components Verification Card -->
        <M3Card variant="outlined" padding="medium">
          <template #header>
            <div class="section-title">
              <Sliders :size="18" class="primary-icon" />
              <h3>Material 3 UI Components Showcase</h3>
            </div>
          </template>

          <div class="button-row">
            <M3Button variant="filled">Filled Button</M3Button>
            <M3Button variant="elevated">Elevated Button</M3Button>
            <M3Button variant="tonal">Tonal Button</M3Button>
            <M3Button variant="outlined">Outlined Button</M3Button>
            <M3Button variant="text">Text Button</M3Button>
          </div>

          <div class="form-grid" style="margin-top: 1.25rem;">
            <M3TextField
              v-model="textInput"
              label="Interactive Text Field"
              supporting-text="Dynamic v-model reactivity"
            />

            <M3TextArea
              v-model="textAreaInput"
              label="Interactive Text Area"
              :rows="2"
            />

            <div class="toggle-row">
              <M3Switch
                v-model="switchChecked"
                label="Offline Execution Guarantee"
              />

              <M3Checkbox
                v-model="checkboxChecked"
                label="Zero Outbound Telemetry"
              />

              <M3Badge :value="badgeCount">
                <M3Button variant="tonal" @click="badgeCount++">
                  Increment Badge
                </M3Button>
              </M3Badge>
            </div>
          </div>

          <template #actions>
            <M3Button variant="filled" @click="isDialogOpen = true">
              <template #icon>
                <Send :size="16" />
              </template>
              Open Dialog Test
            </M3Button>
          </template>
        </M3Card>
      </template>

      <!-- INDIVIDUAL TOOL WORKSPACE CANVAS WITH SPLIT-PANE EDITOR -->
      <template v-else>
        <div class="tool-workspace-container">
          <SplitEditor
            v-model:input="toolInput"
            v-model:output="toolOutput"
            :input-language="navStore.activeToolId.includes('json') ? 'json' : 'text'"
            :output-language="navStore.activeToolId.includes('json') ? 'json' : 'text'"
            :input-title="`${navStore.activeTool.name} Input`"
            :output-title="`${navStore.activeTool.name} Output`"
            :is-executing="isExecuting"
            :error="toolError"
            :execution-time-ms="lastExecTime"
            :show-execute-button="true"
            :execute-button-label="`Execute ${navStore.activeTool.name}`"
            height="calc(100vh - 280px)"
            @execute="handleTransformTool"
          />
        </div>
      </template>
    </div>

    <!-- M3 Dialog Component -->
    <M3Dialog
      v-model="isDialogOpen"
      headline="Material 3 Dialog Verified"
    >
      <template #icon>
        <ShieldCheck :size="24" style="color: var(--md-sys-color-primary);" />
      </template>

      <p>
        Thin Vue wrapper around <code>&lt;md-dialog&gt;</code> is working seamlessly with reactive
        <code>v-model</code> binding and event propagation.
      </p>

      <template #actions>
        <M3Button variant="text" @click="isDialogOpen = false">
          Cancel
        </M3Button>
        <M3Button variant="filled" @click="isDialogOpen = false">
          Confirm
        </M3Button>
      </template>
    </M3Dialog>
  </AppLayout>
</template>

<style scoped>
.tool-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.tool-header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 1;
}

.tool-icon-large {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.75rem;
  border-radius: var(--md-sys-shape-corner-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tool-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-badge-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.tool-titles h2 {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--md-sys-color-on-surface);
}

.category-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  letter-spacing: 0.05em;
}

.status-pill {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.status-pill.ready {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.status-pill.planned {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.tool-desc {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.header-quick-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-view-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.section-title h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.title-with-tags {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.engine-tag,
.platform-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
}

.engine-tag {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.platform-tag {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.primary-icon {
  color: var(--md-sys-color-primary);
}

.desc-text {
  margin: 0 0 1rem 0;
  line-height: 1.5;
  color: var(--md-sys-color-on-surface-variant);
}

.editor-demo-container {
  margin-top: 0.75rem;
}

.tool-workspace-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.quick-nav-chips {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.chip-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.quick-chip-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border-radius: 9999px;
  background-color: var(--md-sys-color-surface-container-highest);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-chip-btn:hover {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.worker-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.result-container {
  margin-top: 1rem;
  padding: 0.875rem 1rem;
  background-color: var(--md-sys-color-surface-container-highest);
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.result-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.success-icon {
  color: #10b981;
}

.error-icon {
  color: var(--md-sys-color-error);
}

.executing-badge {
  color: var(--md-sys-color-primary);
  font-style: italic;
}

.result-code {
  margin: 0;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: var(--md-sys-shape-corner-small);
  font-family: monospace;
  font-size: 0.8125rem;
  overflow-x: auto;
  color: var(--md-sys-color-on-surface);
}

.error-msg {
  color: var(--md-sys-color-error);
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.toggle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
}
</style>
