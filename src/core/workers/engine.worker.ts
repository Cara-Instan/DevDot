import type { WorkerTaskMessage, WorkerResponseMessage } from '../types/execution'
import { dispatchTask } from './task-router'

// Listen for incoming execution requests
self.addEventListener('message', async (event: MessageEvent<WorkerTaskMessage>) => {
  const { type, payload } = event.data

  if (type !== 'EXECUTE' || !payload) {
    return
  }

  const startTime = performance.now()
  const { id } = payload

  try {
    const result = await dispatchTask(payload)
    const executionTimeMs = performance.now() - startTime

    const response: WorkerResponseMessage = {
      type: 'EXECUTION_RESULT',
      result: {
        id,
        success: true,
        result,
        executionTimeMs: Math.round(executionTimeMs * 100) / 100
      }
    }

    self.postMessage(response)
  } catch (error: any) {
    const executionTimeMs = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    const response: WorkerResponseMessage = {
      type: 'EXECUTION_RESULT',
      result: {
        id,
        success: false,
        error: errorMessage,
        executionTimeMs: Math.round(executionTimeMs * 100) / 100
      }
    }

    self.postMessage(response)
  }
})
