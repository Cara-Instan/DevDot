<script setup lang="ts">
import { computed } from 'vue'
import '@material/web/textfield/outlined-text-field.js'
import '@material/web/textfield/filled-text-field.js'

export type TextAreaVariant = 'outlined' | 'filled'

interface Props {
  modelValue?: string
  variant?: TextAreaVariant
  label?: string
  placeholder?: string
  rows?: number
  supportingText?: string
  error?: boolean
  errorText?: string
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  prefixText?: string
  suffixText?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  variant: 'outlined',
  rows: 4,
  disabled: false,
  required: false,
  readOnly: false,
  error: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'input', event: InputEvent): void
  (e: 'change', event: Event): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const componentTag = computed(() => {
  return props.variant === 'filled' ? 'md-filled-text-field' : 'md-outlined-text-field'
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
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
</script>

<template>
  <component
    :is="componentTag"
    type="textarea"
    :value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :rows="rows"
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
  >
    <template v-if="$slots['leading-icon']" #leading-icon>
      <slot name="leading-icon" />
    </template>
    <template v-if="$slots['trailing-icon']" #trailing-icon>
      <slot name="trailing-icon" />
    </template>
  </component>
</template>
