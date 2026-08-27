<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  Maximize2,
  Minimize2,
  RotateCcw
} from 'lucide-vue-next'

interface Props {
  direction?: 'horizontal' | 'vertical'
  initialSplit?: number // percentage 0 - 100
  minSplit?: number
  maxSplit?: number
  collapsible?: boolean
  showControls?: boolean
  mobileBreakpoint?: number // px
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'horizontal',
  initialSplit: 50,
  minSplit: 15,
  maxSplit: 85,
  collapsible: true,
  showControls: true,
  mobileBreakpoint: 768
})

const emit = defineEmits<{
  (e: 'resize', splitPercent: number): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const splitPercent = ref(props.initialSplit)
const isDragging = ref(false)
const activeMobileTab = ref<'pane-1' | 'pane-2'>('pane-1')
const isMobile = ref(false)

// Check viewport width
function checkMobile() {
  if (typeof window === 'undefined') return
  isMobile.value = window.innerWidth < props.mobileBreakpoint
}

// Drag & Resize Handlers
function startDrag(event: MouseEvent | TouchEvent) {
  event.preventDefault()
  isDragging.value = true

  document.body.style.cursor = props.direction === 'horizontal' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchend', stopDrag)
}

function onDrag(event: MouseEvent | TouchEvent) {
  if (!isDragging.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  let clientPos = 0
  let totalSize = 0

  if (props.direction === 'horizontal') {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    clientPos = clientX - rect.left
    totalSize = rect.width
  } else {
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    clientPos = clientY - rect.top
    totalSize = rect.height
  }

  if (totalSize <= 0) return

  let percent = (clientPos / totalSize) * 100
  percent = Math.max(props.minSplit, Math.min(props.maxSplit, percent))

  splitPercent.value = percent
  emit('resize', percent)
}

function stopDrag() {
  if (!isDragging.value) return
  isDragging.value = false

  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchend', stopDrag)
}

// Quick Preset Actions
function setSplit(percent: number) {
  splitPercent.value = Math.max(props.minSplit, Math.min(props.maxSplit, percent))
  emit('resize', splitPercent.value)
}

function resetSplit() {
  setSplit(50)
}

function maximizePane1() {
  setSplit(props.maxSplit)
}

function maximizePane2() {
  setSplit(props.minSplit)
}

// Keyboard navigation on divider
function handleDividerKeyDown(event: KeyboardEvent) {
  const step = 5
  if (props.direction === 'horizontal') {
    if (event.key === 'ArrowLeft') {
      setSplit(splitPercent.value - step)
      event.preventDefault()
    } else if (event.key === 'ArrowRight') {
      setSplit(splitPercent.value + step)
      event.preventDefault()
    }
  } else {
    if (event.key === 'ArrowUp') {
      setSplit(splitPercent.value - step)
      event.preventDefault()
    } else if (event.key === 'ArrowDown') {
      setSplit(splitPercent.value + step)
      event.preventDefault()
    }
  }

  if (event.key === 'Home') {
    resetSplit()
    event.preventDefault()
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  stopDrag()
  window.removeEventListener('resize', checkMobile)
})

defineExpose({
  splitPercent,
  setSplit,
  resetSplit,
  maximizePane1,
  maximizePane2
})
</script>

<template>
  <div
    ref="containerRef"
    class="m3-split-pane-wrapper"
    :class="[
      `direction-${direction}`,
      {
        'is-dragging': isDragging,
        'is-mobile': isMobile
      }
    ]"
  >
    <!-- Mobile Tabs Switcher -->
    <div v-if="isMobile" class="mobile-pane-tabs">
      <button
        type="button"
        class="mobile-tab-btn"
        :class="{ active: activeMobileTab === 'pane-1' }"
        @click="activeMobileTab = 'pane-1'"
      >
        <slot name="pane-1-tab-label">Input Panel</slot>
      </button>

      <button
        type="button"
        class="mobile-tab-btn"
        :class="{ active: activeMobileTab === 'pane-2' }"
        @click="activeMobileTab = 'pane-2'"
      >
        <slot name="pane-2-tab-label">Output Panel</slot>
      </button>
    </div>

    <!-- Main Panes Container -->
    <div class="panes-container">
      <!-- Pane 1 (Left / Top) -->
      <section
        class="split-pane pane-1"
        :class="{ 'mobile-hidden': isMobile && activeMobileTab !== 'pane-1' }"
        :style="!isMobile ? {
          flexBasis: `${splitPercent}%`,
          flexGrow: 0,
          flexShrink: 0
        } : undefined"
      >
        <slot name="pane-1" />
      </section>

      <!-- Resizable Divider Bar (Desktop) -->
      <div
        v-if="!isMobile"
        class="split-divider"
        :class="{ 'divider-dragging': isDragging }"
        tabindex="0"
        role="separator"
        :aria-valuenow="Math.round(splitPercent)"
        aria-valuemin="10"
        aria-valuemax="90"
        aria-label="Resize Split View"
        @mousedown="startDrag"
        @touchstart="startDrag"
        @dblclick="resetSplit"
        @keydown="handleDividerKeyDown"
      >
        <div class="divider-handle">
          <div class="handle-bar" />
        </div>

        <!-- Quick Floating Split Controls -->
        <div v-if="showControls" class="divider-quick-controls">
          <button
            type="button"
            class="quick-ctrl-btn"
            title="Maximize Left Panel"
            @click.stop="maximizePane1"
          >
            <Maximize2 :size="10" />
          </button>
          <button
            type="button"
            class="quick-ctrl-btn"
            title="Reset Split (50/50)"
            @click.stop="resetSplit"
          >
            <RotateCcw :size="10" />
          </button>
          <button
            type="button"
            class="quick-ctrl-btn"
            title="Maximize Right Panel"
            @click.stop="maximizePane2"
          >
            <Minimize2 :size="10" />
          </button>
        </div>
      </div>

      <!-- Pane 2 (Right / Bottom) -->
      <section
        class="split-pane pane-2"
        :class="{ 'mobile-hidden': isMobile && activeMobileTab !== 'pane-2' }"
        :style="!isMobile ? {
          flexBasis: `calc(${100 - splitPercent}% - 8px)`,
          flexGrow: 1,
          flexShrink: 1
        } : undefined"
      >
        <slot name="pane-2" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.m3-split-pane-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  border-radius: var(--md-sys-shape-corner-medium);
}

