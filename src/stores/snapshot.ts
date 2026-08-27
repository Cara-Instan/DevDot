import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNavigationStore, ALL_TOOLS } from './navigation'

/**
 * Tab session data representation conforming to JSON Schema Draft 2020-12
 */
export interface TabSession {
  id: string
  toolId: string
  title: string
  state: Record<string, any>
}

export interface SnapshotMetadata {
  title?: string
  description?: string
  exportedBy?: string
  appVersion?: string
}

/**
 * Portable Session Snapshot schema v1.0.0 for DevDot (.toolkit)
 */
export interface ToolkitSnapshot {
  $schema?: string
  app: 'dev-toolkit'
  schemaVersion: '1.0.0'
  createdAt: string
  metadata: SnapshotMetadata
  activeTabId: string
  tabs: TabSession[]
}

export interface SnapshotValidationResult {
  isValid: boolean
  errors: string[]
  snapshot?: ToolkitSnapshot
}

/**
 * Validates whether an unknown object conforms to DevDot ToolkitSnapshot v1.0.0 schema.
 */
export function validateSnapshot(data: unknown): SnapshotValidationResult {
  const errors: string[] = []

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      isValid: false,
      errors: ['Invalid root structure: Snapshot payload must be a JSON object.']
    }
  }

  const candidate = data as Record<string, any>

  // Validate app identifier
  if (candidate.app !== 'dev-toolkit') {
    errors.push(`Invalid 'app' field: Expected 'dev-toolkit', got '${candidate.app}'.`)
  }

  // Validate schema version
  if (candidate.schemaVersion !== '1.0.0') {
    errors.push(`Unsupported 'schemaVersion': Expected '1.0.0', got '${candidate.schemaVersion}'.`)
  }

  // Validate createdAt date-time
  if (!candidate.createdAt || typeof candidate.createdAt !== 'string' || isNaN(Date.parse(candidate.createdAt))) {
    errors.push(`Invalid 'createdAt': Expected ISO-8601 date string, got '${candidate.createdAt}'.`)
  }

  // Validate activeTabId
  if (!candidate.activeTabId || typeof candidate.activeTabId !== 'string') {
    errors.push("Missing or invalid 'activeTabId': Expected non-empty string identifier.")
  }

  // Validate tabs array
  if (!candidate.tabs || !Array.isArray(candidate.tabs)) {
    errors.push("Missing or invalid 'tabs': Expected an array of tab sessions.")
  } else if (candidate.tabs.length === 0) {
    errors.push("Invalid 'tabs': Array must contain at least one tab session.")
  } else {
    candidate.tabs.forEach((tab: any, index: number) => {
      if (!tab || typeof tab !== 'object') {
        errors.push(`Tab at index [${index}] is not a valid object.`)
        return
      }
      if (!tab.id || typeof tab.id !== 'string') {
        errors.push(`Tab at index [${index}] missing required string field 'id'.`)
      }
      if (!tab.toolId || typeof tab.toolId !== 'string') {
        errors.push(`Tab at index [${index}] missing required string field 'toolId'.`)
      }
      if (!tab.title || typeof tab.title !== 'string') {
        errors.push(`Tab at index [${index}] missing required string field 'title'.`)
      }
      if (!tab.state || typeof tab.state !== 'object') {
        errors.push(`Tab at index [${index}] missing required object field 'state'.`)
      }
    })
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    }
  }

  return {
    isValid: true,
    errors: [],
    snapshot: candidate as ToolkitSnapshot
  }
}

