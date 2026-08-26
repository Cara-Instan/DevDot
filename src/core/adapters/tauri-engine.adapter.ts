import type {
  ExecutionPayload,
  ExecutionResult,
  IExecutionEngine
} from '../types/execution'
import { isTauri } from './platform'
import { WebEngineAdapter } from './web-engine.adapter'

export interface TauriEngineAdapterOptions {
  fallbackToWebWorker?: boolean
}

export class TauriEngineAdapter implements IExecutionEngine {
  public readonly name = 'tauri-ipc'
  private fallbackAdapter: WebEngineAdapter | null = null
  private fallbackToWebWorker: boolean

  constructor(options: TauriEngineAdapterOptions = {}) {
    this.fallbackToWebWorker = options.fallbackToWebWorker ?? true
    if (this.fallbackToWebWorker) {
      this.fallbackAdapter = new WebEngineAdapter()
    }
  }

  public get isAvailable(): boolean {
    return isTauri()
  }

  public async execute<T = any, R = any>(
    payload: ExecutionPayload<T>
  ): Promise<ExecutionResult<R>> {
    const startTime = performance.now()

    // If running inside Tauri desktop app
    if (this.isAvailable) {
      try {
        // Dynamically import Tauri core to avoid bundler issues in standard web environment
        const { invoke } = await import('@tauri-apps/api/core')
        
        const result = await invoke<R>('execute_task', { payload })
        const executionTimeMs = performance.now() - startTime

        return {
          id: payload.id,
          success: true,
          result,
          executionTimeMs: Math.round(executionTimeMs * 100) / 100
        }
      } catch (err: any) {
        // If Rust backend command 'execute_task' is not yet implemented or fails,
        // log notice and seamlessly fall back to Web Worker adapter if allowed.
        console.warn(
          '[TauriEngineAdapter] Tauri IPC command failed or not yet implemented in Rust backend. Delegating to Worker fallback.',
          err
        )

        if (this.fallbackAdapter) {
          return this.fallbackAdapter.execute<T, R>(payload)
        }

        const executionTimeMs = performance.now() - startTime
        return {
          id: payload.id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          executionTimeMs: Math.round(executionTimeMs * 100) / 100
        }
      }
    }

    // Not in Tauri environment -> fallback to Web Worker
    if (this.fallbackAdapter) {
      return this.fallbackAdapter.execute<T, R>(payload)
    }

    const executionTimeMs = performance.now() - startTime
    return {
      id: payload.id,
      success: false,
      error: 'Tauri native environment is not available',
      executionTimeMs: Math.round(executionTimeMs * 100) / 100
    }
  }

  public terminate(): void {
    if (this.fallbackAdapter) {
      this.fallbackAdapter.terminate()
      this.fallbackAdapter = null
    }
  }
}
