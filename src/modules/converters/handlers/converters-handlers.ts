import { registerTaskHandler } from '../../../core/workers/task-registry'
import { transpileData } from '../services/transpiler-service'
import { convertCurlCommand, parseCurlCommand } from '../services/curl-parser-service'
import type {
  DataFormat,
  TranspileOptions,
  TranspileResult,
  CurlConvertOptions,
  CurlConvertResult,
  ParsedCurlRequest
} from '../types'

/**
 * Register all Converters & Transpilers Worker Handlers
 */
export function registerConvertersTaskHandlers(): void {
  // Multi-Format Data Transpiler (JSON, YAML, TOML, CSV)
  registerTaskHandler<
    {
      input: string
      sourceFormat: DataFormat
      targetFormat: DataFormat
      options?: TranspileOptions
    },
    TranspileResult
  >('converters', 'transpile', async (payload) => {
    const { input, sourceFormat, targetFormat, options = {} } = payload
    return transpileData(input, sourceFormat, targetFormat, options)
  })

  // cURL to Code Generator (Fetch, Axios, Python, Go)
  registerTaskHandler<
    {
      command: string
      options: CurlConvertOptions
    },
    CurlConvertResult
  >('converters', 'curl-convert', async (payload) => {
    const { command, options } = payload
    return convertCurlCommand(command, options)
  })

  // cURL Inspect / Parse only
  registerTaskHandler<{ command: string }, ParsedCurlRequest>(
    'converters',
    'curl-parse',
    async (payload) => {
      return parseCurlCommand(payload.command)
    }
  )
}

// Auto-register handlers on module load
registerConvertersTaskHandlers()
