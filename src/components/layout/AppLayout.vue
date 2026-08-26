<script setup lang="ts">
import AppTopBar from './AppTopBar.vue'
import AppNavigationRail from './AppNavigationRail.vue'
import AppBottomNav from './AppBottomNav.vue'
import CommandPalette from './CommandPalette.vue'
import PrivacyDialog from './PrivacyDialog.vue'
import SnapshotDialog from './SnapshotDialog.vue'
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
    <SnapshotDialog />
  </div>
</template>

<style scoped>
.app-layout-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-sys-typescale-font-family);
}

.layout-body {
  display: flex;
  flex: 1;
  min-height: calc(100vh - 64px);
  position: relative;
}

.layout-viewport {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 1.5rem;
  background-color: var(--md-sys-color-surface);
}

@media (max-width: 768px) {
  .layout-viewport {
    padding: 1rem;
    padding-bottom: 5rem; /* Space for bottom nav */
  }
}
</style>
