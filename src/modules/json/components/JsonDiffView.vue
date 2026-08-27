<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  Columns2,
  Rows3,
  ArrowLeftRight,
  RotateCcw,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  Layers,
  FileCheck2,
  FileX2,
  Table,
  Eye,
  Edit3,
  Maximize2,
  Minimize2,
  Search,
  Plus,
  Minus,
  FileSpreadsheet
} from 'lucide-vue-next'
import {
  M3Button,
  M3Switch
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore } from '@/stores'
import type {
  DiffViewMode,
  JsonDiffOptions,
  JsonDiffResult,
  StructuralDiffItem
} from '../types'

const { execute } = useExecutionEngine()
const snapshotStore = useSnapshotStore()

// Sample presets for demo and testing
const SAMPLES = {
  apiResponse: {
    name: 'API Payload Migration',
    left: `{\n  "status": "success",\n  "version": "v1.2.0",\n  "timestamp": 1719823000,\n  "data": {\n    "userId": 1042,\n    "username": "ando_dev",\n    "email": "ando@devtoys.internal",\n    "roles": ["developer", "viewer"],\n    "settings": {\n      "theme": "dark",\n      "notifications": true,\n      "timeout": 3000\n    }\n  },\n  "deprecatedField": "legacy_token_abc123"\n}`,
    right: `{\n  "status": "success",\n  "version": "v2.0.0",\n  "timestamp": 1720000000,\n  "data": {\n    "userId": 1042,\n    "username": "ando_lead",\n    "email": "ando@devtoys.internal",\n    "roles": ["developer", "admin", "maintainer"],\n    "settings": {\n      "theme": "material-dynamic",\n      "notifications": false,\n      "timeout": 5000,\n      "twoFactorAuth": true\n    },\n    "lastLoginIp": "192.168.1.10"\n  }\n}`
  },
  config: {
    name: 'Cloud Microservice Config',
    left: `{\n  "serviceName": "auth-gateway",\n  "environment": "staging",\n  "port": 8080,\n  "replicas": 2,\n  "rateLimit": {\n    "maxRequests": 100,\n    "windowMs": 60000\n  },\n  "corsOrigins": [\n    "http://localhost:3000",\n    "http://staging.devdot.internal"\n  ],\n  "logging": {\n    "level": "debug",\n    "destination": "stdout"\n  }\n}`,
    right: `{\n  "serviceName": "auth-gateway",\n  "environment": "production",\n  "port": 443,\n  "replicas": 8,\n  "rateLimit": {\n    "maxRequests": 500,\n    "windowMs": 60000,\n    "burstTolerance": 50\n  },\n  "corsOrigins": [\n    "https://devdot.tools",\n    "https://app.devdot.tools"\n  ],\n  "logging": {\n    "level": "info",\n    "destination": "cloudwatch"\n  },\n  "tls": {\n    "enabled": true,\n    "minVersion": "1.3"\n  }\n}`
  }
}

// Initial state from snapshot store
const initialSaved = snapshotStore.getToolState('json-diff', {
  leftJson: SAMPLES.apiResponse.left,
  rightJson: SAMPLES.apiResponse.right,
  viewMode: 'side-by-side' as DiffViewMode,
  sortKeys: false,
  autoFormat: true,
  collapseUnchanged: false,
  contextLines: 3,
  editMode: false,
  showStructural: true,
  structuralPanelHeight: 260,
  isPanelMaximized: false
})

const leftJson = ref(initialSaved.leftJson)
const rightJson = ref(initialSaved.rightJson)
const viewMode = ref<DiffViewMode>(initialSaved.viewMode)
const sortKeys = ref(initialSaved.sortKeys)
const autoFormat = ref(initialSaved.autoFormat)
const collapseUnchanged = ref(initialSaved.collapseUnchanged)
const contextLines = ref(initialSaved.contextLines)
const editMode = ref(initialSaved.editMode)
const showStructural = ref(initialSaved.showStructural)
const structuralPanelHeight = ref<number>(initialSaved.structuralPanelHeight ?? 260)
const isPanelMaximized = ref<boolean>(initialSaved.isPanelMaximized ?? false)
const isPanelDragging = ref(false)

// Structural breakdown filters & interaction
const filterQuery = ref('')
const filterType = ref<'all' | 'added' | 'removed' | 'modified' | 'type_changed'>('all')
const copiedPathId = ref<string | null>(null)
const highlightedRowId = ref<string | null>(null)

// Fullscreen & Mobile Column Layout State
const rootRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)
const mobileSideTab = ref<'both' | 'left' | 'right'>('both')

// Diff Result State
const diffResult = ref<JsonDiffResult | null>(null)
const execTimeMs = ref<number | null>(null)
const currentDiffIndex = ref<number>(0)
const isCopied = ref(false)

// DOM scroll containers for sync scroll
const leftScrollRef = ref<HTMLDivElement | null>(null)
const rightScrollRef = ref<HTMLDivElement | null>(null)
const isSyncingScroll = ref(false)

// Sync changes to snapshot store
watch(
  [
    leftJson,
    rightJson,
    viewMode,
    sortKeys,
    autoFormat,
    collapseUnchanged,
    contextLines,
    editMode,
    showStructural,
    structuralPanelHeight,
    isPanelMaximized
  ],
  () => {
    snapshotStore.setToolState('json-diff', {
      leftJson: leftJson.value,
      rightJson: rightJson.value,
      viewMode: viewMode.value,
      sortKeys: sortKeys.value,
      autoFormat: autoFormat.value,
      collapseUnchanged: collapseUnchanged.value,
      contextLines: contextLines.value,
      editMode: editMode.value,
      showStructural: showStructural.value,
      structuralPanelHeight: structuralPanelHeight.value,
      isPanelMaximized: isPanelMaximized.value
    })
  },
  { deep: true }
)

