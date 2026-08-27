<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Star,
  GripVertical,
  RotateCcw,
  LayoutGrid,
  List,
  X,
  AlertTriangle
} from 'lucide-vue-next'
import {
  M3Button,
  ToolIcon
} from '@/components'
import {
  useNavigationStore,
  useSettingsStore,
  DEFAULT_TOOL_ORDER,
  ToolCategory
} from '@/stores'
import appLogo from '@/assets/logo.png'

const navStore = useNavigationStore()
const settingsStore = useSettingsStore()

// Dashboard View Mode & Filters
const overviewSearch = ref('')
const selectedCategory = ref<ToolCategory>('all')
const viewMode = ref<'grid' | 'list'>('grid')

// Drag & Drop State
const draggedToolId = ref<string | null>(null)
const dragOverToolId = ref<string | null>(null)
const dragDropPosition = ref<'before' | 'after' | null>(null)
const isDraggingActive = ref(false)

// Display Categories (exclude system overview)
const displayCategories = computed(() =>
  navStore.categories.filter((cat) => cat.id !== 'system')
)

// Base tools excluding system overview
const allNavTools = computed(() =>
  navStore.tools.filter((t) => t.id !== 'system-overview')
)

// Custom order detection
const isCustomOrder = computed(() => {
  const current = settingsStore.toolOrder
  if (!current || current.length === 0) return false
  return JSON.stringify(current) !== JSON.stringify(DEFAULT_TOOL_ORDER)
})

// Ordered tools based on settingsStore.toolOrder
const orderedTools = computed(() => {
  const order = settingsStore.toolOrder || []
  const tools = [...allNavTools.value]
  return tools.sort((a, b) => {
    const indexA = order.indexOf(a.id)
    const indexB = order.indexOf(b.id)
    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })
})

// Filtered Tools based on search and category
const dashboardTools = computed(() => {
  let list = orderedTools.value
  if (selectedCategory.value !== 'all') {
    list = list.filter((t) => t.category === selectedCategory.value)
  }
  if (overviewSearch.value.trim()) {
    const q = overviewSearch.value.toLowerCase().trim()
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }
  return list
})

// Tool Navigation
function handleToolClick(toolId: string) {
  if (isDraggingActive.value) return
  navStore.selectTool(toolId)
}

// Reset Order Handler
function handleResetOrder() {
  settingsStore.resetToolOrder()
}

// Drag & Drop Event Handlers (HTML5 Drag and Drop API)
function onDragStart(event: DragEvent, toolId: string) {
  draggedToolId.value = toolId
  isDraggingActive.value = true
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', toolId)
    // Customize drag preview if needed
    try {
      const el = event.currentTarget as HTMLElement
      if (el) {
        event.dataTransfer.setDragImage(el, 20, 20)
      }
    } catch {
      // ignore
    }
  }
}

function onDragOver(event: DragEvent, targetToolId: string) {
  event.preventDefault()
  if (!draggedToolId.value || draggedToolId.value === targetToolId) return

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  dragOverToolId.value = targetToolId

  const targetEl = event.currentTarget as HTMLElement
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect()
    if (viewMode.value === 'grid') {
      const midpoint = rect.left + rect.width / 2
      dragDropPosition.value = event.clientX < midpoint ? 'before' : 'after'
    } else {
      const midpoint = rect.top + rect.height / 2
      dragDropPosition.value = event.clientY < midpoint ? 'before' : 'after'
    }
  }
}

function onDragLeave(event: DragEvent, targetToolId: string) {
  if (dragOverToolId.value === targetToolId) {
    const current = event.currentTarget as HTMLElement
    const related = event.relatedTarget as HTMLElement
    if (!current || !related || !current.contains(related)) {
      dragOverToolId.value = null
      dragDropPosition.value = null
    }
  }
}

