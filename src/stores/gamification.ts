import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  GamificationEvent,
  GamificationStats,
  AchievementDefinition,
  PetMood,
  PetSkin,
  PetState
} from '../core/gamification/types'
import { AchievementRegistry } from '../core/gamification/registry'
import {
  playUnlockSound,
  playLevelUpSound,
  playMunchSound,
  playPetSqueak,
  playErrorChirp
} from '../core/gamification/sound'

export const GAMIFICATION_STORAGE_KEY = 'devdot_gamification_v1'

const DEFAULT_STATS: GamificationStats = {
  totalBytesFormatted: 0,
  totalOperations: 0,
  jsonOperations: 0,
  cryptoOperations: 0,
  converterOperations: 0,
  securityOperations: 0,
  snapshotsExported: 0,
  panicWipes: 0,
  petInteractions: 0,
  nightOwlCount: 0,
  fridayDeploys: 0,
  themeToggles: 0,
  escapeSpamCount: 0,
  hashesGenerated: {}
}

const DEFAULT_PET: PetState = {
  name: 'Byte',
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  mood: 'idle',
  skin: 'classic',
  enabled: true,
  isDocked: false,
  soundEnabled: false,
  soundVolume: 0.15,
  totalFedBytes: 0
}

interface PersistedGamificationState {
  unlockedAchievements: Record<string, string>
  progress: Record<string, number>
  stats: GamificationStats
  pet: Omit<PetState, 'mood'>
}

function loadFromStorage(): PersistedGamificationState {
  try {
    const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        unlockedAchievements: parsed.unlockedAchievements || {},
        progress: parsed.progress || {},
        stats: { ...DEFAULT_STATS, ...parsed.stats },
        pet: { ...DEFAULT_PET, ...parsed.pet }
      }
    }
  } catch (e) {
    console.error('Failed to load gamification state from localStorage:', e)
  }
  return {
    unlockedAchievements: {},
    progress: {},
    stats: { ...DEFAULT_STATS },
    pet: { ...DEFAULT_PET }
  }
}

