<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { onClickOutside } from '@vueuse/core'
import {
  X,
  Plus,
  Pin,
  PinOff,
  Copy,
  FolderMinus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-vue-next'

import { useTabStore, useNavigationStore, WorkspaceTab, ALL_TOOLS } from '@/stores'
import { M3Tooltip } from '@/components/ui'
import ToolIcon from './ToolIcon.vue'

const tabStore = useTabStore()
const navStore = useNavigationStore()

// Tabs scroll container reference
const scrollContainerRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// Context Menu State
const contextMenuRef = ref<HTMLElement | null>(null)
const isContextMenuOpen = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTab = ref<WorkspaceTab | null>(null)

// New Tab Popover State
const newTabPopoverRef = ref<HTMLElement | null>(null)
const isNewTabPopoverOpen = ref(false)
const newTabSearch = ref('')
const newTabInputRef = ref<HTMLInputElement | null>(null)

// Drag and Drop Tab Reorder State
const draggedTabIndex = ref<number | null>(null)
const dragOverTabIndex = ref<number | null>(null)

onClickOutside(contextMenuRef, () => {
  isContextMenuOpen.value = false
})

onClickOutside(newTabPopoverRef, () => {
  isNewTabPopoverOpen.value = false
})

function checkScroll() {
  const el = scrollContainerRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 4
}

function scrollTabs(direction: 'left' | 'right') {
  const el = scrollContainerRef.value
  if (!el) return
  const scrollAmount = 240
  el.scrollBy({
    left: direction === 'left' ? -scrollAmount : scrollAmount,
    behavior: 'smooth'
  })
  setTimeout(checkScroll, 300)
}

function handleTabClick(tab: WorkspaceTab) {
  tabStore.setActiveTab(tab.id)
  navStore.activeToolId = tab.toolId
}

function handleCloseTab(tab: WorkspaceTab, event: MouseEvent) {
  event.stopPropagation()
  if (tab.isPinned || tab.toolId === 'system-overview') return
  tabStore.closeTab(tab.id)
  navStore.activeToolId = tabStore.activeToolId
}

function handleMiddleClick(tab: WorkspaceTab, event: MouseEvent) {
  if (event.button === 1) {
    // Middle click closes tab if not pinned or overview
    event.preventDefault()
    if (!tab.isPinned && tab.toolId !== 'system-overview') {
      handleCloseTab(tab, event)
    }
  }
}

function handleContextMenu(tab: WorkspaceTab, event: MouseEvent) {
  event.preventDefault()
  contextMenuTab.value = tab
  isContextMenuOpen.value = true

  const menuWidth = 200
  const menuHeight = 220
  let x = event.clientX
  let y = event.clientY

  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 8
  }
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 8
  }

  contextMenuPosition.value = { x, y }
}

const isNearRightEdge = ref(false)

function toggleNewTabPopover() {
  isNewTabPopoverOpen.value = !isNewTabPopoverOpen.value
  if (isNewTabPopoverOpen.value) {
    if (newTabPopoverRef.value) {
      const rect = newTabPopoverRef.value.getBoundingClientRect()
      isNearRightEdge.value = rect.left + 270 > window.innerWidth
    }
    newTabSearch.value = ''
    nextTick(() => {
      newTabInputRef.value?.focus()
    })
  }
}

function handleSelectNewTool(toolId: string) {
  tabStore.openTab(toolId, { forceNew: true, activate: true })
  navStore.activeToolId = toolId
  isNewTabPopoverOpen.value = false
  nextTick(() => {
    scrollToActiveTab()
  })
}

function scrollToActiveTab() {
  const el = scrollContainerRef.value
  if (!el) return
  const activeEl = el.querySelector('.tab-chip.is-active') as HTMLElement | null
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }
  checkScroll()
}

// Drag and drop reordering
function handleDragStart(index: number, event: DragEvent) {
  const tab = tabStore.tabs[index]
  if (tab?.isPinned || tab?.toolId === 'system-overview') {
    event.preventDefault()
    return
  }
  draggedTabIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (draggedTabIndex.value !== null && draggedTabIndex.value !== index) {
    dragOverTabIndex.value = index
  }
}

function handleDragLeave() {
  dragOverTabIndex.value = null
}

function handleDrop(index: number, event: DragEvent) {
  event.preventDefault()
  if (draggedTabIndex.value !== null && draggedTabIndex.value !== index) {
    tabStore.reorderTabs(draggedTabIndex.value, index)
  }
  draggedTabIndex.value = null
  dragOverTabIndex.value = null
}

function handleDragEnd() {
  draggedTabIndex.value = null
  dragOverTabIndex.value = null
}

// Filtered tools for New Tab Popover
const filteredNewTools = computed(() => {
  const q = newTabSearch.value.toLowerCase().trim()
  if (!q) return ALL_TOOLS
  return ALL_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q))
  )
})

