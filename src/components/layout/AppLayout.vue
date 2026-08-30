<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
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
import { useNavigationStore } from '@/stores/navigation'
import { useSmoothScroll } from '@/composables/useSmoothScroll'

const pwaStore = usePwaStore()
const navStore = useNavigationStore()
const viewportRef = ref<HTMLElement | null>(null)

const { scrollToTop, refresh } = useSmoothScroll({
  wrapperRef: viewportRef
})

watch(
  () => navStore.activeToolId,
  () => {
    scrollToTop(true)
    refresh()
  }
)

onMounted(() => {
  pwaStore.initPwa()
})
</script>

<template>
  <div class="app-layout-root">
    <!-- Top Bar -->
    <AppTopBar />

    <div class="layout-body">
      <!-- Main Application Canvas (100% Full-Width) with Smooth Momentum Scrolling -->
      <main ref="viewportRef" class="layout-viewport" role="main">
        <slot />
      </main>
    </div>

    <!-- Slide-Over Navigation Flyout Drawer (On-Demand) -->
    <AppNavigationDrawer data-lenis-prevent />

    <!-- Responsive Bottom Bar (Mobile) -->
    <AppBottomNav />

    <!-- Modals & Overlays -->
    <CommandPalette data-lenis-prevent />
    <PrivacyDialog data-lenis-prevent />
    <PanicDialog data-lenis-prevent />
    <SnapshotDialog data-lenis-prevent />
    <SettingsDialog data-lenis-prevent />
    <PwaInstallBanner data-lenis-prevent />
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
  padding: 0.625rem 0.875rem;
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
