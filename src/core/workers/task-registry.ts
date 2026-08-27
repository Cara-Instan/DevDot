import type { TaskHandler } from '../types/execution'

const handlerRegistry = new Map<string, TaskHandler>()

export function getHandlerKey(tool: string, action: string): string {
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
 * Retrieve a registered task handler
 */
export function getTaskHandler(tool: string, action: string): TaskHandler | undefined {
  return handlerRegistry.get(getHandlerKey(tool, action))
}
