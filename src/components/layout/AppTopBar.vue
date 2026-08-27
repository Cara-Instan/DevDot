<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onClickOutside } from '@vueuse/core'
import {
  Menu,
  Sparkles,
  ChevronDown,
  Search,
  Sun,
  Moon,
  Contrast,
  FolderArchive,
  Settings,
  Check,
  X
} from 'lucide-vue-next'

import { M3Tooltip } from '@/components/ui'
import { useNavigationStore, ToolCategory } from '@/stores'
import { useTheme } from '@/composables'
import ToolIcon from './ToolIcon.vue'

const navStore = useNavigationStore()
const { isDark, themeMode, isHighContrast, setThemeMode, toggleHighContrast } = useTheme()

// Tool Switcher Dropdown State
const isDropdownOpen = ref(false)
const switcherFilter = ref('')
const switcherInputRef = ref<HTMLInputElement | null>(null)
const dropdownContainerRef = ref<HTMLElement | null>(null)
const switcherCategory = ref<ToolCategory>('all')

onClickOutside(dropdownContainerRef, () => {
  isDropdownOpen.value = false
})

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value
  if (isDropdownOpen.value) {
    switcherFilter.value = ''
    switcherCategory.value = 'all'
    nextTick(() => {
      switcherInputRef.value?.focus()
    })
  }
}

function handleSelectTool(toolId: string) {
  navStore.selectTool(toolId)
  isDropdownOpen.value = false
  switcherFilter.value = ''
}

function handleToggleNav() {
  navStore.toggleNavDrawer()
}

// Filtered tools for the switcher dropdown
const switcherTools = computed(() => {
  let list = navStore.tools
  if (switcherCategory.value !== 'all') {
    list = list.filter((t) => t.category === switcherCategory.value)
  }
  if (switcherFilter.value.trim()) {
    const q = switcherFilter.value.toLowerCase().trim()
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }
  return list
})
</script>

<template>
  <header class="top-app-bar">
    <!-- Left: Sidebar Toggle, Brand & Tool Switcher Dropdown -->
    <div class="top-bar-left">
      <M3Tooltip text="Navigation Drawer & Tools Catalog">
        <button
          type="button"
          class="compact-icon-btn"
          aria-label="Toggle navigation drawer"
          @click="handleToggleNav"
        >
          <Menu :size="16" />
        </button>
      </M3Tooltip>

      <!-- Tool Switcher Trigger & Popover -->
      <div ref="dropdownContainerRef" class="tool-switcher-container">
        <button
          type="button"
          class="tool-switcher-btn"
          :class="{ 'is-open': isDropdownOpen }"
          aria-haspopup="true"
          :aria-expanded="isDropdownOpen"
          @click="toggleDropdown"
        >
          <div class="brand-badge">
            <Sparkles :size="14" />
          </div>
          <span class="brand-name">DevDot</span>
          <span class="breadcrumb-sep">/</span>
          <span class="active-tool-label">{{ navStore.activeTool.name }}</span>
          <ChevronDown :size="13" class="chevron-icon" :class="{ rotated: isDropdownOpen }" />
        </button>

        <!-- Tool Switcher Dropdown Menu -->
        <div v-if="isDropdownOpen" class="switcher-dropdown-menu" role="menu">
          <!-- Dropdown Filter Header -->
          <div class="switcher-header">
            <div class="switcher-input-wrapper">
              <Search :size="13" class="search-muted-icon" />
              <input
                ref="switcherInputRef"
                v-model="switcherFilter"
                type="text"
                placeholder="Switch to tool..."
                class="switcher-filter-input"
                @keydown.esc="isDropdownOpen = false"
              />
              <button
                v-if="switcherFilter"
                type="button"
                class="clear-btn"
                @click="switcherFilter = ''"
              >
                <X :size="11" />
              </button>
            </div>

            <!-- Fast Category Filter Chips -->
            <div class="category-chips">
              <button
                type="button"
                class="chip-btn"
                :class="{ active: switcherCategory === 'all' }"
                @click="switcherCategory = 'all'"
              >
                All
              </button>
              <button
                type="button"
                class="chip-btn"
                :class="{ active: switcherCategory === 'json' }"
                @click="switcherCategory = 'json'"
              >
                JSON
              </button>
              <button
                type="button"
                class="chip-btn"
                :class="{ active: switcherCategory === 'crypto' }"
                @click="switcherCategory = 'crypto'"
              >
                Crypto
              </button>
              <button
                type="button"
                class="chip-btn"
                :class="{ active: switcherCategory === 'converters' }"
                @click="switcherCategory = 'converters'"
              >
                Converters
              </button>
              <button
                type="button"
                class="chip-btn"
                :class="{ active: switcherCategory === 'text' }"
                @click="switcherCategory = 'text'"
              >
                Text
              </button>
            </div>
          </div>

          <!-- Tools List -->
          <div class="switcher-list">
            <button
              v-for="tool in switcherTools"
              :key="tool.id"
              type="button"
              class="switcher-item"
              :class="{ 'is-selected': navStore.activeToolId === tool.id }"
              role="menuitem"
              @click="handleSelectTool(tool.id)"
            >
              <div class="item-icon-box">
                <ToolIcon :name="tool.icon" :size="14" />
              </div>
              <div class="item-info">
                <span class="item-title">{{ tool.name }}</span>
                <span class="item-sub">{{ tool.category }}</span>
              </div>
              <Check
                v-if="navStore.activeToolId === tool.id"
                :size="14"
                class="active-check-icon"
              />
            </button>

            <div v-if="switcherTools.length === 0" class="empty-results">
              No matching tools found
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Center: Global Quick Search Trigger (Ctrl + K) -->
    <div class="top-bar-center">
      <button
        type="button"
        class="search-trigger"
        aria-label="Open command palette search"
        @click="navStore.openCommandPalette()"
      >
        <Search :size="13" class="search-icon" />
        <span class="search-label">Quick find tools...</span>
        <kbd class="search-kbd">Ctrl K</kbd>
      </button>
    </div>

    <!-- Right: Snapshot, Settings & Theme Controls -->
    <div class="top-bar-right">
      <!-- Snapshot Manager Button -->
      <M3Tooltip text="Session Snapshot (.toolkit) - Backup & Restore">
        <button
          type="button"
          class="topbar-action-btn"
          @click="navStore.openSnapshotModal('export')"
        >
          <FolderArchive :size="14" />
          <span class="btn-text-desktop">Snapshot</span>
        </button>
      </M3Tooltip>

      <div class="v-divider" />

      <!-- Quick Theme Switcher -->
      <M3Tooltip :text="`Switch to ${isDark ? 'Light' : 'Dark'} Mode (Current: ${themeMode})`">
        <button
          type="button"
          class="compact-icon-btn"
          aria-label="Toggle theme mode"
          @click="setThemeMode(isDark ? 'light' : 'dark')"
        >
          <Sun v-if="isDark" :size="15" />
          <Moon v-else :size="15" />
        </button>
      </M3Tooltip>

      <!-- High Contrast Toggle -->
      <M3Tooltip text="Toggle High Contrast Mode">
        <button
          type="button"
          class="compact-icon-btn"
          :class="{ 'is-active-icon': isHighContrast }"
          aria-label="Toggle high contrast"
          @click="toggleHighContrast"
        >
          <Contrast :size="15" />
        </button>
      </M3Tooltip>

      <!-- Preferences & Settings Dialog -->
      <M3Tooltip text="Preferences & Settings">
        <button
          type="button"
          class="compact-icon-btn"
          aria-label="Open settings"
          @click="navStore.openSettings()"
        >
          <Settings :size="15" />
        </button>
      </M3Tooltip>
    </div>
  </header>
