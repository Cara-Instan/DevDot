<script setup lang="ts">
import { ShieldCheck, Lock, WifiOff, HardDriveDownload, CheckCircle2 } from 'lucide-vue-next'
import { M3Dialog, M3Button } from '@/components/ui'
import { useNavigationStore } from '@/stores'

const navStore = useNavigationStore()
</script>

<template>
  <M3Dialog
    :model-value="navStore.isPrivacyModalOpen"
    headline="Zero Outbound Data Guarantee"
    @update:model-value="(val) => !val && navStore.closePrivacyModal()"
  >
    <template #icon>
      <ShieldCheck :size="28" style="color: var(--md-sys-color-primary);" />
    </template>

    <div class="privacy-content">
      <p class="privacy-intro">
        DevDot runs <strong>100% locally</strong> in your browser and desktop environment. Your sensitive payloads, API tokens, and credentials never touch any remote server.
      </p>

      <div class="privacy-points">
        <div class="point-item">
          <div class="point-icon">
            <WifiOff :size="18" />
          </div>
          <div>
            <h4>Air-Gapped Local Execution</h4>
            <p>All formatting, transformations, hashing, and transpiling execute in client-side Web Workers and local WASM/Rust memory.</p>
          </div>
        </div>

        <div class="point-item">
          <div class="point-icon">
            <Lock :size="18" />
          </div>
          <div>
            <h4>Zero Telemetry & Analytics</h4>
            <p>No Google Analytics, Sentry, Mixpanel, or third-party trackers. All fonts and assets are locally bundled by Vite.</p>
          </div>
        </div>

        <div class="point-item">
          <div class="point-icon">
            <HardDriveDownload :size="18" />
          </div>
          <div>
            <h4>Portable Offline Snapshots</h4>
            <p>Work sessions are saved as structured <code>.toolkit</code> files directly to your device with zero cloud dependency.</p>
          </div>
        </div>
      </div>

      <div class="privacy-badge">
        <CheckCircle2 :size="16" />
        <span>Verified Safe for Production Secrets & Production Payloads</span>
      </div>
    </div>

    <template #actions>
      <M3Button variant="filled" @click="navStore.closePrivacyModal()">
        Got It
      </M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.privacy-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
}

.privacy-intro {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--md-sys-color-on-surface-variant);
}

.privacy-intro strong {
  color: var(--md-sys-color-primary);
}

.privacy-points {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.point-item {
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
}

.point-icon {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.4rem;
  border-radius: var(--md-sys-shape-corner-small);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.point-item h4 {
  margin: 0 0 0.2rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.point-item p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--md-sys-color-on-surface-variant);
}

.point-item code {
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-family: monospace;
}

.privacy-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--md-sys-color-primary);
}
</style>