export const useSnapshotStore = defineStore('snapshot', () => {
  // Reactive tool states indexed by toolId
  const toolStates = ref<Record<string, Record<string, any>>>({})
  const lastExportedAt = ref<string | null>(null)
  const lastImportedAt = ref<string | null>(null)
  const lastImportedSnapshot = ref<ToolkitSnapshot | null>(null)
  const isImporting = ref<boolean>(false)
  const isExporting = ref<boolean>(false)

  /**
   * Set or update state for a specific tool
   */
  function setToolState(toolId: string, state: Record<string, any>) {
    toolStates.value[toolId] = {
      ...(toolStates.value[toolId] || {}),
      ...state
    }
  }

  /**
   * Get registered state for a specific tool
   */
  function getToolState<T = Record<string, any>>(toolId: string): T | undefined
  function getToolState<T = Record<string, any>>(toolId: string, defaultVal: T): T
  function getToolState<T = Record<string, any>>(toolId: string, defaultVal?: T): T | undefined {
    return (toolStates.value[toolId] as T) || defaultVal
  }

  /**
   * Export active session into a valid ToolkitSnapshot JSON structure
   */
  function exportSession(options?: {
    title?: string
    description?: string
    selectedToolIds?: string[]
  }): ToolkitSnapshot {
    isExporting.value = true
    const navStore = useNavigationStore()

    const availableToolIds = Object.keys(toolStates.value)
    const targetToolIds = options?.selectedToolIds && options.selectedToolIds.length > 0
      ? options.selectedToolIds
      : availableToolIds.length > 0
        ? availableToolIds
        : [navStore.activeToolId]

    const tabs: TabSession[] = []

    for (const toolId of targetToolIds) {
      const toolDef = ALL_TOOLS.find((t) => t.id === toolId)
      const title = toolDef ? toolDef.name : toolId
      const state = toolStates.value[toolId] || { active: true, updatedAt: Date.now() }

      tabs.push({
        id: `tab-${toolId}`,
        toolId,
        title,
        state: JSON.parse(JSON.stringify(state)) // deep clone
      })
    }

    // Ensure we have at least one tab
    if (tabs.length === 0) {
      tabs.push({
        id: `tab-${navStore.activeToolId}`,
        toolId: navStore.activeToolId,
        title: navStore.activeTool.name,
        state: { timestamp: Date.now() }
      })
    }

    const snapshot: ToolkitSnapshot = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      app: 'dev-toolkit',
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      metadata: {
        title: options?.title?.trim() || 'DevDot Work Session',
        description: options?.description?.trim() || 'Portable session snapshot exported from DevDot Privacy-First Universal Toolkit',
        exportedBy: 'DevDot v0.1.0 (Air-Gapped Client)',
        appVersion: '0.1.0'
      },
      activeTabId: navStore.activeToolId,
      tabs
    }

    lastExportedAt.value = snapshot.createdAt
    isExporting.value = false
    return snapshot
  }

  /**
   * Serialize and trigger client-side download of a .toolkit file
   */
  function downloadSnapshotFile(snapshot: ToolkitSnapshot, filename?: string) {
    const defaultName = `devdot-session-${new Date().toISOString().replace(/[:.]/g, '-')}.toolkit`
    const targetName = filename || defaultName

    const jsonStr = JSON.stringify(snapshot, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', url)
    downloadAnchor.setAttribute('download', targetName)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    URL.revokeObjectURL(url)
  }

  /**
   * Parse and validate an incoming .toolkit file string
   */
  function importSession(jsonString: string): {
    success: boolean
    message: string
    data?: ToolkitSnapshot
    errors?: string[]
  } {
    isImporting.value = true
    try {
      const parsed = JSON.parse(jsonString)
      const validation = validateSnapshot(parsed)

      if (!validation.isValid || !validation.snapshot) {
        isImporting.value = false
        return {
          success: false,
          message: 'Invalid .toolkit snapshot structure.',
          errors: validation.errors
        }
      }

      isImporting.value = false
      return {
        success: true,
        message: `Validated snapshot "${validation.snapshot.metadata.title || 'Untitled Session'}" with ${validation.snapshot.tabs.length} tool session(s).`,
        data: validation.snapshot
      }
    } catch (err: any) {
      isImporting.value = false
      return {
        success: false,
        message: 'JSON parsing failed. The file is corrupted or not a valid JSON document.',
        errors: [err?.message || 'Syntax error in snapshot JSON']
      }
    }
  }

  /**
   * Rehydrate reactive Pinia tool states and restore active workspace tab
   */
  function hydrateSession(snapshot: ToolkitSnapshot): {
    success: boolean
    message: string
    restoredCount: number
  } {
    const validation = validateSnapshot(snapshot)
    if (!validation.isValid || !validation.snapshot) {
      return {
        success: false,
        message: `Cannot hydrate invalid snapshot: ${validation.errors.join('; ')}`,
        restoredCount: 0
      }
    }

    const navStore = useNavigationStore()
    let restoredCount = 0

    // Hydrate all tab states in Pinia
    for (const tab of validation.snapshot.tabs) {
      toolStates.value[tab.toolId] = JSON.parse(JSON.stringify(tab.state))
      restoredCount++
    }

    // Restore active tab
    if (validation.snapshot.activeTabId) {
      navStore.selectTool(validation.snapshot.activeTabId)
    }

    lastImportedAt.value = new Date().toISOString()
    lastImportedSnapshot.value = validation.snapshot

    return {
      success: true,
      message: `Successfully restored ${restoredCount} tool session(s) from snapshot created at ${new Date(validation.snapshot.createdAt).toLocaleString()}.`,
      restoredCount
    }
  }

  /**
   * Reset all stored tool states
   */
  function clearSession() {
    toolStates.value = {}
    lastImportedSnapshot.value = null
  }

  return {
    // State
    toolStates,
    lastExportedAt,
    lastImportedAt,
    lastImportedSnapshot,
    isImporting,
    isExporting,
    // Actions
    setToolState,
    getToolState,
    exportSession,
    downloadSnapshotFile,
    importSession,
    hydrateSession,
    clearSession
  }
})
