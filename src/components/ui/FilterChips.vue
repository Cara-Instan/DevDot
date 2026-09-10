<script setup lang="ts">
export interface FilterChipOption {
  id: string
  label: string
  count?: number
  prefix?: string
  dotColor?: string
  color?: string
}

interface Props {
  modelValue: string
  chips: FilterChipOption[]
  size?: 'compact' | 'normal'
}

withDefaults(defineProps<Props>(), {
  size: 'compact'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="m3-filter-chips-group" :class="`size-${size}`">
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      class="m3-filter-chip"
      :class="{ active: modelValue === chip.id }"
      @click="emit('update:modelValue', chip.id)"
    >
      <span
        v-if="chip.dotColor"
        class="chip-dot"
        :style="{ backgroundColor: chip.dotColor }"
      />
      <span
        v-if="chip.prefix"
        class="chip-prefix"
        :style="chip.color && modelValue !== chip.id ? { color: chip.color } : undefined"
      >{{ chip.prefix }}</span>
      <span
        class="chip-label"
        :style="chip.color && modelValue !== chip.id ? { color: chip.color } : undefined"
      >{{ chip.label }}</span>
      <span v-if="chip.count !== undefined" class="chip-count">
        {{ chip.count }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.m3-filter-chips-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.m3-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.12s ease;
  user-select: none;
}

.size-compact .m3-filter-chip {
  height: 24px;
  padding: 0 7px;
  font-size: 11px;
}

.size-normal .m3-filter-chip {
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
  border-radius: 8px;
}

.m3-filter-chip:hover {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.m3-filter-chip.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.chip-prefix {
  font-weight: 700;
  opacity: 0.85;
}

.chip-count {
  font-size: 9.5px;
  opacity: 0.75;
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 4px;
  border-radius: 9999px;
  margin-left: 2px;
}

:global(.theme-dark) .chip-count {
  background: rgba(255, 255, 255, 0.12);
}
</style>
