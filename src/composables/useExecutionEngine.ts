import { ref, computed } from 'vue'
import type { ExecutionPayload, ExecutionResult, IExecutionEngine } from '@/core/types'
import { getDefaultExecutionEngine, isTauri } from '@/core/adapters'

export interface UseExecutionEngineOptions {
  engine?: IExecutionEngine
}

export function useExecutionEngine(options: UseExecutionEngineOptions = {}) {
  const engine = options.engine || getDefaultExecutionEngine()
  const isExecuting = ref(false)
  const lastResult = ref<ExecutionResult | null>(null)
  const error = ref<string | null>(null)
  const platform = computed(() => (isTauri() ? 'tauri' : 'web'))

  async function executePayload<T = any, R = any>(
    payload: ExecutionPayload<T>
  ): Promise<ExecutionResult<R>> {
    isExecuting.value = true
    error.value = null

    try {
      const res = await engine.execute<T, R>(payload)
      lastResult.value = res

      if (!res.success) {
        error.value = res.error || 'Execution failed'
      }

      return res
    } catch (err: any) {
      const executionError = err instanceof Error ? err.message : String(err)
      error.value = executionError

      const failResult: ExecutionResult<R> = {
        id: payload.id,
        success: false,
        error: executionError,
        executionTimeMs: 0
      }
      lastResult.value = failResult
      return failResult
    } finally {
      isExecuting.value = false
    }
  }

  async function execute<T = any, R = any>(
    tool: string,
    action: string,
    data: T,
    options?: Record<string, any>
  ): Promise<ExecutionResult<R>> {
    return executePayload<T, R>({
      tool,
      action,
      data,
      options
    })
  }

  return {
    engine,
    platform,
    isExecuting,
    lastResult,
    error,
    execute,
    executePayload
  }
}
