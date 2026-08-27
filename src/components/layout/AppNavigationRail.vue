<script setup lang="ts">
import { computed } from 'vue'
import {
  Boxes,
  FileJson,
  ShieldCheck,
  ArrowLeftRight,
  FileText,
  Cpu,
  X,
  LayoutDashboard,
  Search
} from 'lucide-vue-next'
import { useNavigationStore, ToolCategory } from '@/stores'
import { useExecutionEngine } from '@/composables'
import { M3Tooltip } from '@/components/ui'
import ToolIcon from './ToolIcon.vue'

const navStore = useNavigationStore()
const { engine, platform } = useExecutionEngine()

const categoryIcons: Record<ToolCategory, any> = {
  all: Boxes,
  json: FileJson,
  crypto: ShieldCheck,
  converters: ArrowLeftRight,
  text: FileText,
  system: Cpu
}

const activeCategoryIcon = computed(() => {
  return categoryIcons[navStore.activeCategory] || Boxes
})

const isOverviewActive = computed(() => navStore.activeToolId === 'system-overview')
</script>

<template>
  <!-- Mobile Backdrop -->
  <div
    v-if="navStore.isMobileNavOpen"
    class="mobile-backdrop"
    @click="navStore.isMobileNavOpen = false"
  />

  <aside
    class="nav-rail-container"
    :class="{
      'mobile-open': navStore.isMobileNavOpen,
      'is-collapsed': navStore.isSidebarCollapsed
    }"
  >
    <!-- Header (Mobile Only Close Button) -->
    <div class="rail-mobile-header">
      <div class="drawer-title">
        <component :is="activeCategoryIcon" :size="20" class="category-icon-main" />
        <span>Categories & Tools</span>
      </div>
      <button
        type="button"
        class="close-drawer-btn"
        @click="navStore.isMobileNavOpen = false"
      >
        <X :size="20" />
      </button>
    </div>

    <!-- Pinned Top Navigation Anchor: Overview / Dashboard -->
    <div class="rail-top-anchor">
      <M3Tooltip :text="navStore.isSidebarCollapsed ? 'Overview & Hub Dashboard' : ''">
        <button
          type="button"
          class="overview-nav-btn"
          :class="{ active: isOverviewActive }"
          @click="navStore.selectTool('system-overview')"
        >
          <div class="overview-icon-box">
            <LayoutDashboard :size="18" />
          </div>
          <div class="overview-text">
            <span class="overview-title">Overview & Hub</span>
            <span class="overview-sub">Workspace Dashboard</span>
          </div>
          <span class="overview-badge">
            {{ navStore.tools.filter(t => t.id !== 'system-overview').length }}
          </span>
        </button>
      </M3Tooltip>
    </div>

    <!-- Rail Search / Filter Input -->
    <div class="rail-search-box" @click="navStore.isSidebarCollapsed ? navStore.openCommandPalette() : undefined">
      <Search :size="14" class="rail-search-icon" />
      <input
        v-if="!navStore.isSidebarCollapsed"
        v-model="navStore.searchQuery"
        type="text"
        placeholder="Filter tools..."
        class="rail-search-input"
      />
      <button
        v-if="!navStore.isSidebarCollapsed && navStore.searchQuery"
        type="button"
        class="clear-search-btn"
        @click.stop="navStore.searchQuery = ''"
      >
        <X :size="12" />
      </button>
    </div>

    <!-- Category Filter Bar (M3 Segmented / Pills) -->
    <div v-if="!navStore.isSidebarCollapsed" class="category-scroll-container">
      <div class="category-pills">
        <button
          v-for="cat in navStore.categories.filter(c => c.id !== 'system')"
          :key="cat.id"
          type="button"
          class="cat-pill"
          :class="{ active: navStore.activeCategory === cat.id }"
          @click="navStore.setCategory(cat.id)"
        >
          <component :is="categoryIcons[cat.id]" :size="13" />
          <span>{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Tools List Scroll View -->
    <nav class="tools-nav-list" aria-label="Tool Navigation">
      <div v-if="!navStore.isSidebarCollapsed" class="list-section-header">
        <span class="section-label">
          {{ navStore.activeCategory === 'all' ? 'All Developer Tools' : navStore.categories.find(c => c.id === navStore.activeCategory)?.label }}
        </span>
        <span class="section-count">
          {{ navStore.filteredTools.filter(t => t.id !== 'system-overview').length }}
        </span>
      </div>

      <div class="tools-group">
        <M3Tooltip
          v-for="tool in navStore.filteredTools.filter(t => t.id !== 'system-overview')"
          :key="tool.id"
          :text="navStore.isSidebarCollapsed ? tool.name : ''"
        >
          <button
            type="button"
            class="tool-item-btn"
            :class="{ active: navStore.activeToolId === tool.id }"
            @click="navStore.selectTool(tool.id)"
          >
            <div class="tool-icon-wrapper">
              <ToolIcon :name="tool.icon" :size="17" />
            </div>

            <div v-if="!navStore.isSidebarCollapsed" class="tool-text-meta">
              <span class="tool-name">{{ tool.name }}</span>
              <span class="tool-desc-short">{{ tool.description }}</span>
            </div>

            <div v-if="!navStore.isSidebarCollapsed && tool.status === 'ready'" class="tool-ready-dot" title="Ready to use" />
          </button>
        </M3Tooltip>
      </div>
    </nav>

    <!-- Rail Footer / Engine Status -->
    <div class="rail-footer">
      <M3Tooltip :text="navStore.isSidebarCollapsed ? `${engine.name} • 100% Offline • ${platform}` : ''">
        <div class="engine-status-box">
          <div class="status-indicator-dot" />
          <div v-if="!navStore.isSidebarCollapsed" class="status-meta">
            <span class="engine-name">{{ engine.name }}</span>
            <span class="platform-name">100% Offline • {{ platform }}</span>
          </div>
        </div>
      </M3Tooltip>
    </div>
  </aside>
</template>

<style scoped>
.nav-rail-container {
  width: 280px;
  background-color: var(--md-sys-color-surface-container-low);
  border-right: 1px solid var(--md-sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  position: sticky;
  top: 64px;
  flex-shrink: 0;
  user-select: none;
  font-family: var(--md-sys-typescale-font-family);
  z-index: 40;
  transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-rail-container.is-collapsed {
  width: 68px;
}

.nav-rail-container.is-collapsed .rail-top-anchor {
  padding: 0.5rem 0.5rem 0.25rem 0.5rem;
}

.nav-rail-container.is-collapsed .overview-nav-btn {
  justify-content: center;
  padding: 0.45rem;
}

.nav-rail-container.is-collapsed .rail-search-box {
  margin: 0.25rem 0.5rem;
  padding: 0.5rem;
  justify-content: center;
  cursor: pointer;
}

.nav-rail-container.is-collapsed .tools-nav-list {
  padding: 0.5rem 0.35rem;
  align-items: center;
}

.nav-rail-container.is-collapsed .tool-item-btn {
  justify-content: center;
  padding: 0.45rem;
}

.nav-rail-container.is-collapsed .rail-footer {
  padding: 0.75rem 0.5rem;
  display: flex;
  justify-content: center;
}

.nav-rail-container.is-collapsed .engine-status-box {
  justify-content: center;
}

.rail-mobile-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--md-sys-color-on-surface);
}

.close-drawer-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 0.25rem;
}

