<script setup lang="ts">
import { ref } from 'vue'
import {
  Flame,
  AlertOctagon,
  Trash2,
  CheckCircle2,
  Database,

  HardDrive,
  Layers,
  ClipboardX
} from 'lucide-vue-next'
import { M3Dialog, M3Button } from '@/components/ui'
import { useSecurityStore } from '@/stores'

const securityStore = useSecurityStore()
const isSuccessMessageShown = ref(false)
const clearedList = ref<string[]>([])

async function handleConfirmPanicWipe() {
  const res = await securityStore.quickClearAllData()
  if (res.success) {
    clearedList.value = res.clearedItems
    isSuccessMessageShown.value = true
    setTimeout(() => {
      isSuccessMessageShown.value = false
    }, 4000)
  }
}
</script>

<template>
  <M3Dialog
    :model-value="securityStore.isPanicModalOpen"
    headline="Panic / Ephemeral Quick Clear"
    @update:model-value="(val) => !val && securityStore.closePanicModal()"
  >
    <template #icon>
      <Flame :size="28" style="color: #ef4444;" />
    </template>

    <div class="panic-dialog-content">
      <!-- Success State -->
      <div v-if="isSuccessMessageShown" class="panic-success-box">
        <div class="success-header">
          <CheckCircle2 :size="22" class="success-icon" />
          <h4>Ephemeral Storage & Memory Purged!</h4>
        </div>
        <p class="success-desc">
          All browser traces, stored keys, reactive tab states, and clipboard caches have been completely eradicated.
        </p>
        <ul class="cleared-list">
          <li v-for="(item, idx) in clearedList" :key="idx">
            ✓ {{ item }}
          </li>
        </ul>
      </div>

      <!-- Warning & Confirmation State -->
      <div v-else class="panic-body">
        <div class="panic-alert-box">
          <AlertOctagon :size="20" class="alert-icon" />
          <div>
            <strong>Irreversible Memory Scrubbing</strong>
            <p>This action will immediately obliterate all local storage, session caches, tab states, and sensitive clipboard data.</p>
          </div>
        </div>

        <h4 class="items-title">What will be scrubbed:</h4>
        <div class="scrub-items-grid">
          <div class="scrub-item">
            <Layers :size="16" class="item-icon" />
            <div>
              <strong>Pinia Workspace Tabs</strong>
              <span>Clears all active editor buffers & tool states</span>
            </div>
          </div>

          <div class="scrub-item">
            <HardDrive :size="16" class="item-icon" />
            <div>
              <strong>Browser LocalStorage</strong>
              <span>Clears stored local tokens, preferences, and keys</span>
            </div>
          </div>

          <div class="scrub-item">
            <Database :size="16" class="item-icon" />
            <div>
              <strong>IndexedDB Databases</strong>
              <span>Purges all client-side persistent storage</span>
            </div>
          </div>

          <div class="scrub-item">
            <ClipboardX :size="16" class="item-icon" />
            <div>
              <strong>System Clipboard</strong>
              <span>Overwrites clipboard buffer to prevent leakages</span>
            </div>
          </div>
        </div>

        <div v-if="securityStore.lastPanicClearedAt" class="last-purged-note">
          Last scrubbed at: {{ new Date(securityStore.lastPanicClearedAt).toLocaleString() }}
        </div>
      </div>
    </div>

    <template #actions>
      <template v-if="isSuccessMessageShown">
        <M3Button variant="filled" @click="securityStore.closePanicModal()">
          Close
        </M3Button>
      </template>
      <template v-else>
        <M3Button
          variant="text"
          :disabled="securityStore.isPanicClearing"
          @click="securityStore.closePanicModal()"
        >
          Cancel
        </M3Button>
        <M3Button
          variant="filled"
          class="panic-confirm-btn"
          :disabled="securityStore.isPanicClearing"
          @click="handleConfirmPanicWipe"
        >
          <template #icon>
            <Trash2 :size="16" />
          </template>
          {{ securityStore.isPanicClearing ? 'Scrubbing Memory...' : 'Scrub All Memory Now' }}
        </M3Button>
      </template>
    </template>
  </M3Dialog>
</template>

<style scoped>
.panic-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
}

.panic-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panic-alert-box {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.875rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--md-sys-shape-corner-medium);
  color: #ef4444;
}

.panic-alert-box strong {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.panic-alert-box p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--md-sys-color-on-surface);
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.items-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.scrub-items-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (max-width: 600px) {
  .scrub-items-grid {
    grid-template-columns: 1fr;
  }
}

.scrub-item {
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  padding: 0.625rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
}

.item-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.scrub-item strong {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.scrub-item span {
  display: block;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.3;
}

.last-purged-note {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  font-style: italic;
  text-align: right;
}

.panic-success-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--md-sys-shape-corner-medium);
}

.success-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #10b981;
}

.success-header h4 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.success-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
  line-height: 1.4;
}

.cleared-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.75rem;
  color: #10b981;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panic-confirm-btn {
  background-color: #ef4444 !important;
  color: #ffffff !important;
}

.panic-confirm-btn:hover {
  background-color: #dc2626 !important;
}
</style>