.panes-container {
  display: flex;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
}

.direction-horizontal .panes-container {
  flex-direction: row;
}

.direction-vertical .panes-container {
  flex-direction: column;
}

/* Individual Pane */
.split-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

/* Resizable Divider */
.split-divider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--md-sys-color-surface-container);
  transition: background-color 0.15s ease;
  z-index: 5;
  user-select: none;
  touch-action: none;
  outline: none;
}

.direction-horizontal .split-divider {
  width: 8px;
  cursor: col-resize;
  border-left: 1px solid var(--md-sys-color-outline-variant);
  border-right: 1px solid var(--md-sys-color-outline-variant);
}

.direction-vertical .split-divider {
  height: 8px;
  cursor: row-resize;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.split-divider:hover,
.split-divider.divider-dragging,
.split-divider:focus-visible {
  background-color: var(--md-sys-color-primary-container);
}

.divider-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.direction-horizontal .handle-bar {
  width: 3px;
  height: 28px;
  background-color: var(--md-sys-color-outline);
  border-radius: 9999px;
  transition: background-color 0.15s ease, height 0.15s ease;
}

.direction-vertical .handle-bar {
  height: 3px;
  width: 28px;
  background-color: var(--md-sys-color-outline);
  border-radius: 9999px;
  transition: background-color 0.15s ease, width 0.15s ease;
}

.split-divider:hover .handle-bar,
.split-divider.divider-dragging .handle-bar,
.split-divider:focus-visible .handle-bar {
  background-color: var(--md-sys-color-primary);
}

/* Quick Divider Controls */
.divider-quick-controls {
  position: absolute;
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-extra-small);
  padding: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform: scale(0.9);
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.split-divider:hover .divider-quick-controls,
.split-divider:focus-visible .divider-quick-controls {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.quick-ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-ctrl-btn:hover {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

/* Mobile Tabs */
.mobile-pane-tabs {
  display: flex;
  width: 100%;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  margin-bottom: 0.75rem;
  overflow: hidden;
  padding: 3px;
  gap: 4px;
}

.mobile-tab-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: var(--md-sys-shape-corner-extra-small);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobile-tab-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mobile-hidden {
  display: none !important;
}

/* Dragging state */
.is-dragging {
  user-select: none;
}
</style>
