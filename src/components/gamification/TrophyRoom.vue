<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Trophy,
  Lock,
  Search,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  FileJson,
  Fingerprint,
  Repeat,
  Moon
} from 'lucide-vue-next'
import { useGamificationStore } from '@/stores'
import { AchievementCategory } from '@/core/gamification/types'
import ToolIcon from '@/components/layout/ToolIcon.vue'

const gamification = useGamificationStore()

const searchQuery = ref('')
const selectedCategory = ref<AchievementCategory | 'all'>('all')

const categories: { id: AchievementCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'All Trophies', icon: Trophy },
  { id: 'json', label: 'JSON Suite', icon: FileJson },
  { id: 'crypto', label: 'Crypto & Tokens', icon: Fingerprint },
  { id: 'converters', label: 'Converters', icon: Repeat },
  { id: 'security', label: 'Security & PII', icon: ShieldCheck },
  { id: 'easter-egg', label: 'Secrets & Eggs', icon: Moon }
]

const filteredAchievements = computed(() => {
  let list = gamification.allAchievements

  if (selectedCategory.value !== 'all') {
    list = list.filter((a) => a.category === selectedCategory.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter((a) => {
      const isUnlocked = !!gamification.unlockedAchievements[a.id]
      if (!isUnlocked && a.secret) {
        return false // Don't match secret text if locked
      }
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.flavorText.toLowerCase().includes(q)
      )
    })
  }

  // Sort: Unlocked first, then by tier weight
  const tierWeight = { legendary: 4, gold: 3, silver: 2, bronze: 1 }
  return [...list].sort((a, b) => {
    const aUnlocked = !!gamification.unlockedAchievements[a.id]
    const bUnlocked = !!gamification.unlockedAchievements[b.id]
    if (aUnlocked && !bUnlocked) return -1
    if (!aUnlocked && bUnlocked) return 1
    return tierWeight[b.tier] - tierWeight[a.tier]
  })
})

function formatDate(isoStr: string) {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Unlocked'
  }
}
</script>

<template>
  <div class="trophy-room-root">
    <!-- Header: Dev Persona Banner & Overall Progress -->
    <div class="trophy-hero-card">
      <div class="hero-persona-side">
        <div class="persona-icon-box">
          <ToolIcon :name="gamification.devClass.icon" :size="28" />
        </div>
        <div class="persona-details">
          <span class="persona-badge">DEVELOPER PERSONA</span>
          <h2 class="persona-title">{{ gamification.devClass.title }}</h2>
          <p class="persona-desc">{{ gamification.devClass.desc }}</p>
        </div>
      </div>

      <div class="hero-progress-side">
        <div class="progress-stats-row">
          <div class="stat-group">
            <span class="stat-number">
              {{ gamification.unlockedCount }}
              <span class="stat-total">/ {{ gamification.totalCount }}</span>
            </span>
            <span class="stat-sub">Trophies Unlocked</span>
          </div>
          <div class="stat-group">
            <span class="stat-number text-amber">
              {{ gamification.completionPercentage }}%
            </span>
            <span class="stat-sub">Completion</span>
          </div>
        </div>

        <div class="trophy-progress-bar">
          <div
            class="trophy-progress-fill"
            :style="{ width: `${gamification.completionPercentage}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Toolbar: Category Chips & Search -->
    <div class="trophy-toolbar">
      <div class="category-chips">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="cat-chip"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          <component :is="cat.icon" :size="13" />
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <div class="search-box">
        <Search :size="14" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter achievements..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Trophies Grid -->
    <div class="trophies-grid">
      <div
        v-for="badge in filteredAchievements"
        :key="badge.id"
        class="trophy-card"
        :class="[
          `tier-${badge.tier}`,
          {
            'is-unlocked': !!gamification.unlockedAchievements[badge.id],
            'is-secret': !gamification.unlockedAchievements[badge.id] && badge.secret
          }
        ]"
      >
        <!-- Card Icon Frame -->
        <div class="card-icon-frame">
          <template v-if="gamification.unlockedAchievements[badge.id]">
            <ToolIcon :name="badge.icon" :size="20" />
            <div class="unlocked-check-badge">
              <CheckCircle2 :size="11" />
            </div>
          </template>
          <template v-else-if="badge.secret">
            <HelpCircle :size="20" class="locked-icon" />
          </template>
          <template v-else>
            <Lock :size="18" class="locked-icon" />
          </template>
        </div>

        <!-- Card Content -->
        <div class="card-content">
          <div class="card-meta-row">
            <span class="tier-pill">{{ badge.tier.toUpperCase() }}</span>
            <span v-if="gamification.unlockedAchievements[badge.id]" class="unlocked-date">
              {{ formatDate(gamification.unlockedAchievements[badge.id]) }}
            </span>
            <span v-else class="xp-bounty">+{{ badge.xpReward }} XP</span>
          </div>

          <!-- Unlocked or Visible Locked -->
          <template v-if="gamification.unlockedAchievements[badge.id] || !badge.secret">
            <h4 class="card-title">{{ badge.title }}</h4>
            <p class="card-desc">{{ badge.description }}</p>
            <p v-if="gamification.unlockedAchievements[badge.id]" class="card-flavor">
              "{{ badge.flavorText }}"
            </p>

            <!-- Multi-step Progress Bar if applicable and not completed -->
            <div
              v-if="!gamification.unlockedAchievements[badge.id] && badge.maxProgress && badge.maxProgress > 1"
              class="step-progress-wrapper"
            >
              <div class="step-progress-labels">
                <span>Progress</span>
                <span>{{ gamification.progress[badge.id] || 0 }} / {{ badge.maxProgress }}</span>
              </div>
              <div class="step-progress-track">
                <div
                  class="step-progress-fill"
                  :style="{
                    width: `${Math.min(
                      100,
                      Math.round(((gamification.progress[badge.id] || 0) / badge.maxProgress) * 100)
                    )}%`
                  }"
                />
              </div>
            </div>
          </template>

          <!-- Secret Locked State -->
          <template v-else>
            <h4 class="card-title text-muted">Secret Achievement</h4>
            <p class="card-desc text-muted">
              Continue exploring DevDot tools and shortcuts to reveal this mystery badge.
            </p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trophy-room-root {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

/* Hero Card */
.trophy-hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--md-sys-color-surface-container, #1c1d22);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  gap: 2rem;
}