// Hydrate from snapshot store if externally changed
watch(
  () => snapshotStore.toolStates['json-diff'],
  (newState) => {
    if (newState) {
      if (newState.leftJson !== undefined && newState.leftJson !== leftJson.value) leftJson.value = newState.leftJson
      if (newState.rightJson !== undefined && newState.rightJson !== rightJson.value) rightJson.value = newState.rightJson
      if (newState.viewMode !== undefined && newState.viewMode !== viewMode.value) viewMode.value = newState.viewMode
      if (newState.sortKeys !== undefined && newState.sortKeys !== sortKeys.value) sortKeys.value = newState.sortKeys
      if (newState.autoFormat !== undefined && newState.autoFormat !== autoFormat.value) autoFormat.value = newState.autoFormat
      if (newState.collapseUnchanged !== undefined && newState.collapseUnchanged !== collapseUnchanged.value) collapseUnchanged.value = newState.collapseUnchanged
      if (newState.contextLines !== undefined && newState.contextLines !== contextLines.value) contextLines.value = newState.contextLines
      if (newState.editMode !== undefined && newState.editMode !== editMode.value) editMode.value = newState.editMode
      if (newState.showStructural !== undefined && newState.showStructural !== showStructural.value) showStructural.value = newState.showStructural
      if (newState.structuralPanelHeight !== undefined && newState.structuralPanelHeight !== structuralPanelHeight.value) structuralPanelHeight.value = newState.structuralPanelHeight
      if (newState.isPanelMaximized !== undefined && newState.isPanelMaximized !== isPanelMaximized.value) isPanelMaximized.value = newState.isPanelMaximized
      handleRunDiff()
    }
  },
  { deep: true }
)

// Perform Diff via Web Worker Engine
async function handleRunDiff() {
  const options: JsonDiffOptions = {
    sortKeys: sortKeys.value,
    autoFormat: autoFormat.value,
    collapseUnchanged: collapseUnchanged.value,
    contextLines: contextLines.value
  }

  const res = await execute<
    { left: string; right: string; options?: JsonDiffOptions },
    JsonDiffResult
  >('json', 'diff', {
    left: leftJson.value,
    right: rightJson.value,
    options
  })

  if (res.success && res.result) {
    diffResult.value = res.result
    execTimeMs.value = res.executionTimeMs
    if (currentDiffIndex.value >= (res.result.markers.length || 0)) {
      currentDiffIndex.value = res.result.markers.length > 0 ? 1 : 0
    } else if (res.result.markers.length > 0 && currentDiffIndex.value === 0) {
      currentDiffIndex.value = 1
    }
  }
}

// Watch inputs & options to re-calculate diff with debounce
let debounceTimer: any = null
function queueDiff() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    handleRunDiff()
  }, 200)
}

watch([leftJson, rightJson, sortKeys, autoFormat, collapseUnchanged, contextLines], () => {
  queueDiff()
})

// Actions
function handleSwap() {
  const temp = leftJson.value
  leftJson.value = rightJson.value
  rightJson.value = temp
  queueDiff()
}

function handleClear() {
  leftJson.value = ''
  rightJson.value = ''
  diffResult.value = null
  currentDiffIndex.value = 0
}

function handleLoadPreset(presetKey: keyof typeof SAMPLES) {
  const preset = SAMPLES[presetKey]
  if (preset) {
    leftJson.value = preset.left
    rightJson.value = preset.right
    queueDiff()
  }
}