</template>

<style scoped>
.top-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42px;
  min-height: 42px;
  max-height: 42px;
  padding: 0 0.75rem;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
  position: sticky;
  top: 0;
  z-index: 50;
  user-select: none;
}

/* Left Section */
.top-bar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex-shrink: 0;
}

.compact-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--md-sys-shape-corner-small, 6px);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}

.compact-icon-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline-variant);
}

.compact-icon-btn.is-active-icon {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

/* Tool Switcher */
.tool-switcher-container {
  position: relative;
  display: flex;
  align-items: center;
}

.tool-switcher-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 28px;
  padding: 0 0.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  color: var(--md-sys-color-on-surface);
  font-size: 0.78125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  max-width: 300px;
}

.tool-switcher-btn:hover,
.tool-switcher-btn.is-open {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
}

.brand-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-tertiary, #8b5cf6) 100%);
  color: var(--md-sys-color-on-primary);
  border-radius: 4px;
  flex-shrink: 0;
}

.brand-name {
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--md-sys-color-on-surface);
  font-size: 0.78125rem;
}

.breadcrumb-sep {
  color: var(--md-sys-color-outline);
  font-weight: 400;
  font-size: 0.75rem;
}

.active-tool-label {
  font-weight: 600;
  color: var(--md-sys-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.chevron-icon {
  color: var(--md-sys-color-on-surface-variant);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* Tool Switcher Dropdown Menu */
.switcher-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 320px;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: dropdown-appear 0.15s ease-out;
}

@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.switcher-header {
  padding: 0.5rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.switcher-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
}

.search-muted-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.switcher-filter-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
  min-width: 0;
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-chips {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chip-btn {
  background-color: transparent;
  border: 1px solid transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s ease;
}

.chip-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.chip-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 600;
}

.switcher-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.switcher-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s ease;
  width: 100%;
}

.switcher-item:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.switcher-item.is-selected {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-weight: 600;
}

.item-icon-box {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.switcher-item.is-selected .item-icon-box {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-sub {
  font-size: 0.625rem;
  color: var(--md-sys-color-on-surface-variant);
  text-transform: capitalize;
}

.active-check-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.empty-results {
  padding: 1.25rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

/* Center Section */
.top-bar-center {
  flex: 1;
  max-width: 320px;
  margin: 0 0.75rem;
  min-width: 0;
}

.search-trigger {
  width: 100%;
  height: 28px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.625rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.75rem;
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
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.05rem 0.35rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 4px;
  font-family: monospace;
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

/* Right Section */
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.topbar-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 28px;
  padding: 0 0.55rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small, 6px);
  color: var(--md-sys-color-on-surface);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.topbar-action-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  border-color: var(--md-sys-color-primary);
}

.btn-text-desktop {
  font-size: 0.75rem;
}

.v-divider {
  width: 1px;
  height: 18px;
  background-color: var(--md-sys-color-outline-variant);
  margin: 0 0.15rem;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .top-bar-center {
    max-width: 220px;
  }
}

@media (max-width: 768px) {
  .btn-text-desktop {
    display: none;
  }

  .top-bar-center {
    display: none;
  }

  .active-tool-label {
    max-width: 100px;
  }
}
</style>
