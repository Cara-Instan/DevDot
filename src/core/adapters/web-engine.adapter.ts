import type {
  ExecutionPayload,
  ExecutionResult,
  IExecutionEngine
} from '../types/execution'
import { WorkerPool } from '../workers/worker-pool'
import { dispatchTask } from '../workers/task-router'

export interface WebEngineAdapterOptions {
  poolSize?: number
  enableFallback?: boolean
}

export class WebEngineAdapter implements IExecutionEngine {
  public readonly name = 'web-worker'
  private pool: WorkerPool | null = null
  private enableFallback: boolean

  constructor(options: WebEngineAdapterOptions = {}) {
    this.enableFallback = options.enableFallback ?? true

    if (typeof Worker !== 'undefined') {
      try {
        this.pool = new WorkerPool({ poolSize: options.poolSize })
      } catch (err) {
        console.warn('[WebEngineAdapter] Failed to initialize WorkerPool, falling back to main-thread execution:', err)
      }
    }
  }

  public get isAvailable(): boolean {
    return true
  }

  public async execute<T = any, R = any>(
    payload: ExecutionPayload<T>
  ): Promise<ExecutionResult<R>> {
    // If worker pool is active, delegate to worker thread
    if (this.pool) {
      try {
        return await this.pool.postTask<T, R>(payload)
      } catch (workerErr: any) {
        if (!this.enableFallback) {
          return {
            id: payload.id,
            success: false,
            error: workerErr?.message || 'Worker execution failed',
            executionTimeMs: 0
          }
        }
        console.warn('[WebEngineAdapter] Worker error, executing via fallback on main thread:', workerErr)
      }
    }

    // Main thread execution fallback
    const startTime = performance.now()
    try {
      const result = await dispatchTask<T, R>(payload)
      const executionTimeMs = performance.now() - startTime

      return {
        id: payload.id,
        success: true,
        result,
        executionTimeMs: Math.round(executionTimeMs * 100) / 100
      }
    } catch (error: any) {
      const executionTimeMs = performance.now() - startTime
      return {
        id: payload.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Math.round(executionTimeMs * 100) / 100
      }
    }
  }

  public terminate(): void {
    if (this.pool) {
      this.pool.terminate()
      this.pool = null
    }
  }

  public getPoolStats() {
    return this.pool ? this.pool.getStats() : null
  }
}
