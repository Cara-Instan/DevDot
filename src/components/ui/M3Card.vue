<script setup lang="ts">
import { computed } from 'vue'
import '@material/web/elevation/elevation.js'
import '@material/web/ripple/ripple.js'

export type CardVariant = 'elevated' | 'filled' | 'outlined'

interface Props {
  variant?: CardVariant
  interactive?: boolean
  padding?: 'none' | 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'filled',
  interactive: false,
  padding: 'medium'
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const cardClasses = computed(() => [
  'm3-card',
  `m3-card--${props.variant}`,
  `m3-card--pad-${props.padding}`,
  { 'is-interactive': props.interactive }
])

const handleClick = (e: MouseEvent) => {
  if (props.interactive) {
    emit('click', e)
  }
}
</script>

<template>
  <div :class="cardClasses" @click="handleClick">
    <md-elevation v-if="variant === 'elevated'" />
    <md-ripple v-if="interactive" />
    
    <header v-if="$slots.header" class="m3-card-header">
      <slot name="header" />
    </header>

    <div class="m3-card-content">
      <slot />
    </div>

    <footer v-if="$slots.actions" class="m3-card-actions">
      <slot name="actions" />
    </footer>
  </div>
</template>

<style scoped>
.m3-card {
  position: relative;
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  color: var(--md-sys-color-on-surface);
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
}

.m3-card--filled {
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid transparent;
}

.m3-card--elevated {
  background-color: var(--md-sys-color-surface-container-low);
  box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  border: 1px solid transparent;
}

.m3-card--outlined {
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.m3-card.is-interactive {
  cursor: pointer;
}

.m3-card.is-interactive:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

/* Padding variants */
.m3-card--pad-none .m3-card-content {
  padding: 0;
}

.m3-card--pad-small .m3-card-content {
  padding: 0.75rem;
}

.m3-card--pad-medium .m3-card-content {
  padding: 1.25rem;
}

.m3-card--pad-large .m3-card-content {
  padding: 1.75rem;
}

.m3-card-header {
  padding: 1.25rem 1.25rem 0.5rem 1.25rem;
}

.m3-card-actions {
  padding: 0.5rem 1.25rem 1.25rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
