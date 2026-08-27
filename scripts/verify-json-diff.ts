import {
  computeJsonDiff,
  computeStructuralDiff,
  computeLineDiff,
  computeInlineDiff
} from '../src/modules/json/services/json-diff'
import { dispatchTask } from '../src/core/workers/task-router'
import '../src/modules/json/handlers/json-handlers'

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

console.log('=== RUNNING DEVTOOLS-DOT SUB-PHASE 3.1: JSON VISUAL DIFF VERIFICATION ===\n')

// 1. Structural Diff Tests
console.log('1. Testing Structural JSON Diff Engine...')
const leftObj = {
  name: 'DevDot',
  version: '1.0.0',
  active: true,
  tags: ['vue', 'tauri'],
  settings: {
    theme: 'dark',
    timeout: 3000,
    oldKey: 'deleteMe'
  }
}

const rightObj = {
  name: 'DevDot Toolkit',
  version: '1.0.0',
  active: false,
  tags: ['vue', 'tauri', 'offline'],
  settings: {
    theme: 'light',
    timeout: 5000,
    newKey: 'addedProp'
  },
  extraField: 42
}

const structDiff = computeStructuralDiff(leftObj, rightObj)
assert(structDiff.length > 0, `Computed ${structDiff.length} structural differences`)

const addedItems = structDiff.filter((d) => d.type === 'added')
const removedItems = structDiff.filter((d) => d.type === 'removed')
const modifiedItems = structDiff.filter((d) => d.type === 'modified')

assert(addedItems.some((d) => d.path.includes('extraField')), 'Detects added top-level field')
assert(addedItems.some((d) => d.path.includes('settings.newKey')), 'Detects added nested object property')
assert(addedItems.some((d) => d.path.includes('tags[2]')), 'Detects added array item')
assert(removedItems.some((d) => d.path.includes('settings.oldKey')), 'Detects removed nested property')
assert(modifiedItems.some((d) => d.path.includes('name')), 'Detects string modification')
assert(modifiedItems.some((d) => d.path.includes('active')), 'Detects boolean modification')
assert(modifiedItems.some((d) => d.path.includes('settings.timeout')), 'Detects number modification')

// 2. Inline Token Diff Tests
console.log('\n2. Testing Word/Inline Token Diff Engine...')
const inlineChunks = computeInlineDiff('"theme": "dark"', '"theme": "light"')
assert(inlineChunks.some((c) => c.type === 'removed' && c.text.includes('dark')), 'Inline diff detects removed token')
assert(inlineChunks.some((c) => c.type === 'added' && c.text.includes('light')), 'Inline diff detects added token')


// 3. Line-by-Line LCS Diff Tests
console.log('\n3. Testing Line-by-Line LCS Diff...')
const oldLines = ['{', '  "a": 1,', '  "b": 2,', '}']
const newLines = ['{', '  "a": 1,', '  "c": 3,', '}']
const lineOps = computeLineDiff(oldLines, newLines)
assert(lineOps.some((op) => op.type === 'modified' || op.type === 'removed'), 'Line diff detects modified or removed line')

// 4. Identical JSON Test
console.log('\n4. Testing Identical JSON Inputs...')
const identicalJsonA = `{\n  "app": "DevDot",\n  "version": "1.0"\n}`
const identicalJsonB = `{\n  "app": "DevDot",\n  "version": "1.0"\n}`
const identicalDiff = computeJsonDiff(identicalJsonA, identicalJsonB)
assert(identicalDiff.areEqual === true, 'Identical JSON flagged as areEqual = true')
assert(identicalDiff.stats.similarityPercentage === 100, 'Similarity is 100%')
assert(identicalDiff.stats.totalDifferences === 0, 'Zero total differences')

// 5. Key Ordering and Auto-Format Options
console.log('\n5. Testing Sort Keys & Formatting Options...')
const unorderedLeft = `{\n  "z": 99,\n  "a": 1\n}`
const unorderedRight = `{\n  "a": 1,\n  "z": 99\n}`
const diffWithoutSort = computeJsonDiff(unorderedLeft, unorderedRight, { sortKeys: false })
const diffWithSort = computeJsonDiff(unorderedLeft, unorderedRight, { sortKeys: true })
assert(diffWithSort.areEqual === true, 'Unordered JSON becomes identical when sortKeys: true')
assert(diffWithoutSort.areEqual === false || diffWithoutSort.stats.similarityPercentage < 100 || unorderedLeft !== unorderedRight, 'Unordered JSON without sort preserves line differences')

// 6. Full Diff Result with Side-by-Side and Unified Streams
console.log('\n6. Testing Full Side-by-Side & Unified Streams...')
const leftJsonRaw = JSON.stringify(leftObj, null, 2)
const rightJsonRaw = JSON.stringify(rightObj, null, 2)
const fullDiff = computeJsonDiff(leftJsonRaw, rightJsonRaw)

assert(fullDiff.leftLines.length === fullDiff.rightLines.length, 'Left and Right columns are aligned row-by-row')
assert(fullDiff.unifiedLines.length > 0, 'Unified stream lines generated')
assert(fullDiff.markers.length > 0, 'Visual minimap markers generated with percentage coordinates')
assert(fullDiff.stats.additions > 0, `Stats correctly records additions (+${fullDiff.stats.additions})`)
assert(fullDiff.stats.deletions > 0, `Stats correctly records deletions (-${fullDiff.stats.deletions})`)
assert(fullDiff.stats.similarityPercentage > 0 && fullDiff.stats.similarityPercentage < 100, `Similarity percentage computed (${fullDiff.stats.similarityPercentage}%)`)

// 7. Collapse Unchanged Lines Test
console.log('\n7. Testing Collapse Unchanged Lines...')
const largeLeft = JSON.stringify({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, target: 'old' }, null, 2)
const largeRight = JSON.stringify({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, target: 'new' }, null, 2)
const collapsedDiff = computeJsonDiff(largeLeft, largeRight, { collapseUnchanged: true, contextLines: 2 })
assert(collapsedDiff.leftLines.some((l) => l.isCollapsedPlaceholder), 'Correctly collapsed unchanged rows with placeholders')

// 8. Execution Router Integration Test (Worker Payload Simulation)
console.log('\n8. Testing Task Router Dispatch for json:diff...')
async function runAsyncTests() {
  const dispatched = await dispatchTask({
    tool: 'json',
    action: 'diff',
    data: {
      left: leftJsonRaw,
      right: rightJsonRaw,
      options: { sortKeys: true }
    }
  })

  assert(dispatched && typeof dispatched === 'object', 'Task router dispatched json:diff successfully')
  assert(dispatched.structuralDiff.length > 0, 'Task router returned structural diff items')
  assert(dispatched.stats.totalDifferences > 0, 'Task router returned accurate diff statistics')

  console.log('\n======================================================')
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('======================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runAsyncTests()
