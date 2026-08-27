<script setup lang="ts">
import {
  ShieldCheck,
  Search,
  Sun,
  Moon,
  Contrast,
  Download,
  Upload,
  Menu,
  Sparkles,
  Flame,
  Clock,
  DownloadCloud,
  RefreshCw
} from 'lucide-vue-next'

import { M3Button, M3Tooltip } from '@/components/ui'
import { useNavigationStore, useSecurityStore, usePwaStore } from '@/stores'
import { useTheme } from '@/composables'

const navStore = useNavigationStore()
const securityStore = useSecurityStore()
const pwaStore = usePwaStore()
const { isDark, themeMode, isHighContrast, setThemeMode, toggleHighContrast } = useTheme()

function handleToggleNav() {
  if (window.innerWidth <= 768) {
    navStore.isMobileNavOpen = !navStore.isMobileNavOpen
  } else {
    navStore.toggleSidebarCollapsed()
  }
}
</script>

<template>
  <header class="top-app-bar">
    <!-- Left: Brand & Nav Trigger -->
    <div class="top-bar-left">
      <M3Tooltip :text="navStore.isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'">
        <button
          type="button"
          class="sidebar-toggle-btn"
          aria-label="Toggle navigation sidebar"
          @click="handleToggleNav"
        >
          <Menu :size="20" />
        </button>
      </M3Tooltip>

      <div class="brand-group" @click="navStore.selectTool('system-overview')">
        <div class="brand-icon">
          <Sparkles :size="20" />
        </div>
        <div class="brand-text">
          <span class="brand-title">DevDot</span>
          <span class="brand-subtitle">Universal Toolkit</span>
        </div>
      </div>

      <!-- Privacy Status Pill -->
      <M3Tooltip text="Zero outbound network calls. Everything executes locally.">
        <button
          type="button"
          class="privacy-pill"
          @click="navStore.openPrivacyModal()"
        >
          <ShieldCheck :size="14" class="privacy-icon" />
          <span class="privacy-text">100% Offline</span>
        </button>
      </M3Tooltip>

      <!-- Active Clipboard Auto-Purge Pill Indicator -->
      <M3Tooltip
        v-if="securityStore.isTimerActive"
        :text="`Clipboard Auto-Purge in ${securityStore.remainingPurgeSeconds}s. Click to wipe now.`"
      >
        <button
          type="button"
          class="purge-timer-pill"
          @click="securityStore.purgeClipboardNow()"
        >
          <Clock :size="13" class="spin-clock-icon" />
          <span>Purge {{ securityStore.remainingPurgeSeconds }}s</span>
        </button>
      </M3Tooltip>
    </div>


    <!-- Center: Global Search / Command Palette Trigger -->
    <div class="top-bar-center">
      <button
        type="button"
        class="search-trigger"
        @click="navStore.openCommandPalette()"
      >
        <Search :size="16" class="search-icon" />
        <span class="search-label">Quick find tools or actions...</span>
        <kbd class="search-kbd">Ctrl K</kbd>
      </button>
    </div>

    <!-- Right: Snapshot, Panic, PWA, & Theme Actions -->
    <div class="top-bar-right">
      <!-- PWA Install Prompt Button (Visible when browser install prompt is available) -->
      <div v-if="pwaStore.isInstallable && !pwaStore.isInstalled" class="action-group pwa-install-group">
        <M3Tooltip text="Install DevDot as a standalone Desktop/Mobile PWA app">
          <M3Button
            variant="filled"
            @click="pwaStore.promptInstall()"
          >
            <template #icon>
              <DownloadCloud :size="16" />
            </template>
            <span class="btn-label-desktop">Install App</span>
          </M3Button>
        </M3Tooltip>
      </div>

      <!-- PWA Update Available Button -->
      <div v-if="pwaStore.needRefresh" class="action-group pwa-update-group">
        <M3Tooltip text="A newer offline version is available. Click to reload.">
          <M3Button
            variant="filled"
            @click="pwaStore.updateApp()"
          >
            <template #icon>
              <RefreshCw :size="16" class="spin-clock-icon" />
            </template>
            <span class="btn-label-desktop">Update Ready</span>
          </M3Button>
        </M3Tooltip>
      </div>

      <!-- Panic / Quick Clear Button -->
      <div class="action-group panic-group">
        <M3Tooltip text="Panic / Quick Clear: Wipe all storage, caches, and clipboard">
          <button
            type="button"
            class="panic-btn"
            aria-label="Panic / Quick Clear"
            @click="securityStore.openPanicModal()"
          >
            <Flame :size="16" />
            <span class="btn-label-desktop">Panic Clear</span>
          </button>
        </M3Tooltip>
      </div>

      <div class="v-divider" />

      <!-- Snapshot Actions -->
      <div class="action-group snapshot-group">
        <M3Tooltip text="Export active session snapshot (.toolkit)">
          <M3Button
            variant="tonal"
            @click="navStore.openSnapshotModal('export')"
          >
            <template #icon>
              <Download :size="16" />
            </template>
            <span class="btn-label-desktop">Export</span>
          </M3Button>
        </M3Tooltip>

        <M3Tooltip text="Import session snapshot (.toolkit)">
          <M3Button
            variant="outlined"
            @click="navStore.openSnapshotModal('import')"
          >
            <template #icon>
              <Upload :size="16" />
            </template>
            <span class="btn-label-desktop">Import</span>
          </M3Button>
        </M3Tooltip>
      </div>

      <div class="v-divider" />

      <!-- Theme Controls -->
      <div class="action-group">
        <M3Tooltip text="Toggle High Contrast Mode">
          <M3Button
            :variant="isHighContrast ? 'filled' : 'outlined'"
            @click="toggleHighContrast"
          >
            <template #icon>
              <Contrast :size="16" />
            </template>
          </M3Button>
        </M3Tooltip>

        <M3Tooltip :text="`Current Mode: ${themeMode}`">
          <M3Button
            variant="tonal"
            @click="setThemeMode(isDark ? 'light' : 'dark')"
          >
            <template #icon>
              <Sun v-if="isDark" :size="16" />
              <Moon v-else :size="16" />
            </template>
          </M3Button>
        </M3Tooltip>
      </div>
    </div>
  </header>
