import { setActivePinia, createPinia } from 'pinia'

// Mock in-memory localStorage for node test runner
const store: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) }
}

import { useSnapshotStore } from '../src/stores/snapshot'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ PASS: ${message}`)
}

console.log('\n--- Testing Snapshot Store setTabState & Redactor Hydration Guard ---')
setActivePinia(createPinia())
const snapshotStore = useSnapshotStore()

// 1. Initial setTabState
snapshotStore.setTabState('tab-redactor', 'pii-redactor', {
  inputText: 'initial log text',
  maskingMode: 'category-tag',
  activeRuleIds: ['rule-email', 'rule-ip']
})

const stateRef1 = snapshotStore.toolStates['tab-redactor']
assert(stateRef1 !== undefined, 'State is initialized for tab-redactor')
assert(stateRef1.inputText === 'initial log text', 'Input text is set correctly')

// 2. Redundant setTabState with identical values should NOT create a new object reference
snapshotStore.setTabState('tab-redactor', 'pii-redactor', {
  inputText: 'initial log text',
  maskingMode: 'category-tag',
  activeRuleIds: ['rule-email', 'rule-ip']
})

const stateRef2 = snapshotStore.toolStates['tab-redactor']
assert(stateRef1 === stateRef2, 'Identical setTabState does not replace object reference (no churn/reactivity loop)')

// 3. Meaningful change should produce updated state
snapshotStore.setTabState('tab-redactor', 'pii-redactor', {
  inputText: 'modified log text'
})

const stateRef3 = snapshotStore.toolStates['tab-redactor']
assert(stateRef3 !== stateRef1, 'Meaningful change creates updated object')
assert(stateRef3.inputText === 'modified log text', 'Updated property is reflected')
assert(stateRef3.maskingMode === 'category-tag', 'Previous properties are retained')

// 4. Test setToolState redundant call protection
snapshotStore.setToolState('pii-redactor', {
  inputText: 'modified log text'
})
const toolRef1 = snapshotStore.toolStates['pii-redactor']
snapshotStore.setToolState('pii-redactor', {
  inputText: 'modified log text'
})
const toolRef2 = snapshotStore.toolStates['pii-redactor']
assert(toolRef1 === toolRef2, 'Identical setToolState does not replace object reference')

console.log('\n🎉 ALL Redactor Hydration Resilience checks PASSED!\n')
