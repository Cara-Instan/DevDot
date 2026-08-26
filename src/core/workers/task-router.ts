import type { ExecutionPayload, TaskHandler } from '../types/execution'

const handlerRegistry = new Map<string, TaskHandler>()

function getHandlerKey(tool: string, action: string): string {
  return `${tool.trim().toLowerCase()}:${action.trim().toLowerCase()}`
}

/**
 * Register a task handler for a specific tool and action
 */
export function registerTaskHandler<T = any, R = any>(
  tool: string,
  action: string,
  handler: TaskHandler<T, R>
): void {
  const key = getHandlerKey(tool, action)
  handlerRegistry.set(key, handler)
}

/**
 * Unregister a task handler
 */
export function unregisterTaskHandler(tool: string, action: string): boolean {
  const key = getHandlerKey(tool, action)
  return handlerRegistry.delete(key)
}

/**
 * Check if a task handler is registered
 */
export function hasTaskHandler(tool: string, action: string): boolean {
  return handlerRegistry.has(getHandlerKey(tool, action))
}

/**
 * Dispatches and executes the appropriate task handler
 */
export async function dispatchTask<T = any, R = any>(
  payload: ExecutionPayload<T>
): Promise<R> {
  const { tool, action, data, options } = payload
  const key = getHandlerKey(tool, action)
  const handler = handlerRegistry.get(key)

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
