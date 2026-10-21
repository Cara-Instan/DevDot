import { setActivePinia, createPinia } from 'pinia'
import { useGamificationStore, GAMIFICATION_STORAGE_KEY } from '../src/stores/gamification'
import { useNavigationStore } from '../src/stores/navigation'
import { useSettingsStore, SETTINGS_STORAGE_KEY } from '../src/stores/settings'
import { useSnapshotStore } from '../src/stores/snapshot'
import { useTabStore } from '../src/stores/tabs'
import { usePwaStore } from '../src/stores/pwa'

let totalTests = 0
let passedTests = 0

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`)
    passedTests++
  } else {
    console.error(`  ✗ FAIL: ${testName}`)
    if (details) console.error(`         Details: ${details}`)
  }
}

// In-Memory LocalStorage Mock
class LocalStorageMock implements Storage {
  private store: Record<string, string> = {}

  get length(): number {
    return Object.keys(this.store).length
  }

  clear(): void {
    this.store = {}
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }
}

const mockStorage = new LocalStorageMock()
// @ts-ignore
global.localStorage = mockStorage
// @ts-ignore
global.window = {
  localStorage: mockStorage,
  location: { reload: () => {} },
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {}
}
// @ts-ignore
Object.defineProperty(globalThis, 'navigator', {
  value: {
    onLine: true,
    hardwareConcurrency: 4,
    serviceWorker: {
      getRegistrations: async () => []
    }
  },
  configurable: true,
  writable: true
})

async function runResilienceTests() {
  console.log('==================================================================')
  console.log('🛡️ DEVDOT DATA CORRUPTION RESILIENCE & PWA CACHE VERIFICATION')
  console.log('==================================================================\n')

  // -------------------------------------------------------------------------
  // 1. Gamification Pet XP Infinite Loop & Corruption Immunity
  // -------------------------------------------------------------------------
  console.log('--- 1. Gamification Store Infinite Loop Circuit Breaker ---')
  setActivePinia(createPinia())

  // Scenario A: xpToNextLevel corrupted to 0 with huge xp
  mockStorage.setItem(
    GAMIFICATION_STORAGE_KEY,
    JSON.stringify({
      unlockedAchievements: null,
      progress: 'corrupted',
      stats: { totalOperations: 'not-a-number', jsonOperations: -5 },
      pet: {
        name: 'CorruptedByte',
        level: 'invalid',
        xp: 'corrupt',
        xpToNextLevel: 0,
        mood: 'idle'
      }
    })
  )

  const gamiStore = useGamificationStore()

  assert(gamiStore.pet.level >= 1, 'Sanitizes invalid level to >= 1')
  assert(gamiStore.pet.xp >= 0, 'Sanitizes invalid xp to >= 0')
  assert(gamiStore.pet.xpToNextLevel >= 50, 'Guarantees xpToNextLevel is >= 50 even if stored as 0')
  assert(typeof gamiStore.stats.totalOperations === 'number', 'Sanitizes NaN stats to finite numbers')
  assert(gamiStore.stats.jsonOperations >= 0, 'Clamps negative stats to >= 0')

  // Test executing awardPetXp under degenerate parameters (simulating corrupted runtime state)
  const startTime = Date.now()
  gamiStore.awardPetXp(1000)
  const durationMs = Date.now() - startTime

  assert(durationMs < 100, `Leveling calculation finished in ${durationMs}ms (no infinite loop)`)
  assert(gamiStore.pet.level > 1, `Pet leveled up safely to level ${gamiStore.pet.level}`)
  assert(gamiStore.pet.xpToNextLevel > 0, 'Next level XP remains positive')

  // -------------------------------------------------------------------------
  // 2. Navigation Store Resilience
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Navigation Store Safe Hydration ---')
  mockStorage.setItem('devdot_favorites', JSON.stringify('not-an-array'))
  mockStorage.setItem('devdot_recents', JSON.stringify({ 'recent-1': true }))
  mockStorage.setItem('devdot_sidebar_collapsed', JSON.stringify('yes-collapsed'))

  setActivePinia(createPinia())
  const navStore = useNavigationStore()

  assert(Array.isArray(navStore.favorites), 'Favorites always hydrates as an array')
  assert(navStore.favorites.length > 0, 'Favorites falls back to valid tools on corrupt data')
  assert(Array.isArray(navStore.recents), 'Recents always hydrates as an array')
  assert(typeof navStore.isSidebarCollapsed === 'boolean', 'Sidebar collapsed status always hydrates as boolean')

  // Toggle favorite with non-array resistance
  navStore.toggleFavorite('json-format')
  assert(Array.isArray(navStore.favorites), 'Favorites remains array after toggling')

  // -------------------------------------------------------------------------
  // 3. Settings Store Resilience
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Settings Store Clamp & Fallback ---')
  mockStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      editorFontSize: 9999,
      scrollMultiplier: -5,
      clipboardAutoPurgeSeconds: 'never',
      themeMode: 'ultra-neon-custom',
      toolOrder: 'invalid-string'
    })
  )

  setActivePinia(createPinia())
  const settingsStore = useSettingsStore()

  assert(settingsStore.editorFontSize <= 24, 'Clamps oversized editorFontSize')
  assert(settingsStore.scrollMultiplier >= 0.5, 'Clamps negative scrollMultiplier')
  assert(typeof settingsStore.clipboardAutoPurgeSeconds === 'number', 'Recovers valid number for auto purge')
  assert(['light', 'dark', 'system'].includes(settingsStore.themeMode), 'Falls back to valid theme mode')
  assert(Array.isArray(settingsStore.toolOrder), 'Tool order remains array')

  // -------------------------------------------------------------------------
  // 4. Snapshot Store Debounce & Corruption Resilience
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Snapshot Store State Protection ---')
  mockStorage.setItem(
    'devdot_tool_sessions_v1',
    JSON.stringify({
      'json-format': 'corrupted-string-state',
      'tab-1': { validKey: 'value' },
      'corrupt-array': [1, 2, 3]
    })
  )

  setActivePinia(createPinia())
  const snapshotStore = useSnapshotStore()

  const safeState = snapshotStore.getTabOrToolState('json-format', 'json-format', { fallback: true })
  assert(typeof safeState === 'object', 'getTabOrToolState returns an object')
  assert(safeState.fallback === true, 'Discards string state and uses fallback default')

  snapshotStore.setTabState('tab-test', 'json-format', { input: 'hello' })
  assert(snapshotStore.toolStates['tab-test'].input === 'hello', 'Tab state updated cleanly')

  // -------------------------------------------------------------------------
  // 5. Workspace Tabs Resilience
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Workspace Tab Store Validation ---')
  mockStorage.setItem(
    'devdot_workspace_tabs_v2',
    JSON.stringify([
      { id: 'tab_nonexistent_tool', toolId: 'tool-that-does-not-exist' },
      { id: 'tab_invalid', toolId: 12345 },
      null,
      { id: 'tab_json-format_1', toolId: 'json-format', title: 'JSON Formatter' }
    ])
  )
  mockStorage.setItem('devdot_active_tab_id_v2', 'orphan-tab-id-999')

  setActivePinia(createPinia())
  const tabStore = useTabStore()

  assert(
    tabStore.tabs.every((t) => ['system-overview', 'json-format'].includes(t.toolId)),
    'Discards unknown or deleted tool IDs from restored tabs'
  )
  assert(tabStore.tabs.some((t) => t.toolId === 'system-overview'), 'Always anchors system-overview tab')
  assert(
    tabStore.tabs.some((t) => t.id === tabStore.activeTabId),
    'Active tab ID resolves to an existing valid tab'
  )

  // -------------------------------------------------------------------------
  // 6. PWA Store & Cache Invalidation API
  // -------------------------------------------------------------------------
  console.log('\n--- 6. PWA Store Cache & Update API ---')
  setActivePinia(createPinia())
  const pwaStore = usePwaStore()

  let updateCalled = false
  pwaStore.registerUpdateHandler(async () => {
    updateCalled = true
  })

  assert(pwaStore.needRefresh === true, 'needRefresh flag activates when update handler is registered')
  await pwaStore.updateApp()
  assert(updateCalled === true, 'updateApp executes the registered Service Worker update handler')

  pwaStore.dismissUpdate()
  assert(pwaStore.needRefresh === false, 'dismissUpdate successfully dismisses the update toast')

  assert(typeof pwaStore.hardResetAppCaches === 'function', 'hardResetAppCaches function is exposed')

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n==================================================================')
  console.log(`🏁 RESILIENCE SUMMARY: ${passedTests} / ${totalTests} checks passed`)
  console.log('==================================================================')

  if (passedTests === totalTests) {
    console.log('✅ ALL DATA CORRUPTION RESILIENCE & PWA CHECKS PASSED!\n')
    process.exit(0)
  } else {
    console.error(`❌ FAILED: ${totalTests - passedTests} checks failed.\n`)
    process.exit(1)
  }
}

runResilienceTests().catch((err) => {
  console.error('Fatal error during resilience testing:', err)
  process.exit(1)
})
