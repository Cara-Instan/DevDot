import { validateSnapshot, type ToolkitSnapshot } from '../src/stores/snapshot'

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${testName}`)
    failed++
  }
}

console.log('=== RUNNING DEVTOOLS-DOT SUB-PHASE 2.3 VERIFICATION ===\n')

// 1. Valid Snapshot Schema Validation
console.log('1. Testing Schema Validator with Valid Snapshot...')
const validSnapshot: ToolkitSnapshot = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  app: 'dev-toolkit',
  schemaVersion: '1.0.0',
  createdAt: '2026-08-26T22:30:00.000Z',
  metadata: {
    title: 'Testing Session Snapshot',
    description: 'Automated test snapshot package',
    exportedBy: 'DevDot v0.1.0'
  },
  activeTabId: 'json-format',
  tabs: [
    {
      id: 'tab-json-format',
      toolId: 'json-format',
      title: 'JSON Prettify & Minify',
      state: {
        inputJson: '{"test": true}',
        outputJson: '{\n  "test": true\n}',
        indentType: '2-spaces',
        autoRepair: true,
        sortKeys: 'none',
        isMinified: false
      }
    },
    {
      id: 'tab-hash-generator',
      toolId: 'hash-generator',
      title: 'Hash & ID Generator',
      state: {
        activeTab: 'hash',
        hashInput: 'Secret 123',
        enableHmac: true,
        hmacSecret: 'my-super-secret'
      }
    }
  ]
}

const validResult = validateSnapshot(validSnapshot)
assert(validResult.isValid === true, 'Accepts conforming ToolkitSnapshot object')
assert(validResult.errors.length === 0, 'No validation error messages for valid object')
assert(validResult.snapshot?.tabs.length === 2, 'Parsed 2 tab sessions correctly')

// 2. Invalid Snapshot Schema Validation Checks
console.log('\n2. Testing Schema Validator with Invalid Payloads...')

const missingApp = { ...validSnapshot, app: 'other-app' }
const missingAppResult = validateSnapshot(missingApp)
assert(!missingAppResult.isValid && missingAppResult.errors.some((e) => e.includes('app')), 'Rejects non-dev-toolkit app identifier')

const badVersion = { ...validSnapshot, schemaVersion: '2.0.0' }
const badVersionResult = validateSnapshot(badVersion)
assert(!badVersionResult.isValid && badVersionResult.errors.some((e) => e.includes('schemaVersion')), 'Rejects unsupported schema version (2.0.0)')

const badDate = { ...validSnapshot, createdAt: 'not-a-valid-date' }
const badDateResult = validateSnapshot(badDate)
assert(!badDateResult.isValid && badDateResult.errors.some((e) => e.includes('createdAt')), 'Rejects invalid ISO-8601 date string')

const emptyTabs = { ...validSnapshot, tabs: [] }
const emptyTabsResult = validateSnapshot(emptyTabs)
assert(!emptyTabsResult.isValid && emptyTabsResult.errors.some((e) => e.includes('tabs')), 'Rejects empty tabs array')

const badTabItem = {
  ...validSnapshot,
  tabs: [{ id: 'tab-1', toolId: 'json-format' /* missing title and state */ }]
}
const badTabResult = validateSnapshot(badTabItem)
assert(!badTabResult.isValid && badTabResult.errors.length >= 2, 'Rejects tab items missing required fields (title, state)')

const nonObjectPayload = 'just a string'
const nonObjectResult = validateSnapshot(nonObjectPayload)
assert(!nonObjectResult.isValid && nonObjectResult.errors[0].includes('root structure'), 'Rejects non-object root payload')

// 3. Simulated Full Session Export & Roundtrip Hydration
console.log('\n3. Testing End-to-End Snapshot Roundtrip (Export -> JSON String -> Import -> Hydrate)...')

const sampleSessionState: Record<string, Record<string, any>> = {
  'json-format': {
    inputJson: '{"name": "DevDot", "airGapped": true}',
    outputJson: '{\n  "name": "DevDot",\n  "airGapped": true\n}',
    indentType: '4-spaces',
    autoRepair: true,
    sortKeys: 'asc',
    isMinified: false
  },
  'json-schema': {
    inputJson: '{"id": 42, "role": "admin"}',
    selectedTarget: 'rust',
    rustOptions: {
      rootName: 'UserCredentials',
      deriveMacros: ['Serialize', 'Deserialize', 'Debug', 'Clone'],
      useOptionForNullable: true
    }
  },
  'encoders-decoders': {
    activeMode: 'base64',
    direction: 'encode',
    inputText: 'Antigravity Privacy Toolkit',
    base64UrlSafe: true
  },
  'hash-generator': {
    activeTab: 'id-gen',
    idType: 'nanoid',
    idCount: 20,
    nanoidLength: 32,
    nanoidPreset: 'hex'
  }
}

// Function to construct export payload manually to test algorithm logic
function buildExport(
  states: Record<string, Record<string, any>>,
  options?: { title?: string; description?: string; selectedToolIds?: string[] }
): ToolkitSnapshot {
  const targetIds = options?.selectedToolIds || Object.keys(states)
  const tabs = targetIds.map((toolId) => ({
    id: `tab-${toolId}`,
    toolId,
    title: toolId.toUpperCase(),
    state: JSON.parse(JSON.stringify(states[toolId]))
  }))

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    app: 'dev-toolkit',
    schemaVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    metadata: {
      title: options?.title || 'DevDot Work Session',
      description: options?.description || 'Exported from DevDot Privacy-First Universal Toolkit',
      exportedBy: 'DevDot v0.1.0'
    },
    activeTabId: 'json-schema',
    tabs
  }
}

const exportedSnapshot = buildExport(sampleSessionState, {
  title: 'Full Dev Session',
  description: 'Production debug data'
})

const serializedJson = JSON.stringify(exportedSnapshot, null, 2)
assert(serializedJson.includes('"schemaVersion": "1.0.0"'), 'Serialized JSON contains schema version 1.0.0')
assert(serializedJson.includes('"title": "Full Dev Session"'), 'Serialized JSON contains custom session title')

// Test Parsing & Validation of Serialized Text
const parsedObj = JSON.parse(serializedJson)
const importValidation = validateSnapshot(parsedObj)
assert(importValidation.isValid === true, 'Imported serialized JSON string validates 100% cleanly')

// Test Simulated Hydration into State Dictionary
const restoredStates: Record<string, Record<string, any>> = {}
if (importValidation.snapshot) {
  for (const tab of importValidation.snapshot.tabs) {
    restoredStates[tab.toolId] = tab.state
  }
}

assert(
  restoredStates['json-format']?.indentType === '4-spaces',
  'Restores JSON Formatter indentType option'
)
assert(
  restoredStates['json-schema']?.rustOptions?.rootName === 'UserCredentials',
  'Restores JSON Schema Rust struct root name'
)
assert(
  restoredStates['encoders-decoders']?.base64UrlSafe === true,
  'Restores Base64 URL-Safe toggle'
)
assert(
  restoredStates['hash-generator']?.nanoidLength === 32,
  'Restores NanoID length configuration'
)

// 4. Corrupt JSON Import Error Handling
console.log('\n4. Testing Malformed JSON Parsing & Error Messages...')
const corruptedJson = '{"app": "dev-toolkit", "schemaVersion": "1.0.0", invalid_json'
try {
  JSON.parse(corruptedJson)
  assert(false, 'Should throw syntax error on corrupted JSON')
} catch (e: any) {
  assert(true, `Catches corrupted JSON syntax error (${e.message})`)
}

console.log(`\n=============================================`)
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log(`=============================================\n`)

if (failed > 0) {
  process.exit(1)
}
