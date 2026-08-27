import type {
  ExecutionPayload,
  ExecutionResult,
  WorkerResponseMessage,
  WorkerTaskMessage
} from '../types/execution'

interface PendingTask {
  payload: ExecutionPayload
  resolve: (result: ExecutionResult) => void
  reject: (reason: any) => void
}

interface WorkerInstance {
  id: number
  worker: Worker
  isBusy: boolean
  activeTaskId: string | null
}

export interface WorkerPoolOptions {
  poolSize?: number
}

/**
 * Deep clones serializable objects while unwrapping Vue reactivity Proxies,
 * preventing DataCloneError when posting messages to Web Workers.
 */
export function deepCloneSerializable<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  // Handle TypedArrays & Binary buffers
  if (value instanceof Uint8Array) {
    return new Uint8Array(value) as unknown as T
  }
  if (value instanceof ArrayBuffer) {
    return value.slice(0) as unknown as T
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    return value.map((item) => deepCloneSerializable(item)) as unknown as T
  }

  // Handle Objects (including Vue reactive proxies)
  const result: Record<string, any> = {}
  for (const [key, val] of Object.entries(value)) {
    result[key] = deepCloneSerializable(val)
  }
  return result as T
}

export class WorkerPool {
  private workers: WorkerInstance[] = []
  private taskQueue: PendingTask[] = []
  private pendingTasks = new Map<string, PendingTask>()
  private maxWorkers: number
  private nextTaskId = 1
  private isTerminated = false

  constructor(options: WorkerPoolOptions = {}) {
    const defaultPoolSize = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? Math.max(1, Math.min(navigator.hardwareConcurrency, 4))
      : 2
    this.maxWorkers = options.poolSize || defaultPoolSize
    this.initializePool()
  }

  private initializePool(): void {
    if (typeof Worker === 'undefined') {
      return
    }

    for (let i = 0; i < this.maxWorkers; i++) {
      this.spawnWorker(i)
    }
  }

  private spawnWorker(workerId: number): WorkerInstance {
    const worker = new Worker(
      new URL('./engine.worker.ts', import.meta.url),
      { type: 'module' }
    )

    const instance: WorkerInstance = {
      id: workerId,
      worker,
      isBusy: false,
      activeTaskId: null
    }

    worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      const { type, result } = event.data
      if (type === 'EXECUTION_RESULT' && result && result.id) {
        this.handleTaskCompleted(instance, result)
      }
    }

    worker.onerror = (error) => {
      console.error(`[WorkerPool] Error in worker #${workerId}:`, error)
      this.handleWorkerError(instance, error)
    }

    this.workers.push(instance)
    return instance
  }

  private handleTaskCompleted(workerInstance: WorkerInstance, result: ExecutionResult): void {
    workerInstance.isBusy = false
    workerInstance.activeTaskId = null

    if (result.id && this.pendingTasks.has(result.id)) {
      const task = this.pendingTasks.get(result.id)!
      this.pendingTasks.delete(result.id)
      task.resolve(result)
    }

    // Process next queued task if available
    this.processQueue()
  }

  private handleWorkerError(workerInstance: WorkerInstance, error: ErrorEvent | any): void {
    // If the worker had an active task, reject it
    if (workerInstance.activeTaskId && this.pendingTasks.has(workerInstance.activeTaskId)) {
      const task = this.pendingTasks.get(workerInstance.activeTaskId)!
      this.pendingTasks.delete(workerInstance.activeTaskId)
      task.resolve({
        id: workerInstance.activeTaskId,
        success: false,
        error: error.message || 'Worker thread encountered a fatal error',
        executionTimeMs: 0
      })
    }

    // Terminate and replace faulty worker
    try {
      workerInstance.worker.terminate()
    } catch {
      // Ignore termination errors
    }

    const index = this.workers.indexOf(workerInstance)
    if (index !== -1) {
      this.workers.splice(index, 1)
      if (!this.isTerminated) {
        this.spawnWorker(workerInstance.id)
      }
    }

    this.processQueue()
  }

  private getIdleWorker(): WorkerInstance | null {
    return this.workers.find((w) => !w.isBusy) || null
  }

  private processQueue(): void {
    if (this.isTerminated || this.taskQueue.length === 0) {
      return
    }

    const idleWorker = this.getIdleWorker()
    if (!idleWorker) {
      return
    }

    const nextTask = this.taskQueue.shift()
    if (!nextTask) {
      return
    }

    this.dispatchToWorker(idleWorker, nextTask)
  }

  private dispatchToWorker(workerInstance: WorkerInstance, task: PendingTask): void {
    const taskId = task.payload.id || `task_${Date.now()}_${this.nextTaskId++}`
    task.payload.id = taskId

    workerInstance.isBusy = true
    workerInstance.activeTaskId = taskId
    this.pendingTasks.set(taskId, task)

    const message: WorkerTaskMessage = {
      type: 'EXECUTE',
      payload: deepCloneSerializable(task.payload)
    }

    workerInstance.worker.postMessage(message)
  }

  /**
   * Post a task to be processed by the worker pool
   */
  public async postTask<T = any, R = any>(
    payload: ExecutionPayload<T>
  ): Promise<ExecutionResult<R>> {
    if (this.isTerminated) {
      return {
        id: payload.id,
        success: false,
        error: 'WorkerPool has been terminated',
        executionTimeMs: 0
      }
    }

    return new Promise<ExecutionResult<R>>((resolve, reject) => {
      const task: PendingTask = {
        payload: deepCloneSerializable(payload),
        resolve: resolve as (result: ExecutionResult) => void,
        reject
      }

      const idleWorker = this.getIdleWorker()
      if (idleWorker) {
        this.dispatchToWorker(idleWorker, task)
      } else {
        this.taskQueue.push(task)
      }
    })
  }

  /**
   * Terminate all workers in the pool
   */
  public terminate(): void {
    this.isTerminated = true

    for (const item of this.pendingTasks.values()) {
      item.resolve({
        id: item.payload.id,
        success: false,
        error: 'WorkerPool terminated while task was pending',
        executionTimeMs: 0
      })
    }
    this.pendingTasks.clear()

    for (const item of this.taskQueue) {
      item.resolve({
        id: item.payload.id,
        success: false,
        error: 'WorkerPool terminated before task could run',
        executionTimeMs: 0
      })
    }
    this.taskQueue = []

    for (const w of this.workers) {
      w.worker.terminate()
    }
    this.workers = []
  }

  /**
   * Get current pool diagnostics
   */
  public getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.isBusy).length,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size
    }
  }
}
