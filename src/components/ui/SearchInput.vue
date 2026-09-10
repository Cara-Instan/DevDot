<script setup lang="ts">
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'

interface Props {
  modelValue: string
  placeholder?: string
  size?: 'compact' | 'normal'
  clearable?: boolean
  disabled?: boolean
  spellcheck?: boolean
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
  size: 'compact',
  clearable: true,
  disabled: false,
  spellcheck: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'clear'): void
  (e: 'enter'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

function focus() {
  inputRef.value?.focus()
}

defineExpose({
  focus,
  inputRef
})
</script>

<template>
  <div
    class="m3-search-input-box"
    :class="[`size-${size}`, { disabled }]"
  >
    <Search :size="size === 'compact' ? 12 : 15" class="search-icon" />
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="search-field"
      :placeholder="placeholder"
      :disabled="disabled"
      :spellcheck="spellcheck"
      @input="handleInput"
      @keydown.enter.prevent="emit('enter')"
      @keydown.esc="handleClear"
    />
    <button
      v-if="clearable && modelValue"
      type="button"
      class="clear-btn"
      aria-label="Clear search"
      tabindex="-1"
      @click="handleClear"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.m3-search-input-box {
  display: inline-flex;
  align-items: center;
  position: relative;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.m3-search-input-box:focus-within {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 1px var(--md-sys-color-primary);
}

.m3-search-input-box.size-compact {
  height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  gap: 6px;
}

.m3-search-input-box.size-normal {
  height: 38px;
  padding: 0 12px;
  border-radius: 9999px;
  gap: 8px;
}

.m3-search-input-box.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.search-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.search-field {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-family: inherit;
  outline: none;
  min-width: 60px;
}

.size-compact .search-field {
  font-size: 11.5px;
}

.size-normal .search-field {
  font-size: 13.5px;
}

.search-field::placeholder {
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.65;
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.size-compact .clear-btn {
  width: 16px;
  height: 16px;
  font-size: 10px;
}

.size-normal .clear-btn {
  width: 20px;
  height: 20px;
  font-size: 12px;
}

.clear-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}
</style>