function onDrop(event: DragEvent, targetToolId: string) {
  event.preventDefault()
  const sourceId =
    draggedToolId.value ||
    (event.dataTransfer ? event.dataTransfer.getData('text/plain') : null)

  if (!sourceId || sourceId === targetToolId) {
    resetDragState()
    return
  }

  // Clone current full toolOrder or fallback to default
  const currentOrder = settingsStore.toolOrder && settingsStore.toolOrder.length > 0
    ? [...settingsStore.toolOrder]
    : [...DEFAULT_TOOL_ORDER]

  // Ensure both tools exist in list
  if (!currentOrder.includes(sourceId)) currentOrder.push(sourceId)
  if (!currentOrder.includes(targetToolId)) currentOrder.push(targetToolId)

  // Remove source
  const sourceIdx = currentOrder.indexOf(sourceId)
  currentOrder.splice(sourceIdx, 1)

  // Insert before or after target
  const targetIdx = currentOrder.indexOf(targetToolId)
  const insertIdx = dragDropPosition.value === 'after' ? targetIdx + 1 : targetIdx
  currentOrder.splice(insertIdx, 0, sourceId)

  // Persist updated order
  settingsStore.updateSettings({ toolOrder: currentOrder })
  resetDragState()
}

function onDragEnd() {
  resetDragState()
}

function resetDragState() {
  draggedToolId.value = null
  dragOverToolId.value = null
  dragDropPosition.value = null
  setTimeout(() => {
    isDraggingActive.value = false
  }, 100)
}
</script>

