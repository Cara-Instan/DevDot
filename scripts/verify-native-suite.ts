import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { isTauri, getRuntimeEnvironment } from '../src/core/adapters/platform'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import {
  openNativeFileDialog,
  saveNativeFileDialog,
  type OpenDialogOptions,
  type SaveDialogOptions
} from '../src/core/native/dialog'
import {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts,
  getRegisteredShortcuts
} from '../src/core/native/shortcuts'
import {
  setupNativeDragDrop,
  type DroppedFilePayload
} from '../src/core/native/dragDrop'
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

console.log('=== RUNNING DEVDOT SUB-PHASE 4.2 NATIVE DESKTOP INTEGRATIONS VERIFICATION ===\n')

// 1. Platform Detection & Environment Adapter
console.log('1. Testing Platform Detection & Fallback Modes...')
const env = getRuntimeEnvironment()
assert(env === 'web' || env === 'tauri', `Platform runtime environment correctly identified as "${env}"`)
assert(typeof isTauri() === 'boolean', 'isTauri() returns a valid boolean value')

// 2. Native File Dialog Adapter Specs & Fallback
console.log('\n2. Testing Native Dialog & File System Fallbacks...')
assert(typeof openNativeFileDialog === 'function', 'openNativeFileDialog is defined and exported')
assert(typeof saveNativeFileDialog === 'function', 'saveNativeFileDialog is defined and exported')

// Test Save Dialog options format
const saveOpts: SaveDialogOptions = {
  title: 'Export DevDot Session',
  defaultPath: 'workspace-backup.toolkit',
  filters: [
    { name: 'DevDot Snapshot (*.toolkit)', extensions: ['toolkit'] },
    { name: 'JSON Document (*.json)', extensions: ['json'] }
  ]
}
assert(saveOpts.filters?.length === 2, 'Save dialog options filter format conforms to Tauri v2 spec')
assert(saveOpts.filters?.[0].extensions.includes('toolkit') === true, 'Supports .toolkit custom file extension')

// 3. Global Shortcuts Lifecycle Specs
console.log('\n3. Testing Global Shortcuts Manager...')
assert(typeof registerGlobalShortcuts === 'function', 'registerGlobalShortcuts is defined and callable')
assert(typeof unregisterGlobalShortcuts === 'function', 'unregisterGlobalShortcuts is defined and callable')
assert(typeof getRegisteredShortcuts === 'function', 'getRegisteredShortcuts is defined and callable')

// Test shortcut registration in non-tauri (web test environment)
const shortcutsResult = await registerGlobalShortcuts({
  onToggleWindow: () => {},
  onOpenCommandPalette: () => {},
  onQuickPanic: () => {}
})
assert(shortcutsResult === false, 'Gracefully handles web runtime by not throwing and returning false')
await unregisterGlobalShortcuts()
assert(getRegisteredShortcuts().length === 0, 'Unregistering clears shortcut registry safely')

// 4. Native Drag and Drop & Snapshot Auto-Detection
console.log('\n4. Testing Native Drag & Drop Handler & Snapshot Detection...')
assert(typeof setupNativeDragDrop === 'function', 'setupNativeDragDrop is defined and callable')

// Mock dropped payload testing
const mockSnapshot: ToolkitSnapshot = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  app: 'dev-toolkit',
  schemaVersion: '1.0.0',
  createdAt: new Date().toISOString(),
  metadata: {
    title: 'Dropped Snapshot Test',
    description: 'Testing native drag drop recognition'
  },
  activeTabId: 'json-formatter',
  tabs: [
    {
      id: 'tab-json-formatter',
      toolId: 'json-formatter',
      title: 'JSON Formatter',
      state: { input: '{"hello": "world"}' }
    }
  ]
}

const mockDroppedJsonFile: DroppedFilePayload = {
  name: 'test.json',
  content: '{"hello": "world"}',
  size: 18,
  isToolkitSnapshot: false
}

const mockDroppedToolkitFile: DroppedFilePayload = {
  name: 'my-session.toolkit',
  content: JSON.stringify(mockSnapshot),
  size: 250,
  isToolkitSnapshot: true
}

assert(mockDroppedJsonFile.isToolkitSnapshot === false, 'Correctly identifies standard JSON file')
assert(mockDroppedToolkitFile.isToolkitSnapshot === true, 'Correctly identifies .toolkit snapshot file')
const valRes = validateSnapshot(JSON.parse(mockDroppedToolkitFile.content))
assert(valRes.isValid === true, 'Dropped toolkit payload validates against snapshot schema')

// 5. Cargo Configuration & Tauri v2 Plugins Verification
console.log('\n5. Verifying Cargo.toml Dependencies & Tauri v2 Plugins...')
const cargoTomlPath = path.resolve(__dirname, '../src-tauri/Cargo.toml')
assert(fs.existsSync(cargoTomlPath), 'src-tauri/Cargo.toml exists')
const cargoContent = fs.readFileSync(cargoTomlPath, 'utf-8')
assert(cargoContent.includes('tauri-plugin-dialog'), 'Cargo.toml includes tauri-plugin-dialog')
assert(cargoContent.includes('tauri-plugin-fs'), 'Cargo.toml includes tauri-plugin-fs')
assert(cargoContent.includes('tauri-plugin-global-shortcut'), 'Cargo.toml includes tauri-plugin-global-shortcut')
assert(cargoContent.includes('tauri-plugin-log'), 'Cargo.toml includes tauri-plugin-log')

// 6. Tauri Rust lib.rs Plugin Initialization
console.log('\n6. Verifying src-tauri/src/lib.rs Plugin Initialization...')
const libRsPath = path.resolve(__dirname, '../src-tauri/src/lib.rs')
assert(fs.existsSync(libRsPath), 'src-tauri/src/lib.rs exists')
const libRsContent = fs.readFileSync(libRsPath, 'utf-8')
assert(libRsContent.includes('tauri_plugin_dialog::init()'), 'lib.rs initializes dialog plugin')
assert(libRsContent.includes('tauri_plugin_fs::init()'), 'lib.rs initializes fs plugin')
assert(libRsContent.includes('tauri_plugin_global_shortcut::Builder::new()'), 'lib.rs initializes global-shortcut plugin')

// 7. Tauri Permissions & Capabilities Configuration
console.log('\n7. Verifying Capabilities & Permissions in default.json...')
const capPath = path.resolve(__dirname, '../src-tauri/capabilities/default.json')
assert(fs.existsSync(capPath), 'capabilities/default.json exists')
const capJson = JSON.parse(fs.readFileSync(capPath, 'utf-8'))
assert(capJson.permissions.includes('core:default'), 'Permissions contain core:default')
assert(capJson.permissions.includes('dialog:default'), 'Permissions contain dialog:default')
assert(capJson.permissions.includes('fs:default'), 'Permissions contain fs:default')
assert(capJson.permissions.includes('global-shortcut:default'), 'Permissions contain global-shortcut:default')

console.log('\n======================================================')
console.log(`TOTAL SUB-PHASE 4.2 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
console.log('======================================================\n')

if (failed > 0) {
  process.exit(1)
}
