<script setup lang="ts">
import { computed } from 'vue'
import {
  FileJson,
  Code2,
  GitCompare,
  KeyRound,
  Fingerprint,
  Binary,
  Terminal,
  Repeat,
  EyeOff,
  LayoutDashboard,
  Boxes,
  ShieldCheck,
  ArrowLeftRight,
  FileText,
  Cpu,
  Wrench
} from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
  }>(),
  {
    size: 20
  }
)

const iconMap: Record<string, any> = {
  FileJson,
  Code2,
  GitCompare,
  KeyRound,
  Fingerprint,
  Binary,
  Terminal,
  Repeat,
  EyeOff,
  LayoutDashboard,
  Boxes,
  ShieldCheck,
  ArrowLeftRight,
  FileText,
  Cpu
}

const component = computed(() => {
  return iconMap[props.name] || Wrench
})
</script>

<template>
  <component :is="component" :size="size" />
</template>