// Fullscreen Toggle
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    if (rootRef.value?.requestFullscreen) {
      rootRef.value.requestFullscreen().catch(() => {
        // Fallback handled by CSS .is-fullscreen class
      })
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
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

// Synchronized scrolling
function handleLeftScroll(e: Event) {
  if (isSyncingScroll.value) return
  isSyncingScroll.value = true
  const target = e.target as HTMLElement
  if (rightScrollRef.value) {
    rightScrollRef.value.scrollTop = target.scrollTop
    rightScrollRef.value.scrollLeft = target.scrollLeft
  }
  nextTick(() => {
    isSyncingScroll.value = false
  })
}

function handleRightScroll(e: Event) {
  if (isSyncingScroll.value) return
  isSyncingScroll.value = true
  const target = e.target as HTMLElement
  if (leftScrollRef.value) {
    leftScrollRef.value.scrollTop = target.scrollTop
    leftScrollRef.value.scrollLeft = target.scrollLeft
  }
  nextTick(() => {
    isSyncingScroll.value = false
  })
}

// Diff jumping navigation
function jumpToDiff(index: number) {
  if (!diffResult.value || !diffResult.value.markers.length) return
  const marker = diffResult.value.markers[index - 1]
  if (!marker) return

  currentDiffIndex.value = index
  const rowId = `diff-row-${marker.lineIndex}`
  const targetElem = document.getElementById(rowId)
  if (targetElem) {
    targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function handleNextDiff() {
  if (!diffResult.value?.markers.length) return
  let next = currentDiffIndex.value + 1
  if (next > diffResult.value.markers.length) next = 1
  jumpToDiff(next)
}

function handlePrevDiff() {
  if (!diffResult.value?.markers.length) return
  let prev = currentDiffIndex.value - 1
  if (prev < 1) prev = diffResult.value.markers.length
  jumpToDiff(prev)
}

// Copy diff report or unified patch
async function handleCopyDiff() {
  if (!diffResult.value) return

  let textToCopy = ''
  if (viewMode.value === 'unified') {
    textToCopy = diffResult.value.unifiedLines.map((l) => l.content).join('\n')
  } else {
    // Generate readable diff summary
    const summary = [
      `=== JSON Visual Diff Report ===`,
      `Equality: ${diffResult.value.areEqual ? 'IDENTICAL' : 'DIFFERENT'}`,
      `Similarity: ${diffResult.value.stats.similarityPercentage}%`,
      `Additions: +${diffResult.value.stats.additions}`,
      `Deletions: -${diffResult.value.stats.deletions}`,
      `Modifications: ~${diffResult.value.stats.modifications}`,
      ``,
      `--- Structural Differences (${diffResult.value.structuralDiff.length}) ---`,
      ...diffResult.value.structuralDiff.map(
        (d) => `[${d.type.toUpperCase()}] ${d.path} -> ${d.message}`
      ),
      ``,
      `--- Unified Patch ---`,
      ...diffResult.value.unifiedLines.map((l) => l.content)
    ].join('\n')
    textToCopy = summary
  }

  try {
    await navigator.clipboard.writeText(textToCopy)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

// Structural Breakdown Analytics & Filtering
const structuralCounts = computed(() => {
  const diffs = diffResult.value?.structuralDiff || []
  return {
    all: diffs.length,
    added: diffs.filter((d) => d.type === 'added').length,
    removed: diffs.filter((d) => d.type === 'removed').length,
    modified: diffs.filter((d) => d.type === 'modified').length,
    type_changed: diffs.filter((d) => d.type === 'type_changed').length
  }
})

const filteredStructuralDiff = computed(() => {
  const diffs = diffResult.value?.structuralDiff || []
  return diffs.filter((item) => {
    if (filterType.value !== 'all' && item.type !== filterType.value) {
      return false
    }
    if (filterQuery.value.trim()) {
      const q = filterQuery.value.toLowerCase().trim()
      return item.path.toLowerCase().includes(q) || item.message.toLowerCase().includes(q)
    }
    return true
  })
})

// Structural Panel Window Resizing Handlers
function increasePanelHeight(step = 80) {
  isPanelMaximized.value = false
  structuralPanelHeight.value = Math.min(650, structuralPanelHeight.value + step)
}

function decreasePanelHeight(step = 80) {
  isPanelMaximized.value = false
  structuralPanelHeight.value = Math.max(120, structuralPanelHeight.value - step)
}

function setPanelPreset(height: number) {
  isPanelMaximized.value = false
  structuralPanelHeight.value = height
}

function togglePanelMaximize() {
  isPanelMaximized.value = !isPanelMaximized.value
}

// Drag & Resize Handlers for Structural Panel
function startPanelDrag(event: MouseEvent | TouchEvent) {
  event.preventDefault()
  isPanelDragging.value = true
  isPanelMaximized.value = false

  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'

  const startY = 'touches' in event ? event.touches[0].clientY : event.clientY
  const startHeight = structuralPanelHeight.value

  function onDrag(moveEvent: MouseEvent | TouchEvent) {
    if (!isPanelDragging.value) return
    const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
    const deltaY = startY - currentY
    const newHeight = Math.max(120, Math.min(650, startHeight + deltaY))
    structuralPanelHeight.value = newHeight
  }

  function stopDrag() {
    isPanelDragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchend', stopDrag)
  }

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchend', stopDrag)
}

// Structural Row Click Jump & Highlight
let highlightTimer: any = null
function pulseHighlight(id: string) {
  highlightedRowId.value = id
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => {
    highlightedRowId.value = null
  }, 2200)
}

function handleStructuralRowClick(item: StructuralDiffItem) {
  if (!diffResult.value) return

  const pathParts = item.path.replace(/^\$\.?/, '').split('.')
  const keySegment = pathParts.pop()?.replace(/\[\d+\]$/, '') || ''

  let targetId = ''

  if (viewMode.value === 'unified') {
    const lines = diffResult.value.unifiedLines
    const idx = lines.findIndex((l) => keySegment && l.content.includes(`"${keySegment}"`))
    if (idx !== -1) {
      targetId = `diff-row-${idx}`
    }
  } else {
    if (item.type === 'added') {
      const lines = diffResult.value.rightLines
      const idx = lines.findIndex((l) => keySegment && l.content.includes(`"${keySegment}"`))
      if (idx !== -1) {
        targetId = `diff-row-right-${idx}`
      }
    } else {
      const lines = diffResult.value.leftLines
      const idx = lines.findIndex((l) => keySegment && l.content.includes(`"${keySegment}"`))
      if (idx !== -1) {
        targetId = `diff-row-${idx}`
      }
    }
  }

  if (targetId) {
    const rowElem = document.getElementById(targetId)
    if (rowElem) {
      rowElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      pulseHighlight(targetId)
    }
  }
}

async function copyPath(path: string, id: string) {
  try {
    await navigator.clipboard.writeText(path)
    copiedPathId.value = id
    setTimeout(() => {
      if (copiedPathId.value === id) copiedPathId.value = null
    }, 1500)
  } catch (err) {
    console.error('Failed to copy path', err)
  }
}

async function copyStructuralAsMarkdown() {
  if (!diffResult.value?.structuralDiff.length) return
  const header = `| Type | JSON Path | Changes |\n|---|---|---|`
  const rows = diffResult.value.structuralDiff.map(
    (item) => `| ${item.type.toUpperCase()} | \`${item.path}\` | ${item.message} |`
  )
  const md = [header, ...rows].join('\n')
  await navigator.clipboard.writeText(md)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

async function copyStructuralAsCsv() {
  if (!diffResult.value?.structuralDiff.length) return
  const header = `"Type","JSON Path","Description"`
  const rows = diffResult.value.structuralDiff.map(
    (item) => `"${item.type.toUpperCase()}","${item.path.replace(/"/g, '""')}","${item.message.replace(/"/g, '""')}"`
  )
  const csv = [header, ...rows].join('\n')
  await navigator.clipboard.writeText(csv)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

onMounted(() => {
  handleRunDiff()
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
    class="json-diff-container"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <!-- Top Toolbar Controls -->
    <div class="diff-toolbar">
      <div class="toolbar-left">
        <!-- View Mode Segment -->
        <div class="control-group">
          <label class="control-label">View:</label>
          <div class="segment-group">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: viewMode === 'side-by-side' }"
              title="Side-by-Side Comparison"
              @click="viewMode = 'side-by-side'"
            >
              <Columns2 :size="14" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: viewMode === 'unified' }"
              title="Unified Stream View"
              @click="viewMode = 'unified'"
            >
              <Rows3 :size="14" />
              <span>Unified</span>
            </button>
          </div>
        </div>

        <!-- Mobile Side-by-side Column Switcher (Visible on narrow viewports) -->
        <div v-if="viewMode === 'side-by-side'" class="control-group mobile-column-tabs">
          <label class="control-label">Pane:</label>
          <div class="segment-group">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: mobileSideTab === 'both' }"
              @click="mobileSideTab = 'both'"
            >
              Split
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: mobileSideTab === 'left' }"
              @click="mobileSideTab = 'left'"
            >
              Base
            </button>
            <button
              type="button"
              class="segment-btn"
              :class="{ active: mobileSideTab === 'right' }"
              @click="mobileSideTab = 'right'"
            >
              Modified
            </button>
          </div>
        </div>

        <!-- Sample Preset Selection -->
        <div class="control-group sample-presets-group">
          <label class="control-label">Samples:</label>
          <div class="segment-group">
            <button
              type="button"
              class="segment-btn"
              @click="handleLoadPreset('apiResponse')"
            >
              API Sample
            </button>
            <button
              type="button"
              class="segment-btn"
              @click="handleLoadPreset('config')"
            >
              Config Sample
            </button>
          </div>
        </div>

        <!-- Quick Toggles -->
        <div class="toggle-control">
          <M3Switch
            v-model="sortKeys"
            label="Sort Keys"
          />
        </div>

        <div class="toggle-control">
          <M3Switch
            v-model="collapseUnchanged"
            label="Collapse Unchanged"
          />
        </div>

        <div class="toggle-control">
          <button
            type="button"
            class="mode-toggle-btn"
            :class="{ active: editMode }"
            @click="editMode = !editMode"
          >
            <component :is="editMode ? Eye : Edit3" :size="14" />
            <span>{{ editMode ? 'Diff View' : 'Edit Input' }}</span>
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Diff Jumping Navigator -->
        <div v-if="diffResult?.markers.length" class="diff-navigator">
          <span class="diff-counter">
            Diff <strong>{{ currentDiffIndex }}</strong> of {{ diffResult.markers.length }}
          </span>
          <button
            type="button"
            class="nav-arrow-btn"
            title="Previous Difference"
            @click="handlePrevDiff"
          >
            <ChevronUp :size="15" />
          </button>
          <button
            type="button"
            class="nav-arrow-btn"
            title="Next Difference"
            @click="handleNextDiff"
          >
            <ChevronDown :size="15" />
          </button>
        </div>

        <M3Button
          variant="tonal"
          title="Swap Left and Right JSON"
          @click="handleSwap"
        >
          <template #icon>
            <ArrowLeftRight :size="14" />
          </template>
          Swap
        </M3Button>

        <M3Button
          variant="tonal"
          title="Copy Diff Report / Patch"
          @click="handleCopyDiff"
        >
          <template #icon>
            <component :is="isCopied ? Check : Copy" :size="14" />
          </template>
          {{ isCopied ? 'Copied' : 'Copy Patch' }}
        </M3Button>

        <M3Button
          variant="outlined"
          title="Clear Inputs"
          @click="handleClear"
        >
          <template #icon>
            <RotateCcw :size="14" />
          </template>
          Clear
        </M3Button>

        <!-- Fullscreen / Maximize Toggle Button -->
        <M3Button
          :variant="isFullscreen ? 'filled' : 'tonal'"
          :title="isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Mode'"
          class="fullscreen-toggle-btn"
          @click="toggleFullscreen"
        >
          <template #icon>
            <component :is="isFullscreen ? Minimize2 : Maximize2" :size="14" />
          </template>
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </M3Button>
      </div>
    </div>

    <!-- Summary Stats Bar -->
    <div v-if="diffResult" class="diff-stats-bar">
      <div class="stats-left">
        <!-- Match / Equality Badge -->
        <div
          class="status-badge"
          :class="diffResult.areEqual ? 'badge-identical' : 'badge-different'"
        >
          <component :is="diffResult.areEqual ? FileCheck2 : FileX2" :size="14" />
          <span>{{ diffResult.areEqual ? '100% Identical' : `${diffResult.stats.similarityPercentage}% Similarity` }}</span>
        </div>

        <!-- Additions -->
        <div class="stat-pill stat-added" title="Added Lines">
          <span class="stat-symbol">+</span>
          <span>{{ diffResult.stats.additions }} Added</span>
        </div>

        <!-- Deletions -->
        <div class="stat-pill stat-removed" title="Deleted Lines">
          <span class="stat-symbol">-</span>
          <span>{{ diffResult.stats.deletions }} Deleted</span>
        </div>

        <!-- Modifications -->
        <div class="stat-pill stat-modified" title="Modified Lines">
          <span class="stat-symbol">~</span>
          <span>{{ diffResult.stats.modifications }} Modified</span>
        </div>

        <!-- Total Changes -->
        <span class="stat-meta">
          Total differences: <strong>{{ diffResult.stats.totalDifferences }}</strong> ({{ diffResult.stats.leftLinesCount }} vs {{ diffResult.stats.rightLinesCount }} lines)
        </span>
      </div>

      <div class="stats-right">
        <button
          type="button"
          class="structural-toggle-btn"
          :class="{ active: showStructural }"
          @click="showStructural = !showStructural"
        >
          <Table :size="14" />
          <span>Structural Breakdown ({{ diffResult.structuralDiff.length }})</span>
        </button>
        <span v-if="execTimeMs !== null" class="exec-time-pill">
          {{ execTimeMs }} ms
        </span>
      </div>
    </div>

    <!-- MAIN DIFF WORKSPACE -->
    <div class="diff-workspace">
      <!-- EDIT MODE: Raw Inputs Side-by-Side -->
      <template v-if="editMode">
        <div class="edit-mode-grid">
          <div class="edit-panel">
            <div class="panel-header">
              <span class="panel-title">Original (Base) JSON</span>
              <span v-if="!diffResult?.leftValid" class="panel-error">Invalid JSON format</span>
            </div>
            <textarea
              v-model="leftJson"
              class="raw-json-textarea"
              placeholder="Paste original JSON here..."
              spellcheck="false"
            ></textarea>
          </div>

          <div class="edit-panel">
            <div class="panel-header">
              <span class="panel-title">Modified (Comparison) JSON</span>
              <span v-if="!diffResult?.rightValid" class="panel-error">Invalid JSON format</span>
            </div>
            <textarea
              v-model="rightJson"
              class="raw-json-textarea"
              placeholder="Paste modified JSON here..."
              spellcheck="false"
            ></textarea>
          </div>
        </div>
      </template>

      <!-- VISUAL DIFF VIEWER MODE -->
      <template v-else>
        <!-- SIDE-BY-SIDE VIEW -->
        <div
          v-if="viewMode === 'side-by-side'"
          class="side-by-side-viewer"
          :class="`mobile-tab-${mobileSideTab}`"
        >
          <!-- Left Column: Base -->
          <div
            class="diff-column left-column"
            :class="{ 'mobile-hidden': mobileSideTab === 'right' }"
          >
            <div class="column-header">
              <div class="header-indicator base-dot"></div>
              <span class="column-title">Original (Base)</span>
              <span class="line-badge">{{ diffResult?.leftLines.length || 0 }} rows</span>
            </div>

            <div
              ref="leftScrollRef"
              class="diff-scroll-area"
              @scroll="handleLeftScroll"
            >
              <div
                v-for="(row, idx) in diffResult?.leftLines"
                :id="`diff-row-${idx}`"
                :key="row.id"
                class="diff-row"
                :class="[
                  `row-${row.type}`,
                  { 'is-collapsed': row.isCollapsedPlaceholder },
                  { 'pulse-highlight': highlightedRowId === `diff-row-${idx}` }
                ]"
              >
                <!-- Gutter: Line Number & Change Marker -->
                <div class="diff-gutter">
                  <span class="line-no">{{ row.leftLineNumber !== undefined ? row.leftLineNumber : '' }}</span>
                  <span class="change-symbol">
                    <template v-if="row.type === 'removed'">-</template>
                    <template v-else-if="row.type === 'modified'">~</template>
                  </span>
                </div>

                <!-- Code Content with inline diff highlighting -->
                <div class="code-line">
                  <template v-if="row.inlineDiffs && row.inlineDiffs.length">
                    <span
                      v-for="(chunk, cIdx) in row.inlineDiffs"
                      :key="cIdx"
                      :class="`inline-${chunk.type}`"
                    >{{ chunk.text }}</span>
                  </template>
                  <template v-else>
                    {{ row.content }}
                  </template>
                </div>
              </div>

              <div v-if="!diffResult?.leftLines.length" class="empty-placeholder">
                Paste JSON in Edit Mode or select a Preset above to compare.
              </div>
            </div>
          </div>

          <!-- Right Column: Modified -->
          <div
            class="diff-column right-column"
            :class="{ 'mobile-hidden': mobileSideTab === 'left' }"
          >
            <div class="column-header">
              <div class="header-indicator modified-dot"></div>
              <span class="column-title">Modified (Comparison)</span>
              <span class="line-badge">{{ diffResult?.rightLines.length || 0 }} rows</span>
            </div>

            <div
              ref="rightScrollRef"
              class="diff-scroll-area"
              @scroll="handleRightScroll"
            >
              <div
                v-for="(row, idx) in diffResult?.rightLines"
                :id="`diff-row-right-${idx}`"
                :key="row.id"
                class="diff-row"
                :class="[
                  `row-${row.type}`,
                  { 'is-collapsed': row.isCollapsedPlaceholder },
                  { 'pulse-highlight': highlightedRowId === `diff-row-right-${idx}` }
                ]"
              >
                <!-- Gutter: Line Number & Change Marker -->
                <div class="diff-gutter">
                  <span class="line-no">{{ row.rightLineNumber !== undefined ? row.rightLineNumber : '' }}</span>
                  <span class="change-symbol">
                    <template v-if="row.type === 'added'">+</template>
                    <template v-else-if="row.type === 'modified'">~</template>
                  </span>
                </div>

                <!-- Code Content with inline diff highlighting -->
                <div class="code-line">
                  <template v-if="row.inlineDiffs && row.inlineDiffs.length">
                    <span
                      v-for="(chunk, cIdx) in row.inlineDiffs"
                      :key="cIdx"
                      :class="`inline-${chunk.type}`"
                    >{{ chunk.text }}</span>
                  </template>
                  <template v-else>
                    {{ row.content }}
                  </template>
                </div>
              </div>

              <div v-if="!diffResult?.rightLines.length" class="empty-placeholder">
                Paste JSON in Edit Mode or select a Preset above to compare.
              </div>
            </div>
          </div>

          <!-- Minimap / Gutter Rail -->
          <div class="diff-minimap-rail" title="Visual Minimap (Click to jump)">
            <div
              v-for="marker in diffResult?.markers"
              :key="marker.index"
              class="minimap-tick"
              :class="`tick-${marker.type}`"
              :style="{ top: `${marker.percentage}%` }"
              :title="marker.label"
              @click="jumpToDiff(marker.index)"
            ></div>
          </div>
        </div>

        <!-- UNIFIED VIEW -->
        <div v-else-if="viewMode === 'unified'" class="unified-viewer">
          <div class="column-header">
            <span class="column-title">Unified Stream View</span>
            <span class="line-badge">{{ diffResult?.unifiedLines.length || 0 }} stream lines</span>
          </div>

          <div class="unified-scroll-area">
            <div
              v-for="(row, idx) in diffResult?.unifiedLines"
              :id="`diff-row-${idx}`"
              :key="row.id"
              class="unified-row"
              :class="[
                `row-${row.type}`,
                { 'pulse-highlight': highlightedRowId === `diff-row-${idx}` }
              ]"
            >
              <div class="unified-gutter">
                <span class="gutter-left">{{ row.leftLineNumber !== undefined ? row.leftLineNumber : '' }}</span>
                <span class="gutter-right">{{ row.rightLineNumber !== undefined ? row.rightLineNumber : '' }}</span>
                <span class="gutter-sym">
                  <template v-if="row.type === 'added'">+</template>
                  <template v-else-if="row.type === 'removed'">-</template>
                  <template v-else>&nbsp;</template>
                </span>
              </div>

              <div class="code-line">
                <template v-if="row.inlineDiffs && row.inlineDiffs.length">
                  <span
                    v-for="(chunk, cIdx) in row.inlineDiffs"
                    :key="cIdx"
                    :class="`inline-${chunk.type}`"
                  >{{ chunk.text }}</span>
                </template>
                <template v-else>
                  {{ row.content }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- STRUCTURAL RESIZE SPLITTER HANDLE -->
      <div
        v-if="showStructural && diffResult?.structuralDiff.length && !isPanelMaximized"
        class="structural-resize-handle"
        :class="{ 'is-dragging': isPanelDragging }"
        title="Drag up/down to adjust breakdown height (Double click to maximize)"
        @mousedown="startPanelDrag"
        @touchstart.passive="startPanelDrag"
        @dblclick="togglePanelMaximize"
      >
        <div class="resize-handle-bar"></div>
      </div>

      <!-- STRUCTURAL DIFFERENCES BREAKDOWN PANEL -->
      <div
        v-if="showStructural && diffResult?.structuralDiff.length"
        class="structural-panel"
        :class="{ 'is-maximized': isPanelMaximized }"
        :style="{ height: isPanelMaximized ? undefined : `${structuralPanelHeight}px` }"
      >
        <!-- Header -->
        <div class="structural-header">
          <div class="header-left">
            <Layers :size="15" class="primary-icon" />
            <span class="sec-title">Structural JSON Breakdown</span>
            <span class="count-tag">{{ diffResult.structuralDiff.length }} Changes</span>

            <!-- Quick Height Presets -->
            <div class="panel-presets-group">
              <button
                type="button"
                class="preset-btn"
                :class="{ active: !isPanelMaximized && structuralPanelHeight <= 180 }"
                title="Compact Height (160px)"
                @click="setPanelPreset(160)"
              >
                160px
              </button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: !isPanelMaximized && structuralPanelHeight > 180 && structuralPanelHeight <= 300 }"
                title="Standard Height (260px)"
                @click="setPanelPreset(260)"
              >
                260px
              </button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: !isPanelMaximized && structuralPanelHeight > 300 }"
                title="Expanded Height (420px)"
                @click="setPanelPreset(420)"
              >
                420px
              </button>
            </div>
          </div>

          <div class="header-right">
            <!-- Sizing buttons: Increase & Decrease -->
            <div class="panel-action-group">
              <button
                type="button"
                class="panel-icon-btn"
                title="Decrease Height (-80px)"
                @click="decreasePanelHeight()"
              >
                <Minus :size="13" />
              </button>
              <button
                type="button"
                class="panel-icon-btn"
                title="Increase Height (+80px)"
                @click="increasePanelHeight()"
              >
                <Plus :size="13" />
              </button>
              <button
                type="button"
                class="panel-icon-btn"
                :class="{ active: isPanelMaximized }"
                :title="isPanelMaximized ? 'Restore Down' : 'Maximize Breakdown View'"
                @click="togglePanelMaximize"
              >
                <component :is="isPanelMaximized ? Minimize2 : Maximize2" :size="13" />
              </button>
            </div>

            <!-- Close Panel -->
            <button
              type="button"
              class="close-mini-btn"
              title="Close panel"
              @click="showStructural = false"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="structural-subbar">
          <div class="subbar-left">
            <!-- Search input -->
            <div class="search-box">
              <Search :size="13" class="search-icon" />
              <input
                v-model="filterQuery"
                type="text"
                class="search-input"
                placeholder="Filter by path or change..."
                spellcheck="false"
              />
              <button
                v-if="filterQuery"
                type="button"
                class="clear-search-btn"
                @click="filterQuery = ''"
              >
                ✕
              </button>
            </div>

            <!-- Filter Type Chips -->
            <div class="filter-chips">
              <button
                type="button"
                class="filter-chip"
                :class="{ active: filterType === 'all' }"
                @click="filterType = 'all'"
              >
                All ({{ structuralCounts.all }})
              </button>
              <button
                v-if="structuralCounts.added > 0"
                type="button"
                class="filter-chip chip-added"
                :class="{ active: filterType === 'added' }"
                @click="filterType = 'added'"
              >
                +Added ({{ structuralCounts.added }})
              </button>
              <button
                v-if="structuralCounts.removed > 0"
                type="button"
                class="filter-chip chip-removed"
                :class="{ active: filterType === 'removed' }"
                @click="filterType = 'removed'"
              >
                -Removed ({{ structuralCounts.removed }})
              </button>
              <button
                v-if="structuralCounts.modified > 0"
                type="button"
                class="filter-chip chip-modified"
                :class="{ active: filterType === 'modified' }"
                @click="filterType = 'modified'"
              >
                ~Modified ({{ structuralCounts.modified }})
              </button>
              <button
                v-if="structuralCounts.type_changed > 0"
                type="button"
                class="filter-chip chip-type-changed"
                :class="{ active: filterType === 'type_changed' }"
                @click="filterType = 'type_changed'"
              >
                !Type ({{ structuralCounts.type_changed }})
              </button>
            </div>
          </div>

          <div class="subbar-right">
            <!-- Export Options -->
            <button
              type="button"
              class="subbar-btn"
              title="Copy as Markdown Table"
              @click="copyStructuralAsMarkdown"
            >
              <Copy :size="12" />
              <span>Copy MD</span>
            </button>
            <button
              type="button"
              class="subbar-btn"
              title="Copy as CSV"
              @click="copyStructuralAsCsv"
            >
              <FileSpreadsheet :size="12" />
              <span>Copy CSV</span>
            </button>
          </div>
        </div>

        <!-- Table View -->
        <div class="structural-table-container">
          <table class="structural-table">
            <thead>
              <tr>
                <th style="width: 130px;">Type</th>
                <th style="width: 240px;">JSON Path</th>
                <th>Description / Value Changes</th>
                <th style="width: 70px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredStructuralDiff"
                :key="item.id"
                :class="`struct-row-${item.type}`"
                class="clickable-struct-row"
                title="Click to jump to line in diff viewer"
                @click="handleStructuralRowClick(item)"
              >
                <td>
                  <span class="struct-type-pill" :class="`pill-${item.type}`">
                    {{ item.type.replace('_', ' ').toUpperCase() }}
                  </span>
                </td>
                <td class="path-cell">
                  <div class="path-wrapper">
                    <code>{{ item.path }}</code>
                    <button
                      type="button"
                      class="copy-path-btn"
                      title="Copy JSON Path"
                      @click.stop="copyPath(item.path, item.id)"
                    >
                      <component :is="copiedPathId === item.id ? Check : Copy" :size="11" />
                    </button>
                  </div>
                </td>
                <td class="message-cell">
                  <div class="message-wrapper">
                    <span class="message-text">{{ item.message }}</span>
                    <span v-if="item.oldValue !== undefined && item.newValue !== undefined" class="diff-val-preview">
                      <span class="val-old">{{ JSON.stringify(item.oldValue) }}</span>
                      <span class="val-arrow">&rarr;</span>
                      <span class="val-new">{{ JSON.stringify(item.newValue) }}</span>
                    </span>
                  </div>
                </td>
                <td class="action-cell">
                  <button
                    type="button"
                    class="jump-pill-btn"
                    title="Jump to line"
                    @click.stop="handleStructuralRowClick(item)"
                  >
                    Jump
                  </button>
                </td>
              </tr>

              <tr v-if="!filteredStructuralDiff.length">
                <td colspan="4" class="empty-struct-search">
                  No structural changes match your search filter.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-diff-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  flex: 1;
  min-height: 0;
  gap: 10px;
  position: relative;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Fullscreen / Maximized Mode */
