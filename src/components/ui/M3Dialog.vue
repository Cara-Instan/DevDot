<script setup lang="ts">
import { ref, watch } from 'vue'
import '@material/web/dialog/dialog.js'

interface Props {
  modelValue?: boolean
  headline?: string
  type?: 'alert'
  quick?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  quick: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'open', event: Event): void
  (e: 'opened', event: Event): void
  (e: 'close', event: Event): void
  (e: 'closed', event: Event): void
  (e: 'cancel', event: Event): void
}>()

const dialogRef = ref<HTMLElement & { show?: () => void; close?: () => void } | null>(null)

const handleOpen = (e: Event) => {
  emit('update:modelValue', true)
  emit('open', e)
}

const handleOpened = (e: Event) => {
  emit('opened', e)
}

const handleClose = (e: Event) => {
  emit('update:modelValue', false)
  emit('close', e)
}

const handleClosed = (e: Event) => {
  emit('closed', e)
}

const handleCancel = (e: Event) => {
  emit('cancel', e)
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!dialogRef.value) return
    const dialog = dialogRef.value as any
    if (isOpen && !dialog.open) {
      if (typeof dialog.show === 'function') dialog.show()
      else dialog.open = true
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.open = false
    }
  }
)
</script>

<template>
  <md-dialog
    ref="dialogRef"
    :open="modelValue || undefined"
    :type="type"
    :quick="quick || undefined"
    @open="handleOpen"
    @opened="handleOpened"
    @close="handleClose"
    @closed="handleClosed"
    @cancel="handleCancel"
  >
    <div v-if="$slots.icon" slot="icon">
      <slot name="icon" />
    </div>

    <div slot="headline">
      <slot name="headline">{{ headline }}</slot>
    </div>

    <!-- Main content slot -->
    <form slot="content" method="dialog" @submit.prevent>
      <slot />
    </form>

    <div v-if="$slots.actions" slot="actions">
      <slot name="actions" />
    </div>
  </md-dialog>
</template>
