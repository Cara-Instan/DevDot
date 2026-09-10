import { createPinia, setActivePinia } from 'pinia'
import { AchievementRegistry } from '../src/core/gamification/registry'
import { AchievementDefinition, GamificationStats } from '../src/core/gamification/types'
import { computePayloadHash } from '../src/core/gamification/utils'
import { useGamificationStore } from '../src/stores/gamification'

if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {}
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const k in store) delete store[k] }
  }
}

console.log('🎮 Starting DevDot Gamification & "Puzzle-Piece" Achievement Suite Verification...\n')

let passCount = 0
let failCount = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`)
    passCount++
  } else {
    console.error(`  ✗ FAIL: ${msg}`)
    failCount++
  }
}

// 1. Testing Registry Pre-Loaded Definitions
console.log('--- 1. Testing Built-in Registry & Category Indexing ---')
const all = AchievementRegistry.getAll()
assert(all.length >= 20, `Loaded ${all.length} built-in achievements (expected >= 20)`)

const jsonBadges = AchievementRegistry.getByCategory('json')
assert(jsonBadges.length >= 4, `JSON category contains ${jsonBadges.length} achievements`)

const cryptoBadges = AchievementRegistry.getByCategory('crypto')
assert(cryptoBadges.length >= 4, `Crypto category contains ${cryptoBadges.length} achievements`)

const easterEggBadges = AchievementRegistry.getByCategory('easter-egg')
assert(easterEggBadges.length >= 6, `Easter egg category contains ${easterEggBadges.length} achievements`)

// 2. Testing Plug-and-Play "Puzzle Piece" Extensibility
console.log('\n--- 2. Testing Plug-and-Play "Puzzle Piece" Extensibility ---')
const initialCount = AchievementRegistry.getAll().length

const customPuzzlePiece: AchievementDefinition = {
  id: 'future-wasm-badge',
  title: 'Wasm Sorcerer',
  description: 'Compile WebAssembly offline in DevDot',
  flavorText: 'Near-native bytecode in the browser.',
  tier: 'gold',
  category: 'general',
  icon: 'Cpu',
  xpReward: 150,
  check: (event) => ({
    unlocked: event.type === 'wasm_compile'
  })
}

AchievementRegistry.register(customPuzzlePiece)
const newCount = AchievementRegistry.getAll().length
assert(newCount === initialCount + 1, 'Custom puzzle piece was registered seamlessly without core changes')

const fetched = AchievementRegistry.get('future-wasm-badge')
assert(fetched?.title === 'Wasm Sorcerer', 'Registered puzzle piece retrieved by ID successfully')

// 3. Testing Event Evaluation Engine
console.log('\n--- 3. Testing Evaluation Engine & Trigger Logic ---')
const emptyStats: GamificationStats = {
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

const unlockedSet = new Set<string>()
const progressMap: Record<string, number> = {}

// Trigger JSON format
const res1 = AchievementRegistry.evaluate(
  { type: 'json_format', isMinified: false, bytes: 500 },
  emptyStats,
  progressMap,
  unlockedSet
)

const jsonChefUnlocked = res1.newlyUnlocked.some((a) => a.id === 'json-chef')
assert(jsonChefUnlocked, 'json_format event unlocked JSON Chef achievement')

// Mark json-chef as unlocked and evaluate again
unlockedSet.add('json-chef')
const res2 = AchievementRegistry.evaluate(
  { type: 'json_format', isMinified: false, bytes: 500 },
  emptyStats,
  progressMap,
  unlockedSet
)
const alreadyUnlocked = res2.newlyUnlocked.some((a) => a.id === 'json-chef')
assert(!alreadyUnlocked, 'Already unlocked achievement is not triggered again')

// 4. Testing Multi-Step Cumulative Progress Badges
console.log('\n--- 4. Testing Multi-Step Cumulative Progress ---')
// Test Data Alchemist (10 conversions)
const statsWithConversions: GamificationStats = {
  ...emptyStats,
  converterOperations: 5
}

const resProgress = AchievementRegistry.evaluate(
  { type: 'dummy' },
  statsWithConversions,
  progressMap,
  unlockedSet
)

assert(resProgress.updatedProgress['data-alchemy'] === 5, 'Data Alchemist progress updated to 5 / 10')
assert(!resProgress.newlyUnlocked.some((a) => a.id === 'data-alchemy'), 'Not unlocked yet at 5 / 10')

// Complete to 10
const statsComplete: GamificationStats = {
  ...emptyStats,
  converterOperations: 10
}
const resComplete = AchievementRegistry.evaluate(
  { type: 'dummy' },
  statsComplete,
  progressMap,
  unlockedSet
)
assert(resComplete.newlyUnlocked.some((a) => a.id === 'data-alchemy'), 'Data Alchemist unlocks at 10 / 10 conversions')

// 5. Testing Custom Puzzle Piece Execution
console.log('\n--- 5. Testing Custom Puzzle Piece Execution ---')
const resCustom = AchievementRegistry.evaluate(
  { type: 'wasm_compile' },
  emptyStats,
  progressMap,
  unlockedSet
)
assert(resCustom.newlyUnlocked.some((a) => a.id === 'future-wasm-badge'), 'Custom Wasm puzzle piece evaluates and unlocks!')

// 6. Testing Anti-Abuse Guards & Exploit Prevention
console.log('\n--- 6. Testing Anti-Abuse Guards & Exploit Prevention ---')

// 6.1 Payload Hash Fingerprinting
const hash1 = computePayloadHash('{"test": 123}')
const hash2 = computePayloadHash('{"test": 123}')
const hash3 = computePayloadHash('{"test": 456}')
assert(hash1 === hash2, 'computePayloadHash produces identical fingerprints for identical inputs')
assert(hash1 !== hash3, 'computePayloadHash produces different fingerprints for different inputs')

// Initialize Pinia for GamificationStore testing
setActivePinia(createPinia())
const store = useGamificationStore()
store.resetGamification()

// 6.2 Template / Sample Loading Suppression
store.trackAction({
  type: 'json_format',
  bytes: 5000,
  isSample: true,
  payloadHash: computePayloadHash('{"sample": true}')
})
assert(store.pet.totalFedBytes === 0, 'isSample: true does NOT feed the pet (totalFedBytes === 0)')
assert(store.stats.totalBytesFormatted === 0, 'isSample: true does NOT increment totalBytesFormatted')
assert(store.stats.totalOperations === 0, 'isSample: true does NOT count as user operations')
assert(!store.unlockedAchievements['json-chef'], 'isSample: true does NOT unlock json-chef achievement')

// 6.3 Initial Mount / Hydration Suppression
store.trackAction({
  type: 'json_format',
  bytes: 5000,
  isMount: true,
  payloadHash: computePayloadHash('{"mount": true}')
})
assert(store.pet.totalFedBytes === 0, 'isMount: true does NOT feed the pet')
assert(store.stats.totalOperations === 0, 'isMount: true does NOT count as user operations')
assert(!store.unlockedAchievements['json-chef'], 'isMount: true does NOT unlock json-chef achievement')

// 6.4 Auto-Prettify Keystroke / Live Debounce Suppression
store.trackAction({
  type: 'json_format',
  bytes: 3500,
  isAutomatic: true,
  payloadHash: computePayloadHash('{"live": 1}')
})
assert(store.pet.totalFedBytes === 0, 'isAutomatic: true (typing with auto-prettify) does NOT feed the pet')
assert(store.stats.totalBytesFormatted === 0, 'isAutomatic: true does NOT increment totalBytesFormatted')
assert(store.stats.jsonOperations === 1, 'isAutomatic: true records operation telemetry')

// 6.5 Legitimate Deliberate Manual Format
const userPayload = '{"realUserCode": true}'
const userHash = computePayloadHash(userPayload)
store.trackAction({
  type: 'json_format',
  bytes: 2000,
  isAutomatic: false,
  isSample: false,
  payloadHash: userHash
})
assert(store.pet.totalFedBytes === 2000, 'Deliberate manual formatting feeds the pet (totalFedBytes === 2000)')
assert(store.stats.totalBytesFormatted === 2000, 'totalBytesFormatted incremented for legitimate user format')
assert(store.pet.xp > 0, 'Byte gains XP from legitimate feeding')

// 6.6 Duplicate Payload Button-Mashing Deduplication
const prevFedBytes = store.pet.totalFedBytes
const prevXp = store.pet.xp
store.trackAction({
  type: 'json_format',
  bytes: 2000,
  isAutomatic: false,
  isSample: false,
  payloadHash: userHash // Same hash!
})
assert(store.pet.totalFedBytes === prevFedBytes, 'Duplicate payload hash does NOT feed the pet again (deduplicated)')
assert(store.pet.xp === prevXp, 'Duplicate payload does NOT award additional pet XP')

// 6.7 Pet Petting Rate-Limiting & Anti-Spam
store.resetGamification()
const petRes1 = store.petCompanion()
assert(petRes1.awarded === true, 'First petCompanion call awards XP')
assert(store.pet.xp === 6, 'Byte gained 6 XP from first pet')
assert(store.stats.petInteractions === 1, 'petInteractions incremented to 1')

// Rapid second click immediately (< 3s cooldown)
const petRes2 = store.petCompanion()
assert(petRes2.awarded === false, 'Rapid second petCompanion call is rejected (awarded: false)')
assert(petRes2.reason === 'cooldown', 'Rejection reason is cooldown')
assert(store.pet.xp === 6, 'Pet XP remains 6 without spam inflation')
assert(store.stats.petInteractions === 1, 'petInteractions stat was not spammed')

// Summary
console.log('\n=============================================')
console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED`)
console.log('=============================================')

if (failCount > 0) {
  process.exit(1)
} else {
  console.log('🎉 All Gamification & Achievement Registry Tests Passed!')
}
