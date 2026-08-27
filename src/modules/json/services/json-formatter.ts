import type { JsonFormatOptions, JsonFormatResult, JsonStats, SortKeysOrder } from '../types'
import { safeParseJson, parseJsonError } from './json-parser'

/**
 * Calculates detailed structural statistics for a JSON object
 */
export function calculateJsonStats(
  data: any,
  originalText: string,
  formattedText: string
): JsonStats {
  const originalSizeBytes = new Blob([originalText]).size
  const formattedSizeBytes = new Blob([formattedText]).size
  const byteSavingsBytes = Math.max(0, originalSizeBytes - formattedSizeBytes)
  const byteSavingsPercent =
    originalSizeBytes > 0
      ? Math.round(((originalSizeBytes - formattedSizeBytes) / originalSizeBytes) * 1000) / 10
      : 0

  const linesCount = formattedText.split('\n').length

  let keysCount = 0
  let arraysCount = 0
  let objectsCount = 0
  let maxDepth = 0

  function traverse(node: any, depth: number) {
    if (depth > maxDepth) maxDepth = depth

    if (node === null || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      arraysCount++
      for (const item of node) {
        traverse(item, depth + 1)
      }
    } else {
      objectsCount++
      const keys = Object.keys(node)
      keysCount += keys.length
      for (const key of keys) {
        traverse(node[key], depth + 1)
      }
    }
  }

  traverse(data, 1)

  let dataType: 'object' | 'array' | 'primitive' = 'primitive'
  if (Array.isArray(data)) {
    dataType = 'array'
  } else if (data !== null && typeof data === 'object') {
    dataType = 'object'
  }

  return {
    originalSizeBytes,
    formattedSizeBytes,
    byteSavingsBytes,
    byteSavingsPercent,
    linesCount,
    keysCount,
    arraysCount,
    objectsCount,
    maxDepth,
    dataType
  }
}

/**
 * Recursively sort object keys
 */
export function sortObjectKeys(obj: any, order: SortKeysOrder): any {
  if (order === 'none' || obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectKeys(item, order))
  }

  const sortedKeys = Object.keys(obj).sort((a, b) => {
    if (order === 'asc') return a.localeCompare(b)
    return b.localeCompare(a)
  })

  const sortedObj: Record<string, any> = {}
  for (const key of sortedKeys) {
    sortedObj[key] = sortObjectKeys(obj[key], order)
  }

  return sortedObj
}

/**
 * Formats or minifies a JSON string with options
 */
export function formatJson(
  input: string,
  options: JsonFormatOptions = {}
): JsonFormatResult {
  const {
    indentType = '2-spaces',
    customIndentSize = 2,
    minify = false,
    sortKeys = 'none',
    autoRepair = true
  } = options

  if (!input || !input.trim()) {
    const emptyStats: JsonStats = {
      originalSizeBytes: 0,
      formattedSizeBytes: 0,
      byteSavingsBytes: 0,
      byteSavingsPercent: 0,
      linesCount: 0,
      keysCount: 0,
      arraysCount: 0,
      objectsCount: 0,
      maxDepth: 0,
      dataType: 'primitive'
    }

    return {
      formatted: '',
      repaired: false,
      repairs: [],
      stats: emptyStats,
      isValid: true
    }
  }

  try {
    const { data, wasRepaired, repairs } = safeParseJson(input, { autoRepair })

    // Process key sorting if requested
    const processedData = sortKeys !== 'none' ? sortObjectKeys(data, sortKeys) : data

    // Determine indentation string
    let indentString: string | number = 2
    if (minify) {
      indentString = ''
    } else {
      switch (indentType) {
        case '2-spaces':
          indentString = 2
          break
        case '4-spaces':
          indentString = 4
          break
        case 'tab':
          indentString = '\t'
          break
        case 'custom':
          indentString = Math.max(1, Math.min(10, customIndentSize))
          break
      }
    }

    const formatted = minify
      ? JSON.stringify(processedData)
      : JSON.stringify(processedData, null, indentString)

    const stats = calculateJsonStats(processedData, input, formatted)

    return {
      formatted,
      repaired: wasRepaired,
      repairs,
      stats,
      isValid: true
    }
  } catch (err: any) {
    const errorLocation = parseJsonError(err, input)
    const emptyStats: JsonStats = {
      originalSizeBytes: new Blob([input]).size,
      formattedSizeBytes: 0,
      byteSavingsBytes: 0,
      byteSavingsPercent: 0,
      linesCount: input.split('\n').length,
      keysCount: 0,
      arraysCount: 0,
      objectsCount: 0,
      maxDepth: 0,
      dataType: 'primitive'
    }

    return {
      formatted: input,
      repaired: false,
      repairs: [],
      stats: emptyStats,
      isValid: false,
      error: errorLocation.message,
      errorLocation: {
        line: errorLocation.line,
        column: errorLocation.column
      }
    }
  }
}
