<script setup lang="ts">
import { onMounted } from 'vue'
import AppTopBar from './AppTopBar.vue'
import AppNavigationRail from './AppNavigationRail.vue'
import AppBottomNav from './AppBottomNav.vue'
import CommandPalette from './CommandPalette.vue'
import PrivacyDialog from './PrivacyDialog.vue'
import PanicDialog from './PanicDialog.vue'
import SnapshotDialog from './SnapshotDialog.vue'
import PwaInstallBanner from './PwaInstallBanner.vue'
import { usePwaStore } from '@/stores/pwa'

const pwaStore = usePwaStore()

onMounted(() => {
  pwaStore.initPwa()
})
</script>

<template>
  <div class="app-layout-root">
    <!-- Top Bar -->
    <AppTopBar />

    <div class="layout-body">
      <!-- Navigation Rail / Sidebar -->
      <AppNavigationRail />

      <!-- Main Application Canvas -->
      <main class="layout-viewport" role="main">
        <slot />
      </main>
    </div>

    <!-- Responsive Bottom Bar (Mobile) -->
    <AppBottomNav />

    <!-- Modals & Overlays -->
    <CommandPalette />
    <PrivacyDialog />
    <PanicDialog />
    <SnapshotDialog />
    <PwaInstallBanner />
  </div>
</template>


<style scoped>
.app-layout-root {
  min-height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-sys-typescale-font-family);
}

.layout-body {
  display: flex;
  flex: 1;
  width: 100%;
  max-width: 100%;
  min-height: calc(100vh - 64px);
  position: relative;
  overflow: hidden;
}

.layout-viewport {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.25rem 1.5rem;
  background-color: var(--md-sys-color-surface);
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .layout-viewport {
    padding: 0.75rem;
    padding-bottom: 5rem; /* Space for bottom nav */
  }
}

</style>
