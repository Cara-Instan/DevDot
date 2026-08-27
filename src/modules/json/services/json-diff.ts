import { safeParseJson } from './json-parser'
import { sortObjectKeys } from './json-formatter'
import type {
  DiffChangeType,
  DiffLine,
  DiffMarker,
  InlineDiffChunk,
  JsonDiffOptions,
  JsonDiffResult,
  JsonDiffStats,
  StructuralDiffItem
} from '../types'

/**
 * Deep structural comparator for JSON values
 */
export function computeStructuralDiff(
  left: any,
  right: any,
  currentPath = 'root'
): StructuralDiffItem[] {
  const items: StructuralDiffItem[] = []

  // Case 1: Identical references or primitive values
  if (left === right) {
    return items
  }

  // Case 2: One is undefined or null while other isn't
  if (left === undefined && right !== undefined) {
    items.push({
      id: `${currentPath}-added-${Date.now()}-${Math.random()}`,
      path: currentPath,
      type: 'added',
      newValue: right,
      newType: getType(right),
      message: `Field added with value: ${formatValuePreview(right)}`
    })
    return items
  }

  if (left !== undefined && right === undefined) {
    items.push({
      id: `${currentPath}-removed-${Date.now()}-${Math.random()}`,
      path: currentPath,
      type: 'removed',
      oldValue: left,
      oldType: getType(left),
      message: `Field removed (previously: ${formatValuePreview(left)})`
    })
    return items
  }

  const leftType = getType(left)
  const rightType = getType(right)

  // Case 3: Type change
  if (leftType !== rightType) {
    items.push({
      id: `${currentPath}-type-changed-${Date.now()}-${Math.random()}`,
      path: currentPath,
      type: 'type_changed',
      oldValue: left,
      newValue: right,
      oldType: leftType,
      newType: rightType,
      message: `Type changed from '${leftType}' to '${rightType}'`
    })
    return items
  }

  // Case 4: Arrays
  if (leftType === 'array' && rightType === 'array') {
    const maxLen = Math.max(left.length, right.length)
    for (let i = 0; i < maxLen; i++) {
      const elemPath = `${currentPath}[${i}]`
      if (i >= left.length) {
        items.push({
          id: `${elemPath}-added`,
          path: elemPath,
          type: 'added',
          newValue: right[i],
          newType: getType(right[i]),
          message: `Array item added at index [${i}]: ${formatValuePreview(right[i])}`
        })
      } else if (i >= right.length) {
        items.push({
          id: `${elemPath}-removed`,
          path: elemPath,
          type: 'removed',
          oldValue: left[i],
          oldType: getType(left[i]),
          message: `Array item removed at index [${i}] (previously: ${formatValuePreview(left[i])})`
        })
      } else {
        items.push(...computeStructuralDiff(left[i], right[i], elemPath))
      }
    }
    return items
  }

  // Case 5: Objects
  if (leftType === 'object' && rightType === 'object') {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    const allKeys = Array.from(new Set([...leftKeys, ...rightKeys]))

    for (const key of allKeys) {
      const childPath = currentPath === 'root' ? key : `${currentPath}.${key}`
      const hasLeft = Object.prototype.hasOwnProperty.call(left, key)
      const hasRight = Object.prototype.hasOwnProperty.call(right, key)

      if (!hasLeft && hasRight) {
        items.push({
          id: `${childPath}-added`,
          path: childPath,
          type: 'added',
          newValue: right[key],
          newType: getType(right[key]),
          message: `Property '${key}' added: ${formatValuePreview(right[key])}`
        })
      } else if (hasLeft && !hasRight) {
        items.push({
          id: `${childPath}-removed`,
          path: childPath,
          type: 'removed',
          oldValue: left[key],
          oldType: getType(left[key]),
          message: `Property '${key}' removed (previously: ${formatValuePreview(left[key])})`
        })
      } else {
        items.push(...computeStructuralDiff(left[key], right[key], childPath))
      }
    }
    return items
  }

  // Case 6: Primitive values modification
  if (left !== right) {
    items.push({
      id: `${currentPath}-modified-${Date.now()}-${Math.random()}`,
      path: currentPath,
      type: 'modified',
      oldValue: left,
      newValue: right,
      oldType: leftType,
      newType: rightType,
      message: `Value modified from '${left}' to '${right}'`
    })
  }

  return items
}

