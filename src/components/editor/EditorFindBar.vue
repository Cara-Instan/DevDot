<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { Search, ChevronUp, ChevronDown } from 'lucide-vue-next'

interface Props {
  modelValue: string
  caseSensitive?: boolean
  matchCount?: number
  matchIndex?: number
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  caseSensitive: false,
  matchCount: 0,
  matchIndex: 0,
  placeholder: 'Find...'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:caseSensitive', value: boolean): void
  (e: 'next'): void
  (e: 'prev'): void
  (e: 'close'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function focus() {
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function toggleCase() {
  emit('update:caseSensitive', !props.caseSensitive)
}

onMounted(() => {
  focus()
})

defineExpose({
  focus,
  inputRef
})
</script>

<template>
  <div class="column-find-bar">
    <div class="find-input-wrap">
      <Search :size="12" class="find-icon" />
      <input
        ref="inputRef"
        :value="modelValue"
        type="text"
        class="find-input"
        :placeholder="placeholder"
        spellcheck="false"
        @input="handleInput"
        @keydown.enter.exact.prevent="emit('next')"
        @keydown.shift.enter.prevent="emit('prev')"
        @keydown.esc.prevent="emit('close')"
      />
      <span v-if="modelValue" class="find-count">
        {{ matchCount > 0 ? `${matchIndex || 1} of ${matchCount}` : '0 results' }}
      </span>
    </div>

    <!-- Case Sensitivity Toggle -->
    <button
      type="button"
      class="find-opt-btn"
      :class="{ active: caseSensitive }"
      title="Match Case"
      aria-label="Match Case"
      @click="toggleCase"
    >
      Aa
    </button>

    <!-- Navigation Buttons -->
    <button
      type="button"
      class="find-nav-btn"
      title="Previous Match (Shift+Enter)"
      aria-label="Previous Match"
      :disabled="matchCount === 0"
      @click="emit('prev')"
    >
      <ChevronUp :size="13" />
    </button>

    <button
      type="button"
      class="find-nav-btn"
      title="Next Match (Enter)"
      aria-label="Next Match"
      :disabled="matchCount === 0"
      @click="emit('next')"
    >
      <ChevronDown :size="13" />
    </button>

    <!-- Close Button -->
    <button
      type="button"
      class="find-close-btn"
      title="Close (Esc)"
      aria-label="Close Find Bar"
      @click="emit('close')"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.column-find-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
  animation: slide-down 0.15s ease-out;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.find-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 0 6px;
  min-width: 0;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.find-input-wrap:focus-within {
  border-color: var(--md-sys-color-primary);
  box-shadow: 0 0 0 1px var(--md-sys-color-primary);
}

.find-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
  margin-right: 4px;
}

.find-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-size: 11.5px;
  font-family: inherit;
  padding: 3px 0;
  outline: none;
  min-width: 60px;
}

.find-input::placeholder {
  color: var(--md-sys-color-on-surface-variant);
  opacity: 0.65;
}

.find-count {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  margin-left: 6px;
  white-space: nowrap;
}

.find-opt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 5px;
  height: 24px;
  min-width: 24px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s ease;
}

.find-opt-btn:hover {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.find-opt-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.find-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.find-nav-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
}

.find-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.find-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.12s ease;
}

.find-close-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}
</style>
