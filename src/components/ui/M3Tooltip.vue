<script setup lang="ts">
import { ref } from 'vue'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface Props {
  text?: string
  placement?: TooltipPlacement
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  placement: 'top',
  disabled: false
})

const isVisible = ref(false)

const show = () => {
  if (!props.disabled && (props.text || true)) {
    isVisible.value = true
  }
}

const hide = () => {
  isVisible.value = false
}
</script>

<template>
  <div
    class="m3-tooltip-anchor"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
    <transition name="tooltip-fade">
      <div
        v-if="isVisible && (text || $slots.content)"
        role="tooltip"
        class="m3-tooltip"
        :class="`m3-tooltip--${placement}`"
      >
        <slot name="content">{{ text }}</slot>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.m3-tooltip-anchor {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

.m3-tooltip {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
  background-color: var(--md-sys-color-inverse-surface, #2e3133);
  color: var(--md-sys-color-inverse-on-surface, #f0f1f3);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-extra-small, 4px);
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.m3-tooltip--top {
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
}

.m3-tooltip--bottom {
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
}

.m3-tooltip--left {
  right: calc(100% + 6px);
  top: 50%;
  transform: translateY(-50%);
}

.m3-tooltip--right {
  left: calc(100% + 6px);
  top: 50%;
  transform: translateY(-50%);
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
