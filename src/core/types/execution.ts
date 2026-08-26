export interface ExecutionPayload<T = any> {
  id?: string
  tool: string
  action: string
  data: T
  options?: Record<string, any>
}

export interface ExecutionResult<R = any> {
  id?: string
  success: boolean
  result?: R
  error?: string
  executionTimeMs: number
}

export interface IExecutionEngine {
  readonly name: string
  readonly isAvailable: boolean
  execute<T = any, R = any>(payload: ExecutionPayload<T>): Promise<ExecutionResult<R>>
  terminate?(): void
}

export type TaskHandler<T = any, R = any> = (
  data: T,
  options?: Record<string, any>
) => Promise<R> | R

export interface WorkerTaskMessage<T = any> {
  type: 'EXECUTE'
  payload: ExecutionPayload<T>
}

export interface WorkerResponseMessage<R = any> {
  type: 'EXECUTION_RESULT'
  result: ExecutionResult<R>
}