<template>
  <div class="overview-launchpad">
    <!-- Compact Intro Banner -->
    <header class="overview-header">
      <div class="header-left">
        <div class="overview-logo-badge">
          <img :src="appLogo" alt="DevDot Logo" class="overview-logo-img" />
        </div>
        <div class="header-titles">
          <h1 class="overview-title">Developer Toolkit</h1>
          <p class="overview-subtitle">
            Air-gapped offline developer utilities, crypto inspection, formatters, and data converters.
          </p>
        </div>
      </div>
      <div class="header-right">
        <span class="offline-pill">
          <ShieldCheck :size="14" class="pill-icon" />
          <span>100% Offline Air-Gapped</span>
        </span>
      </div>
    </header>

    <!-- Pinned Favorites (If Any) -->
    <section v-if="navStore.favoriteTools.length > 0" class="pinned-section">
      <div class="pinned-header">
        <Star :size="15" class="star-icon-filled" />
        <span class="pinned-title">Pinned Favorites</span>
        <span class="pinned-count">{{ navStore.favoriteTools.length }}</span>
      </div>

      <div class="favorites-grid">
        <div
          v-for="tool in navStore.favoriteTools"
          :key="tool.id"
          class="favorite-card"
          @click="navStore.selectTool(tool.id)"
        >
          <div class="fav-icon-box">
            <ToolIcon :name="tool.icon" :size="18" />
          </div>
          <div class="fav-info">
            <span class="fav-name">{{ tool.name }}</span>
            <span class="fav-category">{{ tool.category.toUpperCase() }}</span>
          </div>
          <button
            type="button"
            class="fav-unpin-btn"
            title="Remove from favorites"
            @click.stop="navStore.toggleFavorite(tool.id)"
          >
            <Star :size="14" class="star-icon-filled" />
          </button>
        </div>
      </div>
    </section>

    <!-- Tool Catalog & Filters Section -->
    <section class="catalog-section">
      <!-- Catalog Controls Bar -->
      <div class="catalog-filter-bar">
        <div class="filter-left">
          <div class="catalog-search-wrapper">
            <Search :size="15" class="search-icon" />
            <input
              v-model="overviewSearch"
              type="text"
              class="catalog-search-field"
              placeholder="Filter tools by name, tag, or keyword..."
            />
            <button
              v-if="overviewSearch"
              type="button"
              class="clear-filter-btn"
              title="Clear search"
              @click="overviewSearch = ''"
            >
              <X :size="14" />
            </button>
          </div>

          <!-- Category Filter Pills -->
          <div class="category-pills">
            <button
              v-for="cat in displayCategories"
              :key="cat.id"
              type="button"
              class="cat-pill"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <div class="filter-right">
          <!-- Reset Order Button (shown when custom order exists) -->
          <button
            v-if="isCustomOrder"
            type="button"
            class="reset-order-btn"
            title="Reset cards to default order"
            @click="handleResetOrder"
          >
            <RotateCcw :size="13" />
            <span>Reset Order</span>
          </button>

          <!-- View Density Toggle (Grid vs List) -->
          <div class="view-mode-toggle">
            <button
              type="button"
              class="view-toggle-btn"
              :class="{ active: viewMode === 'grid' }"
              title="Grid View"
              @click="viewMode = 'grid'"
            >
              <LayoutGrid :size="15" />
            </button>
            <button
              type="button"
              class="view-toggle-btn"
              :class="{ active: viewMode === 'list' }"
              title="List View"
              @click="viewMode = 'list'"
            >
              <List :size="15" />
            </button>
          </div>
        </div>
      </div>

      <!-- Drag Reorder Hint Bar -->
      <div class="reorder-hint-bar">
        <span class="hint-text">
          <GripVertical :size="13" class="hint-icon" />
          <span>Drag cards to reorder your toolkit catalog</span>
        </span>
        <span class="catalog-count">{{ dashboardTools.length }} tools available</span>
      </div>

      <!-- Tools Grid View with Drag & Drop Reordering -->
      <div
        v-if="dashboardTools.length > 0 && viewMode === 'grid'"
        class="tool-cards-grid"
      >
        <div
          v-for="tool in dashboardTools"
          :key="tool.id"
          class="tool-card"
          :class="{
            'is-dragging': draggedToolId === tool.id,
            'drop-target-before': dragOverToolId === tool.id && dragDropPosition === 'before',
            'drop-target-after': dragOverToolId === tool.id && dragDropPosition === 'after'
          }"
          draggable="true"
          @dragstart="onDragStart($event, tool.id)"
          @dragover="onDragOver($event, tool.id)"
          @dragleave="onDragLeave($event, tool.id)"
          @drop="onDrop($event, tool.id)"
          @dragend="onDragEnd"
          @click="handleToolClick(tool.id)"
        >
          <div class="card-top-row">
            <div class="card-top-left">
              <div class="drag-handle" title="Drag to reorder">
                <GripVertical :size="15" />
              </div>
              <div class="card-icon-container">
                <ToolIcon :name="tool.icon" :size="20" />
              </div>
            </div>

            <div class="card-top-actions">
              <span class="category-tag">{{ tool.category.toUpperCase() }}</span>
              <button
                type="button"
                class="card-star-btn"
                :class="{ active: navStore.isFavorite(tool.id) }"
                :title="navStore.isFavorite(tool.id) ? 'Remove Favorite' : 'Add to Favorites'"
                @click.stop="navStore.toggleFavorite(tool.id)"
              >
                <Star :size="14" :class="{ 'star-filled': navStore.isFavorite(tool.id) }" />
              </button>
            </div>
          </div>

          <div class="card-content">
            <h4 class="card-name">{{ tool.name }}</h4>
            <p class="card-desc">{{ tool.description }}</p>
          </div>

          <div class="card-keywords-row">
            <span
              v-for="kw in tool.keywords.slice(0, 3)"
              :key="kw"
              class="kw-badge"
            >
              {{ kw }}
            </span>
          </div>

          <div class="card-footer">
            <span class="launch-text">Launch Tool</span>
            <ArrowRight :size="14" class="launch-arrow" />
          </div>
        </div>
      </div>

      <!-- Tools List View with Drag & Drop Reordering -->
      <div
        v-else-if="dashboardTools.length > 0 && viewMode === 'list'"
        class="tool-cards-list"
      >
        <div
          v-for="tool in dashboardTools"
          :key="tool.id"
          class="tool-list-row"
          :class="{
            'is-dragging': draggedToolId === tool.id,
            'drop-target-before': dragOverToolId === tool.id && dragDropPosition === 'before',
            'drop-target-after': dragOverToolId === tool.id && dragDropPosition === 'after'
          }"
          draggable="true"
          @dragstart="onDragStart($event, tool.id)"
          @dragover="onDragOver($event, tool.id)"
          @dragleave="onDragLeave($event, tool.id)"
          @drop="onDrop($event, tool.id)"
          @dragend="onDragEnd"
          @click="handleToolClick(tool.id)"
        >
          <div class="drag-handle list-handle" title="Drag to reorder">
            <GripVertical :size="15" />
          </div>

          <div class="list-icon-box">
            <ToolIcon :name="tool.icon" :size="16" />
          </div>

          <div class="list-content">
            <div class="list-title-row">
              <span class="list-name">{{ tool.name }}</span>
              <span class="category-tag small">{{ tool.category.toUpperCase() }}</span>
            </div>
            <p class="list-desc">{{ tool.description }}</p>
          </div>

          <div class="list-actions">
            <button
              type="button"
              class="card-star-btn"
              :class="{ active: navStore.isFavorite(tool.id) }"
              :title="navStore.isFavorite(tool.id) ? 'Remove Favorite' : 'Add to Favorites'"
              @click.stop="navStore.toggleFavorite(tool.id)"
            >
              <Star :size="14" :class="{ 'star-filled': navStore.isFavorite(tool.id) }" />
            </button>
            <div class="list-launch-pill">
              <span>Open</span>
              <ArrowRight :size="12" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-search-state">
        <AlertTriangle :size="28" class="empty-icon" />
        <h3>No tools found</h3>
        <p>No tools matched "{{ overviewSearch }}". Try clearing the search query or selecting another category.</p>
        <M3Button variant="tonal" @click="overviewSearch = ''; selectedCategory = 'all'">
          Reset Filter
        </M3Button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overview-launchpad {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 1400px;
  margin: 0 auto;
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
  padding-bottom: 2rem;
}

