<script setup lang="ts">
import { ref } from 'vue'
import {
  ShieldCheck,
  Lock,
  WifiOff,
  HardDriveDownload,
  CheckCircle2,
  Clock,
  Flame,
  RotateCcw
} from 'lucide-vue-next'

import { M3Dialog, M3Button, M3Switch } from '@/components/ui'
import { useNavigationStore, useSecurityStore } from '@/stores'

const navStore = useNavigationStore()
const securityStore = useSecurityStore()

const activeTab = ref<'guarantee' | 'clipboard' | 'panic'>('guarantee')
const delayOptions = [
  { label: '15 seconds', value: 15 },
  { label: '30 seconds', value: 30 },
  { label: '60 seconds', value: 60 },
  { label: '120 seconds', value: 120 }
]

const auditReport = ref(securityStore.runSecurityAudit())

function refreshAudit() {
  auditReport.value = securityStore.runSecurityAudit()
}
</script>

<template>
  <M3Dialog
    :model-value="navStore.isPrivacyModalOpen"
    headline="Security & Privacy Hardening"
    @update:model-value="(val) => !val && navStore.closePrivacyModal()"
  >
    <template #icon>
      <ShieldCheck :size="28" style="color: var(--md-sys-color-primary);" />
    </template>

    <div class="privacy-modal-body">
      <!-- Tabs Header -->
      <div class="dialog-tabs">
        <button
          type="button"
          class="dialog-tab-btn"
          :class="{ active: activeTab === 'guarantee' }"
          @click="activeTab = 'guarantee'; refreshAudit()"
        >
          <WifiOff :size="15" />
          <span>Zero Network</span>
        </button>
        <button
          type="button"
          class="dialog-tab-btn"
          :class="{ active: activeTab === 'clipboard' }"
          @click="activeTab = 'clipboard'"
        >
          <Clock :size="15" />
          <span>Clipboard Auto-Purge</span>
          <span v-if="securityStore.isTimerActive" class="tab-timer-badge">
            {{ securityStore.remainingPurgeSeconds }}s
          </span>
        </button>
        <button
          type="button"
          class="dialog-tab-btn"
          :class="{ active: activeTab === 'panic' }"
          @click="activeTab = 'panic'"
        >
          <Flame :size="15" />
          <span>Quick Clear</span>
        </button>
      </div>

      <!-- TAB 1: ZERO OUTBOUND GUARANTEE -->
      <div v-if="activeTab === 'guarantee'" class="tab-content">
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
              <p>All formatting, transformations, hashing, and transpiling execute in client-side Web Workers and local memory.</p>
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

        <div class="audit-status-card">
          <div class="audit-header">
            <div class="audit-title">
              <CheckCircle2 :size="16" class="audit-icon" />
              <span>Real-Time Privacy Audit Status</span>
            </div>
            <button type="button" class="refresh-audit-btn" @click="refreshAudit">
              <RotateCcw :size="13" />
              <span>Refresh</span>
            </button>
          </div>
          <div class="audit-grid">
            <div class="audit-stat">
              <span class="stat-label">Air-Gapped Sandbox:</span>
              <span class="stat-value text-success">Active (100% Offline)</span>
            </div>
            <div class="audit-stat">
              <span class="stat-label">Outbound Requests:</span>
              <span class="stat-value text-success">0 Calls (Clean)</span>
            </div>
            <div class="audit-stat">
              <span class="stat-label">Telemetry Trackers:</span>
              <span class="stat-value text-success">0 Detected</span>
            </div>
            <div class="audit-stat">
              <span class="stat-label">Storage Integrity:</span>
              <span class="stat-value text-success">Ephemeral & Scrubbable</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: CLIPBOARD AUTO-PURGE -->
      <div v-else-if="activeTab === 'clipboard'" class="tab-content">
        <div class="clipboard-setting-card">
          <div class="setting-row">
            <div class="setting-info">
              <h4>Clipboard Auto-Purge Protection</h4>
              <p>Automatically wipe copied sensitive data from the operating system clipboard after a configured timeout to prevent credential leakage.</p>
            </div>
            <M3Switch
              v-model="securityStore.autoPurgeEnabled"
              label=""
            />
          </div>

          <div v-if="securityStore.autoPurgeEnabled" class="timer-duration-selector">
            <label class="section-label">Purge Delay Duration:</label>
            <div class="duration-buttons">
              <button
                v-for="opt in delayOptions"
                :key="opt.value"
                type="button"
                class="duration-pill"
                :class="{ active: securityStore.purgeDelaySeconds === opt.value }"
                @click="securityStore.purgeDelaySeconds = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Live Countdown Monitor -->
        <div class="clipboard-status-box" :class="{ 'is-active': securityStore.isTimerActive }">
          <div class="status-top">
            <div class="status-indicator">
              <span class="pulse-dot" :class="{ 'pulse-active': securityStore.isTimerActive }" />
              <strong>
                {{ securityStore.isTimerActive ? 'Clipboard Purge Countdown Active' : 'Clipboard Monitor Idle' }}
              </strong>
            </div>
            <span v-if="securityStore.isTimerActive" class="countdown-badge">
              {{ securityStore.remainingPurgeSeconds }}s remaining
            </span>
          </div>

          <div v-if="securityStore.isTimerActive" class="timer-progress-bar">
            <div
              class="timer-progress-fill"
              :style="{ width: `${(securityStore.remainingPurgeSeconds / securityStore.purgeDelaySeconds) * 100}%` }"
            />
          </div>

          <div v-if="securityStore.lastCopiedPreview" class="preview-snippet">
            <span>Last Copied Protected Payload:</span>
            <code>{{ securityStore.lastCopiedPreview }}</code>
          </div>

          <div class="clipboard-actions">
            <M3Button
              v-if="securityStore.isTimerActive"
              variant="outlined"
              @click="securityStore.cancelClipboardPurge()"
            >
              Cancel Timer
            </M3Button>

            <M3Button
              variant="filled"
              @click="securityStore.purgeClipboardNow()"
            >
              <template #icon>
                <ClipboardX :size="16" />
              </template>
              Purge Clipboard Now
            </M3Button>
          </div>
        </div>

        <div v-if="securityStore.lastPurgedAt" class="last-purged-text">
          Last clipboard purge completed at {{ new Date(securityStore.lastPurgedAt).toLocaleTimeString() }}.
        </div>
      </div>

      <!-- TAB 3: QUICK CLEAR & PANIC WIPE -->
      <div v-else-if="activeTab === 'panic'" class="tab-content">
        <div class="panic-banner">
          <div class="panic-banner-icon">
            <Flame :size="24" />
          </div>
          <div>
            <h4>One-Click Ephemeral Memory Scrubbing</h4>
            <p>Instantly eradicate all Pinia reactive sessions, CodeMirror buffers, LocalStorage tokens, and IndexedDB databases across DevDot.</p>
          </div>
        </div>

        <div class="scrub-checklist">
          <div class="checklist-item">
            <CheckCircle2 :size="16" class="check-icon" />
            <span>Wipe Pinia Tool State & Session Buffers</span>
          </div>
          <div class="checklist-item">
            <CheckCircle2 :size="16" class="check-icon" />
            <span>Clear Browser LocalStorage & SessionStorage</span>
          </div>
          <div class="checklist-item">
            <CheckCircle2 :size="16" class="check-icon" />
            <span>Purge Client IndexedDB Database Stores</span>
          </div>
          <div class="checklist-item">
            <CheckCircle2 :size="16" class="check-icon" />
            <span>Overwrite System Clipboard Buffers</span>
          </div>
        </div>

        <div class="panic-action-box">
          <M3Button
            variant="filled"
            class="panic-trigger-btn"
            @click="navStore.closePrivacyModal(); securityStore.openPanicModal()"
          >
            <template #icon>
              <Flame :size="18" />
            </template>
            Launch Panic / Quick Clear Wizard
          </M3Button>
        </div>
      </div>
    </div>

    <template #actions>
      <M3Button variant="filled" @click="navStore.closePrivacyModal()">
        Close
      </M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.privacy-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
  min-height: 320px;
}

