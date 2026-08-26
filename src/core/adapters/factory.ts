import type { IExecutionEngine } from '../types/execution'
import { isTauri } from './platform'
import { WebEngineAdapter } from './web-engine.adapter'
import { TauriEngineAdapter } from './tauri-engine.adapter'

let defaultEngineInstance: IExecutionEngine | null = null

/**
 * Creates an execution engine instance based on desired target
 */
export function createExecutionEngine(
  type: 'web' | 'tauri' | 'auto' = 'auto'
): IExecutionEngine {
  if (type === 'tauri') {
    return new TauriEngineAdapter()
  }

  if (type === 'web') {
    return new WebEngineAdapter()
  }

  // 'auto' mode: Detects platform automatically
  if (isTauri()) {
    return new TauriEngineAdapter()
  }

  return new WebEngineAdapter()
}

/**
 * Returns the global singleton execution engine instance
 */
export function getDefaultExecutionEngine(): IExecutionEngine {
  if (!defaultEngineInstance) {
    defaultEngineInstance = createExecutionEngine('auto')
  }
  return defaultEngineInstance
}

/**
 * Overrides the default global execution engine
 */
export function setDefaultExecutionEngine(engine: IExecutionEngine): void {
  defaultEngineInstance = engine
}
