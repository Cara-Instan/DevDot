<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Heart,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Sparkles,
  Info,
  X
} from 'lucide-vue-next'
import { useGamificationStore } from '@/stores'
import { PetSkin } from '@/core/gamification/types'

const gamification = useGamificationStore()

const isMinimized = ref(false)
const isProfileOpen = ref(false)
const showQuote = ref(false)
const currentQuote = ref('Quack! Ready to debug.')

const quotes = [
  'Mmm, that JSON was crunchy!',
  'Did you remember to drink water?',
  'Who wrote this regex? (Don’t tell me)',
  'LGTM! Ship it to production!',
  'Tabs or spaces? I prefer bytes.',
  'Zero outbound leaks. 100% offline!',
  'Keep calm and decrypt.',
  'Need a rubber duck? I am right here.'
]

let quoteTimer: any = null
let autoBlinkTimer: any = null
const isBlinking = ref(false)

function triggerRandomQuote() {
  const rand = quotes[Math.floor(Math.random() * quotes.length)]
  currentQuote.value = rand
  showQuote.value = true
  if (quoteTimer) clearTimeout(quoteTimer)
  quoteTimer = setTimeout(() => {
    showQuote.value = false
  }, 4000)
}

function handlePetClick() {
  const res = gamification.petCompanion()
  if (!res.awarded) {
    if (res.reason === 'cooldown') {
      currentQuote.value = 'Byte is ticklish! *giggles* ✨'
      showQuote.value = true
      if (quoteTimer) clearTimeout(quoteTimer)
      quoteTimer = setTimeout(() => {
        showQuote.value = false
      }, 2500)
      return
    }
  }
  triggerRandomQuote()
}

onMounted(() => {
  autoBlinkTimer = setInterval(() => {
    if (gamification.pet.mood === 'idle') {
      isBlinking.value = true
      setTimeout(() => {
        isBlinking.value = false
      }, 200)
    }
  }, 4000)
})

onUnmounted(() => {
  if (quoteTimer) clearTimeout(quoteTimer)
  if (autoBlinkTimer) clearInterval(autoBlinkTimer)
})

const xpPercent = computed(() => {
  const current = gamification.pet.xp
  const max = gamification.pet.xpToNextLevel
  return Math.min(100, Math.round((current / max) * 100))
})

const availableSkins: { id: PetSkin; label: string; icon: string }[] = [
  { id: 'classic', label: 'Classic Duck', icon: '🐥' },
  { id: 'cyber-visor', label: 'Cyber Visor', icon: '🕶️' },
  { id: 'wizard-hat', label: 'Code Wizard', icon: '🧙' },
  { id: 'coffee-cup', label: 'Espresso Byte', icon: '☕' }
]
</script>

