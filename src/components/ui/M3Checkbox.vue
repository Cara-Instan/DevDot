<script setup lang="ts">
import '@material/web/checkbox/checkbox.js'

interface Props {
  modelValue?: boolean
  indeterminate?: boolean
  disabled?: boolean
  label?: string
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  indeterminate: false,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', event: Event): void
}>()

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement & { checked?: boolean }
  const isChecked = target.checked ?? false
  emit('update:modelValue', isChecked)
  emit('change', event)
}
</script>

<template>
  <label class="m3-checkbox-wrapper" :class="{ 'is-disabled': disabled }">
    <md-checkbox
      :checked="modelValue || undefined"
      :indeterminate="indeterminate || undefined"
      :disabled="disabled || undefined"
      @change="handleChange"
    />
    <span v-if="label || $slots.default" class="m3-checkbox-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.m3-checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.m3-checkbox-wrapper.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.m3-checkbox-label {
  font-size: 0.9375rem;
  color: var(--md-sys-color-on-surface);
  line-height: 1.25;
}
</style>
