<script setup lang="ts">
import { computed } from 'vue'
import '@material/web/labs/badge/badge.js'

interface Props {
  value?: string | number
  dot?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  dot: false
})

const badgeValue = computed(() => {
  if (props.dot) return undefined
  if (props.value === undefined || props.value === null) return undefined
  return String(props.value)
})
</script>

<template>
  <div class="m3-badge-container">
    <slot />
    <md-badge
      :value="badgeValue"
      :aria-label="ariaLabel"
    />
  </div>
</template>

<style scoped>
.m3-badge-container {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}
</style>