.json-diff-container.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  background-color: var(--md-sys-color-surface);
  padding: 1rem 1.25rem;
  box-sizing: border-box;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.json-diff-container.is-fullscreen .diff-workspace {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.json-diff-container.is-fullscreen .side-by-side-viewer,
.json-diff-container.is-fullscreen .unified-viewer,
.json-diff-container.is-fullscreen .edit-mode-grid {
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* Toolbar */
.diff-toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 36px;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.25rem 0.625rem;
  overflow-x: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  flex-shrink: 0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.segment-group {
  display: inline-flex;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.segment-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.segment-btn.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.mode-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.mode-toggle-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.diff-navigator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  padding: 2px 6px;
}

.diff-counter {
  font-size: 11px;
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
}

.nav-arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.nav-arrow-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
}

.fullscreen-toggle-btn {
  font-weight: 600;
}

/* Stats Bar */
.diff-stats-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  padding: 6px 12px;
}

.stats-left,
.stats-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 6px;
}

.badge-identical {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-different {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
}

.stat-symbol {
  font-weight: 800;
}

.stat-added {
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.stat-removed {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.stat-modified {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.stat-meta {
  font-size: 11.5px;
  color: var(--md-sys-color-on-surface-variant);
  margin-left: 4px;
}

.structural-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.structural-toggle-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.exec-time-pill {
  font-size: 11px;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-high);
  padding: 2px 7px;
  border-radius: 4px;
}

/* Diff Workspace */
.diff-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  gap: 10px;
}

/* Edit Mode Grid */
.edit-mode-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.edit-panel {
  display: flex;
  flex-direction: column;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
  overflow: hidden;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-size: 12px;
  font-weight: 600;
}

.panel-error {
  color: var(--md-sys-color-error);
  font-size: 11px;
}

.raw-json-textarea {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 14px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

/* Side-by-side visual viewer */
.side-by-side-viewer {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
  overflow: hidden;
  padding-right: 16px; /* Room for minimap */
}

.diff-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  border-right: 1px solid var(--md-sys-color-outline-variant);
  overflow: hidden;
}


.diff-column:last-of-type {
  border-right: none;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-size: 12px;
  font-weight: 600;
}

.header-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.base-dot {
  background: #3b82f6;
}

.modified-dot {
  background: #22c55e;
}

.line-badge {
  font-size: 11px;
  color: var(--md-sys-color-on-surface-variant);
  margin-left: auto;
}

.diff-scroll-area,
.unified-scroll-area {
  flex: 1;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace;
  font-size: 12.5px;
  line-height: 1.6;
  background: var(--md-sys-color-surface-container-lowest);
}

.diff-row,
.unified-row {
  display: flex;
  align-items: stretch;
  min-height: 22px;
  white-space: pre;
  border-left: 3px solid transparent;
}

.diff-row:hover,
.unified-row:hover {
  filter: brightness(1.04);
}

.row-added {
  background: rgba(34, 197, 94, 0.12);
  border-left-color: #22c55e;
}

.row-removed {
  background: rgba(239, 68, 68, 0.12);
  border-left-color: #ef4444;
}

.row-modified {
  background: rgba(245, 158, 11, 0.12);
  border-left-color: #f59e0b;
}

.row-unchanged {
  background: transparent;
}

.is-collapsed {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-style: italic;
  font-size: 11px;
}

.diff-gutter {
  display: flex;
  width: 58px;
  flex-shrink: 0;
  user-select: none;
  background: var(--md-sys-color-surface-container-low);
  border-right: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  padding: 0 4px;
}

.line-no {
  flex: 1;
  text-align: right;
  padding-right: 6px;
  font-size: 11px;
  opacity: 0.7;
}

.change-symbol {
  width: 14px;
  text-align: center;
  font-weight: 800;
}

.row-added .change-symbol {
  color: #22c55e;
}

.row-removed .change-symbol {
  color: #ef4444;
}

.row-modified .change-symbol {
  color: #f59e0b;
}

.code-line {
  flex: 1;
  padding: 0 10px;
  overflow-x: auto;
}

/* Inline Highlights */
.inline-added {
  background: rgba(34, 197, 94, 0.3);
  color: #4ade80;
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 600;
}

.inline-removed {
  background: rgba(239, 68, 68, 0.3);
  color: #f87171;
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 600;
  text-decoration: line-through;
}

/* Unified View */
.unified-viewer {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
  overflow: hidden;
}

.unified-gutter {
  display: flex;
  width: 86px;
  flex-shrink: 0;
  user-select: none;
  background: var(--md-sys-color-surface-container-low);
  border-right: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  padding: 0 4px;
}

.gutter-left,
.gutter-right {
  width: 32px;
  text-align: right;
  padding-right: 4px;
  font-size: 11px;
  opacity: 0.7;
}

.gutter-sym {
  width: 14px;
  text-align: center;
  font-weight: 800;
}

/* Minimap Rail */
.diff-minimap-rail {
  position: absolute;
  top: 34px;
  right: 0;
  bottom: 0;
  width: 14px;
  background: var(--md-sys-color-surface-container-high);
  border-left: 1px solid var(--md-sys-color-outline-variant);
  cursor: pointer;
}

.minimap-tick {
  position: absolute;
  left: 2px;
  right: 2px;
  height: 4px;
  border-radius: 2px;
  transform: translateY(-50%);
  cursor: pointer;
}

.tick-added {
  background: #22c55e;
}

.tick-removed {
  background: #ef4444;
}

.tick-modified {
  background: #f59e0b;
}

/* Pulse highlight for row jumped from structural breakdown */
.pulse-highlight {
  animation: pulse-glow 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes pulse-glow {
  0% {
    background-color: var(--md-sys-color-primary-container) !important;
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: -2px;
  }
  60% {
    background-color: rgba(99, 102, 241, 0.25) !important;
    outline: 2px solid rgba(99, 102, 241, 0.5);
    outline-offset: -2px;
  }
  100% {
    background-color: transparent;
    outline: none;
  }
}

/* Structural Resize Handle */
.structural-resize-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 8px;
  cursor: row-resize;
  background: transparent;
  user-select: none;
  margin: 2px 0 -4px 0;
  z-index: 10;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.structural-resize-handle:hover,
.structural-resize-handle.is-dragging {
  background: var(--md-sys-color-surface-container-highest);
}

.resize-handle-bar {
  width: 44px;
  height: 3.5px;
  border-radius: 2px;
  background: var(--md-sys-color-outline-variant);
  transition: background 0.15s ease, width 0.15s ease;
}

.structural-resize-handle:hover .resize-handle-bar,
.structural-resize-handle.is-dragging .resize-handle-bar {
  background: var(--md-sys-color-primary);
  width: 72px;
}

/* Structural Breakdown Panel */
.structural-panel {
  display: flex;
  flex-direction: column;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  min-height: 120px;
  flex-shrink: 0;
  position: relative;
  transition: height 0.12s ease-out;
}

.structural-panel.is-maximized {
  position: absolute;
  inset: 0;
  height: 100% !important;
  max-height: 100% !important;
  z-index: 40;
  border-radius: 10px;
}

.structural-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
  gap: 8px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sec-title {
  font-size: 12px;
  font-weight: 600;
}

.count-tag {
  font-size: 11px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 600;
}

.panel-presets-group {
  display: inline-flex;
  background: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  margin-left: 6px;
}

.preset-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.preset-btn:hover {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.preset-btn.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.panel-action-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 2px;
}

.panel-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.panel-icon-btn:hover {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.panel-icon-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.close-mini-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.close-mini-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-error);
}

/* Structural Subbar (Filter & Export) */
.structural-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  background: var(--md-sys-color-surface-container-lowest);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
  gap: 8px;
  overflow-x: auto;
}

.subbar-left,
.subbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 0 6px;
  width: 180px;
}

