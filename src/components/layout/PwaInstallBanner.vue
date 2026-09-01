<script setup lang="ts">
import { Download, RefreshCw, X } from 'lucide-vue-next'
import appLogo from '@/assets/logo.png'
import { usePwaStore } from '@/stores/pwa'
import { M3Button } from '@/components/ui'

const pwaStore = usePwaStore()

async function handleInstall() {
  await pwaStore.promptInstall()
}

async function handleUpdate() {
  await pwaStore.updateApp()
}

function handleDismiss() {
  pwaStore.dismissInstall(false)
}

function handleDontAskAgain() {
  pwaStore.dismissInstall(true)
}
</script>

<template>
  <aside class="pwa-banners-container" aria-label="Application installation and update notices">
    <!-- SW Update Available Notification Banner -->
    <Transition name="slide-up">
      <div v-if="pwaStore.needRefresh" class="pwa-banner update-banner" role="alert">
        <div class="banner-main">
          <div class="banner-icon-badge update-badge">
            <RefreshCw :size="18" class="spin-icon" />
          </div>
          <div class="banner-text">
            <span class="banner-title">Update Ready</span>
            <span class="banner-desc">New offline version cached and ready to use.</span>
          </div>
        </div>

        <div class="banner-actions update-actions">
          <M3Button variant="filled" @click="handleUpdate">
            <template #icon>
              <RefreshCw :size="14" />
            </template>
            Reload & Apply
          </M3Button>
        </div>
      </div>
    </Transition>

    <!-- PWA Install Prompt Banner -->
    <Transition name="slide-up">
      <div
        v-if="pwaStore.showInstallBanner"
        class="pwa-banner install-banner"
        role="region"
        aria-label="Install DevDot App"
      >
        <div class="banner-main">
          <div class="banner-icon-badge install-badge">
            <img :src="appLogo" alt="DevDot Logo" class="banner-logo-img" />
          </div>
          <div class="banner-text">
            <span class="banner-title">Install DevDot App</span>
            <span class="banner-desc">Get fast offline desktop & mobile access with no browser chrome.</span>
          </div>
          <button
            type="button"
            class="dismiss-btn"
            aria-label="Dismiss install notice"
            title="Dismiss"
            @click="handleDismiss"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="banner-actions">
          <button
            type="button"
            class="secondary-text-btn"
            title="Never show automatic install banner again"
            @click="handleDontAskAgain"
          >
            Don't ask again
          </button>

          <M3Button variant="filled" @click="handleInstall">
            <template #icon>
              <Download :size="14" />
            </template>
            Install Now
          </M3Button>
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.pwa-banners-container {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 380px;
  max-width: calc(100vw - 2.5rem);
  pointer-events: none;
}

.pwa-banner {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem 1.125rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
  color: var(--md-sys-color-on-surface);
}

.update-banner {
  border-color: var(--md-sys-color-primary);
  background: linear-gradient(
    135deg,
    var(--md-sys-color-surface-container-high) 0%,
    rgba(99, 102, 241, 0.08) 100%
  );
}

.banner-main {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  width: 100%;
}

.banner-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--md-sys-color-surface-container-highest);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.install-badge {
  overflow: hidden;
  padding: 4px;
}

.banner-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
}

.update-badge {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: transparent;
}

.banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.banner-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  line-height: 1.3;
}

.banner-desc {
  font-size: 0.775rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.35;
}

.banner-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding-top: 0.25rem;
  border-top: 1px solid var(--md-sys-color-surface-container-highest, rgba(255, 255, 255, 0.06));
}

.update-actions {
  justify-content: flex-end;
}

.secondary-text-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.35rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-small, 6px);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.secondary-text-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.dismiss-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  padding: 0.25rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -2px;
  margin-right: -4px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.dismiss-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.spin-icon {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@media (max-width: 600px) {
  .pwa-banners-container {
    bottom: 4.5rem;
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
    max-width: none;
  }
}
</style>
