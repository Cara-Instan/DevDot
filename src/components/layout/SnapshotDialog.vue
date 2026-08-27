<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  FileArchive,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Check
} from 'lucide-vue-next'
import {
  M3Dialog,
  M3Button,
  M3TextField,
  M3Checkbox
} from '@/components/ui'
import ToolIcon from './ToolIcon.vue'
import { useNavigationStore, useSnapshotStore, ALL_TOOLS, type ToolkitSnapshot } from '@/stores'
import { useNativeIntegration } from '@/composables'

const navStore = useNavigationStore()
const snapshotStore = useSnapshotStore()
const { isNative, exportSnapshotNative, importSnapshotNative } = useNativeIntegration()

const activeTab = ref<'export' | 'import'>('export')
const sessionTitle = ref('DevDot Work Session')
const sessionDescription = ref('Portable developer workspace session exported from DevDot')
const selectedToolIds = ref<string[]>([])

// Import State
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importedSnapshot = ref<ToolkitSnapshot | null>(null)
const importErrors = ref<string[]>([])
const importSuccessMessage = ref<string | null>(null)
const isRestoring = ref(false)

// Sync tab with navigation store trigger (e.g. from top bar Export or Import button)
watch(
  () => navStore.snapshotModalTab,
  (newTab) => {
    activeTab.value = newTab
  },
  { immediate: true }
)

// When opening modal, initialize selected tools for export
watch(
  () => navStore.isSnapshotModalOpen,
  (isOpen) => {
    if (isOpen) {
      importSuccessMessage.value = null
      importErrors.value = []
      importedSnapshot.value = null

      // Default select all tools that have state or default set of tools
      const toolIdsWithState = Object.keys(snapshotStore.toolStates)
      if (toolIdsWithState.length > 0) {
        selectedToolIds.value = [...toolIdsWithState]
      } else {
        selectedToolIds.value = ALL_TOOLS.filter((t) => t.status === 'ready').map((t) => t.id)
      }
    }
  }
)

// Available tools for export selection
const exportableTools = computed(() => {
  return ALL_TOOLS.filter((t) => t.id !== 'system-overview')
})

const isAllSelected = computed(() => {
  return exportableTools.value.every((t) => selectedToolIds.value.includes(t.id))
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedToolIds.value = []
  } else {
    selectedToolIds.value = exportableTools.value.map((t) => t.id)
  }
}

function toggleToolSelection(toolId: string) {
  if (selectedToolIds.value.includes(toolId)) {
    selectedToolIds.value = selectedToolIds.value.filter((id) => id !== toolId)
  } else {
    selectedToolIds.value.push(toolId)
  }
}

// Estimated size
const estimatedPayloadSize = computed(() => {
  const count = selectedToolIds.value.length
  return `${(count * 0.4 + 0.5).toFixed(1)} KB`
})

async function handleExport() {
  const res = await exportSnapshotNative({
    title: sessionTitle.value,
    description: sessionDescription.value,
    selectedToolIds: selectedToolIds.value
  })

  if (res.success) {
    navStore.closeSnapshotModal()
  }
}

async function triggerFileInput() {
  if (isNative.value) {
    const res = await importSnapshotNative()
    if (res.success && res.snapshot) {
      importedSnapshot.value = res.snapshot
      importErrors.value = []
      importSuccessMessage.value = null
    } else if (res.errors || res.message) {
      importErrors.value = res.errors || (res.message ? [res.message] : [])
    }
  } else {
    fileInputRef.value?.click()
  }
}


function processSnapshotText(text: string) {
  importErrors.value = []
  importSuccessMessage.value = null
  importedSnapshot.value = null

  const result = snapshotStore.importSession(text)
  if (result.success && result.data) {
    importedSnapshot.value = result.data
  } else {
    importErrors.value = result.errors || [result.message]
  }
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    processSnapshotText(text)
  }
  reader.readAsText(file)
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    processSnapshotText(text)
  }
  reader.readAsText(file)
}

function handleRestoreSession() {
  if (!importedSnapshot.value) return

  isRestoring.value = true
  const res = snapshotStore.hydrateSession(importedSnapshot.value)
  isRestoring.value = false

  if (res.success) {
    importSuccessMessage.value = res.message
    setTimeout(() => {
      navStore.closeSnapshotModal()
      importSuccessMessage.value = null
      importedSnapshot.value = null
    }, 1200)
  } else {
    importErrors.value = [res.message]
  }
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return isoString
  }
}
</script>