<template>
  <div v-if="gamification.pet.enabled" class="virtual-pet-wrapper">
    <!-- Compact Minimized Pill -->
    <div
      v-if="isMinimized"
      class="pet-minimized-pill"
      @click="isMinimized = false"
      title="Expand Byte the Desk Companion"
    >
      <span class="mini-duck-emoji">🐥</span>
      <span class="mini-level">Lv.{{ gamification.pet.level }}</span>
      <Maximize2 :size="12" class="mini-expand-icon" />
    </div>

    <!-- Full Pet Widget Container -->
    <div v-else class="virtual-pet-container" :class="[`mood-${gamification.pet.mood}`]">
      <!-- Speech Bubble -->
      <Transition name="bubble-pop">
        <div v-if="showQuote" class="pet-speech-bubble" @click="showQuote = false">
          <span>{{ currentQuote }}</span>
          <div class="bubble-arrow" />
        </div>
      </Transition>

      <!-- Pet Profile & Stats Flyout -->
      <Transition name="fade-slide">
        <div v-if="isProfileOpen" class="pet-profile-flyout">
          <div class="profile-header">
            <div class="profile-title">
              <span class="pet-avatar-mini">🐥</span>
              <div>
                <strong>{{ gamification.pet.name }}</strong>
                <span class="profile-sub">Desk Companion • Lv. {{ gamification.pet.level }}</span>
              </div>
            </div>
            <button type="button" class="btn-icon-subtle" @click="isProfileOpen = false">
              <X :size="13" />
            </button>
          </div>

          <!-- XP Bar -->
          <div class="xp-container">
            <div class="xp-labels">
              <span>XP Progress</span>
              <span>{{ gamification.pet.xp }} / {{ gamification.pet.xpToNextLevel }}</span>
            </div>
            <div class="xp-track">
              <div class="xp-fill" :style="{ width: `${xpPercent}%` }" />
            </div>
          </div>

          <!-- Fed Stats -->
          <div class="pet-stats-row">
            <div class="stat-pill">
              <span class="stat-num">{{ (gamification.pet.totalFedBytes / 1024).toFixed(1) }} KB</span>
              <span class="stat-lbl">Code Devoured</span>
            </div>
            <div class="stat-pill">
              <span class="stat-num">{{ gamification.stats.petInteractions }}</span>
              <span class="stat-lbl">Affection Clicks</span>
            </div>
          </div>

          <!-- Skin Selector -->
          <div class="skin-selector-box">
            <span class="skin-label">Cosmetic Skin:</span>
            <div class="skins-grid">
              <button
                v-for="s in availableSkins"
                :key="s.id"
                type="button"
                class="skin-btn"
                :class="{ active: gamification.pet.skin === s.id }"
                @click="gamification.setPetSkin(s.id)"
              >
                <span>{{ s.icon }}</span>
                <span>{{ s.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Pixel Duck Canvas / SVG Representation -->
      <div class="pet-character-stage" @click="handlePetClick">
        <!-- Floating Particles Container -->
        <div v-if="gamification.pet.mood === 'petted'" class="heart-particles">
          <Heart :size="16" class="heart-p heart-1" />
          <Heart :size="14" class="heart-p heart-2" />
          <Heart :size="12" class="heart-p heart-3" />
        </div>

        <div v-if="gamification.pet.mood === 'eating'" class="crumb-particles">
          <span class="crumb c1">{ }</span>
          <span class="crumb c2">;</span>
          <span class="crumb c3">&lt;/&gt;</span>
        </div>

        <div v-if="gamification.pet.mood === 'celebrating'" class="confetti-particles">
          <Sparkles :size="18" class="sparkle-c s1" />
          <Sparkles :size="14" class="sparkle-c s2" />
        </div>

        <!-- SVG Duck Character -->
        <svg
          class="duck-svg"
          :class="{ 'is-blinking': isBlinking }"
          viewBox="0 0 100 100"
          width="76"
          height="76"
        >
          <!-- Duck Body -->
          <ellipse cx="48" cy="62" rx="30" ry="24" fill="#fbbf24" stroke="#d97706" stroke-width="2.5" />
          <!-- Duck Wing -->
          <ellipse cx="38" cy="63" rx="14" ry="10" fill="#f59e0b" class="duck-wing" />

          <!-- Duck Head -->
          <circle cx="62" cy="38" r="22" fill="#fbbf24" stroke="#d97706" stroke-width="2.5" />

          <!-- Blush Cheeks -->
          <ellipse cx="56" cy="46" rx="4" ry="2.5" fill="#f87171" opacity="0.65" />

          <!-- Eyes -->
          <g v-if="gamification.pet.mood === 'dizzy'" class="duck-eyes-dizzy">
            <circle cx="66" cy="34" r="5" fill="none" stroke="#1e293b" stroke-width="2" stroke-dasharray="3 2" />
          </g>
          <g v-else-if="gamification.pet.mood === 'petted' || gamification.pet.mood === 'celebrating'" class="duck-eyes-happy">
            <path d="M 62 36 Q 66 30 70 36" fill="none" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" />
          </g>
          <g v-else class="duck-eyes-normal">
            <ellipse cx="66" cy="34" rx="3.5" ry="5" fill="#1e293b" class="eye-pupil" />
            <circle cx="67.5" cy="32" r="1.5" fill="#ffffff" />
          </g>

          <!-- Duck Beak -->
          <path
            v-if="gamification.pet.mood === 'eating'"
            d="M 76 38 Q 92 40 84 46 Q 74 44 76 38 Z"
            fill="#ea580c"
            stroke="#9a3412"
            stroke-width="1.5"
            class="beak-eating"
          />
          <path
            v-else
            d="M 74 38 Q 92 42 80 47 Q 72 45 74 38 Z"
            fill="#f97316"
            stroke="#c2410c"
            stroke-width="1.5"
          />

          <!-- Skins & Cosmetics -->
          <!-- Cyber Visor -->
          <g v-if="gamification.pet.skin === 'cyber-visor'">
            <rect x="58" y="29" width="22" height="11" rx="4" fill="#06b6d4" stroke="#0891b2" stroke-width="1.5" opacity="0.85" />
            <line x1="60" y1="34" x2="78" y2="34" stroke="#ec4899" stroke-width="2" />
          </g>

          <!-- Wizard Hat -->
          <g v-else-if="gamification.pet.skin === 'wizard-hat'">
            <polygon points="62,6 48,24 82,24" fill="#7c3aed" stroke="#5b21b6" stroke-width="1.5" />
            <ellipse cx="65" cy="24" rx="19" ry="5" fill="#6d28d9" />
            <polygon points="65,13 67,17 62,15" fill="#fde047" />
          </g>

          <!-- Coffee Cup -->
          <g v-else-if="gamification.pet.skin === 'coffee-cup'">
            <rect x="18" y="65" width="12" height="14" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" />
            <path d="M 30 68 Q 35 72 30 76" fill="none" stroke="#94a3b8" stroke-width="1.5" />
            <!-- Steam -->
            <path d="M 22 62 Q 24 58 22 55" fill="none" stroke="#cbd5e1" stroke-width="1" class="steam-line" />
          </g>
        </svg>
      </div>

      <!-- Footer Action Bar -->
      <div class="pet-bar">
        <div class="pet-info-badge" @click="isProfileOpen = !isProfileOpen" title="View Pet Stats">
          <span class="pet-name">Byte</span>
          <span class="level-pill">Lv.{{ gamification.pet.level }}</span>
          <Info :size="11" class="info-icon" />
        </div>

        <div class="pet-controls">
          <!-- Sound Toggle -->
          <button
            type="button"
            class="control-btn"
            :title="gamification.pet.soundEnabled ? 'Mute 8-bit Audio' : 'Unmute 8-bit Audio'"
            @click.stop="gamification.toggleSoundEnabled()"
          >
            <Volume2 v-if="gamification.pet.soundEnabled" :size="12" />
            <VolumeX v-else :size="12" />
          </button>

          <!-- Minimize Button -->
          <button
            type="button"
            class="control-btn"
            title="Minimize to Corner Pill"
            @click.stop="isMinimized = true"
          >
            <Minimize2 :size="12" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-pet-wrapper {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 999;
  user-select: none;
}

/* Minimized Pill */
.pet-minimized-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  background: var(--md-sys-color-surface-container-highest, #23252a);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pet-minimized-pill:hover {
  transform: translateY(-2px);
  border-color: #fbbf24;
}

.mini-duck-emoji {
  font-size: 0.95rem;
}

.mini-level {
  font-size: 0.7rem;
  font-weight: 700;
  color: #fbbf24;
}

.mini-expand-icon {
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
}

/* Full Pet Container */
.virtual-pet-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(28, 30, 36, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 0.5rem 0.65rem 0.35rem 0.65rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  transition: border-color 0.2s ease;
}

.virtual-pet-container:hover {
  border-color: rgba(251, 191, 36, 0.4);
}

/* Speech Bubble */
.pet-speech-bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: #1e293b;
  color: #f8fafc;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  font-size: 0.75rem;
  line-height: 1.3;
  max-width: 170px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  z-index: 10;
}

.bubble-arrow {
  position: absolute;
  bottom: -5px;
  right: 25px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #1e293b;
}

/* Character Stage & SVG Animations */
.pet-character-stage {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}

.duck-svg {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
  animation: duck-idle-bounce 2.6s infinite ease-in-out;
  transform-origin: center bottom;
  transition: transform 0.2s ease;
}

.pet-character-stage:hover .duck-svg {
  transform: scale(1.08);
}

.pet-character-stage:active .duck-svg {
  transform: scale(0.95);
}

.duck-wing {
  transform-origin: 38px 63px;
  animation: wing-flap 3s infinite ease-in-out;
}

@keyframes duck-idle-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes wing-flap {
  0%, 100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-6deg);
  }
}

