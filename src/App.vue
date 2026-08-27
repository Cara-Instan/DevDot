<script setup lang="ts">
import { ref } from 'vue'
import {
  ShieldCheck,
  Upload
} from 'lucide-vue-next'

import {
  AppLayout,
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
  width: 100%;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.tool-view-body {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  min-height: 0;
  height: 100%;
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
