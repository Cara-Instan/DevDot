<script setup lang="ts">
import { ref, onUnmounted, nextTick, useSlots } from 'vue'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface Props {
  text?: string
  placement?: TooltipPlacement
  disabled?: boolean
  offset?: number
}

const props = withDefaults(defineProps<Props>(), {
  text: '',
  placement: 'top',
  disabled: false,
  offset: 6
})

const slots = useSlots()
const isVisible = ref(false)
const anchorRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const coords = ref({ top: -9999, left: -9999 })
const activePlacement = ref<TooltipPlacement>(props.placement)

let hideTimeout: number | null = null

const updatePosition = () => {
  if (!isVisible.value || !anchorRef.value || !tooltipRef.value) return

  const anchorRect = anchorRef.value.getBoundingClientRect()
  const tooltipRect = tooltipRef.value.getBoundingClientRect()

  // If anchor is not visible in DOM (detached or display:none)
  if (anchorRect.width === 0 && anchorRect.height === 0) return

  const margin = 8 // Viewport margin in px
  const gap = props.offset ?? 6
  const desired = props.placement || 'top'
  let chosen: TooltipPlacement = desired

  // Check collision & flip
  if (desired === 'top' || desired === 'bottom') {
    const fitsTop = anchorRect.top - tooltipRect.height - gap >= margin
    const fitsBottom = window.innerHeight - anchorRect.bottom - tooltipRect.height - gap >= margin

    if (desired === 'top' && !fitsTop && fitsBottom) {
      chosen = 'bottom'
    } else if (desired === 'bottom' && !fitsBottom && fitsTop) {
      chosen = 'top'
    } else if (!fitsTop && !fitsBottom) {
      chosen = anchorRect.top > (window.innerHeight - anchorRect.bottom) ? 'top' : 'bottom'
    }
  } else if (desired === 'left' || desired === 'right') {
    const fitsLeft = anchorRect.left - tooltipRect.width - gap >= margin
    const fitsRight = window.innerWidth - anchorRect.right - tooltipRect.width - gap >= margin

    if (desired === 'left' && !fitsLeft && fitsRight) {
      chosen = 'right'
    } else if (desired === 'right' && !fitsRight && fitsLeft) {
      chosen = 'left'
    } else if (!fitsLeft && !fitsRight) {
      chosen = anchorRect.left > (window.innerWidth - anchorRect.right) ? 'left' : 'right'
    }
  }

  activePlacement.value = chosen

  let top = 0
  let left = 0

  if (chosen === 'top') {
    top = anchorRect.top - tooltipRect.height - gap
    left = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2
  } else if (chosen === 'bottom') {
    top = anchorRect.bottom + gap
    left = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2
  } else if (chosen === 'left') {
    top = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2
    left = anchorRect.left - tooltipRect.width - gap
  } else if (chosen === 'right') {
    top = anchorRect.top + (anchorRect.height - tooltipRect.height) / 2
    left = anchorRect.right + gap
  }

  // Viewport bounds clamping to prevent overflowing edges
  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin))
  top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin))

  coords.value = {
    top: Math.round(top),
    left: Math.round(left)
  }
}

const addListeners = () => {
  window.addEventListener('scroll', updatePosition, { capture: true, passive: true })
  window.addEventListener('resize', updatePosition, { passive: true })
}

const removeListeners = () => {
  window.removeEventListener('scroll', updatePosition, { capture: true })
  window.removeEventListener('resize', updatePosition)
}

const show = () => {
  if (props.disabled) return
  if (!props.text && !slots.content) return

  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }

  isVisible.value = true
  addListeners()

  nextTick(() => {
    updatePosition()
  })
}

const hide = () => {
  isVisible.value = false
  removeListeners()
}

onUnmounted(() => {
  if (hideTimeout) clearTimeout(hideTimeout)
  removeListeners()
})
</script>

<template>
  <div
    ref="anchorRef"
    class="m3-tooltip-anchor"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />

    <Teleport to="body">
      <transition name="tooltip-fade">
        <div
          v-if="isVisible && (text || $slots.content)"
          ref="tooltipRef"
          role="tooltip"
          class="m3-tooltip"
          :class="`m3-tooltip--${activePlacement}`"
          :style="{
            top: `${coords.top}px`,
            left: `${coords.left}px`
          }"
        >
          <slot name="content">{{ text }}</slot>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.m3-tooltip-anchor {
  display: inline-flex;
  vertical-align: middle;
}

.m3-tooltip {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  background-color: var(--md-sys-color-inverse-surface, #2e3133);
  color: var(--md-sys-color-inverse-on-surface, #f0f1f3);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-extra-small, 4px);
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  will-change: transform, opacity;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.12s cubic-bezier(0, 0, 0.2, 1), transform 0.12s cubic-bezier(0, 0, 0.2, 1);
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