/* Blinking */
.is-blinking .eye-pupil {
  transform: scaleY(0.1);
}

/* Mood Animations */
.mood-eating .beak-eating {
  animation: beak-munch 0.2s infinite alternate;
}

@keyframes beak-munch {
  0% { transform: scaleY(1); }
  100% { transform: scaleY(1.4); }
}

.mood-celebrating .duck-svg {
  animation: celebration-jump 0.6s infinite alternate ease-in-out;
}

@keyframes celebration-jump {
  0% { transform: translateY(0) rotate(-4deg); }
  100% { transform: translateY(-12px) rotate(4deg); }
}

.mood-dizzy .duck-svg {
  animation: dizzy-wobble 0.3s infinite ease-in-out;
}

@keyframes dizzy-wobble {
  0% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
  100% { transform: rotate(-8deg); }
}

/* Floating Particles */
.heart-particles,
.crumb-particles,
.confetti-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.heart-p {
  position: absolute;
  color: #f43f5e;
  animation: float-up 1.6s forwards cubic-bezier(0.1, 0.9, 0.2, 1);
}
.heart-1 { top: 15%; left: 10%; }
.heart-2 { top: 0%; right: 15%; animation-delay: 0.15s; }
.heart-3 { top: 25%; right: 5%; animation-delay: 0.3s; }

