<script setup lang="ts">
import { ref } from 'vue'
import {
  ShieldCheck,
  Search,
  Upload
} from 'lucide-vue-next'

import {
  AppLayout,
  ToolIcon,
  M3Button,
  M3Dialog
} from '@/components'
import {
  OverviewView,
  JsonFormatterView,
  JsonSchemaView,
  JsonDiffView,
  EncoderDecoderView,
  HashGeneratorView,
  JwtDebuggerView,
  MultiTranspilerView,
  CurlConverterView,
  PiiRedactorView
} from '@/modules'
import { useNativeIntegration } from '@/composables'
import { useNavigationStore } from '@/stores'

const navStore = useNavigationStore()
const { isDraggingNative } = useNativeIntegration()
const isDialogOpen = ref(false)
</script>

<template>
  <AppLayout>
    <!-- Main View Content -->
    <div class="app-main-container">
      <!-- SYSTEM OVERVIEW & WORKSPACE HUB (HERO & CATALOG) -->
      <template v-if="navStore.activeToolId === 'system-overview'">
        <OverviewView />
      </template>

      <!-- SPECIFIC TOOL WORKSPACES -->
      <template v-else>
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
                  {{ navStore.activeTool.status === 'ready' ? 'Ready' : 'Upcoming' }}
                </span>
              </div>
              <p class="tool-desc">{{ navStore.activeTool.description }}</p>
            </div>
          </div>

          <div class="header-quick-actions">
            <M3Button
              variant="tonal"
              @click="navStore.selectTool('system-overview')"
            >
              Overview
            </M3Button>
            <M3Button
              variant="filled"
              @click="navStore.openCommandPalette()"
            >
              <template #icon>
                <Search :size="16" />
              </template>
              Search (Ctrl+K)
            </M3Button>
          </div>
        </section>

        <!-- Tool View Module -->
        <div class="tool-view-body">
          <!-- JSON FORMATTER & MINIFIER -->
          <template v-if="navStore.activeToolId === 'json-format'">
            <JsonFormatterView />
          </template>

          <!-- JSON SCHEMA & TYPE GENERATOR -->
          <template v-else-if="navStore.activeToolId === 'json-schema'">
            <JsonSchemaView />
          </template>

          <!-- JSON VISUAL DIFF CHECKER -->
          <template v-else-if="navStore.activeToolId === 'json-diff'">
            <JsonDiffView />
          </template>

          <!-- ENCODERS & DECODERS (BASE64, URL, HEX, HTML) -->
          <template v-else-if="navStore.activeToolId === 'encoders-decoders'">
            <EncoderDecoderView />
          </template>

          <!-- HASH & ID GENERATOR (MD5, SHA1, SHA256, SHA512, UUID, ULID, NANOID) -->
          <template v-else-if="navStore.activeToolId === 'hash-generator'">
            <HashGeneratorView />
          </template>

          <!-- OFFLINE JWT DEBUGGER & INSPECTOR -->
          <template v-else-if="navStore.activeToolId === 'jwt-debugger'">
            <JwtDebuggerView />
          </template>

          <!-- MULTI-FORMAT DATA TRANSPILER (JSON, YAML, TOML, CSV) -->
          <template v-else-if="navStore.activeToolId === 'multi-transpiler'">
            <MultiTranspilerView />
          </template>

          <!-- cURL TO CODE CONVERTER (FETCH, AXIOS, PYTHON, GO) -->
          <template v-else-if="navStore.activeToolId === 'curl-converter'">
            <CurlConverterView />
          </template>

          <!-- PII LOG REDACTOR & SANITIZER -->
          <template v-else-if="navStore.activeToolId === 'pii-redactor'">
            <PiiRedactorView />
          </template>
        </div>
      </template>
    </div>

    <!-- M3 Dialog Component -->
    <M3Dialog
      v-model="isDialogOpen"
      headline="Material 3 Dialog"
    >
      <template #icon>
        <ShieldCheck :size="24" style="color: var(--md-sys-color-primary);" />
      </template>

      <p>
        DevDot operates 100% offline with zero outbound network requests.
      </p>

      <template #actions>
        <M3Button variant="filled" @click="isDialogOpen = false">
          Close
        </M3Button>
      </template>
    </M3Dialog>

    <!-- Native Drag & Drop Fullscreen Overlay -->
    <Transition name="fade">
      <div v-if="isDraggingNative" class="native-drag-overlay">
        <div class="native-drag-box">
          <Upload :size="48" class="drag-icon-pulse" />
          <h3>Drop File to Open in DevDot</h3>
          <p>Drop <code>.toolkit</code> session snapshots, JSON, Code, or Log files anywhere to load</p>
        </div>
      </div>
    </Transition>
  </AppLayout>
</template>

<style scoped>
.app-main-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.tool-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  flex-wrap: wrap;
  gap: 1rem;
}

.tool-header-info {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-width: 0;
  flex: 1;
}

.tool-icon-large {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.65rem;
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
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tool-titles h2 {
  margin: 0;
  font-size: 1.25rem;
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

.tool-desc {
  margin: 0.25rem 0 0 0;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface-variant);
}

.header-quick-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tool-view-body {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  min-height: 0;
}

@media (max-width: 768px) {
  .tool-view-header {
    padding: 0.875rem 1rem;
    gap: 0.75rem;
  }

  .tool-titles h2 {
    font-size: 1.125rem;
  }

  .header-quick-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

.native-drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.native-drag-box {
  background-color: var(--md-sys-color-surface-container-high);
  border: 2px dashed var(--md-sys-color-primary);
  border-radius: var(--md-sys-shape-corner-extra-large);
  padding: 3rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  color: var(--md-sys-color-on-surface);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
}

.drag-icon-pulse {
  color: var(--md-sys-color-primary);
  animation: pulse-bounce 1.5s infinite ease-in-out;
}

@keyframes pulse-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