/* Compact Intro Banner */
.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.overview-logo-badge {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.overview-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.overview-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--md-sys-color-on-surface);
}

.overview-subtitle {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface-variant);
}

.header-right {
  display: flex;
  align-items: center;
}

.offline-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #10b981;
}

.pill-icon {
  color: #10b981;
}

/* Pinned Favorites Section */
.pinned-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pinned-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--md-sys-color-on-surface-variant);
}

.star-icon-filled {
  color: #f59e0b;
  fill: #f59e0b;
}

.pinned-count {
  font-size: 0.6875rem;
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.05rem 0.4rem;
  border-radius: 9999px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.625rem;
}

.favorite-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.85rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  cursor: pointer;
  transition: all 0.15s ease;
}

.favorite-card:hover {
  background-color: var(--md-sys-color-surface-container);
  border-color: var(--md-sys-color-primary);
  transform: translateY(-1px);
}

.fav-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  flex-shrink: 0;
}

.fav-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.fav-name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-category {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface-variant);
  letter-spacing: 0.05em;
}

.fav-unpin-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.fav-unpin-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Tool Catalog & Filters */
.catalog-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.catalog-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  flex: 1;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.catalog-search-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  min-width: 260px;
}

.search-icon {
  color: var(--md-sys-color-on-surface-variant);
}

.catalog-search-field {
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
  outline: none;
  width: 100%;
}

.clear-filter-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-pills {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.cat-pill {
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-pill:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.cat-pill.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.reset-order-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.71875rem;
  font-weight: 600;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-order-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
}

.view-mode-toggle {
  display: flex;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.15rem;
}

.view-toggle-btn {
  border: none;
  background: transparent;
  padding: 0.3rem 0.45rem;
  border-radius: var(--md-sys-shape-corner-extra-small);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-toggle-btn.active {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
}

/* Reorder Hint Bar */
.reorder-hint-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.2rem;
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.hint-text {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  opacity: 0.8;
}

.hint-icon {
  color: var(--md-sys-color-primary);
}

.catalog-count {
  font-weight: 600;
}

/* Grid Cards with Drag and Drop */
.tool-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.85rem;
}

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem 1.15rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  min-height: 180px;
  user-select: none;
}

