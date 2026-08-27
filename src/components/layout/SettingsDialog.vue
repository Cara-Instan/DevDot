<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Contrast,
  Type,
  WrapText,
  ShieldCheck,
  Flame,
  Clock,
  Trash2,
  DownloadCloud,
  RefreshCw,
  EyeOff,
  LayoutGrid,
  RotateCcw,
  Info,
  Cpu,
  CheckCircle2,
  HardDrive,
  Copy,
  Check,
  Scale,
  Layers,
  Shield
} from 'lucide-vue-next'
import appLogo from '@/assets/logo.png'

import { M3Dialog, M3Button, M3Switch } from '@/components/ui'
import { useSettingsStore, useNavigationStore, useSecurityStore, usePwaStore } from '@/stores'
import { useTheme, useExecutionEngine } from '@/composables'

const navStore = useNavigationStore()
const settingsStore = useSettingsStore()
const securityStore = useSecurityStore()
const pwaStore = usePwaStore()
const { themeMode, isHighContrast, setThemeMode, toggleHighContrast } = useTheme()
const { engine, platform } = useExecutionEngine()

type SettingsTab = 'appearance' | 'privacy' | 'pwa' | 'tools' | 'about'
const activeTab = ref<SettingsTab>('appearance')

const fontSizes = [11, 12, 13, 14, 16, 18]
const purgeDelayOptions = [
  { label: 'Disabled', value: 0 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s (Default)', value: 60 },
  { label: '120s', value: 120 }
]

const resetSuccess = ref(false)
const licenseCopied = ref(false)
const systemInfoCopied = ref(false)
const showFullLicense = ref(false)

const mitLicenseText = `MIT License

Copyright (c) 2026 Cara Instan / DevDot Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

const openSourceStack = [
  { name: 'Vue 3', version: '^3.5.13', license: 'MIT', desc: 'Progressive Reactive UI Framework' },
  { name: 'CodeMirror 6', version: '^6.0.2', license: 'MIT', desc: 'Extensible In-Browser Code & Syntax Engine' },
  { name: '@material/web', version: '^2.5.0', license: 'Apache-2.0', desc: 'Material Design 3 Tokenized Components' },
  { name: 'Pinia', version: '^3.0.1', license: 'MIT', desc: 'Type-Safe Reactive State Management' },
  { name: 'Lucide Icons', version: '^0.475.0', license: 'ISC', desc: 'Vector Iconography & Graphic Assets' },
  { name: 'Tauri 2', version: '^2.11.1', license: 'MIT / Apache-2.0', desc: 'Lightweight Native Desktop Application Core' },
  { name: 'Bcrypt.js', version: '^3.0.3', license: 'MIT', desc: 'Client-Side Cryptographic Password Hashing' },
  { name: 'PapaParse & Smol-TOML', version: 'Latest', license: 'MIT', desc: 'High-Performance Local Data Transpilers' }
]

function handleResetToolOrder() {
  settingsStore.resetToolOrder()
  resetSuccess.value = true
  setTimeout(() => {
    resetSuccess.value = false
  }, 3000)
}

function handlePurgeDelaySelect(seconds: number) {
  settingsStore.updateSettings({ clipboardAutoPurgeSeconds: seconds })
  if (seconds === 0) {
    securityStore.autoPurgeEnabled = false
  } else {
    securityStore.autoPurgeEnabled = true
    securityStore.purgeDelaySeconds = seconds
  }
}

async function copyLicenseText() {
  try {
    await navigator.clipboard.writeText(mitLicenseText)
    licenseCopied.value = true
    setTimeout(() => {
      licenseCopied.value = false
    }, 2500)
  } catch {
    // fallback
  }
}

async function copySystemDiagnostics() {
  const info = [
    '=== DevDot System Diagnostics ===',
    `App: DevDot Developer Toolkit v0.1.0`,
    `Engine: ${engine.name} (${platform.value.toUpperCase()})`,
    `Theme: ${themeMode.value} (High Contrast: ${isHighContrast.value ? 'Yes' : 'No'})`,
    `User Agent: ${navigator.userAgent}`,
    `Screen: ${window.screen.width}x${window.screen.height} (DPR: ${window.devicePixelRatio})`,
    `Hardware Concurrency: ${navigator.hardwareConcurrency || 'N/A'} Cores`,
    `Security: 100% Offline / Air-Gapped Zero Network Telemetry`,
    `Generated At: ${new Date().toISOString()}`
  ].join('\n')

  try {
    await navigator.clipboard.writeText(info)
    systemInfoCopied.value = true
    setTimeout(() => {
      systemInfoCopied.value = false
    }, 2500)
  } catch {
    // fallback
  }
}

const isAutoPurgeActive = computed({
  get: () => settingsStore.clipboardAutoPurgeSeconds > 0 && securityStore.autoPurgeEnabled,
  set: (val: boolean) => {
    if (val) {
      const delay = settingsStore.clipboardAutoPurgeSeconds || 60
      settingsStore.updateSettings({ clipboardAutoPurgeSeconds: delay })
      securityStore.autoPurgeEnabled = true
      securityStore.purgeDelaySeconds = delay
    } else {
      settingsStore.updateSettings({ clipboardAutoPurgeSeconds: 0 })
      securityStore.autoPurgeEnabled = false
    }
  }
})

const dontAskInstall = computed({
  get: () => settingsStore.dontAskAgainInstallPrompt,
  set: (val: boolean) => {
    settingsStore.setDontAskInstall(val)
  }
})

const editorWordWrap = computed({
  get: () => settingsStore.editorWordWrap,
  set: (val: boolean) => {
    settingsStore.updateSettings({ editorWordWrap: val })
  }
})
</script>

<template>
  <M3Dialog
    :model-value="navStore.isSettingsOpen"
    headline="Preferences & Settings"
    @update:model-value="(val) => !val && navStore.closeSettings()"
  >
    <template #icon>
      <Settings :size="26" style="color: var(--md-sys-color-primary);" />
    </template>

    <div class="settings-modal-body">
      <!-- Navigation Tabs -->
      <div class="settings-tabs" role="tablist">
        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'appearance' }"
          role="tab"
          :aria-selected="activeTab === 'appearance'"
          @click="activeTab = 'appearance'"
        >
          <Sun :size="15" />
          <span>Appearance</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'privacy' }"
          role="tab"
          :aria-selected="activeTab === 'privacy'"
          @click="activeTab = 'privacy'"
        >
          <HardDrive :size="15" />
          <span>Storage & Privacy</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'pwa' }"
          role="tab"
          :aria-selected="activeTab === 'pwa'"
          @click="activeTab = 'pwa'"
        >
          <DownloadCloud :size="15" />
          <span>Application</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'tools' }"
          role="tab"
          :aria-selected="activeTab === 'tools'"
          @click="activeTab = 'tools'"
        >
          <LayoutGrid :size="15" />
          <span>Tool Management</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          :class="{ active: activeTab === 'about' }"
          role="tab"
          :aria-selected="activeTab === 'about'"
          @click="activeTab = 'about'"
        >
          <Info :size="15" />
          <span>About & License</span>
        </button>
      </div>

      <!-- TAB 1: APPEARANCE -->
      <div v-if="activeTab === 'appearance'" class="tab-pane" role="tabpanel">
        <!-- Theme Mode Selection -->
        <div class="setting-card">
          <div class="setting-card-header">
            <h4>Color Theme</h4>
            <span class="setting-hint">Choose between dark, light, or system sync</span>
          </div>

          <div class="theme-options-grid">
            <button
              type="button"
              class="theme-select-card"
              :class="{ selected: themeMode === 'light' }"
              @click="setThemeMode('light')"
            >
              <div class="theme-preview light-preview">
                <Sun :size="18" />
              </div>
              <span class="theme-label">Light Mode</span>
            </button>

            <button
              type="button"
              class="theme-select-card"
              :class="{ selected: themeMode === 'dark' }"
              @click="setThemeMode('dark')"
            >
              <div class="theme-preview dark-preview">
                <Moon :size="18" />
              </div>
              <span class="theme-label">Dark Mode</span>
            </button>

            <button
              type="button"
              class="theme-select-card"
              :class="{ selected: themeMode === 'system' }"
              @click="setThemeMode('system')"
            >
              <div class="theme-preview system-preview">
                <Monitor :size="18" />
              </div>
              <span class="theme-label">System Sync</span>
            </button>
          </div>
        </div>

        <!-- High Contrast Mode -->
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-meta">
              <div class="setting-title-with-icon">
                <Contrast :size="16" class="setting-icon" />
                <h4>High Contrast Mode</h4>
              </div>
              <p>Enhances edge borders and luminance for improved visibility and accessibility.</p>
            </div>
            <M3Switch
              :model-value="isHighContrast"
              label=""
              @update:model-value="toggleHighContrast"
            />
          </div>
        </div>

        <!-- Editor Font Size & Word Wrap -->
        <div class="setting-card">
          <div class="setting-card-header">
            <div class="setting-title-with-icon">
              <Type :size="16" class="setting-icon" />
              <h4>Editor Font Size & Layout</h4>
            </div>
            <span class="setting-hint">Configure CodeMirror workspace typography</span>
          </div>

          <div class="font-size-row">
            <span class="sub-label">Font Size:</span>
            <div class="pills-group">
              <button
                v-for="size in fontSizes"
                :key="size"
                type="button"
                class="choice-pill"
                :class="{ active: settingsStore.editorFontSize === size }"
                @click="settingsStore.updateSettings({ editorFontSize: size })"
              >
                {{ size }}px
              </button>
            </div>
          </div>

          <!-- Mini Code Preview -->
          <div
            class="editor-mini-preview"
            :style="{ fontSize: `${settingsStore.editorFontSize}px` }"
          >
            <span class="preview-keyword">const</span> <span class="preview-var">developerToolkit</span> = {
            <span class="preview-prop">engine</span>: <span class="preview-str">"DevDot"</span>,
            <span class="preview-prop">fontSize</span>: <span class="preview-num">{{ settingsStore.editorFontSize }}</span>
            };
          </div>

          <div class="setting-row mt-2">
            <div class="setting-meta">
              <div class="setting-title-with-icon">
                <WrapText :size="16" class="setting-icon" />
                <h4>Editor Soft Word Wrap</h4>
              </div>
              <p>Automatically wrap long lines inside code panes without horizontal scroll.</p>
            </div>
            <M3Switch
              v-model="editorWordWrap"
              label=""
            />
          </div>
        </div>
      </div>

      <!-- TAB 2: STORAGE & PRIVACY -->
      <div v-else-if="activeTab === 'privacy'" class="tab-pane" role="tabpanel">
        <!-- Panic Clear Section -->
        <div class="setting-card panic-accent-card">
          <div class="panic-banner">
            <div class="panic-icon-badge">
              <Flame :size="20" />
            </div>
            <div class="panic-meta">
              <h4>Panic / Ephemeral Quick Clear</h4>
              <p>Instantly scrub all reactive workspace buffers, active tabs, browser LocalStorage, IndexedDB stores, and system clipboard.</p>
            </div>
          </div>

          <div class="panic-action-row">
            <M3Button
              variant="filled"
              class="panic-trigger-button"
              @click="navStore.closeSettings(); securityStore.openPanicModal()"
            >
              <template #icon>
                <Trash2 :size="15" />
              </template>
              Launch Panic Clear Wizard
            </M3Button>
          </div>
        </div>

        <!-- Clipboard Auto-Purge Timer -->
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-meta">
              <div class="setting-title-with-icon">
                <Clock :size="16" class="setting-icon" />
                <h4>Clipboard Auto-Purge Protection</h4>
              </div>
              <p>Automatically clear sensitive copied payloads from the system clipboard to prevent leakage.</p>
            </div>
            <M3Switch
              v-model="isAutoPurgeActive"
              label=""
            />
          </div>

          <div v-if="isAutoPurgeActive" class="timer-config-row">
            <span class="sub-label">Purge Timeout Delay:</span>
            <div class="pills-group">
              <button
                v-for="opt in purgeDelayOptions.filter(o => o.value > 0)"
                :key="opt.value"
                type="button"
                class="choice-pill"
                :class="{ active: settingsStore.clipboardAutoPurgeSeconds === opt.value }"
                @click="handlePurgeDelaySelect(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Wipe All Settings -->
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-meta">
              <h4>Factory Reset All Settings</h4>
              <p>Reset all preferences, tool order, and editor themes back to initial default state.</p>
            </div>
            <M3Button
              variant="outlined"
              @click="settingsStore.wipeAllData()"
            >
              <template #icon>
                <RotateCcw :size="15" />
              </template>
              Reset Settings
            </M3Button>
          </div>
        </div>
      </div>

      <!-- TAB 3: APPLICATION & PWA -->
      <div v-else-if="activeTab === 'pwa'" class="tab-pane" role="tabpanel">
        <!-- Install Status -->
        <div class="setting-card">
          <div class="setting-card-header">
            <h4>Standalone Desktop / PWA App</h4>
            <span class="setting-hint">Run DevDot in an isolated, frameless desktop window</span>
          </div>

          <div class="app-status-row">
            <div class="status-chip">
              <span class="status-indicator-dot" :class="{ 'is-installed': pwaStore.isInstalled }" />
              <span>
                {{ pwaStore.isInstalled ? 'Installed (Standalone Mode)' : (pwaStore.isInstallable ? 'Ready to Install' : 'Web Browser Engine') }}
              </span>
            </div>

            <M3Button
              v-if="pwaStore.isInstallable && !pwaStore.isInstalled"
              variant="filled"
              @click="pwaStore.promptInstall()"
            >
              <template #icon>
                <DownloadCloud :size="16" />
              </template>
              Install DevDot
            </M3Button>
          </div>
        </div>

        <!-- Offline Service Worker Updates -->
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-meta">
              <h4>Check Offline Engine & Cache Updates</h4>
              <p>Reload Service Worker and local caches to ensure latest air-gapped transforms.</p>
            </div>
            <M3Button
              variant="tonal"
              @click="pwaStore.updateApp()"
            >
              <template #icon>
                <RefreshCw :size="15" />
              </template>
              Update Cache
            </M3Button>
          </div>
        </div>

        <!-- Install Banner Suppression -->
        <div class="setting-card">
          <div class="setting-row">
            <div class="setting-meta">
              <div class="setting-title-with-icon">
                <EyeOff :size="16" class="setting-icon" />
                <h4>Suppress Automatic Install Banners</h4>
              </div>
              <p>Never show automatic installation prompts on application startup.</p>
            </div>
            <M3Switch
              v-model="dontAskInstall"
              label=""
            />
          </div>
        </div>
      </div>

      <!-- TAB 4: TOOL MANAGEMENT -->
      <div v-else-if="activeTab === 'tools'" class="tab-pane" role="tabpanel">
        <div class="setting-card">
          <div class="setting-card-header">
            <h4>Overview Tool Grid Arrangement</h4>
            <span class="setting-hint">Manage tool card ordering and layout customization</span>
          </div>

          <p class="tool-mgmt-desc">
            You have <strong>{{ navStore.tools.filter(t => t.id !== 'system-overview').length }}</strong> developer modules active. On the Overview page, tools can be rearranged using Drag-and-Drop.
          </p>

          <div class="reset-tool-row">
            <M3Button
              variant="outlined"
              @click="handleResetToolOrder"
            >
              <template #icon>
                <RotateCcw :size="15" />
              </template>
              Reset Tool Order to Default
            </M3Button>

            <span v-if="resetSuccess" class="reset-success-msg">
              <CheckCircle2 :size="15" />
              Tool order reset to factory default!
            </span>
          </div>
        </div>
      </div>

      <!-- TAB 5: ABOUT & LICENSE -->
      <div v-else-if="activeTab === 'about'" class="tab-pane" role="tabpanel">
        <!-- Hero Brand Card -->
        <div class="about-brand-card">
          <div class="about-brand-icon">
            <img :src="appLogo" alt="DevDot Logo" class="about-logo-img" />
          </div>
          <div class="about-brand-info">
            <div class="about-title-row">
              <h3>DevDot Toolkit</h3>
              <span class="version-badge">v0.1.0</span>
            </div>
            <p class="about-tagline">
              Air-Gapped, Zero-Telemetry Developer Suite & Cryptographic Workstation
            </p>
            <div class="about-badge-pills">
              <span class="edition-pill">
                <ShieldCheck :size="12" />
                100% Offline & Private
              </span>
              <span class="edition-pill">
                <Scale :size="12" />
                MIT Open Source
              </span>
            </div>
          </div>
        </div>

        <!-- Quick Action Bar -->
        <div class="about-actions-card">
          <button
            type="button"
            class="about-action-btn"
            @click="copySystemDiagnostics"
          >
            <component :is="systemInfoCopied ? Check : Copy" :size="14" />
            <span>{{ systemInfoCopied ? 'Diagnostics Copied!' : 'Copy System Diagnostics' }}</span>
          </button>

          <button
            type="button"
            class="about-action-btn"
            :class="{ active: showFullLicense }"
            @click="showFullLicense = !showFullLicense"
          >
            <Scale :size="14" />
            <span>{{ showFullLicense ? 'Hide Full License' : 'View Full MIT License' }}</span>
          </button>
        </div>

        <!-- System Architecture & Security Specs -->
        <div class="setting-card">
          <div class="setting-card-header">
            <div class="setting-title-with-icon">
              <Cpu :size="16" class="setting-icon" />
              <h4>Runtime & System Architecture</h4>
            </div>
            <span class="setting-hint">Core execution environment and local engine characteristics</span>
          </div>

          <div class="about-grid">
            <div class="about-stat">
              <span class="about-label">Runtime Engine</span>
              <span class="about-val">
                <Cpu :size="14" class="stat-icon" />
                {{ engine.name }} ({{ platform.toUpperCase() }})
              </span>
            </div>

            <div class="about-stat">
              <span class="about-label">Air-Gapped Status</span>
              <span class="about-val text-success">
                <ShieldCheck :size="14" class="stat-icon" />
                100% Offline / Zero Network
              </span>
            </div>

            <div class="about-stat">
              <span class="about-label">Telemetry & Tracking</span>
              <span class="about-val text-success">
                <Shield :size="14" class="stat-icon" />
                0 Outbound Pings / Clean
              </span>
            </div>

            <div class="about-stat">
              <span class="about-label">Data Persistence</span>
              <span class="about-val">
                <HardDrive :size="14" class="stat-icon" />
                Isolated LocalStorage & IndexedDB
              </span>
            </div>
          </div>
        </div>

        <!-- Software License (MIT) Card -->
        <div class="setting-card license-card">
          <div class="license-card-header">
            <div class="license-title-meta">
              <div class="setting-title-with-icon">
                <Scale :size="16" class="setting-icon" />
                <h4>Software License</h4>
              </div>
              <span class="license-type-badge">MIT License</span>
            </div>

            <button
              type="button"
              class="license-copy-btn"
              title="Copy License Text"
              @click="copyLicenseText"
            >
              <component :is="licenseCopied ? Check : Copy" :size="13" />
              <span>{{ licenseCopied ? 'Copied' : 'Copy Text' }}</span>
            </button>
          </div>

          <div class="license-summary">
            <p class="license-copyright">
              Copyright &copy; 2026 <strong>Cara Instan / DevDot Contributors</strong>.
            </p>
            <p class="license-desc">
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies.
            </p>
          </div>

          <!-- Collapsible / Full License Text Pane -->
          <div v-if="showFullLicense" class="full-license-viewer">
            <pre class="license-pre">{{ mitLicenseText }}</pre>
          </div>
        </div>

        <!-- Open Source Credits & Dependencies -->
        <div class="setting-card">
          <div class="setting-card-header">
            <div class="setting-title-with-icon">
              <Layers :size="16" class="setting-icon" />
              <h4>Open Source Engine & Stack</h4>
            </div>
            <span class="setting-hint">DevDot is built upon these high-performance open-source projects</span>
          </div>

          <div class="stack-grid">
            <div
              v-for="item in openSourceStack"
              :key="item.name"
              class="stack-item"
            >
              <div class="stack-header">
                <span class="stack-name">{{ item.name }}</span>
                <span class="stack-license-chip">{{ item.license }}</span>
              </div>
              <span class="stack-desc">{{ item.desc }}</span>
            </div>
          </div>
        </div>

        <p class="about-footer-note">
          DevDot is crafted with privacy and speed in mind. All transformations, formatting, cryptography, and parsing run strictly within your local machine.
        </p>
      </div>
    </div>

    <template #actions>
      <M3Button variant="filled" @click="navStore.closeSettings()">
        Done
      </M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.settings-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
  min-height: 400px;
  width: 100%;
}

.settings-tabs {
  display: flex;
  gap: 0.35rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  padding-bottom: 0.5rem;
  overflow-x: auto;
}

.settings-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface-variant);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.settings-tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.settings-tab-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setting-card {
  padding: 1rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--md-sys-color-on-surface);
}

.setting-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.setting-card-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.setting-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.setting-meta h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.setting-meta p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.35;
}

.setting-title-with-icon {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.setting-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

/* Theme Selection Cards */
.theme-options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

@media (max-width: 500px) {
  .theme-options-grid {
    grid-template-columns: 1fr;
  }
}

.theme-select-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;
  background-color: var(--md-sys-color-surface-container);
  border: 2px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--md-sys-color-on-surface);
  font-family: inherit;
  user-select: none;
}

.theme-select-card:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-outline);
  color: var(--md-sys-color-on-surface);
}

.theme-select-card.selected {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.theme-preview {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.light-preview {
  background-color: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
}

.dark-preview {
  background-color: #0f172a;
  color: #f8fafc;
  border: 1px solid #334155;
}

.system-preview {
  background: linear-gradient(135deg, #ffffff 50%, #0f172a 50%);
  color: #38bdf8;
  border: 1px solid #cbd5e1;
}

.theme-label {
  font-size: 0.78125rem;
  font-weight: 600;
  color: inherit;
}

/* Pills and Typography */
.font-size-row,
.timer-config-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sub-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.pills-group {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.choice-pill {
  padding: 0.3rem 0.65rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  transition: all 0.15s ease;
}

.choice-pill:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.choice-pill.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.editor-mini-preview {
  padding: 0.75rem 1rem;
  background-color: var(--md-sys-color-surface-container-lowest, #0d1117);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  color: #e6edf3;
  line-height: 1.5;
  white-space: pre-wrap;
}

.preview-keyword { color: #ff7b72; font-weight: 600; }
.preview-var { color: #79c0ff; }
.preview-prop { color: #d2a8ff; }
.preview-str { color: #a5d6ff; }
.preview-num { color: #7ee787; }

.mt-2 {
  margin-top: 0.5rem;
}

/* Panic Card */
.panic-accent-card {
  border-color: rgba(239, 68, 68, 0.3);
  background-color: rgba(239, 68, 68, 0.05);
}

.panic-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.panic-icon-badge {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 0.5rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.panic-meta h4 {
  margin: 0 0 0.15rem 0;
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 600;
}

.panic-meta p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
  line-height: 1.35;
}

.panic-action-row {
  display: flex;
  justify-content: flex-end;
}

.panic-trigger-button {
  background-color: #ef4444 !important;
  color: #ffffff !important;
  font-weight: 600;
}

.panic-trigger-button:hover {
  background-color: #dc2626 !important;
}

/* App Status */
.app-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #64748b;
}

.status-indicator-dot.is-installed {
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

/* Tool Management */
.tool-mgmt-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.4;
}

.reset-tool-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.reset-success-msg {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #10b981;
  font-size: 0.78125rem;
  font-weight: 600;
}

/* About Tab */
.about-brand-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.125rem;
  background: linear-gradient(135deg, rgba(var(--md-sys-color-primary-rgb, 59, 130, 246), 0.14) 0%, rgba(139, 92, 246, 0.12) 100%);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
}

.about-brand-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 4px;
}

.about-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.about-brand-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}

.about-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.about-brand-info h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--md-sys-color-on-surface);
}

.version-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.about-tagline {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.35;
}

.about-badge-pills {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.edition-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
}

.about-actions-card {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.about-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.about-action-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-primary);
}

.about-action-btn.active {
  background-color: var(--md-sys-color-primary-container);
  border-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary-container);
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
}

@media (max-width: 600px) {
  .about-grid {
    grid-template-columns: 1fr;
  }
}

.about-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.6rem 0.75rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
}

.about-label {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.about-val {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.stat-icon {
  color: var(--md-sys-color-primary);
  flex-shrink: 0;
}

.text-success {
  color: #10b981 !important;
}

/* License Card */
.license-card {
  gap: 0.65rem;
}

.license-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.license-title-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.license-type-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  letter-spacing: 0.02em;
}

.license-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.license-copy-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
}

.license-summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.license-copyright {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
}

.license-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.4;
}

.full-license-viewer {
  margin-top: 0.35rem;
  max-height: 180px;
  overflow-y: auto;
  background-color: var(--md-sys-color-surface-container-lowest, #0d1117);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.75rem;
}

.license-pre {
  margin: 0;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  font-size: 0.71875rem;
  line-height: 1.45;
  color: var(--md-sys-color-on-surface);
  white-space: pre-wrap;
  word-break: break-word;
}

/* Open Source Stack Grid */
.stack-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .stack-grid {
    grid-template-columns: 1fr;
  }
}

.stack-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.625rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
}

.stack-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stack-name {
  font-size: 0.78125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.stack-license-chip {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.stack-desc {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.25;
}

.about-footer-note {
  margin: 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
  font-style: italic;
  line-height: 1.4;
}
</style>