@media (max-width: 768px) {
  .trophy-hero-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

.hero-persona-side {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex: 1;
}

.persona-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.05));
  border: 1.5px solid rgba(251, 191, 36, 0.4);
  color: #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(251, 191, 36, 0.15);
}

.persona-details {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.persona-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fbbf24;
  text-transform: uppercase;
}

.persona-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface, #f3f4f6);
}

.persona-desc {
  margin: 0;
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
}

.hero-progress-side {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

@media (max-width: 768px) {
  .hero-progress-side {
    width: 100%;
  }
}

.progress-stats-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.stat-group {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 1.35rem;
  font-weight: 700;
  color: #f3f4f6;
  line-height: 1;
}

.stat-total {
  font-size: 0.85rem;
  font-weight: 500;
  color: #9ca3af;
}

.stat-sub {
  font-size: 0.65rem;
  color: #9ca3af;
  margin-top: 0.2rem;
}

.text-amber {
  color: #fbbf24;
}

.trophy-progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  overflow: hidden;
}

.trophy-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

/* Toolbar */
.trophy-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.category-chips {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.cat-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  background: var(--md-sys-color-surface-container, #1e2025);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-chip:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.cat-chip.active {
  background: rgba(251, 191, 36, 0.15);
  border-color: #fbbf24;
  color: #fbbf24;
  font-weight: 600;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  background: var(--md-sys-color-surface-container, #1e2025);
  border: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 200px;
}

.search-icon {
  color: #9ca3af;
}

.search-input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.75rem;
  color: #f3f4f6;
  width: 100%;
}

/* Trophies Grid */
.trophies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1rem;
}

.trophy-card {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  gap: 0.85rem;
  border-radius: 12px;
  background: var(--md-sys-color-surface-container-low, #181a1f);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  transition: all 0.2s ease;
}

.trophy-card:hover {
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
}

.trophy-card.is-unlocked {
  background: var(--md-sys-color-surface-container, #1c1e24);
}

/* Tier Specific Accents */
.trophy-card.is-unlocked.tier-bronze {
  border-color: rgba(205, 127, 50, 0.35);
}
.trophy-card.is-unlocked.tier-bronze .card-icon-frame {
  background: rgba(205, 127, 50, 0.15);
  border-color: #cd7f32;
  color: #f1b378;
}
.trophy-card.is-unlocked.tier-bronze .tier-pill {
  color: #f1b378;
  background: rgba(205, 127, 50, 0.15);
}

.trophy-card.is-unlocked.tier-silver {
  border-color: rgba(192, 192, 192, 0.35);
}
.trophy-card.is-unlocked.tier-silver .card-icon-frame {
  background: rgba(210, 215, 220, 0.15);
  border-color: #d1d5db;
  color: #f3f4f6;
}
.trophy-card.is-unlocked.tier-silver .tier-pill {
  color: #e5e7eb;
  background: rgba(210, 215, 220, 0.15);
}

.trophy-card.is-unlocked.tier-gold {
  border-color: rgba(255, 215, 0, 0.4);
}
.trophy-card.is-unlocked.tier-gold .card-icon-frame {
  background: rgba(255, 215, 0, 0.15);
  border-color: #f59e0b;
  color: #fde047;
}
.trophy-card.is-unlocked.tier-gold .tier-pill {
  color: #fde047;
  background: rgba(255, 215, 0, 0.15);
}

.trophy-card.is-unlocked.tier-legendary {
  border-color: rgba(244, 63, 94, 0.4);
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.15);
}
.trophy-card.is-unlocked.tier-legendary .card-icon-frame {
  background: rgba(244, 63, 94, 0.15);
  border-color: #f43f5e;
  color: #f472b6;
}
.trophy-card.is-unlocked.tier-legendary .tier-pill {
  color: #f472b6;
  background: rgba(244, 63, 94, 0.15);
}

/* Locked Card Styling */
.trophy-card:not(.is-unlocked) {
  opacity: 0.75;
}

.card-icon-frame {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.unlocked-check-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  color: #22c55e;
  background: #111827;
  border-radius: 9999px;
  display: flex;
}

.locked-icon {
  color: #6b7280;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}

.tier-pill {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: #9ca3af;
}

.unlocked-date {
  font-size: 0.65rem;
  color: #9ca3af;
}

.xp-bounty {
  font-size: 0.65rem;
  font-weight: 700;
  color: #10b981;
}

.card-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.25;
}

.card-desc {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant, #9ca3af);
  line-height: 1.35;
}

.card-flavor {
  margin: 0.35rem 0 0 0;
  font-size: 0.7rem;
  color: #d1d5db;
  font-style: italic;
}

.text-muted {
  color: #6b7280 !important;
}

/* Step Progress for multi-step achievements */
.step-progress-wrapper {
  margin-top: 0.5rem;
}

.step-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: #9ca3af;
  margin-bottom: 0.2rem;
}

.step-progress-track {
  width: 100%;
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  overflow: hidden;
}

.step-progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 9999px;
  transition: width 0.3s ease;
}
</style>
