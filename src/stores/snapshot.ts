import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToolkitSnapshot {
  app: 'dev-toolkit'
  schemaVersion: '1.0.0'
  createdAt: string
  metadata: {
    title?: string
    description?: string
  }
  activeTabId: string
  tabs: Array<{
    id: string
    toolId: string
    title: string
    state: Record<string, any>
  }>
}

export const useSnapshotStore = defineStore('snapshot', () => {
  const lastExportedAt = ref<string | null>(null)
  const isImporting = ref<boolean>(false)
  const isExporting = ref<boolean>(false)

  function exportSession(customTitle?: string): ToolkitSnapshot {
    isExporting.value = true
    const snapshot: ToolkitSnapshot = {
      app: 'dev-toolkit',
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      metadata: {
        title: customTitle || 'DevDot Work Session',
        description: 'Exported from DevDot Privacy-First Toolkit'
      },
      activeTabId: 'session-main',
      tabs: [
        {
          id: 'session-main',
          toolId: 'system-overview',
          title: 'Main Session',
          state: {
            timestamp: Date.now()
          }
        }
      ]
    }
    lastExportedAt.value = snapshot.createdAt
    isExporting.value = false
    return snapshot
  }

  function downloadSnapshotFile(snapshot: ToolkitSnapshot, filename = 'devdot-session.toolkit') {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', filename)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  function importSession(jsonString: string): { success: boolean; message: string; data?: ToolkitSnapshot } {
    isImporting.value = true
    try {
      const parsed = JSON.parse(jsonString) as ToolkitSnapshot
      if (parsed.app !== 'dev-toolkit' || !parsed.schemaVersion) {
        throw new Error('Invalid .toolkit session format or unsupported schema version.')
      }
      isImporting.value = false
      return {
        success: true,
        message: `Successfully loaded snapshot from ${parsed.createdAt}`,
        data: parsed
      }
    } catch (err: any) {
      isImporting.value = false
      return {
        success: false,
        message: err?.message || 'Failed to parse .toolkit file.'
      }
    }
  }

  return {
    lastExportedAt,
    isImporting,
    isExporting,
    exportSession,
    downloadSnapshotFile,
    importSession
  }
})