.search-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 11px;
  padding: 3px 4px;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.clear-search-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 0 2px;
  font-size: 10px;
}

.filter-chips {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-chip {
  border: 1px solid var(--md-sys-color-outline-variant);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.filter-chip:hover {
  background: var(--md-sys-color-surface-container-high);
}

.filter-chip.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.subbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.subbar-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

/* Structural Table */
.structural-table-container {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.structural-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
  text-align: left;
}

.structural-table th {
  position: sticky;
  top: 0;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  padding: 6px 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  z-index: 2;
}

.structural-table td {
  padding: 5px 12px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  vertical-align: middle;
}

.clickable-struct-row {
  cursor: pointer;
  transition: background 0.12s ease;
}

.clickable-struct-row:hover {
  background: var(--md-sys-color-surface-container-high);
}

.path-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.path-cell code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: var(--md-sys-color-surface-container-high);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--md-sys-color-primary);
  word-break: break-all;
}

.copy-path-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0.6;
  transition: all 0.12s ease;
}

.copy-path-btn:hover {
  opacity: 1;
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.diff-val-preview {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-family: 'JetBrains Mono', monospace;
}

.val-old {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

.val-arrow {
  color: var(--md-sys-color-on-surface-variant);
  font-weight: bold;
}

.val-new {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

.action-cell {
  text-align: right;
}

.jump-pill-btn {
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.jump-pill-btn:hover {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.empty-struct-search {
  text-align: center;
  padding: 24px 12px;
  color: var(--md-sys-color-on-surface-variant);
  font-style: italic;
}

.struct-type-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.pill-added {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.pill-removed {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.pill-modified {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.pill-type_changed {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.empty-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--md-sys-color-on-surface-variant);
  font-style: italic;
  font-size: 13px;
}

/* Mobile Tabs Switcher */
.mobile-column-tabs {
  display: none;
}

/* Responsive Breakpoints */
@media (max-width: 1280px) {
  .diff-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: flex-start;
  }
}

@media (max-width: 1024px) {
  .mobile-column-tabs {
    display: flex;
  }

  .sample-presets-group {
    display: none;
  }

  .side-by-side-viewer.mobile-tab-both {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .side-by-side-viewer.mobile-tab-left,
  .side-by-side-viewer.mobile-tab-right {
    grid-template-columns: minmax(0, 1fr);
  }

  .diff-column.mobile-hidden {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .json-diff-container {
    min-height: auto;
  }

  .diff-minimap-rail {
    display: none;
  }

  .side-by-side-viewer {
    padding-right: 0;
  }

  .diff-column {
    border-right: none;
  }

  .edit-mode-grid {
    grid-template-columns: 1fr;
    min-height: 400px;
  }

  .diff-workspace {
    min-height: 400px;
  }

  .diff-stats-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-left,
  .stats-right {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
