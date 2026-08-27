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
        <div class="banner-content">
          <div class="banner-icon-badge update-badge">
            <RefreshCw :size="18" class="spin-icon" />
          </div>
          <div class="banner-text">
            <span class="banner-title">Update Ready</span>
            <span class="banner-desc">New offline version cached and ready to use.</span>
          </div>
        </div>

        <div class="banner-actions">
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
        <div class="banner-content">
          <div class="banner-icon-badge install-badge">
            <img :src="appLogo" alt="DevDot Logo" class="banner-logo-img" />
          </div>
          <div class="banner-text">
            <span class="banner-title">Install DevDot App</span>
            <span class="banner-desc">Get fast offline desktop/mobile access with no browser chrome.</span>
          </div>
        </div>

        <div class="banner-actions">
          <M3Button variant="filled" @click="handleInstall">
            <template #icon>
              <Download :size="14" />
            </template>
            Install Now
          </M3Button>

          <button
            type="button"
            class="secondary-text-btn"
            title="Never show automatic install banner again"
            @click="handleDontAskAgain"
          >
            Don't ask again
          </button>

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
  max-width: 440px;
  width: calc(100vw - 2.5rem);
  pointer-events: none;
}

.pwa-banner {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1.125rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
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

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.banner-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.install-badge {
  overflow: hidden;
}

.banner-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.update-badge {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.banner-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.banner-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
  line-height: 1.2;
}

.banner-desc {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.3;
  margin-top: 0.15rem;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.secondary-text-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.35rem 0.55rem;
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
  padding: 0.4rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
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
  }

  .pwa-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .banner-actions {
    width: 100%;
    justify-content: space-between;
    margin-top: 0.25rem;
  }
}
</style>
