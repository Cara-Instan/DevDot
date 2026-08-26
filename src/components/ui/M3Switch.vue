<script setup lang="ts">
import '@material/web/switch/switch.js'

interface Props {
  modelValue?: boolean
  disabled?: boolean
  icons?: boolean
  showOnlySelectedIcon?: boolean
  label?: string
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  icons: false,
  showOnlySelectedIcon: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', event: Event): void
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement & { selected?: boolean }
  const isSelected = target.selected ?? target.checked ?? false
  emit('update:modelValue', isSelected)
  emit('change', event)
}
</script>

<template>
  <label class="m3-switch-wrapper" :class="{ 'is-disabled': disabled }">
    <md-switch
      :selected="modelValue || undefined"
      :disabled="disabled || undefined"
      :icons="icons || undefined"
      :show-only-selected-icon="showOnlySelectedIcon || undefined"
      @change="handleChange"
    />
    <span v-if="label || $slots.default" class="m3-switch-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.m3-switch-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.m3-switch-wrapper.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.m3-switch-label {
  font-size: 0.9375rem;
  color: var(--md-sys-color-on-surface);
  line-height: 1.25;
}
</style>
