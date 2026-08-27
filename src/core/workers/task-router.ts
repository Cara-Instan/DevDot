import type { ExecutionPayload } from '../types/execution'
import {
  getTaskHandler,
  hasTaskHandler,
  registerTaskHandler,
  unregisterTaskHandler
} from './task-registry'

// Re-export registry functions for backward compatibility
export {
  registerTaskHandler,
  unregisterTaskHandler,
  hasTaskHandler
}

// Import all module handlers to ensure they are registered
import '../../modules/json/handlers/json-handlers'
import '../../modules/encoders/handlers/encoders-handlers'
import '../../modules/crypto/handlers/crypto-handlers'
import '../../modules/converters/handlers/converters-handlers'
import '../../modules/redactor/handlers/redactor-handlers'

/**
 * Dispatches and executes the appropriate task handler
 */
export async function dispatchTask<T = any, R = any>(
  payload: ExecutionPayload<T>
): Promise<R> {
  const { tool, action, data, options } = payload
  const handler = getTaskHandler(tool, action)

  if (!handler) {
    throw new Error(`[ExecutionEngine] No handler registered for task '${tool}:${action}'`)
  }

  return (await handler(data, options)) as R
}

// ==========================================
// Built-in System Handlers for Engine Testing & Health
// ==========================================

registerTaskHandler('system', 'ping', async () => {
  return {
    pong: true,
    timestamp: Date.now(),
    thread: typeof window !== 'undefined' ? 'main' : 'worker'
  }
})

registerTaskHandler('system', 'echo', async (data) => {
  return data
})

registerTaskHandler('system', 'benchmark', async (data: { count?: number } = {}) => {
  const count = data.count || 200000
  let primesFound = 0
  
  // Simple CPU-bound prime finder for benchmark testing worker offloading
  for (let i = 2; i <= count; i++) {
    let isPrime = true
    const sqrt = Math.sqrt(i)
    for (let j = 2; j <= sqrt; j++) {
      if (i % j === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) primesFound++
  }

  return {
    processedCount: count,
    primesFound,
    thread: typeof window !== 'undefined' ? 'main' : 'worker'
  }
})