</template>


<style scoped>
.top-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 1rem;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow: hidden;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
  position: sticky;
  top: 0;
  z-index: 50;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex-shrink: 0;
}

.sidebar-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--md-sys-shape-corner-small);
  transition: background-color 0.15s ease;
}

.sidebar-toggle-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.brand-icon {
  background: linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-tertiary, #8b5cf6) 100%);
  color: var(--md-sys-color-on-primary);
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--md-sys-color-on-surface);
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
  letter-spacing: 0.02em;
}

.privacy-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.625rem;
  background-color: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.privacy-pill:hover {
  background-color: rgba(16, 185, 129, 0.2);
}

.privacy-icon {
  flex-shrink: 0;
}

.purge-timer-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.625rem;
  background-color: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  animation: pulse-soft 2s infinite ease-in-out;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.purge-timer-pill:hover {
  background-color: #ef4444;
  color: #ffffff;
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}

.top-bar-center {
  flex: 1;
  max-width: 420px;
  margin: 0 1rem;
  min-width: 0;
}

.search-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.45rem 0.875rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.search-trigger:hover {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.search-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.search-label {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-kbd {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 4px;
  font-family: monospace;
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.panic-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 9999px;
  font-size: 0.78125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.panic-btn:hover {
  background-color: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);
}

.v-divider {
  width: 1px;
  height: 24px;
  background-color: var(--md-sys-color-outline-variant);
  margin: 0 0.15rem;
}

@media (max-width: 1280px) {
  .btn-label-desktop {
    display: none;
  }
}

@media (max-width: 1100px) {
  .brand-subtitle {
    display: none;
  }

  .top-bar-center {
    max-width: 260px;
    margin: 0 0.5rem;
  }
}

@media (max-width: 960px) {
  .privacy-text {
    display: none;
  }

  .top-bar-center {
    max-width: 200px;
  }

  .search-kbd {
    display: none;
  }
}

@media (max-width: 768px) {
  .top-bar-center {
    display: none;
  }

  .snapshot-group {
    display: none;
  }
}

</style>
