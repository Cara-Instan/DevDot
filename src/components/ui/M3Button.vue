<script setup lang="ts">
import { computed } from 'vue'
import '@material/web/button/filled-button.js'
import '@material/web/button/elevated-button.js'
import '@material/web/button/filled-tonal-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/button/text-button.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/iconbutton/filled-icon-button.js'
import '@material/web/iconbutton/filled-tonal-icon-button.js'
import '@material/web/iconbutton/outlined-icon-button.js'

export type ButtonVariant = 'filled' | 'elevated' | 'tonal' | 'outlined' | 'text' | 'icon' | 'filled-icon' | 'tonal-icon' | 'outlined-icon'

interface Props {
  variant?: ButtonVariant
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  href?: string
  target?: string
  trailingIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'filled',
  disabled: false,
  type: 'button',
  trailingIcon: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const componentTag = computed(() => {
  switch (props.variant) {
    case 'elevated':
      return 'md-elevated-button'
    case 'tonal':
      return 'md-filled-tonal-button'
    case 'outlined':
      return 'md-outlined-button'
    case 'text':
      return 'md-text-button'
    case 'icon':
      return 'md-icon-button'
    case 'filled-icon':
      return 'md-filled-icon-button'
    case 'tonal-icon':
      return 'md-filled-tonal-icon-button'
    case 'outlined-icon':
      return 'md-outlined-icon-button'
    case 'filled':
    default:
      return 'md-filled-button'
  }
})

const handleClick = (e: MouseEvent) => {
  if (!props.disabled) {
    emit('click', e)
  }
}
</script>

<template>
  <component
    :is="componentTag"
    :disabled="disabled || undefined"
    :type="type"
    :href="href"
    :target="target"
    :trailing-icon="trailingIcon || undefined"
    @click="handleClick"
  >
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
    <slot />
  </component>
</template>
