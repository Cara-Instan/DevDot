/**
 * Verification Suite for DevDot Sub-Phase 4.1: Security & Ephemeral Scrubbing
 * 
 * Verifies:
 * 1. Zero Outbound Network Request Audit (No telemetry, trackers, or CDN leakages)
 * 2. Ephemeral Scrubbing & Panic / Quick Clear functionality
 * 3. Clipboard Auto-Purge scheduling, countdown, and instant wipe
 * 4. Security Store Audit Reporting & Reactive State Management
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { setActivePinia, createPinia } from 'pinia'
import { useSecurityStore } from '../src/stores/security'
import { useSnapshotStore } from '../src/stores/snapshot'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  \x1b[32m✔\x1b[0m [PASS] ${testName}`)
  } else {
    failedTests++
    console.error(`  \x1b[31m✘\x1b[0m [FAIL] ${testName}`)
    if (details) {
      console.error(`    \x1b[33mDetails: ${details}\x1b[0m`)
    }
  }
}

// Mock browser environments for Node.js test runner
function setupMockBrowserEnvironment() {
  const localStorageMock: Record<string, string> = {}
  const sessionStorageMock: Record<string, string> = {}
  let clipboardData = ''

  ;(globalThis as any).localStorage = {
    getItem: (key: string) => localStorageMock[key] || null,
    setItem: (key: string, val: string) => { localStorageMock[key] = val },
    removeItem: (key: string) => { delete localStorageMock[key] },
    clear: () => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]) },
    get length() { return Object.keys(localStorageMock).length }
  }

  ;(globalThis as any).sessionStorage = {
    getItem: (key: string) => sessionStorageMock[key] || null,
    setItem: (key: string, val: string) => { sessionStorageMock[key] = val },
    removeItem: (key: string) => { delete sessionStorageMock[key] },
    clear: () => { Object.keys(sessionStorageMock).forEach(k => delete sessionStorageMock[k]) },
    get length() { return Object.keys(sessionStorageMock).length }
  }

  const mockClipboard = {
    writeText: async (text: string) => {
      clipboardData = text
      return Promise.resolve()
    },
    readText: async () => Promise.resolve(clipboardData)
  }

  if (typeof globalThis.navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: mockClipboard },
      configurable: true,
      writable: true
    })
  } else {
    try {
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: mockClipboard,
        configurable: true,
        writable: true
      })
    } catch {
      (globalThis.navigator as any).clipboard = mockClipboard
    }
  }

  return {
    getLocalStorage: () => localStorageMock,
    getSessionStorage: () => sessionStorageMock,
    getClipboard: () => clipboardData
  }
}

async function runSecuritySuite() {
  console.log('\n===============================================================')
  console.log('🛡️  DEVDOT SUB-PHASE 4.1: SECURITY & EPHEMERAL SCRUBBING AUDIT')
  console.log('===============================================================\n')

  const env = setupMockBrowserEnvironment()
  setActivePinia(createPinia())

  // =========================================================================
  // TEST SECTION 1: ZERO OUTBOUND NETWORK AUDIT
  // =========================================================================
  console.log('🔍 Test Group 1: Zero Outbound Network & Telemetry Audit')

  const forbiddenDomains = [
    'google-analytics.com',
    'googletagmanager.com',
    'sentry.io',
    'mixpanel.com',
    'hotjar.com',
    'segment.io',
    'logrocket.com',
    'amplitude.com',
    'fonts.googleapis.com'
  ]

  const srcDir = path.resolve(__dirname, '../src')
  const indexHtmlPath = path.resolve(__dirname, '../index.html')

  function getAllFiles(dir: string): string[] {
    let results: string[] = []
    const list = fs.readdirSync(dir)
    list.forEach(file => {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath))
      } else if (file.endsWith('.ts') || file.endsWith('.vue') || file.endsWith('.js') || file.endsWith('.html')) {
        results.push(fullPath)
      }
    })
    return results
  }

  const allFiles = [...getAllFiles(srcDir), indexHtmlPath]
  let detectedTrackerCount = 0
  const trackerViolations: string[] = []

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    for (const domain of forbiddenDomains) {
      if (content.includes(domain)) {
        detectedTrackerCount++
        trackerViolations.push(`${path.relative(path.resolve(__dirname, '..'), filePath)} matches "${domain}"`)
      }
    }
  }

  assert(
    detectedTrackerCount === 0,
    'Zero third-party trackers or telemetry scripts found in codebase',
    trackerViolations.join(', ')
  )

  // Verify index.html contains no external script or style CDNs
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
  const externalScriptRegex = /<script[^>]+src=["'](https?:)?\/\/[^"']+["']/i
  const externalStyleRegex = /<link[^>]+href=["'](https?:)?\/\/[^"']+["']/i

  assert(!externalScriptRegex.test(indexHtmlContent), 'index.html has zero external CDN script tags')
  assert(!externalStyleRegex.test(indexHtmlContent), 'index.html has zero external stylesheet CDN tags')

  // =========================================================================
  // TEST SECTION 2: EPHEMERAL SCRUBBING & PANIC QUICK CLEAR
  // =========================================================================
  console.log('\n🧹 Test Group 2: Ephemeral Memory Scrubbing & Panic Quick Clear')

  const securityStore = useSecurityStore()
  const snapshotStore = useSnapshotStore()

  // Populate mock data into stores, localStorage, and sessionStorage
  localStorage.setItem('auth_test_key', 'super-secret-user-token-123')
  localStorage.setItem('recent_query', 'sensitive_database_search')
  sessionStorage.setItem('temp_session_var', 'volatile-cache-data')
  snapshotStore.setToolState('json-format', { input: '{"secret": "production-api-key"}' })
  snapshotStore.setToolState('jwt-debugger', { token: 'eyJhbGciOiJIUzI1Ni...' })

  await securityStore.copyToClipboard('very-confidential-password-xyz', { autoPurge: false })

  assert(localStorage.length === 2, 'LocalStorage populated with mock items before wipe')
  assert(sessionStorage.length === 1, 'SessionStorage populated with mock items before wipe')
  assert(Object.keys(snapshotStore.toolStates).length >= 2, 'Pinia snapshot store populated before wipe')
  assert(env.getClipboard() === 'very-confidential-password-xyz', 'Clipboard populated before wipe')

  // Execute Quick Clear / Panic Wipe
  const panicResult = await securityStore.quickClearAllData()

  assert(panicResult.success === true, 'quickClearAllData returned success status')
  assert(panicResult.clearedItems.length >= 4, 'Reported all scrubbed memory vectors')
  assert(localStorage.length === 0, 'LocalStorage is completely wiped and empty (0 items)')
  assert(sessionStorage.length === 0, 'SessionStorage is completely wiped and empty (0 items)')
  assert(Object.keys(snapshotStore.toolStates).length === 0, 'Pinia workspace session store is completely reset')
  assert(env.getClipboard() === '', 'System clipboard is wiped and set to empty string')
  assert(securityStore.lastPanicClearedAt !== null, 'Recorded lastPanicClearedAt timestamp')

  // =========================================================================
  // TEST SECTION 3: CLIPBOARD AUTO-PURGE MANAGER
  // =========================================================================
  console.log('\n⏱️ Test Group 3: Clipboard Auto-Purge Scheduling & Wipe Engine')

  // 1. Test Copy with Auto-Purge enabled
  securityStore.autoPurgeEnabled = true
  securityStore.purgeDelaySeconds = 30

  const copySuccess = await securityStore.copyToClipboard('Bearer eyJhbGciOiJIUzI1Ni.eyJzdWIiOiIxMjM0NTY3ODkwIn0', {
    label: 'JWT Secret Token'
  })

  assert(copySuccess === true, 'copyToClipboard returned true on successful write')
  assert(env.getClipboard().startsWith('Bearer eyJhbGci'), 'Clipboard content matches written payload')
  assert(securityStore.remainingPurgeSeconds === 30, 'Purge timer initialized with configured 30s countdown')
  assert(securityStore.isTimerActive === true, 'isTimerActive getter returns true while countdown active')
  assert(securityStore.lastCopiedPreview === 'JWT Secret Token', 'Preserved human-readable label preview')

  // 2. Test Cancel Purge Timer
  securityStore.cancelClipboardPurge()
  assert(securityStore.remainingPurgeSeconds === 0, 'cancelClipboardPurge immediately resets remaining seconds to 0')
  assert(securityStore.isTimerActive === false, 'isTimerActive returns false after cancellation')

  // 3. Test Immediate Purge Action
  await securityStore.copyToClipboard('CreditCard: 4111-2222-3333-4444')
  assert(env.getClipboard().includes('4111-2222'), 'Clipboard holds credit card payload before manual purge')

  const immediatePurgeSuccess = await securityStore.purgeClipboardNow()
  assert(immediatePurgeSuccess === true, 'purgeClipboardNow executed successfully')
  assert(env.getClipboard() === '', 'Clipboard data cleared to empty string immediately')
  assert(securityStore.lastCopiedPreview === '', 'lastCopiedPreview reset after purge')
  assert(securityStore.lastPurgedAt !== null, 'lastPurgedAt timestamp updated')

  // 4. Test Custom Delay Option
  await securityStore.copyToClipboard('Secret API Key', { customDelay: 15 })
  assert(securityStore.remainingPurgeSeconds === 15, 'customDelay option correctly overrides default purge timeout (15s)')
  securityStore.cancelClipboardPurge()

  // =========================================================================
  // TEST SECTION 4: SECURITY AUDIT REPORT GENERATOR
  // =========================================================================
  console.log('\n📊 Test Group 4: Security Audit Report & Reactive State')

  const auditReport = securityStore.runSecurityAudit()

  assert(auditReport.isAirGapped === true, 'Audit reports 100% Air-Gapped Sandbox status')
  assert(auditReport.outboundCallsDetected === 0, 'Audit reports 0 outbound network calls')
  assert(auditReport.thirdPartyTrackers === 0, 'Audit reports 0 third-party trackers')
  assert(auditReport.localStorageClean === true, 'Audit reports LocalStorage is clean following panic wipe')
  assert(auditReport.indexedDbClean === true, 'Audit reports IndexedDB storage integrity clean')
  assert(typeof auditReport.timestamp === 'string', 'Audit includes valid ISO timestamp')

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================')
  console.log(`🏁 AUDIT SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`)
  console.log('===============================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  } else {
    console.log('\x1b[32m✨ All Security & Ephemeral Scrubbing tests passed successfully!\x1b[0m\n')
  }
}

runSecuritySuite().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