// Keyboard shortcuts for tab navigation
function handleKeydown(e: KeyboardEvent) {
  // Ctrl + W or Cmd + W -> Close active tab
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'w') {
    // Only close if not inside a standard form input / text area where user might type
    const activeEl = document.activeElement
    const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')
    if (!isEditing && tabStore.tabs.length > 1) {
      const currentTab = tabStore.tabs.find((t) => t.id === tabStore.activeTabId)
      if (currentTab && !currentTab.isPinned && currentTab.toolId !== 'system-overview') {
        e.preventDefault()
        tabStore.closeTab(tabStore.activeTabId)
        navStore.activeToolId = tabStore.activeToolId
      }
    }
  }

  // Ctrl + Shift + T or Cmd + Shift + T -> Reopen closed tab
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
    e.preventDefault()
    tabStore.reopenClosedTab()
    navStore.activeToolId = tabStore.activeToolId
  }

  // Alt + Left or Ctrl + PageUp -> Prev Tab
  if (e.ctrlKey && e.key === 'PageUp') {
    e.preventDefault()
    tabStore.previousTab()
    navStore.activeToolId = tabStore.activeToolId
    scrollToActiveTab()
  }

  // Alt + Right or Ctrl + PageDown -> Next Tab
  if (e.ctrlKey && e.key === 'PageDown') {
    e.preventDefault()
    tabStore.nextTab()
    navStore.activeToolId = tabStore.activeToolId
    scrollToActiveTab()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => {
    checkScroll()
    scrollToActiveTab()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app-tab-bar" role="tablist" aria-label="Workspace tool tabs">
    <!-- Left Scroll Button (When overflowed) -->
    <button
      v-if="canScrollLeft"
      type="button"
      class="tab-scroll-btn tab-scroll-left"
      aria-label="Scroll tabs left"
      @click="scrollTabs('left')"
    >
      <ChevronLeft :size="14" />
    </button>

    <!-- Scrollable Tab Strip -->
    <div
      ref="scrollContainerRef"
      class="tabs-strip"
      @scroll="checkScroll"
    >
      <div
        v-for="(tab, index) in tabStore.tabs"
        :key="tab.id"
        class="tab-chip"
        :class="{
          'is-active': tabStore.activeTabId === tab.id,
          'is-pinned': tab.isPinned,
          'is-overview': tab.toolId === 'system-overview',
          'is-dragging': draggedTabIndex === index,
          'is-drag-over': dragOverTabIndex === index
        }"
        role="tab"
        :aria-selected="tabStore.activeTabId === tab.id"
        :draggable="!tab.isPinned && tab.toolId !== 'system-overview'"
        @click="handleTabClick(tab)"
        @auxclick="handleMiddleClick(tab, $event)"
        @contextmenu="handleContextMenu(tab, $event)"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver(index, $event)"
        @dragleave="handleDragLeave"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd"
      >
        <!-- Pin Icon for Pinned Tabs (other than overview) -->
        <span v-if="tab.isPinned && tab.toolId !== 'system-overview'" class="tab-pin-badge" title="Pinned Tab">
          <Pin :size="11" class="pin-icon" />
        </span>

        <!-- Tool / Home Icon -->
        <span class="tab-icon">
          <Home v-if="tab.toolId === 'system-overview'" :size="13" />
          <ToolIcon
            v-else
            :name="ALL_TOOLS.find((t) => t.id === tab.toolId)?.icon || 'Boxes'"
            :size="13"
          />
        </span>

        <!-- Tab Title -->
        <span class="tab-title" :title="tab.customTitle || tab.title">
          {{ tab.customTitle || tab.title }}
        </span>

        <!-- Tab Close Button (only for unpinned tabs, never for system overview) -->
        <button
          v-if="!tab.isPinned && tab.toolId !== 'system-overview'"
          type="button"
          class="tab-close-btn"
          title="Close Tab (Ctrl+W)"
          @click="handleCloseTab(tab, $event)"
        >
          <X :size="12" />
        </button>
      </div>
    </div>

    <!-- Right Scroll Button (When overflowed) -->
    <button
      v-if="canScrollRight"
      type="button"
      class="tab-scroll-btn tab-scroll-right"
      aria-label="Scroll tabs right"
      @click="scrollTabs('right')"
    >
      <ChevronRight :size="14" />
    </button>

    <!-- New Tab (+) Action & Popover -->
    <div ref="newTabPopoverRef" class="new-tab-container">
      <M3Tooltip text="Open New Tool Tab (Ctrl+T)">
        <button
          type="button"
          class="new-tab-trigger-btn"
          aria-label="Open new tool tab"
          :class="{ 'is-open': isNewTabPopoverOpen }"
          @click="toggleNewTabPopover"
        >
          <Plus :size="14" />
        </button>
      </M3Tooltip>

      <!-- New Tab Quick Tool Selector Dropdown -->
      <Transition name="tab-popover">
        <div
          v-if="isNewTabPopoverOpen"
          class="new-tab-popover"
          :class="{ 'align-right': isNearRightEdge }"
          role="dialog"
        >
          <div class="popover-header">
            <input
              ref="newTabInputRef"
              v-model="newTabSearch"
              type="text"
              placeholder="Search tools to open in new tab..."
              class="popover-search-input"
              @keydown.esc="isNewTabPopoverOpen = false"
            />
          </div>
          <div class="popover-list">
            <button
              v-for="tool in filteredNewTools"
              :key="tool.id"
              type="button"
              class="popover-tool-item"
              @click="handleSelectNewTool(tool.id)"
            >
              <div class="tool-icon-wrapper">
                <ToolIcon :name="tool.icon" :size="14" />
              </div>
              <div class="tool-meta">
                <span class="tool-name">{{ tool.name }}</span>
                <span class="tool-cat">{{ tool.category }}</span>
              </div>
            </button>
            <div v-if="filteredNewTools.length === 0" class="popover-empty">
              No matching tools
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Tab Right-Click Context Menu -->
    <Teleport to="body">
      <div
        v-if="isContextMenuOpen && contextMenuTab"
        ref="contextMenuRef"
        class="tab-context-menu"
        :style="{
          top: `${contextMenuPosition.y}px`,
          left: `${contextMenuPosition.x}px`
        }"
      >
        <div class="context-menu-header">
          <span class="context-tab-title">{{ contextMenuTab.customTitle || contextMenuTab.title }}</span>
        </div>

        <button
          v-if="contextMenuTab.toolId !== 'system-overview' && !contextMenuTab.isPinned"
          type="button"
          class="context-menu-item"
          @click="tabStore.closeTab(contextMenuTab.id); isContextMenuOpen = false"
        >
          <X :size="13" />
          <span>Close Tab</span>
          <kbd class="menu-kbd">Ctrl+W</kbd>
        </button>

        <button
          v-if="tabStore.tabs.length > 1"
          type="button"
          class="context-menu-item"
          @click="tabStore.closeOtherTabs(contextMenuTab.id); isContextMenuOpen = false"
        >
          <FolderMinus :size="13" />
          <span>Close Others</span>
        </button>

        <button
          v-if="tabStore.tabs.length > 1"
          type="button"
          class="context-menu-item"
          @click="tabStore.closeTabsToRight(contextMenuTab.id); isContextMenuOpen = false"
        >
          <ChevronRight :size="13" />
          <span>Close Tabs to the Right</span>
        </button>

        <div v-if="contextMenuTab.toolId !== 'system-overview'" class="context-menu-divider" />

        <button
          v-if="contextMenuTab.toolId !== 'system-overview'"
          type="button"
          class="context-menu-item"
          @click="tabStore.duplicateTab(contextMenuTab.id); isContextMenuOpen = false"
        >
          <Copy :size="13" />
          <span>Duplicate Tab</span>
        </button>

        <button
          v-if="contextMenuTab.toolId !== 'system-overview'"
          type="button"
          class="context-menu-item"
          @click="tabStore.togglePin(contextMenuTab.id); isContextMenuOpen = false"
        >
          <Pin v-if="!contextMenuTab.isPinned" :size="13" />
          <PinOff v-else :size="13" />
          <span>{{ contextMenuTab.isPinned ? 'Unpin Tab' : 'Pin Tab' }}</span>
        </button>

        <button
          v-if="tabStore.closedTabsHistory.length > 0"
          type="button"
          class="context-menu-item"
          @click="tabStore.reopenClosedTab(); isContextMenuOpen = false"
        >
          <Sparkles :size="13" />
          <span>Reopen Closed Tab</span>
          <kbd class="menu-kbd">Ctrl+Shift+T</kbd>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.app-tab-bar {
  display: flex;
  align-items: center;
  height: 32px;
  background-color: var(--md-sys-color-surface-container-lowest, #101216);
  border-bottom: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  position: relative;
  user-select: none;
  z-index: 20;
  padding: 0 0.5rem;
  gap: 0.25rem;
  overflow: visible;
}

.tabs-strip {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  max-width: calc(100% - 30px);
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  gap: 2px;
  height: 100%;
}

.tabs-strip::-webkit-scrollbar {
  display: none;
}

.tab-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 26px;
  padding: 0 0.625rem;
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant, #94a3b8);
  border-radius: 6px 6px 0 0;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  max-width: 200px;
  min-width: 90px;
  position: relative;
  transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
  border: 1px solid transparent;
  border-bottom: none;
}