export const useGamificationStore = defineStore('gamification', () => {
  const initial = loadFromStorage()

  // State
  const unlockedAchievements = ref<Record<string, string>>(initial.unlockedAchievements)
  const progress = ref<Record<string, number>>(initial.progress)
  const stats = ref<GamificationStats>(initial.stats)
  const pet = ref<PetState>({
    ...initial.pet,
    mood: 'idle'
  })

  // Notification Toast Queue
  const activeToast = ref<AchievementDefinition | null>(null)
  const toastQueue = ref<AchievementDefinition[]>([])
  let moodResetTimer: any = null

  // Computed
  const allAchievements = computed(() => AchievementRegistry.getAll())

  const unlockedCount = computed(() => Object.keys(unlockedAchievements.value).length)
  const totalCount = computed(() => allAchievements.value.length)
  const completionPercentage = computed(() => {
    if (totalCount.value === 0) return 0
    return Math.round((unlockedCount.value / totalCount.value) * 100)
  })

  /**
   * Calculate developer persona / RPG Class based on cumulative usage stats
   */
  const devClass = computed(() => {
    const s = stats.value
    const scores = [
      { class: 'Data Alchemist', icon: 'FileJson', count: s.jsonOperations, desc: 'Master of structured schemas, visual diffs, and formatting.' },
      { class: 'Crypto Sorcerer', icon: 'Fingerprint', count: s.cryptoOperations, desc: 'Weaving cryptographic hashes, JWT tokens, and bitwise encoding.' },
      { class: 'Polyglot Transmuter', icon: 'Repeat', count: s.converterOperations, desc: 'Translating seamlessly between languages and data serializations.' },
      { class: 'Syntax Paladin', icon: 'ShieldCheck', count: s.securityOperations, desc: 'Guardian against data leaks, sanitizing secrets and logs.' }
    ]

    scores.sort((a, b) => b.count - a.count)
    if (scores[0].count === 0) {
      return {
        title: 'Terminal Apprentice',
        icon: 'Cpu',
        desc: 'Just beginning the journey across offline developer utilities.'
      }
    }

    return {
      title: `${scores[0].class} (Lv. ${pet.value.level})`,
      icon: scores[0].icon,
      desc: scores[0].desc
    }
  })

  // Persistence
  function save() {
    try {
      const stateToPersist: PersistedGamificationState = {
        unlockedAchievements: unlockedAchievements.value,
        progress: progress.value,
        stats: stats.value,
        pet: {
          name: pet.value.name,
          level: pet.value.level,
          xp: pet.value.xp,
          xpToNextLevel: pet.value.xpToNextLevel,
          skin: pet.value.skin,
          enabled: pet.value.enabled,
          isDocked: pet.value.isDocked,
          soundEnabled: pet.value.soundEnabled,
          soundVolume: pet.value.soundVolume,
          totalFedBytes: pet.value.totalFedBytes
        }
      }
      localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(stateToPersist))
    } catch (e) {
      console.error('Failed to persist gamification state:', e)
    }
  }

  watch([unlockedAchievements, progress, stats, pet], () => save(), { deep: true })

  // Anti-Abuse state & cooldown timers (in-memory)
  let lastFeedTimestamp = 0
  const FEED_COOLDOWN_MS = 10000 // 10s cooldown between feeding
  const MAX_SINGLE_FEED_BYTES = 25000 // Cap single feed contribution
  const recentFedHashes = new Set<string>()

  let lastPetTimestamp = 0
  const PET_COOLDOWN_MS = 3000 // 3s cooldown between pet click XP rewards
  let petXpWindowStart = 0
  let petXpCountInWindow = 0
  const MAX_PET_XP_PER_WINDOW = 5 // max 5 petting XP rewards per 5 minutes
  const PET_WINDOW_MS = 5 * 60 * 1000

  let lastThemeToggleTimestamp = 0
  const THEME_TOGGLE_COOLDOWN_MS = 1000 // 1s debounce on theme toggle stat

  // Pet Actions
  function setPetMood(mood: PetMood, durationMs: number = 2500) {
    pet.value.mood = mood
    if (moodResetTimer) clearTimeout(moodResetTimer)
    if (durationMs > 0 && mood !== 'idle') {
      moodResetTimer = setTimeout(() => {
        pet.value.mood = 'idle'
      }, durationMs)
    }
  }

  function awardPetXp(amount: number) {
    pet.value.xp += amount
    while (pet.value.xp >= pet.value.xpToNextLevel) {
      pet.value.xp -= pet.value.xpToNextLevel
      pet.value.level += 1
      pet.value.xpToNextLevel = Math.round(pet.value.xpToNextLevel * 1.35)

      if (pet.value.soundEnabled) {
        playLevelUpSound(pet.value.soundVolume)
      }
      setPetMood('celebrating', 3500)

      // Check level achievements
      trackAction({ type: 'pet_level_up', meta: { level: pet.value.level } })
    }
  }

  function feedPet(bytes: number, payloadHash?: string): boolean {
    if (bytes <= 0) return false

    const now = Date.now()

    // 1. Check duplicate payload hash
    if (payloadHash && recentFedHashes.has(payloadHash)) {
      return false
    }

    // 2. Check feeding cooldown
    if (now - lastFeedTimestamp < FEED_COOLDOWN_MS) {
      return false
    }

    // Record feed
    lastFeedTimestamp = now
    if (payloadHash) {
      recentFedHashes.add(payloadHash)
      if (recentFedHashes.size > 25) {
        const firstKey = recentFedHashes.values().next().value
        if (firstKey) recentFedHashes.delete(firstKey)
      }
    }

    const effectiveBytes = Math.min(bytes, MAX_SINGLE_FEED_BYTES)
    pet.value.totalFedBytes += effectiveBytes
    setPetMood('eating', 2200)
    const gainedXp = Math.min(Math.max(Math.floor(effectiveBytes / 250), 2), 25)
    awardPetXp(gainedXp)
    if (pet.value.soundEnabled) {
      playMunchSound(pet.value.soundVolume)
    }
    return true
  }

  function petCompanion(): { awarded: boolean; reason?: string } {
    const now = Date.now()

    // Reset window if expired
    if (now - petXpWindowStart > PET_WINDOW_MS) {
      petXpWindowStart = now
      petXpCountInWindow = 0
    }

    const isRapidClick = (now - lastPetTimestamp) < PET_COOLDOWN_MS
    const isWindowCapped = petXpCountInWindow >= MAX_PET_XP_PER_WINDOW

    setPetMood('petted', 1800)
    if (pet.value.soundEnabled) {
      playPetSqueak(pet.value.soundVolume)
    }

    // If rapid click or window capped, do not grant XP or increment interactions stat
    if (isRapidClick || isWindowCapped) {
      return { awarded: false, reason: isRapidClick ? 'cooldown' : 'capped' }
    }

    lastPetTimestamp = now
    petXpCountInWindow += 1
    stats.value.petInteractions += 1
    awardPetXp(6)
    trackAction({ type: 'pet_interaction' })
    return { awarded: true }
  }

  function reportSyntaxError() {
    setPetMood('dizzy', 2500)
    if (pet.value.soundEnabled) {
      playErrorChirp(pet.value.soundVolume)
    }
  }

  // Toast Queue Actions
  function showNextToast() {
    if (toastQueue.value.length > 0) {
      activeToast.value = toastQueue.value.shift() || null
      if (pet.value.soundEnabled) {
        playUnlockSound(pet.value.soundVolume)
      }
      setPetMood('celebrating', 3000)
    } else {
      activeToast.value = null
    }
  }

  function enqueueAchievementUnlock(achievement: AchievementDefinition) {
    if (!activeToast.value) {
      activeToast.value = achievement
      if (pet.value.soundEnabled) {
        playUnlockSound(pet.value.soundVolume)
      }
      setPetMood('celebrating', 3000)
    } else {
      toastQueue.value.push(achievement)
    }
  }

  function dismissToast() {
    activeToast.value = null
    setTimeout(() => {
      showNextToast()
    }, 200)
  }

  // Central Event Tracking Pipeline
  function trackAction(event: GamificationEvent) {
    // Suppress actions that originated from templates, sample loading, or initial mount
    if (event.isSample || event.isTemplate || event.isMount) {
      return
    }

    // Debounce theme toggles
    if (event.type === 'theme_toggle') {
      const now = Date.now()
      if (now - lastThemeToggleTimestamp < THEME_TOGGLE_COOLDOWN_MS) {
        return
      }
      lastThemeToggleTimestamp = now
    }

    stats.value.totalOperations += 1

    // Temporal easter egg checks
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const day = now.getDay() // 0 = Sun, 5 = Fri

    // 1:00 AM to 4:30 AM
    if (hour >= 1 && (hour < 4 || (hour === 4 && minute <= 30))) {
      stats.value.nightOwlCount += 1
    }

    // Friday after 16:00
    if (day === 5 && hour >= 16) {
      stats.value.fridayDeploys += 1
    }

    // Category telemetry & Feed Pet
    // Notice: Automatic watcher/debounced typing events (isAutomatic: true) or option toggles do NOT feed pet or add to totalBytesFormatted!
    if (event.type.startsWith('json_') || event.type === 'json_format') {
      stats.value.jsonOperations += 1
      if (event.bytes && !event.isAutomatic && !event.isOptionChange) {
        const fed = feedPet(event.bytes, event.payloadHash)
        if (fed) {
          stats.value.totalBytesFormatted += Math.min(event.bytes, MAX_SINGLE_FEED_BYTES)
        }
      }
    } else if (
      event.type.startsWith('hash_') ||
      event.type === 'jwt_decode' ||
      event.type === 'encoder_action'
    ) {
      stats.value.cryptoOperations += 1
      if (event.algo) {
        stats.value.hashesGenerated[event.algo] = (stats.value.hashesGenerated[event.algo] || 0) + 1
      }
    } else if (event.type === 'transpile' || event.type === 'curl_convert') {
      stats.value.converterOperations += 1
      if (event.bytes && !event.isAutomatic && !event.isOptionChange) {
        const fed = feedPet(event.bytes, event.payloadHash)
        if (fed) {
          stats.value.totalBytesFormatted += Math.min(event.bytes, MAX_SINGLE_FEED_BYTES)
        }
      }
    } else if (event.type.startsWith('pii_')) {
      stats.value.securityOperations += 1
    } else if (event.type === 'snapshot_export') {
      stats.value.snapshotsExported += 1
    } else if (event.type === 'panic_wipe') {
      stats.value.panicWipes += 1
    } else if (event.type === 'theme_toggle') {
      stats.value.themeToggles += 1
    } else if (event.type === 'escape_press') {
      stats.value.escapeSpamCount += 1
    }

    // Evaluate Achievements via Registry
    const unlockedSet = new Set(Object.keys(unlockedAchievements.value))
    const { newlyUnlocked, updatedProgress } = AchievementRegistry.evaluate(
      event,
      stats.value,
      progress.value,
      unlockedSet
    )

    // Update progress map
    for (const [id, prog] of Object.entries(updatedProgress)) {
      progress.value[id] = prog
    }

    // Handle newly unlocked achievements
    for (const ach of newlyUnlocked) {
      unlockedAchievements.value[ach.id] = new Date().toISOString()
      awardPetXp(ach.xpReward)
      enqueueAchievementUnlock(ach)
    }

    save()
  }

  function resetGamification() {
    unlockedAchievements.value = {}
    progress.value = {}
    stats.value = { ...DEFAULT_STATS }
    pet.value = { ...DEFAULT_PET, mood: 'idle' }
    activeToast.value = null
    toastQueue.value = []
    lastFeedTimestamp = 0
    recentFedHashes.clear()
    lastPetTimestamp = 0
    petXpWindowStart = 0
    petXpCountInWindow = 0
    lastThemeToggleTimestamp = 0
    save()
  }

  function setPetSkin(skin: PetSkin) {
    pet.value.skin = skin
  }

  function togglePetEnabled(val?: boolean) {
    pet.value.enabled = val !== undefined ? val : !pet.value.enabled
  }

  function toggleSoundEnabled(val?: boolean) {
    pet.value.soundEnabled = val !== undefined ? val : !pet.value.soundEnabled
  }

  function setSoundVolume(volume: number) {
    pet.value.soundVolume = Math.max(0, Math.min(1, volume))
  }

  return {
    // State
    unlockedAchievements,
    progress,
    stats,
    pet,
    activeToast,

    // Computed
    allAchievements,
    unlockedCount,
    totalCount,
    completionPercentage,
    devClass,

    // Actions
    trackAction,
    feedPet,
    petCompanion,
    setPetMood,
    setPetSkin,
    reportSyntaxError,
    togglePetEnabled,
    toggleSoundEnabled,
    setSoundVolume,
    dismissToast,
    resetGamification
  }
})
