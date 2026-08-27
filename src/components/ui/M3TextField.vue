<script setup lang="ts">
import { computed } from 'vue'
import '@material/web/textfield/outlined-text-field.js'
import '@material/web/textfield/filled-text-field.js'

export type TextFieldVariant = 'outlined' | 'filled'

interface Props {
  modelValue?: string | number
  variant?: TextFieldVariant
  label?: string
  placeholder?: string
  type?: 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url'
  supportingText?: string
  error?: boolean
  errorText?: string
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  prefixText?: string
  suffixText?: string
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  variant: 'outlined',
  type: 'text',
  disabled: false,
  required: false,
  readOnly: false,
  error: false,
  fullWidth: true
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'input', event: InputEvent): void
  (e: 'change', event: Event): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'keydown', event: KeyboardEvent): void
}>()

const componentTag = computed(() => {
  return props.variant === 'filled' ? 'md-filled-text-field' : 'md-outlined-text-field'
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', event as InputEvent)
}

const handleChange = (event: Event) => {
  emit('change', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleKeyDown = (event: KeyboardEvent) => {
  emit('keydown', event)
}
</script>

<template>
  <component
    :is="componentTag"
    class="m3-text-field"
    :class="{ 'm3-text-field--full-width': fullWidth }"
    :value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :type="type"
    :supporting-text="supportingText"
    :error="error || undefined"
    :error-text="errorText"
    :disabled="disabled || undefined"
    :required="required || undefined"
    :read-only="readOnly || undefined"
    :prefix-text="prefixText"
    :suffix-text="suffixText"
    @input="handleInput"
    @change="handleChange"
    @focus="handleFocus"
    @blur="handleBlur"
    @keydown="handleKeyDown"
  >
    <template v-if="$slots['leading-icon']" #leading-icon>
      <slot name="leading-icon" />
    </template>
    <template v-if="$slots['trailing-icon']" #trailing-icon>
      <slot name="trailing-icon" />
    </template>
  </component>
</template>

<style scoped>
.m3-text-field {
  box-sizing: border-box;
}

.m3-text-field--full-width {
  width: 100%;
  display: block;
}

md-outlined-text-field,
md-filled-text-field {
  box-sizing: border-box;
}

md-outlined-text-field.m3-text-field--full-width,
md-filled-text-field.m3-text-field--full-width {
  width: 100%;
  display: block;
}
</style>