.tab-chip:hover {
  background-color: var(--md-sys-color-surface-container-high, rgba(255, 255, 255, 0.04));
  color: var(--md-sys-color-on-surface, #e2e8f0);
}

.tab-chip.is-active {
  background-color: var(--md-sys-color-surface-container, rgba(255, 255, 255, 0.09));
  color: var(--md-sys-color-primary, #60a5fa);
  border-color: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tab-chip.is-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--md-sys-color-primary, #60a5fa);
  border-radius: 2px 2px 0 0;
}

.tab-chip.is-pinned {
  min-width: 80px;
  background-color: rgba(96, 165, 250, 0.05);
}

.tab-pin-badge {
  display: inline-flex;
  align-items: center;
  color: var(--md-sys-color-primary, #60a5fa);
  margin-right: -2px;
}

.tab-icon {
  display: inline-flex;
  align-items: center;
  opacity: 0.85;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
  transition: all 0.1s ease;
  margin-left: 2px;
}

.tab-chip:hover .tab-close-btn {
  opacity: 0.85;
}

.tab-close-btn:hover {
  opacity: 1;
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.tab-chip.is-dragging {
  opacity: 0.4;
}

.tab-chip.is-drag-over {
  border-left: 2px solid var(--md-sys-color-primary, #60a5fa);
}

/* Scroll Buttons */
.tab-scroll-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background-color: var(--md-sys-color-surface-container, #1e293b);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  color: var(--md-sys-color-on-surface-variant, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.tab-scroll-btn:hover {
  background-color: var(--md-sys-color-surface-container-high, #334155);
  color: var(--md-sys-color-on-surface, #f8fafc);
}

/* New Tab Trigger */
.new-tab-container {
  position: relative;
  display: flex;
  align-items: center;
}

.new-tab-trigger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--md-sys-color-on-surface-variant, #94a3b8);
  cursor: pointer;
  transition: all 0.15s ease;
}

.new-tab-trigger-btn:hover,
.new-tab-trigger-btn.is-open {
  background-color: var(--md-sys-color-surface-container-high, rgba(255, 255, 255, 0.08));
  color: var(--md-sys-color-on-surface, #f8fafc);
  border-color: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
}

/* New Tab Popover */
.new-tab-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 260px;
  max-width: min(280px, calc(100vw - 24px));
  background-color: var(--md-sys-color-surface-container-high, #1e222b);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: popoverFadeIn 0.15s ease-out;
}

.new-tab-popover.align-right {
  left: auto;
  right: 0;
}

@keyframes popoverFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.popover-header {
  padding: 0.5rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
}

.popover-search-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-lowest, #12151b);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  color: var(--md-sys-color-on-surface, #f8fafc);
  font-size: 0.75rem;
  outline: none;
}

.popover-search-input:focus {
  border-color: var(--md-sys-color-primary, #60a5fa);
}

.popover-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 0.25rem;
}

.popover-tool-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  color: var(--md-sys-color-on-surface, #e2e8f0);
  transition: background-color 0.1s ease;
}

.popover-tool-item:hover {
  background-color: var(--md-sys-color-surface-container-highest, rgba(255, 255, 255, 0.08));
}

.tool-icon-wrapper {
  display: flex;
  align-items: center;
  color: var(--md-sys-color-primary, #60a5fa);
}

.tool-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tool-name {
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-cat {
  font-size: 0.65rem;
  color: var(--md-sys-color-on-surface-variant, #94a3b8);
  text-transform: capitalize;
}

.popover-empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant, #94a3b8);
}

/* Context Menu */
.tab-context-menu {
  position: fixed;
  z-index: 10000;
  width: 220px;
  background-color: var(--md-sys-color-surface-container-high, #1e222b);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.context-menu-header {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  margin-bottom: 2px;
}

.context-tab-title {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--md-sys-color-primary, #60a5fa);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface, #e2e8f0);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.1s ease;
}

.context-menu-item:hover {
  background-color: var(--md-sys-color-surface-container-highest, rgba(255, 255, 255, 0.08));
  color: var(--md-sys-color-primary, #60a5fa);
}

.menu-kbd {
  margin-left: auto;
  font-size: 0.65rem;
  background-color: rgba(255, 255, 255, 0.08);
  padding: 2px 4px;
  border-radius: 3px;
  color: var(--md-sys-color-on-surface-variant, #94a3b8);
}

.context-menu-divider {
  height: 1px;
  background-color: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  margin: 3px 0;
}

@media (max-width: 768px) {
  .app-tab-bar {
    height: 30px;
    padding: 0 0.25rem;
  }
  .tab-chip {
    max-width: 140px;
    min-width: 70px;
    font-size: 0.7rem;
    height: 24px;
  }
}
</style>