<template>
  <M3Dialog
    :model-value="navStore.isSnapshotModalOpen"
    headline="Portable Session Snapshot (.toolkit)"
    @update:model-value="(val) => !val && navStore.closeSnapshotModal()"
  >
    <template #icon>
      <FileArchive :size="28" style="color: var(--md-sys-color-primary);" />
    </template>

    <div class="snapshot-container">
      <!-- Top Sub-Tabs Switcher -->
      <div class="tab-switcher">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'export' }"
          @click="activeTab = 'export'"
        >
          <Download :size="16" />
          Export Session (.toolkit)
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          <Upload :size="16" />
          Import Session (.toolkit)
        </button>
      </div>

      <!-- ============================================ -->
      <!-- EXPORT TAB                                   -->
      <!-- ============================================ -->
      <div v-if="activeTab === 'export'" class="tab-content">
        <p class="tab-description">
          Export your active workspace state, inputs, and custom configurations into a secure, portable <code>.toolkit</code> file (JSON Schema v1.0.0).
        </p>

        <div class="fields-stack">
          <M3TextField
            v-model="sessionTitle"
            label="Session Title"
            supporting-text="Identifier for this snapshot package"
          />

          <M3TextField
            v-model="sessionDescription"
            label="Session Notes / Description"
            supporting-text="Optional metadata included in export"
          />
        </div>

        <!-- Tool Selection Section -->
        <div class="tools-selection-box">
          <div class="tools-selection-header">
            <div class="tools-selection-title">
              <Layers :size="16" class="header-icon" />
              <span>Select Tools to Include in Snapshot:</span>
            </div>
            <button
              type="button"
              class="select-all-btn"
              @click="toggleSelectAll"
            >
              {{ isAllSelected ? 'Deselect All' : 'Select All' }}
            </button>
          </div>

          <div class="tools-checklist-grid">
            <div
              v-for="tool in exportableTools"
              :key="tool.id"
              class="tool-checkbox-item"
              :class="{ selected: selectedToolIds.includes(tool.id) }"
              @click="toggleToolSelection(tool.id)"
            >
              <M3Checkbox
                :model-value="selectedToolIds.includes(tool.id)"
                @update:model-value="() => toggleToolSelection(tool.id)"
              />
              <ToolIcon :name="tool.icon" :size="18" class="tool-item-icon" />
              <div class="tool-item-meta">
                <span class="tool-item-name">{{ tool.name }}</span>
                <span v-if="snapshotStore.toolStates[tool.id]" class="state-badge">Active State</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Card & Privacy Guarantee -->
        <div class="info-card">
          <FileCode2 :size="20" class="info-icon" />
          <div class="info-text">
            <span>Snapshot Format: <strong>JSON Schema Draft 2020-12 (.toolkit v1.0.0)</strong></span>
            <small>100% Client-side serialization. ~{{ estimatedPayloadSize }} • Zero cloud uploads.</small>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- IMPORT TAB                                   -->
      <!-- ============================================ -->
      <div v-else class="tab-content">
        <p class="tab-description">
          Drop or select a <code>.toolkit</code> session file to restore previous workspace states, editor contents, and tool settings.
        </p>

        <input
          ref="fileInputRef"
          type="file"
          accept=".toolkit,.json"
          style="display: none"
          @change="handleFileChange"
        />

        <!-- Interactive Drag & Drop Zone -->
        <div
          class="drop-zone"
          :class="{ 'is-dragging': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
        >
          <Upload :size="32" class="upload-icon" />
          <span class="upload-title">Choose or Drag & Drop .toolkit File</span>
          <span class="upload-subtitle">Click here to browse file from your computer</span>
        </div>

        <!-- Validation Errors Box -->
        <div v-if="importErrors.length > 0" class="feedback-box error">
          <AlertTriangle :size="20" class="feedback-icon" />
          <div class="feedback-text">
            <strong>Snapshot Validation Failed:</strong>
            <ul class="error-list">
              <li v-for="(err, idx) in importErrors" :key="idx">{{ err }}</li>
            </ul>
          </div>
        </div>

        <!-- Success Toast Feedback -->
        <div v-if="importSuccessMessage" class="feedback-box success">
          <CheckCircle2 :size="20" class="feedback-icon" />
          <div class="feedback-text">
            <strong>Restoration Successful!</strong>
            <span>{{ importSuccessMessage }}</span>
          </div>
        </div>

        <!-- Snapshot Inspection Card (when valid file is loaded) -->
        <div v-if="importedSnapshot && !importSuccessMessage" class="snapshot-preview-card">
          <div class="preview-header">
            <div class="preview-title-row">
              <Sparkles :size="18" class="preview-icon" />
              <span class="preview-headline">{{ importedSnapshot.metadata?.title || 'Imported Workspace Snapshot' }}</span>
            </div>
            <span class="schema-badge">Schema v{{ importedSnapshot.schemaVersion }}</span>
          </div>

          <p v-if="importedSnapshot.metadata?.description" class="preview-desc">
            {{ importedSnapshot.metadata.description }}
          </p>

          <div class="preview-meta-grid">
            <div class="meta-item">
              <Calendar :size="14" />
              <span>Created: {{ formatDate(importedSnapshot.createdAt) }}</span>
            </div>
            <div class="meta-item">
              <Layers :size="14" />
              <span>{{ importedSnapshot.tabs.length }} Tool Session(s)</span>
            </div>
          </div>

          <!-- Included Tool Chips -->
          <div class="included-tools-list">
            <span class="tools-label">Included Modules:</span>
            <div class="chips-row">
              <div
                v-for="tab in importedSnapshot.tabs"
                :key="tab.id"
                class="module-chip"
                :class="{ active: tab.toolId === importedSnapshot.activeTabId }"
              >
                <ToolIcon
                  :name="ALL_TOOLS.find(t => t.id === tab.toolId)?.icon || 'Code2'"
                  :size="14"
                />
                <span>{{ tab.title }}</span>
                <span v-if="tab.toolId === importedSnapshot.activeTabId" class="active-dot" title="Active Tab">•</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Action Buttons -->
    <template #actions>
      <M3Button variant="text" @click="navStore.closeSnapshotModal()">
        Cancel
      </M3Button>

      <M3Button
        v-if="activeTab === 'export'"
        variant="filled"
        :disabled="selectedToolIds.length === 0"
        @click="handleExport"
      >
        <template #icon>
          <Download :size="16" />
        </template>
        Download .toolkit
      </M3Button>

      <M3Button
        v-else-if="activeTab === 'import' && importedSnapshot"
        variant="filled"
        :disabled="isRestoring"
        @click="handleRestoreSession"
      >
        <template #icon>
          <RefreshCw v-if="isRestoring" :size="16" class="spin-icon" />
          <Check v-else :size="16" />
        </template>
        Restore Session
      </M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.snapshot-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-family: var(--md-sys-typescale-font-family);
  min-width: 480px;
  max-width: 100%;
}