function getType(val: any): string {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (Array.isArray(val)) return 'array'
  return typeof val
}

function formatValuePreview(val: any): string {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (typeof val === 'string') return `"${val.length > 30 ? val.slice(0, 27) + '...' : val}"`
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return `Array(${val.length})`
  if (typeof val === 'object') return `{${Object.keys(val).slice(0, 3).join(', ')}${Object.keys(val).length > 3 ? '...' : ''}}`
  return String(val)
}

/**
 * Compute word/char level inline diffs for modified lines
 */
export function computeInlineDiff(oldText: string, newText: string): InlineDiffChunk[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }]
  }

  const oldTokens = tokenizeText(oldText)
  const newTokens = tokenizeText(newText)

  const lcs = computeTokenLCS(oldTokens, newTokens)
  const chunks: InlineDiffChunk[] = []

  let i = 0
  let j = 0

  for (const match of lcs) {
    // Tokens removed from oldText
    while (i < match.oldIndex) {
      chunks.push({ type: 'removed', text: oldTokens[i] })
      i++
    }
    // Tokens added in newText
    while (j < match.newIndex) {
      chunks.push({ type: 'added', text: newTokens[j] })
      j++
    }
    // Unchanged matching token
    chunks.push({ type: 'unchanged', text: newTokens[match.newIndex] })
    i++
    j++
  }

  while (i < oldTokens.length) {
    chunks.push({ type: 'removed', text: oldTokens[i] })
    i++
  }
  while (j < newTokens.length) {
    chunks.push({ type: 'added', text: newTokens[j] })
    j++
  }

  // Merge consecutive chunks of same type
  return mergeInlineChunks(chunks)
}

function tokenizeText(text: string): string[] {
  // Split into words, punctuation, whitespace chunks
  const tokens: string[] = []
  const regex = /([a-zA-Z0-9_]+|[{}\[\],:"]|\s+|[^\s\w{}\[\],:"]+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0])
  }
  return tokens.length ? tokens : [text]
}

interface TokenMatch {
  oldIndex: number
  newIndex: number
}

