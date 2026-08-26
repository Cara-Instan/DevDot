<script setup lang="ts">
import { ref } from 'vue'
import {
  FileArchive,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCode2
} from 'lucide-vue-next'
import { M3Dialog, M3Button, M3TextField } from '@/components/ui'
import { useNavigationStore, useSnapshotStore } from '@/stores'

const navStore = useNavigationStore()
const snapshotStore = useSnapshotStore()

const activeTab = ref<'export' | 'import'>('export')
const sessionTitle = ref('DevDot Work Session')
const importFeedback = ref<{ success: boolean; message: string } | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

function handleExport() {
  const snapshot = snapshotStore.exportSession(sessionTitle.value)
  const filename = `${sessionTitle.value.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.toolkit`
  snapshotStore.downloadSnapshotFile(snapshot, filename)
  navStore.closeSnapshotModal()
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const result = snapshotStore.importSession(text)
    importFeedback.value = {
      success: result.success,
      message: result.message
    }
    if (result.success) {
      setTimeout(() => {
        navStore.closeSnapshotModal()
        importFeedback.value = null
      }, 1500)
    }
  }
  reader.readAsText(file)
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
      <div class="tab-switcher">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'export' }"
          @click="activeTab = 'export'"
        >
          <Download :size="16" />
          Export Sesi
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          <Upload :size="16" />
          Import Sesi
        </button>
      </div>

      <!-- Export Tab -->
      <div v-if="activeTab === 'export'" class="tab-content">
        <p class="tab-description">
          Export seluruh state tab aktif, konfigurasi tools, dan input editor ke dalam satu file terenkripsi <code>.toolkit</code>.
        </p>

        <M3TextField
          v-model="sessionTitle"
          label="Judul Snapshot Sesi"
          supporting-text="Format file: *.toolkit (JSON v1.0.0)"
        />

        <div class="info-card">
          <FileCode2 :size="20" class="info-icon" />
          <div class="info-text">
            <span>Snapshot Engine: <strong>Client-Side Local Blob</strong></span>
            <small>Tidak ada data yang dikirim ke server / cloud.</small>
          </div>
        </div>
      </div>

      <!-- Import Tab -->
      <div v-else class="tab-content">
        <p class="tab-description">
          Pilih atau seret file <code>.toolkit</code> untuk memulihkan seluruh tab dan editor ke kondisi sebelumnya.
        </p>

        <input
          ref="fileInputRef"
          type="file"
          accept=".toolkit,.json"
          style="display: none"
          @change="handleFileChange"
        />

        <div class="drop-zone" @click="triggerFileInput">
          <Upload :size="32" class="upload-icon" />
          <span class="upload-title">Pilih file .toolkit dari komputer</span>
          <span class="upload-subtitle">Klik di sini untuk menelusuri file</span>
        </div>

        <div v-if="importFeedback" class="feedback-box" :class="importFeedback.success ? 'success' : 'error'">
          <component :is="importFeedback.success ? CheckCircle2 : AlertTriangle" :size="18" />
          <span>{{ importFeedback.message }}</span>
        </div>
      </div>
    </div>

    <template #actions>
      <M3Button variant="text" @click="navStore.closeSnapshotModal()">
        Batal
      </M3Button>
      <M3Button
        v-if="activeTab === 'export'"
        variant="filled"
        @click="handleExport"
      >
        <template #icon>
          <Download :size="16" />
        </template>
        Download .toolkit
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
  padding: 0.5rem 1rem;
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
  gap: 1rem;
}

.tab-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.4;
}

.tab-description code {
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-family: monospace;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
}

.info-icon {
  color: var(--md-sys-color-primary);
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
  padding: 2rem 1rem;
  border: 2px dashed var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-surface-container-lowest);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.drop-zone:hover {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-low);
}

.upload-icon {
  color: var(--md-sys-color-primary);
  margin-bottom: 0.5rem;
}

.upload-title {
  font-size: 0.875rem;
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
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.8125rem;
  font-weight: 500;
}

.feedback-box.success {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.feedback-box.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--md-sys-color-error);
  border: 1px solid rgba(239, 68, 68, 0.3);
}
</style>
