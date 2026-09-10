<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import M3Tooltip from '../ui/M3Tooltip.vue'

interface Props {
  title?: string
  indicator?: 'base' | 'modified' | 'info' | 'success' | 'warning' | 'error' | 'none'
  indicatorColor?: string
  badge?: string | number | null
  showFind?: boolean
  findActive?: boolean
  findTooltip?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  indicator: 'none',
  badge: null,
  showFind: false,
  findActive: false,
  findTooltip: 'Find in Editor (Ctrl+F)'
})

const emit = defineEmits<{
  (e: 'toggle-find'): void
}>()
</script>

<template>
  <div class="pane-header-bar">
    <div class="pane-header-left">
      <div
        v-if="indicatorColor || indicator !== 'none'"
        class="indicator-dot"
        :class="indicator !== 'none' ? `dot-${indicator}` : undefined"
        :style="indicatorColor ? { backgroundColor: indicatorColor, boxShadow: `0 0 6px ${indicatorColor}` } : undefined"
      />
      <slot name="title">
        <span v-if="title" class="pane-title">{{ title }}</span>
      </slot>
      <slot name="badge">
        <span v-if="badge !== null && badge !== undefined" class="pane-badge">{{ badge }}</span>
      </slot>
      <slot name="left" />
    </div>

    <div class="pane-header-right">
      <slot name="actions" />

      <!-- Optional Find Button -->
      <M3Tooltip v-if="showFind" :text="findTooltip" placement="top">
        <button
          type="button"
          class="pane-icon-btn find-toggle-btn"
          :class="{ active: findActive }"
          :aria-label="findTooltip"
          @click="emit('toggle-find')"
        >
          <Search :size="13" />
        </button>
      </M3Tooltip>

      <slot name="actions-after-find" />
    </div>
  </div>
</template>

<style scoped>
.pane-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  height: 36px;
  box-sizing: border-box;
  flex-shrink: 0;
  user-select: none;
}

.pane-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-base {
  background: #0ea5e9;
  box-shadow: 0 0 6px rgba(14, 165, 233, 0.4);
}

.dot-modified {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.dot-info {
  background: var(--md-sys-color-primary);
}

.dot-success {
  background: #10b981;
}

.dot-warning {
  background: #f59e0b;
}

.dot-error {
  background: var(--md-sys-color-error);
}

.pane-title {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  letter-spacing: 0.2px;
}

.pane-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 9999px;
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border: 1px solid var(--md-sys-color-outline-variant);
  white-space: nowrap;
}

.pane-header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pane-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.12s ease;
  padding: 0;
  flex-shrink: 0;
}

.pane-icon-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline-variant);
}

.pane-icon-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}
</style>
