<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  Search,
  ArrowRight,
  Sun,
  Moon,
  Contrast,
  Download,
  Upload,
  ShieldCheck,
  Zap,
  Activity,
  CornerDownLeft,
  Flame,
  ClipboardX,
  DownloadCloud,
  RefreshCw,
  Settings
} from 'lucide-vue-next'

import { useNavigationStore, useSecurityStore, usePwaStore, ToolDefinition } from '@/stores'
import { useTheme, useExecutionEngine } from '@/composables'
import ToolIcon from './ToolIcon.vue'

const navStore = useNavigationStore()
const securityStore = useSecurityStore()
const pwaStore = usePwaStore()
const { isDark, setThemeMode, toggleHighContrast } = useTheme()
const { execute } = useExecutionEngine()


const searchInputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)
const query = ref('')

interface CommandItem {
  id: string
  title: string
  subtitle: string
  category: string
  iconName?: string
  iconComponent?: any
  action: () => void
  shortcut?: string
}

const quickActions: CommandItem[] = [
  {
    id: 'action-open-settings',
    title: 'Preferences & Settings',
    subtitle: 'Configure theme, editor font, clipboard auto-purge, PWA, and tool order',
    category: 'Settings',
    iconComponent: Settings,
    action: () => {
      navStore.openSettings()
    }
  },
  {
    id: 'action-panic-clear',
    title: 'Panic / Quick Clear All Ephemeral Data',
    subtitle: 'Wipe all LocalStorage, session tabs, IndexedDB, and clipboard memory',
    category: 'Security',
    iconComponent: Flame,
    action: () => {
      securityStore.openPanicModal()
    }
  },
  {
    id: 'action-purge-clipboard',
    title: 'Purge System Clipboard Now',
    subtitle: 'Instantly overwrite and clean the OS clipboard',
    category: 'Security',
    iconComponent: ClipboardX,
    action: () => {
      securityStore.purgeClipboardNow()
    }
  },
  {
    id: 'action-privacy-info',
    title: 'Security Hardening & Zero-Outbound Audit',
    subtitle: 'Manage clipboard auto-purge timers and verify 100% offline air-gap',
    category: 'Security',
    iconComponent: ShieldCheck,
    action: () => {
      navStore.openPrivacyModal()
    }
  },
  {
    id: 'action-theme-toggle',
    title: 'Toggle Theme (Dark / Light)',
    subtitle: 'Switch between light and dark Material 3 themes',
    category: 'Theme',
    iconComponent: isDark.value ? Sun : Moon,
    action: () => {
      setThemeMode(isDark.value ? 'light' : 'dark')
    }
  },
  {
    id: 'action-contrast-toggle',
    title: 'Toggle High Contrast Mode',
    subtitle: 'Enhance visual contrast and border outlines',
    category: 'Theme',
    iconComponent: Contrast,
    action: () => {
      toggleHighContrast()
    }
  },
  {
    id: 'action-export-snapshot',
    title: 'Export Session Snapshot (.toolkit)',
    subtitle: 'Save active tabs and workspace state to a local file',
    category: 'Snapshot',
    iconComponent: Download,
    action: () => {
      navStore.openSnapshotModal('export')
    }
  },
  {
    id: 'action-import-snapshot',
    title: 'Import Session Snapshot (.toolkit)',
    subtitle: 'Restore tabs and workspace from a local .toolkit file',
    category: 'Snapshot',
    iconComponent: Upload,
    action: () => {
      navStore.openSnapshotModal('import')
    }
  },
  {
    id: 'action-worker-ping',
    title: 'Execute Background Worker Ping',
    subtitle: 'Send test ping task to client-side Web Worker pool',
    category: 'Execution',
    iconComponent: Activity,
    action: () => {
      execute('system', 'ping', {})
    }
  },
  {
    id: 'action-worker-benchmark',
    title: 'Run Worker CPU Benchmark',
    subtitle: 'Benchmark background multi-threaded worker calculation',
    category: 'Execution',
    iconComponent: Zap,
    action: () => {
      execute('system', 'benchmark', { count: 150000 })
    }
  },
  {
    id: 'action-pwa-install',
    title: 'Install DevDot App (PWA)',
    subtitle: 'Install DevDot as a standalone application on Desktop/Mobile',
    category: 'Application',
    iconComponent: DownloadCloud,
    action: () => {
      pwaStore.promptInstall()
    }
  },
  {
    id: 'action-pwa-update',
    title: 'Check Offline Cache / Update Service Worker',
    subtitle: 'Reload service worker cache for the latest offline build',
    category: 'Application',
    iconComponent: RefreshCw,
    action: () => {
      pwaStore.updateApp()
    }
  }
]


const toolItems = computed<CommandItem[]>(() => {
  return navStore.tools.map((t: ToolDefinition) => ({
    id: `tool-${t.id}`,
    title: t.name,
    subtitle: t.description,
    category: t.category.toUpperCase(),
    iconName: t.icon,
    action: () => {
      navStore.selectTool(t.id)
    }
  }))
})

