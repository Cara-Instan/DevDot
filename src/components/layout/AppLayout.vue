<script setup lang="ts">
import { onMounted } from 'vue'
import AppTopBar from './AppTopBar.vue'
import AppNavigationDrawer from './AppNavigationDrawer.vue'
import AppBottomNav from './AppBottomNav.vue'
import CommandPalette from './CommandPalette.vue'
import PrivacyDialog from './PrivacyDialog.vue'
import PanicDialog from './PanicDialog.vue'
import SnapshotDialog from './SnapshotDialog.vue'
import SettingsDialog from './SettingsDialog.vue'
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
      <!-- Main Application Canvas (100% Full-Width) -->
      <main class="layout-viewport" role="main">
        <slot />
      </main>
    </div>

    <!-- Slide-Over Navigation Flyout Drawer (On-Demand) -->
    <AppNavigationDrawer />

    <!-- Responsive Bottom Bar (Mobile) -->
    <AppBottomNav />

    <!-- Modals & Overlays -->
    <CommandPalette />
    <PrivacyDialog />
    <PanicDialog />
    <SnapshotDialog />
    <SettingsDialog />
    <PwaInstallBanner />
  </div>
</template>


<style scoped>
.app-layout-root {
  height: 100vh;
  width: 100%;
  max-width: 100vw;
  overflow: hidden;
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
  height: calc(100vh - 42px);
  min-height: 0;
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.layout-viewport {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 1.25rem;
  background-color: var(--md-sys-color-surface);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .layout-viewport {
    padding: 0.75rem;
    padding-bottom: 5rem; /* Space for bottom nav */
  }
}
</style>
