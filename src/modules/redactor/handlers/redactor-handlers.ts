import { registerTaskHandler } from '../../../core/workers/task-registry'
import { redactPii, analyzePii } from '../services/pii-redactor-service'
import type { PiiRedactOptions, PiiRedactResult, PiiAnalyzeResult } from '../types'

/**
 * Register all PII Redactor & Sanitizer Worker Handlers
 */
export function registerRedactorTaskHandlers(): void {
  // Redact & Sanitize text
  registerTaskHandler<
    {
      input: string
      options?: PiiRedactOptions
    },
    PiiRedactResult
  >('redactor', 'redact', async (payload) => {
    const { input, options = {} } = payload
    return redactPii(input, options)
  })

  // Analyze PII presence without modifying text
  registerTaskHandler<
    {
      input: string
      options?: PiiRedactOptions
    },
    PiiAnalyzeResult
  >('redactor', 'analyze', async (payload) => {
    const { input, options = {} } = payload
    return analyzePii(input, options)
  })
}

// Auto-register handlers on module load
registerRedactorTaskHandlers()
