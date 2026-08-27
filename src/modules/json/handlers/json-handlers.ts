import { registerTaskHandler } from '../../../core/workers/task-registry'
import { formatJson } from '../services/json-formatter'
import { repairJson, safeParseJson, parseJsonError } from '../services/json-parser'
import { generateTypesFromJson } from '../services/type-generators'
import { computeJsonDiff } from '../services/json-diff'
import type {
  JsonDiffOptions,
  JsonDiffResult,
  JsonFormatOptions,
  JsonFormatResult,
  JsonRepairResult,
  TypeGeneratorPayload,
  TypeGeneratorResult
} from '../types'

/**
 * Register all JSON Suite Worker Handlers
 */
export function registerJsonTaskHandlers(): void {
  // Format / Prettify / Minify JSON
  registerTaskHandler<
    { input: string; options?: JsonFormatOptions } | string,
    JsonFormatResult
  >('json', 'format', async (data, options) => {
    let input = ''
    let formatOptions: JsonFormatOptions = options || {}

    if (typeof data === 'string') {
      input = data
    } else if (data && typeof data === 'object') {
      input = data.input || ''
      formatOptions = { ...data.options, ...options }
    }

    return formatJson(input, formatOptions)
  })

  // Dedicated Minify Action
  registerTaskHandler<
    { input: string } | string,
    JsonFormatResult
  >('json', 'minify', async (data) => {
    const input = typeof data === 'string' ? data : data?.input || ''
    return formatJson(input, { minify: true, autoRepair: true })
  })

  // Dedicated Repair Action
  registerTaskHandler<
    { input: string } | string,
    JsonRepairResult
  >('json', 'repair', async (data) => {
    const input = typeof data === 'string' ? data : data?.input || ''
    return repairJson(input)
  })

  // Validate JSON Action
  registerTaskHandler<
    { input: string } | string,
    { isValid: boolean; error?: string; line?: number; column?: number }
  >('json', 'validate', async (data) => {
    const input = typeof data === 'string' ? data : data?.input || ''
    try {
      safeParseJson(input, { autoRepair: false })
      return { isValid: true }
    } catch (err: any) {
      const loc = parseJsonError(err, input)
      return {
        isValid: false,
        error: loc.message,
        line: loc.line,
        column: loc.column
      }
    }
  })

  // Generate Types (TypeScript / Go / Rust / JSON Schema)
  registerTaskHandler<
    TypeGeneratorPayload,
    TypeGeneratorResult
  >('json', 'generate-types', async (payload) => {
    return generateTypesFromJson(payload)
  })

  // Visual Diff JSON Action
  registerTaskHandler<
    { left: string; right: string; options?: JsonDiffOptions },
    JsonDiffResult
  >('json', 'diff', async (data) => {
    const left = data?.left || ''
    const right = data?.right || ''
    const options = data?.options || {}
    return computeJsonDiff(left, right, options)
  })
}

// Auto-register handlers when this file is imported
registerJsonTaskHandlers()

