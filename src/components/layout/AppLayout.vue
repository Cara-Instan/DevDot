<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import AppTopBar from './AppTopBar.vue'
import AppTabBar from './AppTabBar.vue'
import AppNavigationDrawer from './AppNavigationDrawer.vue'
import AppBottomNav from './AppBottomNav.vue'
import CommandPalette from './CommandPalette.vue'
import PrivacyDialog from './PrivacyDialog.vue'
import PanicDialog from './PanicDialog.vue'
import SnapshotDialog from './SnapshotDialog.vue'
import SettingsDialog from './SettingsDialog.vue'
import PwaInstallBanner from './PwaInstallBanner.vue'
import { VirtualPet, AchievementToast } from '@/components/gamification'
import { usePwaStore } from '@/stores/pwa'
import { useTabStore } from '@/stores/tabs'
import { useGamificationStore } from '@/stores/gamification'
import { useSmoothScroll } from '@/composables/useSmoothScroll'

const pwaStore = usePwaStore()
const tabStore = useTabStore()
const gamificationStore = useGamificationStore()
const viewportRef = ref<HTMLElement | null>(null)

// Easter Egg: Konami Code Sequence
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
let konamiIndex = 0

// Easter Egg: Vim Refugee (5 rapid Escape presses)
let escapeCount = 0
let escapeResetTimer: any = null

function handleGlobalKeydown(e: KeyboardEvent) {
  // Check Konami Code
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (key === konamiCode[konamiIndex].toLowerCase()) {
    konamiIndex++
    if (konamiIndex === konamiCode.length) {
      gamificationStore.trackAction({ type: 'konami_code' })
      konamiIndex = 0
    }
  } else {
    konamiIndex = 0
  }

  // Check Escape spamming
  if (e.key === 'Escape') {
    escapeCount++
    if (escapeResetTimer) clearTimeout(escapeResetTimer)
    escapeResetTimer = setTimeout(() => {
      escapeCount = 0
    }, 1500)

    if (escapeCount >= 5) {
      gamificationStore.trackAction({ type: 'escape_press' })
      escapeCount = 0
    }
  }
}

const { scrollToTop, refresh } = useSmoothScroll({
  wrapperRef: viewportRef
})

watch(
  () => tabStore.activeTabId,
  () => {
    scrollToTop(true)
    refresh()
  }
)

onMounted(() => {
  pwaStore.initPwa()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  if (escapeResetTimer) clearTimeout(escapeResetTimer)
})
</script>

<template>
  <div class="app-layout-root">
    <!-- Top Bar -->
    <AppTopBar />

    <!-- Workspace Tabs Strip -->
    <AppTabBar />

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

    <!-- Gamification: Retro Toast & Desk Companion -->
    <AchievementToast />
    <VirtualPet />
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
  height: calc(100vh - 74px);
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