@keyframes float-up {
  0% { opacity: 1; transform: translateY(0) scale(0.6); }
  100% { opacity: 0; transform: translateY(-30px) scale(1.2); }
}

.crumb {
  position: absolute;
  font-size: 0.75rem;
  font-family: monospace;
  font-weight: 700;
  color: #38bdf8;
  animation: crumb-fly 0.9s forwards ease-out;
}
.c1 { top: 30%; right: 10%; }
.c2 { top: 40%; right: 2%; animation-delay: 0.1s; }
.c3 { top: 20%; right: 25%; animation-delay: 0.2s; }

@keyframes crumb-fly {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: translate(15px, -15px) scale(0.4); }
}

.sparkle-c {
  position: absolute;
  color: #fbbf24;
  animation: sparkle-burst 1s forwards ease-out;
}
.s1 { top: 10%; left: 15%; }
.s2 { top: 5%; right: 10%; animation-delay: 0.2s; }

@keyframes sparkle-burst {
  0% { opacity: 1; transform: scale(0.5) rotate(0); }
  100% { opacity: 0; transform: scale(1.3) rotate(90deg); }
}

/* Steam animation for coffee cup */
.steam-line {
  animation: steam-rise 2s infinite ease-out;
}
@keyframes steam-rise {
  0% { opacity: 0; transform: translateY(0); }
  50% { opacity: 0.8; }
  100% { opacity: 0; transform: translateY(-6px); }
}

/* Bottom Bar */
.pet-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.4rem;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.pet-info-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.pet-info-badge:hover {
  background: rgba(255, 255, 255, 0.1);
}

.pet-name {
  font-size: 0.7rem;
  font-weight: 700;
  color: #f3f4f6;
}

.level-pill {
  font-size: 0.625rem;
  font-weight: 700;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  padding: 0.05rem 0.3rem;
  border-radius: 9999px;
}

.info-icon {
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
}

.pet-controls {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.control-btn {
  background: none;
  border: none;
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
  padding: 0.2rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.control-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

/* Profile Flyout Card */
.pet-profile-flyout {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  width: 240px;
  background: var(--md-sys-color-surface-container-high, #1e2025);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 0.75rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(14px);
  z-index: 100;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.profile-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.pet-avatar-mini {
  font-size: 1.1rem;
}

.profile-sub {
  display: block;
  font-size: 0.65rem;
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
}

.btn-icon-subtle {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.2rem;
}

.xp-container {
  margin-bottom: 0.65rem;
}

.xp-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #cbd5e1;
  margin-bottom: 0.25rem;
}

.xp-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #fbbf24, #f59e0b);
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.pet-stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  margin-bottom: 0.65rem;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.35rem 0.45rem;
  border-radius: 6px;
  text-align: center;
}

.stat-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: #f3f4f6;
}

.stat-lbl {
  font-size: 0.6rem;
  color: #9ca3af;
}

.skin-selector-box {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.5rem;
}

.skin-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
  display: block;
  margin-bottom: 0.35rem;
}

.skins-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem;
}

.skin-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.65rem;
  padding: 0.25rem 0.4rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.skin-btn.active {
  background: rgba(251, 191, 36, 0.2);
  border-color: #fbbf24;
  color: #fbbf24;
}

/* Transitions */
.bubble-pop-enter-active,
.bubble-pop-leave-active {
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.bubble-pop-enter-from,
.bubble-pop-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