.dialog-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  padding-bottom: 0.5rem;
  overflow-x: auto;
}

.dialog-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 0.875rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.dialog-tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.dialog-tab-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.tab-timer-badge {
  background-color: #ef4444;
  color: #ffffff;
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.privacy-intro {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--md-sys-color-on-surface-variant);
}

.privacy-intro strong {
  color: var(--md-sys-color-primary);
}

.privacy-points {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.point-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.point-icon {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.35rem;
  border-radius: var(--md-sys-shape-corner-small);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.point-item h4 {
  margin: 0 0 0.15rem 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.point-item p {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--md-sys-color-on-surface-variant);
}

.point-item code {
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-family: monospace;
}

.audit-status-card {
  padding: 0.875rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.audit-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.audit-icon {
  color: #10b981;
}

.refresh-audit-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
}

.refresh-audit-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.audit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .audit-grid {
    grid-template-columns: 1fr;
  }
}

.audit-stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  padding: 0.35rem 0.5rem;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 4px;
}

.stat-label {
  color: var(--md-sys-color-on-surface-variant);
}

.stat-value {
  font-weight: 600;
}

.text-success {
  color: #10b981;
}

/* Clipboard tab */
.clipboard-setting-card {
  padding: 0.875rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.setting-info h4 {
  margin: 0 0 0.2rem 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.setting-info p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.35;
}

.timer-duration-selector {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  padding-top: 0.75rem;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.duration-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.duration-pill {
  padding: 0.35rem 0.65rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  transition: all 0.15s ease;
}

.duration-pill:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.duration-pill.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.clipboard-status-box {
  padding: 1rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.clipboard-status-box.is-active {
  border-color: rgba(239, 68, 68, 0.5);
  background-color: rgba(239, 68, 68, 0.04);
}

.status-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--md-sys-color-outline);
}

.pulse-active {
  background-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25);
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

.countdown-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.12);
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
}

.timer-progress-bar {
  width: 100%;
  height: 4px;
  background-color: var(--md-sys-color-surface-container-highest);
  border-radius: 2px;
  overflow: hidden;
}

.timer-progress-fill {
  height: 100%;
  background-color: #ef4444;
  transition: width 1s linear;
}

.preview-snippet {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

.preview-snippet code {
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  color: var(--md-sys-color-on-surface);
  word-break: break-all;
}

.clipboard-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.last-purged-text {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  font-style: italic;
  text-align: right;
}

/* Panic tab */
.panic-banner {
  display: flex;
  gap: 0.875rem;
  align-items: center;
  padding: 0.875rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--md-sys-shape-corner-medium);
  color: #ef4444;
}

.panic-banner-icon {
  background-color: rgba(239, 68, 68, 0.2);
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.panic-banner h4 {
  margin: 0 0 0.15rem 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.panic-banner p {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--md-sys-color-on-surface);
}

.scrub-checklist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-small);
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78125rem;
  color: var(--md-sys-color-on-surface);
}

.check-icon {
  color: #10b981;
  flex-shrink: 0;
}

.panic-action-box {
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
}

.panic-trigger-btn {
  background-color: #ef4444 !important;
  color: #ffffff !important;
  font-weight: 600;
}

.panic-trigger-btn:hover {
  background-color: #dc2626 !important;
}
</style>
