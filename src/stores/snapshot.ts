import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useNavigationStore, ALL_TOOLS } from './navigation'
import { useTabStore } from './tabs'

const STORAGE_KEY = 'devdot_tool_sessions_v1'

function loadPersistedToolStates(): Record<string, Record<string, any>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('[SnapshotStore] Failed to load persisted tool states:', err)
  }
  return {}
}


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
  // Reactive tool states indexed by tabId or toolId
  const toolStates = ref<Record<string, Record<string, any>>>(loadPersistedToolStates())
  const lastExportedAt = ref<string | null>(null)
  const lastImportedAt = ref<string | null>(null)
  const lastImportedSnapshot = ref<ToolkitSnapshot | null>(null)
  const isImporting = ref<boolean>(false)
  const isExporting = ref<boolean>(false)

  function persistToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toolStates.value))
    } catch (err) {
      console.warn('[SnapshotStore] Failed to persist tool states to localStorage:', err)
    }
  }

  // Watch and persist tool states to localStorage
  watch(
    toolStates,
    () => {
      persistToStorage()
    },
    { deep: true }
  )

  /**
   * Set or update state for a specific tab and fallback tool
   */
  function setTabState(tabId: string, toolId: string, state: Record<string, any>) {
    const existingTabState = toolStates.value[tabId] || toolStates.value[toolId] || {}
    const updated = {
      ...existingTabState,
      ...state
    }
    toolStates.value[tabId] = updated
    toolStates.value[toolId] = updated
    persistToStorage()
  }

  /**
   * Set or update state for a specific tool (backwards compatible)
   */
  function setToolState(toolId: string, state: Record<string, any>) {
    toolStates.value[toolId] = {
      ...(toolStates.value[toolId] || {}),
      ...state
    }
    persistToStorage()
  }

  /**
   * Get registered state for a specific tab, falling back to toolId and then defaultVal
   */
  function getTabOrToolState<T = Record<string, any>>(tabId: string | undefined, toolId: string, defaultVal: T): T {
    if (tabId && toolStates.value[tabId]) {
      return toolStates.value[tabId] as T
    }
    if (toolStates.value[toolId]) {
      return toolStates.value[toolId] as T
    }
    return defaultVal
  }

  /**
   * Clone state from one tab to another (e.g. on tab duplication)
   */
  function cloneTabState(sourceTabId: string, targetTabId: string, toolId: string) {
    const sourceState = toolStates.value[sourceTabId] || toolStates.value[toolId] || {}
    toolStates.value[targetTabId] = JSON.parse(JSON.stringify(sourceState))
    persistToStorage()
  }

  /**
   * Remove state for a closed tab
   */
  function removeTabState(tabId: string) {
    if (toolStates.value[tabId]) {
      delete toolStates.value[tabId]
      persistToStorage()
    }
  }

  /**
   * Get registered state for a specific tool (backwards compatible)
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
    const tabStore = useTabStore()

    const availableTabs = tabStore.tabs
    const tabs: TabSession[] = []

    for (const tab of availableTabs) {
      if (options?.selectedToolIds && options.selectedToolIds.length > 0) {
        if (!options.selectedToolIds.includes(tab.toolId)) continue
      }
      const toolDef = ALL_TOOLS.find((t) => t.id === tab.toolId)
      const title = tab.customTitle || (toolDef ? toolDef.name : tab.toolId)
      const state = toolStates.value[tab.id] || toolStates.value[tab.toolId] || { active: true, updatedAt: Date.now() }

      tabs.push({
        id: tab.id,
        toolId: tab.toolId,
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
        state: toolStates.value[navStore.activeToolId] || { timestamp: Date.now() }
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
      activeTabId: tabStore.activeTabId || navStore.activeToolId,
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
    const tabStore = useTabStore()
    let restoredCount = 0

    // Hydrate all tab states in Pinia
    for (const tab of validation.snapshot.tabs) {
      const clonedState = JSON.parse(JSON.stringify(tab.state))
      toolStates.value[tab.id] = clonedState
      toolStates.value[tab.toolId] = clonedState
      restoredCount++
    }
    persistToStorage()

    // Restore tabs in TabStore
    tabStore.restoreTabsFromSnapshot(validation.snapshot.tabs, validation.snapshot.activeTabId)
    navStore.activeToolId = tabStore.activeToolId

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
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
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
    setTabState,
    getTabOrToolState,
    cloneTabState,
    removeTabState,
    setToolState,
    getToolState,
    exportSession,
    downloadSnapshotFile,
    importSession,
    hydrateSession,
    clearSession
  }
})
