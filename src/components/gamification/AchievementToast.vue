<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import {
  Trophy,
  X,
  Sparkles,
  Award
} from 'lucide-vue-next'
import { useGamificationStore } from '@/stores'
import ToolIcon from '@/components/layout/ToolIcon.vue'

const gamificationStore = useGamificationStore()

const currentToast = computed(() => gamificationStore.activeToast)

let dismissTimer: any = null

function resetTimer() {
  if (dismissTimer) clearTimeout(dismissTimer)
  if (currentToast.value) {
    dismissTimer = setTimeout(() => {
      gamificationStore.dismissToast()
    }, 4500)
  }
}

onMounted(() => {
  resetTimer()
})

onUnmounted(() => {
  if (dismissTimer) clearTimeout(dismissTimer)
})

const tierClass = computed(() => {
  if (!currentToast.value) return 'tier-bronze'
  return `tier-${currentToast.value.tier}`
})
</script>

<template>
  <Transition name="toast-slide">
    <div
      v-if="currentToast"
      class="achievement-toast-container"
      :class="tierClass"
      role="alert"
      aria-live="polite"
    >
      <div class="toast-glow-bg" />

      <div class="toast-content">
        <!-- Left: Badge Icon Box -->
        <div class="badge-icon-frame">
          <ToolIcon
            v-if="currentToast.icon"
            :name="currentToast.icon"
            :size="20"
            class="badge-icon"
          />
          <Trophy v-else :size="20" class="badge-icon" />
          <div class="sparkle-orbit">
            <Sparkles :size="10" />
          </div>
        </div>

        <!-- Middle: Title, Subtitle, & XP -->
        <div class="badge-details">
          <div class="toast-top-row">
            <span class="unlock-label">
              <Award :size="11" />
              ACHIEVEMENT UNLOCKED
            </span>
            <span class="xp-pill">+{{ currentToast.xpReward }} XP</span>
          </div>

          <h4 class="badge-title">{{ currentToast.title }}</h4>
          <p class="badge-flavor">{{ currentToast.flavorText }}</p>
        </div>

        <!-- Right: Close Button -->
        <button
          type="button"
          class="toast-close-btn"
          aria-label="Dismiss notification"
          @click="gamificationStore.dismissToast()"
        >
          <X :size="14" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.achievement-toast-container {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 10000;
  min-width: 320px;
  max-width: 390px;
  border-radius: 12px;
  background: var(--md-sys-color-surface-container-highest, #23252a);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  backdrop-filter: blur(12px);
  user-select: none;
}

/* Tier Glow Styles */
.tier-bronze {
  border-color: rgba(205, 127, 50, 0.4);
  box-shadow: 0 0 20px rgba(205, 127, 50, 0.2), 0 12px 32px rgba(0, 0, 0, 0.45);
}
.tier-bronze .badge-icon-frame {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.25), rgba(138, 77, 24, 0.4));
  border-color: #cd7f32;
  color: #f1b378;
}

.tier-silver {
  border-color: rgba(192, 192, 192, 0.4);
  box-shadow: 0 0 20px rgba(192, 192, 192, 0.2), 0 12px 32px rgba(0, 0, 0, 0.45);
}
.tier-silver .badge-icon-frame {
  background: linear-gradient(135deg, rgba(210, 215, 220, 0.25), rgba(140, 145, 155, 0.4));
  border-color: #d1d5db;
  color: #f3f4f6;
}

.tier-gold {
  border-color: rgba(255, 215, 0, 0.45);
  box-shadow: 0 0 24px rgba(255, 215, 0, 0.25), 0 12px 32px rgba(0, 0, 0, 0.45);
}
.tier-gold .badge-icon-frame {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(217, 119, 6, 0.4));
  border-color: #f59e0b;
  color: #fde047;
}

.tier-legendary {
  border-color: rgba(244, 63, 94, 0.5);
  box-shadow: 0 0 30px rgba(244, 63, 94, 0.35), 0 12px 32px rgba(0, 0, 0, 0.45);
  animation: pulse-legendary 3s infinite alternate;
}
.tier-legendary .badge-icon-frame {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.3), rgba(168, 85, 247, 0.4));
  border-color: #ec4899;
  color: #f472b6;
}

@keyframes pulse-legendary {
  0% {
    box-shadow: 0 0 20px rgba(244, 63, 94, 0.3);
  }
  100% {
    box-shadow: 0 0 35px rgba(168, 85, 247, 0.45);
  }
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 0.85rem 1rem;
  gap: 0.85rem;
  position: relative;
}

.badge-icon-frame {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.sparkle-orbit {
  position: absolute;
  top: -4px;
  right: -4px;
  color: #fbbf24;
  animation: spin-pulse 3s infinite linear;
}

@keyframes spin-pulse {
  0% { transform: rotate(0deg) scale(0.9); }
  50% { transform: rotate(180deg) scale(1.15); }
  100% { transform: rotate(360deg) scale(0.9); }
}

.badge-details {
  flex: 1;
  min-width: 0;
}

.toast-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}

.unlock-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fbbf24;
  text-transform: uppercase;
}

.xp-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-title {
  margin: 0;
  font-size: 0.925rem;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-flavor {
  margin: 0.15rem 0 0 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
  font-style: italic;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.toast-close-btn {
  background: none;
  border: none;
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  align-self: flex-start;
}

.toast-close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

/* Animations */
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