.tool-card:hover {
  background-color: var(--md-sys-color-surface-container);
  border-color: var(--md-sys-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

/* Dragging & Drop States */
.tool-card.is-dragging {
  opacity: 0.35;
  transform: scale(0.97);
  border: 2px dashed var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-highest);
}

.tool-card.drop-target-before {
  border-left: 3px solid var(--md-sys-color-primary);
  box-shadow: -4px 0 12px rgba(var(--md-sys-color-primary-rgb, 99, 102, 241), 0.35);
}

.tool-card.drop-target-after {
  border-right: 3px solid var(--md-sys-color-primary);
  box-shadow: 4px 0 12px rgba(var(--md-sys-color-primary-rgb, 99, 102, 241), 0.35);
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-top-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.4;
  padding: 0.2rem 0;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.tool-card:hover .drag-handle,
.tool-list-row:hover .drag-handle {
  opacity: 0.9;
  color: var(--md-sys-color-primary);
}

.drag-handle:active {
  cursor: grabbing;
}

.card-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.card-top-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.category-tag {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.12rem 0.45rem;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 9999px;
}

.category-tag.small {
  font-size: 0.5625rem;
  padding: 0.08rem 0.35rem;
}

.card-star-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.15s ease;
}

.card-star-btn:hover {
  color: #f59e0b;
  transform: scale(1.15);
}

.card-star-btn.active .star-filled {
  color: #f59e0b;
  fill: #f59e0b;
}

.card-content {
  margin: 0.6rem 0 0.4rem 0;
}

.card-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.card-desc {
  margin: 0.3rem 0 0 0;
  font-size: 0.78125rem;
  line-height: 1.4;
  color: var(--md-sys-color-on-surface-variant);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-keywords-row {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin: 0.4rem 0;
}

.kw-badge {
  font-size: 0.6rem;
  padding: 0.08rem 0.35rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-extra-small);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.4rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.launch-text {
  font-size: 0.71875rem;
  font-weight: 700;
  color: var(--md-sys-color-primary);
}

.launch-arrow {
  color: var(--md-sys-color-primary);
  transition: transform 0.2s ease;
}

.tool-card:hover .launch-arrow {
  transform: translateX(3px);
}

/* List View */
.tool-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tool-list-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.tool-list-row:hover {
  background-color: var(--md-sys-color-surface-container);
  border-color: var(--md-sys-color-primary);
}

.tool-list-row.is-dragging {
  opacity: 0.35;
  border: 2px dashed var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-highest);
}

.tool-list-row.drop-target-before {
  border-top: 3px solid var(--md-sys-color-primary);
  box-shadow: 0 -4px 12px rgba(var(--md-sys-color-primary-rgb, 99, 102, 241), 0.35);
}

.tool-list-row.drop-target-after {
  border-bottom: 3px solid var(--md-sys-color-primary);
  box-shadow: 0 4px 12px rgba(var(--md-sys-color-primary-rgb, 99, 102, 241), 0.35);
}

.list-handle {
  padding: 0 0.1rem;
}

.list-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  flex-shrink: 0;
}

.list-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.list-title-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.list-name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.list-desc {
  margin: 0.1rem 0 0 0;
  font-size: 0.71875rem;
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.list-launch-pill {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-radius: 9999px;
  font-size: 0.65625rem;
  font-weight: 700;
}

/* Empty State */
.empty-search-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  gap: 0.65rem;
}

.empty-icon {
  color: #f59e0b;
}

@media (max-width: 768px) {
  .overview-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .catalog-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-left, .filter-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
