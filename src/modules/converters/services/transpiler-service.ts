import * as YAML from 'yaml'
import * as TOML from 'smol-toml'
import Papa from 'papaparse'
import type { DataFormat, TranspileOptions, TranspileResult } from '../types'

/**
 * Utility to flatten a nested object into dot-notated key-value pairs
 */
export function flattenObject(obj: any, prefix = '', res: Record<string, any> = {}): Record<string, any> {
  if (obj === null || obj === undefined) {
    if (prefix) res[prefix] = obj
    return res
  }

  if (typeof obj !== 'object') {
    if (prefix) res[prefix] = obj
    return res
  }

  if (Array.isArray(obj)) {
    // If array of primitives, join as comma separated
    const allPrimitives = obj.every(
      (item) => typeof item !== 'object' || item === null
    )
    if (allPrimitives) {
      if (prefix) res[prefix] = obj.join('; ')
    } else {
      // Array of objects
      obj.forEach((item, index) => {
        flattenObject(item, prefix ? `${prefix}[${index}]` : `[${index}]`, res)
      })
    }
    return res
  }

  for (const key of Object.keys(obj)) {
    const propName = prefix ? `${prefix}.${key}` : key
    const val = obj[key]

    if (val !== null && typeof val === 'object') {
      flattenObject(val, propName, res)
    } else {
      res[propName] = val
    }
  }

  return res
}

/**
 * Utility to unflatten dot-notated keys back into a nested object
 */
export function unflattenObject(obj: Record<string, any>): any {
  const result: Record<string, any> = {}

  for (const key of Object.keys(obj)) {
    const val = obj[key]
    const parts = key.split('.')
    let current = result

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1

      if (isLast) {
        current[part] = val
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {}
        }
        current = current[part]
      }
    }
  }

  return result
}

/**
 * Parse input string based on source format
 */
export function parseData(input: string, format: DataFormat, options: TranspileOptions = {}): any {
  const trimmed = input.trim()
  if (!trimmed) {
    if (format === 'csv') return []
    return {}
  }

  switch (format) {
    case 'json': {
      try {
        return JSON.parse(trimmed)
      } catch (err: any) {
        throw new Error(`Invalid JSON syntax: ${err.message}`)
      }
    }

    case 'yaml': {
      try {
        const parsed = YAML.parse(trimmed)
        return parsed === null || parsed === undefined ? {} : parsed
      } catch (err: any) {
        throw new Error(`Invalid YAML syntax: ${err.message}`)
      }
    }

    case 'toml': {
      try {
        return TOML.parse(trimmed)
      } catch (err: any) {
        throw new Error(`Invalid TOML syntax: ${err.message}`)
      }
    }

    case 'csv': {
      const parseResult = Papa.parse(trimmed, {
        header: options.csvHeader !== false,
        dynamicTyping: options.csvDynamicTyping !== false,
        skipEmptyLines: true,
        delimiter: options.csvDelimiter || '' // auto-detect if empty
      })

      if (parseResult.errors && parseResult.errors.length > 0) {
        const firstError = parseResult.errors[0]
        if (firstError.type !== 'FieldMismatch') {
          throw new Error(`CSV parsing error on row ${firstError.row}: ${firstError.message}`)
        }
      }

      let data = parseResult.data as any[]

      // If headers were parsed and keys contain dot notation, unflatten them
      if (options.csvHeader !== false && Array.isArray(data)) {
        data = data.map((row) => {
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            const hasDot = Object.keys(row).some((k) => k.includes('.'))
            return hasDot ? unflattenObject(row) : row
          }
          return row
        })
      }

      return data
    }

    default:
      throw new Error(`Unsupported source format: ${format}`)
  }
}

/**
 * Serialize JavaScript data structure into target format
 */
export function serializeData(data: any, format: DataFormat, options: TranspileOptions = {}): string {
  switch (format) {
    case 'json': {
      let indent: string | number = 2
      if (options.jsonIndent === 0) indent = 0
      else if (options.jsonIndent === 4) indent = 4
      else if (options.jsonIndent === 'tab') indent = '\t'
      else if (options.jsonIndent === 2) indent = 2

      return indent === 0 ? JSON.stringify(data) : JSON.stringify(data, null, indent)
    }

    case 'yaml': {
      const yamlIndent = options.yamlIndent || 2
      return YAML.stringify(data, {
        indent: yamlIndent
      })
    }

    case 'toml': {
      // TOML requires top-level to be a dictionary/table (object), not a bare array or primitive
      let tomlData = data
      if (Array.isArray(data)) {
        tomlData = { items: data }
      } else if (typeof data !== 'object' || data === null) {
        tomlData = { value: data }
      }

      try {
        return TOML.stringify(tomlData)
      } catch (err: any) {
        throw new Error(`TOML serialization error: ${err.message}`)
      }
    }

    case 'csv': {
      // CSV expects an array of objects or an array of arrays
      let rows: any[] = []

      if (Array.isArray(data)) {
        if (data.length === 0) {
          return ''
        }
        if (typeof data[0] === 'object' && data[0] !== null) {
          rows = options.flattenNested !== false
            ? data.map((item) => (typeof item === 'object' && item !== null ? flattenObject(item) : { value: item }))
            : data
        } else {
          rows = data.map((item) => ({ value: item }))
        }
      } else if (typeof data === 'object' && data !== null) {
        // Single object -> wrap in 1 row
        rows = [options.flattenNested !== false ? flattenObject(data) : data]
      } else {
        rows = [{ value: data }]
      }

      return Papa.unparse(rows, {
        quotes: options.csvQuotes || false,
        delimiter: options.csvDelimiter || ',',
        header: options.csvHeader !== false,
        newline: '\n'
      })
    }

    default:
      throw new Error(`Unsupported target format: ${format}`)
  }
}

/**
 * Transpile data from source format to target format
 */
export function transpileData(
  input: string,
  sourceFormat: DataFormat,
  targetFormat: DataFormat,
  options: TranspileOptions = {}
): TranspileResult {
  const startTime = performance.now()
  const warnings: string[] = []

  if (!input.trim()) {
    return {
      output: '',
      sourceFormat,
      targetFormat,
      itemCount: 0,
      executionTimeMs: 0
    }
  }

  // 1. Parse data from source format
  const parsed = parseData(input, sourceFormat, options)

  // Warnings / Edge case adjustments
  let itemCount = 1
  if (Array.isArray(parsed)) {
    itemCount = parsed.length
  } else if (typeof parsed === 'object' && parsed !== null) {
    itemCount = Object.keys(parsed).length
  }

  if (targetFormat === 'toml' && Array.isArray(parsed)) {
    warnings.push('TOML top-level root does not support raw arrays; wrapped inside an "items" table.')
  }

  if (sourceFormat !== 'csv' && targetFormat === 'csv' && !Array.isArray(parsed) && typeof parsed === 'object') {
    warnings.push('Hierarchical object converted to a single row CSV with flattened keys.')
  }

  // 2. Serialize data into target format
  const output = serializeData(parsed, targetFormat, options)
  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100

  return {
    output,
    sourceFormat,
    targetFormat,
    itemCount,
    executionTimeMs,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}