/* Top Anchor: Overview button */
.rail-top-anchor {
  padding: 0.75rem 0.75rem 0.5rem 0.75rem;
}

.overview-nav-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.overview-nav-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  border-color: var(--md-sys-color-primary);
}

.overview-nav-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.overview-icon-box {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  width: 32px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-small);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.overview-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.overview-title {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.overview-sub {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.overview-nav-btn.active .overview-sub {
  color: var(--md-sys-color-on-primary-container);
  opacity: 0.85;
}

.overview-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.overview-nav-btn.active .overview-badge {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* Search Box */
.rail-search-box {
  margin: 0 0.75rem 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.65rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
}

.rail-search-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.rail-search-input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
  width: 100%;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
}

.category-scroll-container {
  padding: 0.25rem 0.75rem 0.5rem 0.75rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  overflow-x: auto;
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.cat-pill {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  border-radius: 9999px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-pill:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.cat-pill.active {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  border-color: var(--md-sys-color-outline-variant);
  font-weight: 600;
}

.tools-nav-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.list-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.5rem 0.4rem 0.5rem;
}

.section-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--md-sys-color-on-surface-variant);
}

.section-count {
  font-size: 0.6875rem;
  font-weight: 600;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
}

.tools-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tool-item-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid transparent;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: transparent;
  color: var(--md-sys-color-on-surface);
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
  position: relative;
}

.tool-item-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.tool-item-btn.active {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  border-color: var(--md-sys-color-outline-variant);
  font-weight: 600;
}

.tool-item-btn.active .tool-icon-wrapper {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.tool-icon-wrapper {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
  padding: 0.4rem;
  border-radius: var(--md-sys-shape-corner-small);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.12s ease;
}

.tool-text-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tool-name {
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-desc-short {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-item-btn.active .tool-desc-short {
  color: var(--md-sys-color-on-secondary-container);
  opacity: 0.85;
}

.tool-ready-dot {
  width: 6px;
  height: 6px;
  background-color: #10b981;
  border-radius: 9999px;
  flex-shrink: 0;
}

.rail-footer {
  padding: 0.75rem 0.875rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
}

.engine-status-box {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 9999px;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
  flex-shrink: 0;
}

.status-meta {
  display: flex;
  flex-direction: column;
}

.engine-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.platform-name {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.mobile-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 90;
  }

  .nav-rail-container {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    height: 100vh;
    z-index: 100;
    transform: translateX(-100%);
    box-shadow: var(--md-sys-elevation-level3);
  }

  .nav-rail-container.mobile-open {
    transform: translateX(0);
  }

  .rail-mobile-header {
    display: flex;
  }
}
</style>
