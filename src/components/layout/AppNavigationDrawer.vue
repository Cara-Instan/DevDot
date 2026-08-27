<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  Boxes,
  FileJson,
  ShieldCheck,
  ArrowLeftRight,
  FileText,
  Cpu,
  X,
  LayoutDashboard,
  Search,
  Sparkles
} from 'lucide-vue-next'
import { useNavigationStore, ToolCategory } from '@/stores'
import { useExecutionEngine } from '@/composables'
import ToolIcon from './ToolIcon.vue'

const navStore = useNavigationStore()
const { engine, platform } = useExecutionEngine()

const searchInputRef = ref<HTMLInputElement | null>(null)
const drawerContainerRef = ref<HTMLElement | null>(null)

const categoryIcons: Record<ToolCategory, any> = {
  all: Boxes,
  json: FileJson,
  crypto: ShieldCheck,
  converters: ArrowLeftRight,
  text: FileText,
  system: Cpu
}

const isOverviewActive = computed(() => navStore.activeToolId === 'system-overview')

// Focus search input when drawer opens
watch(
  () => navStore.isNavDrawerOpen,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        searchInputRef.value?.focus()
      })
    }
  }
)

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && navStore.isNavDrawerOpen) {
    navStore.closeNavDrawer()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

function handleSelectTool(toolId: string) {
  navStore.selectTool(toolId)
  navStore.closeNavDrawer()
}

function handleSelectOverview() {
  navStore.selectTool('system-overview')
  navStore.closeNavDrawer()
}
</script>

<template>
  <Teleport to="body">
    <!-- Slide-Over Drawer Container -->
    <div
      v-if="navStore.isNavDrawerOpen"
      class="drawer-backdrop-overlay"
      @click="navStore.closeNavDrawer()"
    >
      <aside
        ref="drawerContainerRef"
        class="nav-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Flyout Drawer"
        @click.stop
      >
        <!-- Drawer Header -->
        <div class="drawer-header">
          <div class="drawer-brand">
            <div class="drawer-brand-icon">
              <Sparkles :size="16" />
            </div>
            <div class="drawer-brand-text">
              <span class="brand-title">DevDot Tools</span>
              <span class="brand-sub">Slide-over Navigation</span>
            </div>
          </div>
          <button
            type="button"
            class="close-drawer-btn"
            aria-label="Close navigation drawer"
            @click="navStore.closeNavDrawer()"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Pinned Top Anchor: Overview / Dashboard -->
        <div class="drawer-top-anchor">
          <button
            type="button"
            class="overview-drawer-btn"
            :class="{ active: isOverviewActive }"
            @click="handleSelectOverview"
          >
            <div class="overview-icon-box">
              <LayoutDashboard :size="18" />
            </div>
            <div class="overview-text">
              <span class="overview-title">Overview & Hub</span>
              <span class="overview-sub">Workspace Catalog</span>
            </div>
            <span class="overview-badge">
              {{ navStore.tools.filter(t => t.id !== 'system-overview').length }}
            </span>
          </button>
        </div>

        <!-- Drawer Search / Filter Input -->
        <div class="drawer-search-box">
          <Search :size="14" class="drawer-search-icon" />
          <input
            ref="searchInputRef"
            v-model="navStore.searchQuery"
            type="text"
            placeholder="Filter tools..."
            class="drawer-search-input"
            @keydown.esc.stop="navStore.closeNavDrawer()"
          />
          <button
            v-if="navStore.searchQuery"
            type="button"
            class="clear-search-btn"
            @click="navStore.searchQuery = ''"
          >
            <X :size="12" />
          </button>
        </div>

        <!-- Category Filter Bar (Pills) -->
        <div class="category-scroll-container">
          <div class="category-pills">
            <button
              v-for="cat in navStore.categories.filter(c => c.id !== 'system')"
              :key="cat.id"
              type="button"
              class="cat-pill"
              :class="{ active: navStore.activeCategory === cat.id }"
              @click="navStore.setCategory(cat.id)"
            >
              <component :is="categoryIcons[cat.id]" :size="12" />
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <!-- Tools List Scroll View -->
        <nav class="tools-drawer-list" aria-label="Tools List">
          <div class="list-section-header">
            <span class="section-label">
              {{ navStore.activeCategory === 'all' ? 'All Developer Tools' : navStore.categories.find(c => c.id === navStore.activeCategory)?.label }}
            </span>
            <span class="section-count">
              {{ navStore.filteredTools.filter(t => t.id !== 'system-overview').length }}
            </span>
          </div>

          <div class="tools-group">
            <button
              v-for="tool in navStore.filteredTools.filter(t => t.id !== 'system-overview')"
              :key="tool.id"
              type="button"
              class="tool-item-btn"
              :class="{ active: navStore.activeToolId === tool.id }"
              @click="handleSelectTool(tool.id)"
            >
              <div class="tool-icon-wrapper">
                <ToolIcon :name="tool.icon" :size="16" />
              </div>

              <div class="tool-text-meta">
                <span class="tool-name">{{ tool.name }}</span>
                <span class="tool-desc-short">{{ tool.description }}</span>
              </div>

              <div v-if="tool.status === 'ready'" class="tool-ready-dot" title="Ready to use" />
            </button>

            <div v-if="navStore.filteredTools.filter(t => t.id !== 'system-overview').length === 0" class="empty-tools-state">
              No matching tools found
            </div>
          </div>
        </nav>

        <!-- Drawer Footer / Engine Status -->
        <div class="drawer-footer">
          <div class="engine-status-box">
            <div class="status-indicator-dot" />
            <div class="status-meta">
              <span class="engine-name">{{ engine.name }}</span>
              <span class="platform-name">100% Offline • {{ platform }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
/* Fullscreen Backdrop */
.drawer-backdrop-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-start;
  animation: backdrop-fade 0.18s ease-out;
}

@keyframes backdrop-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Slide-Over Flyout Panel */
.nav-drawer-panel {
  width: 320px;
  max-width: 85vw;
  height: 100%;
  background-color: var(--md-sys-color-surface-container-low);
  border-right: 1px solid var(--md-sys-color-outline-variant);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  user-select: none;
  font-family: var(--md-sys-typescale-font-family);
  animation: slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes slide-in {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.drawer-brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-tertiary, #8b5cf6) 100%);
  color: var(--md-sys-color-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drawer-brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
  line-height: 1.2;
}

.brand-sub {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.close-drawer-btn {
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
}

.close-drawer-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline-variant);
}

/* Top Anchor: Overview */
.drawer-top-anchor {
  padding: 0.75rem 0.75rem 0.35rem 0.75rem;
}

.overview-drawer-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.overview-drawer-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  border-color: var(--md-sys-color-primary);
}

.overview-drawer-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.overview-icon-box {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  width: 30px;
  height: 30px;
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

.overview-drawer-btn.active .overview-sub {
  color: var(--md-sys-color-on-primary-container);
  opacity: 0.85;
}

.overview-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 9999px;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}

.overview-drawer-btn.active .overview-badge {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* Search Box */
.drawer-search-box {
  margin: 0.35rem 0.75rem 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
}

.drawer-search-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.drawer-search-input {
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

/* Category Pills */
.category-scroll-container {
  padding: 0 0.75rem 0.5rem 0.75rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  overflow-x: auto;
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.cat-pill {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  border-radius: 9999px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
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

/* Tools List */
.tools-drawer-list {
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
  padding: 0.2rem 0.5rem 0.35rem 0.5rem;
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
  padding: 0.08rem 0.35rem;
  border-radius: 9999px;
}

.tools-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tool-item-btn {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
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
  padding: 0.35rem;
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

.empty-tools-state {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

/* Footer */
.drawer-footer {
  padding: 0.65rem 0.875rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
}

.engine-status-box {
  display: flex;
  align-items: center;
  gap: 0.55rem;
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
</style>