function computeTokenLCS(oldTokens: string[], newTokens: string[]): TokenMatch[] {
  const m = oldTokens.length
  const n = newTokens.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const matches: TokenMatch[] = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (oldTokens[i - 1] === newTokens[j - 1]) {
      matches.unshift({ oldIndex: i - 1, newIndex: j - 1 })
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return matches
}

function mergeInlineChunks(chunks: InlineDiffChunk[]): InlineDiffChunk[] {
  if (!chunks.length) return []
  const merged: InlineDiffChunk[] = []
  let current = { ...chunks[0] }

  for (let i = 1; i < chunks.length; i++) {
    if (chunks[i].type === current.type) {
      current.text += chunks[i].text
    } else {
      merged.push(current)
      current = { ...chunks[i] }
    }
  }
  merged.push(current)
  return merged
}

/**
 * Line-level Longest Common Subsequence Diff Engine
 */
export interface RawDiffOp {
  type: DiffChangeType
  oldLine?: string
  newLine?: string
  oldLineNo?: number
  newLineNo?: number
}

export function computeLineDiff(oldLines: string[], newLines: string[]): RawDiffOp[] {
  const m = oldLines.length
  const n = newLines.length

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const ops: RawDiffOp[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({
        type: 'unchanged',
        oldLine: oldLines[i - 1],
        newLine: newLines[j - 1],
        oldLineNo: i,
        newLineNo: j
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({
        type: 'added',
        newLine: newLines[j - 1],
        newLineNo: j
      })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      ops.unshift({
        type: 'removed',
        oldLine: oldLines[i - 1],
        oldLineNo: i
      })
      i--
    }
  }

  // Optimize: Pair consecutive removed + added lines into modified operations where helpful
  const optimizedOps: RawDiffOp[] = []
  let k = 0

  while (k < ops.length) {
    if (
      ops[k].type === 'removed' &&
      k + 1 < ops.length &&
      ops[k + 1].type === 'added'
    ) {
      optimizedOps.push({
        type: 'modified',
        oldLine: ops[k].oldLine,
        newLine: ops[k + 1].newLine,
        oldLineNo: ops[k].oldLineNo,
        newLineNo: ops[k + 1].newLineNo
      })
      k += 2
    } else {
      optimizedOps.push(ops[k])
      k++
    }
  }

  return optimizedOps
}

/**
 * Main JSON Diff Engine function
 */
export function computeJsonDiff(
  leftRaw: string,
  rightRaw: string,
  options: JsonDiffOptions = {}
): JsonDiffResult {
  const {
    sortKeys = false,
    autoFormat = true,
    collapseUnchanged = false,
    contextLines = 3,
    indentSize = 2
  } = options

  let leftFormatted = leftRaw
  let rightFormatted = rightRaw
  let leftValid = true
  let rightValid = true
  let leftError: string | undefined
  let rightError: string | undefined
  let leftParsed: any = null
  let rightParsed: any = null

  // 1. Parse Left JSON
  if (leftRaw.trim()) {
    try {
      leftParsed = safeParseJson(leftRaw, { autoRepair: true })
      if (sortKeys && leftParsed && typeof leftParsed === 'object') {
        leftParsed = sortObjectKeys(leftParsed, 'asc')
      }
      if (autoFormat) {
        leftFormatted = JSON.stringify(leftParsed, null, indentSize)
      }
    } catch (err: any) {
      leftValid = false
      leftError = err.message || 'Invalid JSON in left input'
    }
  } else {
    leftFormatted = ''
    leftParsed = null
  }

  // 2. Parse Right JSON
  if (rightRaw.trim()) {
    try {
      rightParsed = safeParseJson(rightRaw, { autoRepair: true })
      if (sortKeys && rightParsed && typeof rightParsed === 'object') {
        rightParsed = sortObjectKeys(rightParsed, 'asc')
      }
      if (autoFormat) {
        rightFormatted = JSON.stringify(rightParsed, null, indentSize)
      }
    } catch (err: any) {
      rightValid = false
      rightError = err.message || 'Invalid JSON in right input'
    }
  } else {
    rightFormatted = ''
    rightParsed = null
  }

  // 3. Compute Structural Diff if both are valid objects/primitives
  let structuralDiff: StructuralDiffItem[] = []
  if (leftValid && rightValid && (leftParsed !== null || rightParsed !== null)) {
    structuralDiff = computeStructuralDiff(leftParsed, rightParsed)
  }

  // 4. Line Diffing
  const leftLinesRaw = leftFormatted ? leftFormatted.split('\n') : []
  const rightLinesRaw = rightFormatted ? rightFormatted.split('\n') : []
  const rawOps = computeLineDiff(leftLinesRaw, rightLinesRaw)

  // Build aligned side-by-side & unified data structures
  const leftLines: DiffLine[] = []
  const rightLines: DiffLine[] = []
  const unifiedLines: DiffLine[] = []
  const markers: DiffMarker[] = []

  let additions = 0
  let deletions = 0
  let modifications = 0
  let unchanged = 0
  let diffIndex = 0

  let unifiedLineCounter = 1

  rawOps.forEach((op, opIndex) => {
    if (op.type === 'added') {
      additions++
      const rightNo = op.newLineNo!
      const content = op.newLine || ''
      const lineId = `row-${opIndex}`

      leftLines.push({
        id: `${lineId}-l`,
        type: 'unchanged', // empty filler on left
        content: '',
        leftLineNumber: undefined
      })

      rightLines.push({
        id: `${lineId}-r`,
        type: 'added',
        content,
        rightLineNumber: rightNo,
        inlineDiffs: [{ type: 'added', text: content }]
      })

      unifiedLines.push({
        id: `${lineId}-u`,
        type: 'added',
        content: `+ ${content}`,
        rightLineNumber: rightNo,
        unifiedLineNumber: unifiedLineCounter++,
        inlineDiffs: [{ type: 'added', text: content }]
      })

      diffIndex++
      markers.push({
        index: diffIndex,
        lineIndex: opIndex,
        type: 'added',
        percentage: rawOps.length > 0 ? (opIndex / rawOps.length) * 100 : 0,
        label: `Addition at Line ${rightNo}`
      })
    } else if (op.type === 'removed') {
      deletions++
      const leftNo = op.oldLineNo!
      const content = op.oldLine || ''
      const lineId = `row-${opIndex}`

      leftLines.push({
        id: `${lineId}-l`,
        type: 'removed',
        content,
        leftLineNumber: leftNo,
        inlineDiffs: [{ type: 'removed', text: content }]
      })

      rightLines.push({
        id: `${lineId}-r`,
        type: 'unchanged', // empty filler on right
        content: '',
        rightLineNumber: undefined
      })

      unifiedLines.push({
        id: `${lineId}-u`,
        type: 'removed',
        content: `- ${content}`,
        leftLineNumber: leftNo,
        unifiedLineNumber: unifiedLineCounter++,
        inlineDiffs: [{ type: 'removed', text: content }]
      })

      diffIndex++
      markers.push({
        index: diffIndex,
        lineIndex: opIndex,
        type: 'removed',
        percentage: rawOps.length > 0 ? (opIndex / rawOps.length) * 100 : 0,
        label: `Deletion at Line ${leftNo}`
      })
    } else if (op.type === 'modified') {
      modifications++
      const leftNo = op.oldLineNo!
      const rightNo = op.newLineNo!
      const oldContent = op.oldLine || ''
      const newContent = op.newLine || ''
      const lineId = `row-${opIndex}`

      const inlineDiffs = computeInlineDiff(oldContent, newContent)

      leftLines.push({
        id: `${lineId}-l`,
        type: 'modified',
        content: oldContent,
        leftLineNumber: leftNo,
        inlineDiffs: inlineDiffs.filter((d) => d.type !== 'added')
      })

      rightLines.push({
        id: `${lineId}-r`,
        type: 'modified',
        content: newContent,
        rightLineNumber: rightNo,
        inlineDiffs: inlineDiffs.filter((d) => d.type !== 'removed')
      })

      // Unified shows removed line then added line
      unifiedLines.push({
        id: `${lineId}-u-old`,
        type: 'removed',
        content: `- ${oldContent}`,
        leftLineNumber: leftNo,
        unifiedLineNumber: unifiedLineCounter++,
        inlineDiffs: inlineDiffs.filter((d) => d.type !== 'added')
      })

      unifiedLines.push({
        id: `${lineId}-u-new`,
        type: 'added',
        content: `+ ${newContent}`,
        rightLineNumber: rightNo,
        unifiedLineNumber: unifiedLineCounter++,
        inlineDiffs: inlineDiffs.filter((d) => d.type !== 'removed')
      })

      diffIndex++
      markers.push({
        index: diffIndex,
        lineIndex: opIndex,
        type: 'modified',
        percentage: rawOps.length > 0 ? (opIndex / rawOps.length) * 100 : 0,
        label: `Modification at Line ${leftNo} -> ${rightNo}`
      })
    } else {
      unchanged++
      const leftNo = op.oldLineNo!
      const rightNo = op.newLineNo!
      const content = op.newLine || op.oldLine || ''
      const lineId = `row-${opIndex}`

      leftLines.push({
        id: `${lineId}-l`,
        type: 'unchanged',
        content,
        leftLineNumber: leftNo
      })

      rightLines.push({
        id: `${lineId}-r`,
        type: 'unchanged',
        content,
        rightLineNumber: rightNo
      })

      unifiedLines.push({
        id: `${lineId}-u`,
        type: 'unchanged',
        content: `  ${content}`,
        leftLineNumber: leftNo,
        rightLineNumber: rightNo,
        unifiedLineNumber: unifiedLineCounter++
      })
    }
  })

  // Handle collapsing unchanged sections if option enabled
  let finalLeftLines = leftLines
  let finalRightLines = rightLines
  let finalUnifiedLines = unifiedLines

  if (collapseUnchanged && contextLines >= 0) {
    const collapsed = applyCollapseUnchanged(leftLines, rightLines, unifiedLines, contextLines)
    finalLeftLines = collapsed.leftLines
    finalRightLines = collapsed.rightLines
    finalUnifiedLines = collapsed.unifiedLines
  }

  // 5. Calculate statistics and similarity percentage
  const totalDifferences = additions + deletions + modifications
  const totalOperations = additions + deletions + modifications + unchanged
  const similarityPercentage =
    totalOperations > 0
      ? Math.max(0, Math.min(100, Math.round(((unchanged * 2) / (leftLinesRaw.length + rightLinesRaw.length || 1)) * 100)))
      : 100

  const stats: JsonDiffStats = {
    additions,
    deletions,
    modifications,
    unchanged,
    totalDifferences,
    similarityPercentage: totalDifferences === 0 && leftValid && rightValid && leftRaw.trim() === rightRaw.trim() ? 100 : similarityPercentage,
    leftLinesCount: leftLinesRaw.length,
    rightLinesCount: rightLinesRaw.length
  }

  const areEqual =
    totalDifferences === 0 &&
    leftValid &&
    rightValid &&
    (leftFormatted.trim() === rightFormatted.trim() ||
      JSON.stringify(leftParsed) === JSON.stringify(rightParsed))

  return {
    areEqual,
    stats,
    leftFormatted,
    rightFormatted,
    leftLines: finalLeftLines,
    rightLines: finalRightLines,
    unifiedLines: finalUnifiedLines,
    structuralDiff,
    markers,
    leftValid,
    rightValid,
    leftError,
    rightError
  }
}

/**
 * Helper to collapse long stretches of unchanged lines
 */
function applyCollapseUnchanged(
  leftLines: DiffLine[],
  rightLines: DiffLine[],
  unifiedLines: DiffLine[],
  context: number
) {
  const n = leftLines.length
  if (n <= context * 2 + 3) {
    return { leftLines, rightLines, unifiedLines }
  }

  // Identify lines that must be kept (changed lines + their context window)
  const keep = new Array(n).fill(false)

  for (let i = 0; i < n; i++) {
    if (leftLines[i].type !== 'unchanged' || rightLines[i].type !== 'unchanged') {
      const start = Math.max(0, i - context)
      const end = Math.min(n - 1, i + context)
      for (let j = start; j <= end; j++) {
        keep[j] = true
      }
    }
  }

  const newLeft: DiffLine[] = []
  const newRight: DiffLine[] = []

  let inCollapsedBlock = false
  let collapsedCount = 0

  for (let i = 0; i < n; i++) {
    if (keep[i]) {
      if (inCollapsedBlock) {
        // Push placeholder
        const placeholderId = `collapse-${i}`
        newLeft.push({
          id: `${placeholderId}-l`,
          type: 'unchanged',
          content: `... (${collapsedCount} unchanged lines collapsed) ...`,
          isCollapsedPlaceholder: true,
          collapsedCount
        })
        newRight.push({
          id: `${placeholderId}-r`,
          type: 'unchanged',
          content: `... (${collapsedCount} unchanged lines collapsed) ...`,
          isCollapsedPlaceholder: true,
          collapsedCount
        })
        inCollapsedBlock = false
        collapsedCount = 0
      }
      newLeft.push(leftLines[i])
      newRight.push(rightLines[i])
    } else {
      inCollapsedBlock = true
      collapsedCount++
    }
  }

  if (inCollapsedBlock) {
    const placeholderId = `collapse-end`
    newLeft.push({
      id: `${placeholderId}-l`,
      type: 'unchanged',
      content: `... (${collapsedCount} unchanged lines collapsed) ...`,
      isCollapsedPlaceholder: true,
      collapsedCount
    })
    newRight.push({
      id: `${placeholderId}-r`,
      type: 'unchanged',
      content: `... (${collapsedCount} unchanged lines collapsed) ...`,
      isCollapsedPlaceholder: true,
      collapsedCount
    })
  }

  return {
    leftLines: newLeft,
    rightLines: newRight,
    unifiedLines
  }
}