const allItems = computed<CommandItem[]>(() => {
  return [...toolItems.value, ...quickActions]
})

const filteredItems = computed<CommandItem[]>(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return allItems.value

  return allItems.value.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  )
})

watch(
  () => navStore.isCommandPaletteOpen,
  (open) => {
    if (open) {
      query.value = ''
      selectedIndex.value = 0
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    }
  }
)

watch(query, () => {
  selectedIndex.value = 0
})

function executeSelected() {
  const items = filteredItems.value
  if (items.length > 0 && items[selectedIndex.value]) {
    items[selectedIndex.value].action()
    navStore.closeCommandPalette()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (!navStore.isCommandPaletteOpen) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      navStore.toggleCommandPalette()
    }
    return
  }

  if (e.key === 'Escape') {
    e.preventDefault()
    navStore.closeCommandPalette()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredItems.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
      scrollToSelected()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredItems.value.length > 0) {
      selectedIndex.value =
        (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
      scrollToSelected()
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    executeSelected()
  }
}

function scrollToSelected() {
  nextTick(() => {
    const el = document.querySelector('.palette-item.active')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function handleItemClick(item: CommandItem) {
  item.action()
  navStore.closeCommandPalette()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="navStore.isCommandPaletteOpen"
      class="palette-backdrop"
      @click.self="navStore.closeCommandPalette()"
    >
      <div class="palette-dialog" role="dialog" aria-modal="true">
        <!-- Search Header -->
        <div class="palette-header">
          <Search :size="20" class="search-icon" />
          <input
            ref="searchInputRef"
            v-model="query"
            type="text"
            class="search-input"
            placeholder="Type a tool name, category, or command..."
            aria-label="Search tools and commands"
          />
          <kbd class="shortcut-badge">ESC</kbd>
        </div>

        <!-- Results List -->
        <div class="palette-body">
          <div v-if="filteredItems.length === 0" class="no-results">
            <span>No tools or commands matching "<strong>{{ query }}</strong>"</span>
          </div>

          <div
            v-for="(item, idx) in filteredItems"
            :key="item.id"
            class="palette-item"
            :class="{ active: idx === selectedIndex }"
            @mouseenter="selectedIndex = idx"
            @click="handleItemClick(item)"
          >
            <div class="item-icon-box">
              <component
                :is="item.iconComponent"
                v-if="item.iconComponent"
                :size="18"
              />
              <ToolIcon
                v-else-if="item.iconName"
                :name="item.iconName"
                :size="18"
              />
            </div>

            <div class="item-info">
              <div class="item-title-row">
                <span class="item-title">{{ item.title }}</span>
                <span class="item-category-tag">{{ item.category }}</span>
              </div>
              <span class="item-subtitle">{{ item.subtitle }}</span>
            </div>

            <div class="item-action-indicator">
              <CornerDownLeft v-if="idx === selectedIndex" :size="14" />
              <ArrowRight v-else :size="14" class="arrow-dim" />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="palette-footer">
          <div class="footer-tip">
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
            <span class="dot">•</span>
            <kbd>↵</kbd> Select
            <span class="dot">•</span>
            <kbd>ESC</kbd> Close
          </div>
          <div class="footer-brand">
            <span>DevDot Quick Navigation</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4.5rem 1rem 2rem 1rem;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.palette-dialog {
  width: 100%;
  max-width: 640px;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  box-shadow: var(--md-sys-elevation-level3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
}

@keyframes slideDown {
  from {
    transform: translateY(-16px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.palette-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
}

.search-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--md-sys-color-on-surface);
  outline: none;
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.7;
}

.shortcut-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 4px;
  font-family: monospace;
}

.palette-body {
  max-height: 380px;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.no-results {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.875rem;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.625rem 0.875rem;
  border-radius: var(--md-sys-shape-corner-medium);
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.palette-item.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.palette-item.active .item-subtitle {
  color: var(--md-sys-color-on-primary-container);
  opacity: 0.8;
}

.palette-item.active .item-icon-box {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.palette-item.active .item-category-tag {
  background-color: rgba(255, 255, 255, 0.2);
  color: inherit;
}

.item-icon-box {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
  padding: 0.45rem;
  border-radius: var(--md-sys-shape-corner-small);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.12s ease;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-title {
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-category-tag {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.item-subtitle {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-action-indicator {
  color: var(--md-sys-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding-left: 0.5rem;
}

.palette-item.active .item-action-indicator {
  color: var(--md-sys-color-on-primary-container);
}

.arrow-dim {
  opacity: 0.3;
}

.palette-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.25rem;
  background-color: var(--md-sys-color-surface-container);
  border-top: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

.footer-tip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.footer-tip kbd {
  font-size: 0.6875rem;
  padding: 0.1rem 0.3rem;
  background-color: var(--md-sys-color-surface-container-highest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 3px;
  font-family: monospace;
}

.dot {
  opacity: 0.4;
  margin: 0 0.15rem;
}

.footer-brand {
  font-size: 0.6875rem;
  opacity: 0.7;
}
</style>
