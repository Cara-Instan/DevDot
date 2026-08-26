<script setup lang="ts">
import {
  Boxes,
  FileJson,
  ShieldCheck,
  ArrowLeftRight,
  Search
} from 'lucide-vue-next'
import { useNavigationStore, ToolCategory } from '@/stores'

const navStore = useNavigationStore()

const bottomNavItems: { id: ToolCategory | 'search'; label: string; icon: any }[] = [
  { id: 'all', label: 'All Tools', icon: Boxes },
  { id: 'json', label: 'JSON', icon: FileJson },
  { id: 'crypto', label: 'Crypto', icon: ShieldCheck },
  { id: 'converters', label: 'Convert', icon: ArrowLeftRight },
  { id: 'search', label: 'Search', icon: Search }
]

function handleClick(itemId: ToolCategory | 'search') {
  if (itemId === 'search') {
    navStore.openCommandPalette()
  } else {
    navStore.setCategory(itemId)
    navStore.isMobileNavOpen = true
  }
}
</script>

<template>
  <nav class="bottom-nav-bar" aria-label="Mobile Bottom Navigation">
    <button
      v-for="item in bottomNavItems"
      :key="item.id"
      type="button"
      class="nav-tab-btn"
      :class="{
        active: item.id !== 'search' && navStore.activeCategory === item.id
      }"
      @click="handleClick(item.id)"
    >
      <div class="tab-icon-indicator">
        <component :is="item.icon" :size="20" />
      </div>
      <span class="tab-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background-color: var(--md-sys-color-surface-container);
  border-top: 1px solid var(--md-sys-color-outline-variant);
  z-index: 45;
  font-family: var(--md-sys-typescale-font-family);
  align-items: center;
  justify-content: space-around;
  padding: 0 0.5rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
}

.nav-tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 0.35rem 0;
  font-family: inherit;
  transition: all 0.15s ease;
}

.tab-icon-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 1rem;
  border-radius: 9999px;
  transition: all 0.15s ease;
}

.tab-label {
  font-size: 0.6875rem;
  font-weight: 500;
}

.nav-tab-btn.active {
  color: var(--md-sys-color-primary);
}

.nav-tab-btn.active .tab-icon-indicator {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

@media (max-width: 768px) {
  .bottom-nav-bar {
    display: flex;
  }
}
</style>