@media (max-width: 600px) {
  .snapshot-container {
    min-width: 100%;
  }
}

.tab-switcher {
  display: flex;
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.25rem;
  border-radius: var(--md-sys-shape-corner-medium);
  gap: 0.25rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-small);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-primary);
  font-weight: 600;
  box-shadow: var(--md-sys-elevation-level1);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.tab-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.45;
}

.tab-description code {
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-family: monospace;
  color: var(--md-sys-color-primary);
}

.fields-stack {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.tools-selection-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
}

.tools-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tools-selection-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.header-icon {
  color: var(--md-sys-color-primary);
}

.select-all-btn {
  font-size: 0.75rem;
  font-weight: 600;
  background: transparent;
  border: none;
  color: var(--md-sys-color-primary);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}

.select-all-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.tools-checklist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  max-height: 180px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.tool-checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-checkbox-item:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.tool-checkbox-item.selected {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-high);
}

.tool-item-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.tool-item-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tool-item-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.state-badge {
  font-size: 0.625rem;
  color: var(--md-sys-color-primary);
  font-weight: 600;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
}

.info-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.info-text {
  display: flex;
  flex-direction: column;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
}

.info-text small {
  color: var(--md-sys-color-on-surface-variant);
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.25rem 1.5rem;
  border: 2px dashed var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-lowest);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.drop-zone:hover,
.drop-zone.is-dragging {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-low);
}

.upload-icon {
  color: var(--md-sys-color-primary);
  margin-bottom: 0.625rem;
}

.upload-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.upload-subtitle {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 0.25rem;
}

.feedback-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.8125rem;
}

.feedback-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.feedback-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error-list {
  margin: 0.25rem 0 0 1.25rem;
  padding: 0;
  font-size: 0.75rem;
}

.feedback-box.success {
  background-color: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.feedback-box.error {
  background-color: rgba(239, 68, 68, 0.12);
  color: var(--md-sys-color-error);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.snapshot-preview-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-icon {
  color: var(--md-sys-color-primary);
}

.preview-headline {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.schema-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.preview-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface-variant);
}

.preview-meta-grid {
  display: flex;
  gap: 1.5rem;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.included-tools-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.tools-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.module-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  background-color: var(--md-sys-color-surface-container-high);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.module-chip.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.active-dot {
  color: var(--md-sys-color-primary);
  font-weight: bold;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
