import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { ALL_TOOLS, ToolDefinition } from './navigation'
import { useSnapshotStore } from './snapshot'

export interface WorkspaceTab {
  id: string
  toolId: string
  title: string
  customTitle?: string
  isPinned?: boolean
  createdAt: number
  lastActiveAt: number
}

const STORAGE_KEY = 'devdot_workspace_tabs_v2'
const ACTIVE_TAB_KEY = 'devdot_active_tab_id_v2'

function generateTabId(toolId: string): string {
  return `tab_${toolId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
}

function getDefaultTabs(): WorkspaceTab[] {
  return [
    {
      id: 'tab_system-overview_init',
      toolId: 'system-overview',
      title: 'Overview & Dashboard',
      isPinned: true,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }
  ]
}

function loadPersistedTabs(): WorkspaceTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate each tab has valid toolId
        const validTabs: WorkspaceTab[] = parsed.filter(
          (t) => t && typeof t.id === 'string' && typeof t.toolId === 'string'
        )
        if (validTabs.length > 0) {
          return validTabs
        }
      }
    }
  } catch (err) {
    console.warn('[TabStore] Failed to load tabs from localStorage:', err)
  }
  return getDefaultTabs()
}

function loadPersistedActiveTabId(tabs: WorkspaceTab[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY)
    if (saved && tabs.some((t) => t.id === saved)) {
      return saved
    }
  } catch {
    // ignore
  }
  return tabs[0]?.id || 'tab_system-overview_init'
}

export const useTabStore = defineStore('tabs', () => {
  const tabs = ref<WorkspaceTab[]>(loadPersistedTabs())
  const activeTabId = ref<string>(loadPersistedActiveTabId(tabs.value))
  const closedTabsHistory = ref<WorkspaceTab[]>([])

  // Watch & Persist Tabs
  watch(
    tabs,
    (newTabs) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTabs))
      } catch (err) {
        console.warn('[TabStore] Failed to persist tabs:', err)
      }
    },
    { deep: true }
  )

  // Watch & Persist Active Tab ID
  watch(activeTabId, (newActiveId) => {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, newActiveId)
    } catch (err) {
      console.warn('[TabStore] Failed to persist activeTabId:', err)
    }
  })

  // Getters
  const activeTab = computed(() => {
    return tabs.value.find((t) => t.id === activeTabId.value) || tabs.value[0]
  })

  const activeToolId = computed(() => {
    return activeTab.value ? activeTab.value.toolId : 'system-overview'
  })

  const activeToolDef = computed<ToolDefinition>(() => {
    const toolId = activeToolId.value
    return ALL_TOOLS.find((t) => t.id === toolId) || ALL_TOOLS[0]
  })

  const tabCount = computed(() => tabs.value.length)

  const pinnedTabs = computed(() => tabs.value.filter((t) => t.isPinned))
  const unpinnedTabs = computed(() => tabs.value.filter((t) => !t.isPinned))

  // Actions
  function setActiveTab(tabId: string) {
    const target = tabs.value.find((t) => t.id === tabId)
    if (target) {
      activeTabId.value = tabId
      target.lastActiveAt = Date.now()
    }
  }

  /**
   * Open a tool in a tab. If tab already exists and forceNew is false, switches to it.
   */
  function openTab(
    toolId: string,
    options?: {
      activate?: boolean
      customTitle?: string
      forceNew?: boolean
      isPinned?: boolean
    }
  ): string {
    const toolDef = ALL_TOOLS.find((t) => t.id === toolId)
    const title = toolDef ? toolDef.name : toolId

    // If forceNew is not set, check if an existing tab with this toolId is open
    if (!options?.forceNew) {
      const existing = tabs.value.find((t) => t.toolId === toolId)
      if (existing) {
        if (options?.activate !== false) {
          setActiveTab(existing.id)
        }
        return existing.id
      }
    }

    const newTab: WorkspaceTab = {
      id: generateTabId(toolId),
      toolId,
      title,
      customTitle: options?.customTitle,
      isPinned: options?.isPinned ?? (toolId === 'system-overview' && tabs.value.length === 0),
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }

    tabs.value.push(newTab)

    if (options?.activate !== false) {
      activeTabId.value = newTab.id
    }

    return newTab.id
  }

  /**
   * Closes a tab by ID.
   */
  function closeTab(tabId: string, force = false) {
    const index = tabs.value.findIndex((t) => t.id === tabId)
    if (index === -1) return

    const targetTab = tabs.value[index]
    if ((targetTab.isPinned || targetTab.toolId === 'system-overview') && !force) {
      return // Don't close pinned tabs or system overview home tab unless forced
    }

    // Save to closed tabs history (max 15)
    closedTabsHistory.value.unshift({ ...targetTab })
    if (closedTabsHistory.value.length > 15) {
      closedTabsHistory.value.pop()
    }

    // Clean up stored tab session state
    try {
      const snapshotStore = useSnapshotStore()
      snapshotStore.removeTabState(tabId)
    } catch {
      // ignore
    }

    // Remove tab
    tabs.value.splice(index, 1)

    // If the closed tab was active, determine next active tab
    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        // Prefer tab at the same index, or the previous one
        const nextIndex = Math.min(index, tabs.value.length - 1)
        setActiveTab(tabs.value[nextIndex].id)
      } else {
        // If no tabs remain, reopen default system overview
        const defaultTabId = openTab('system-overview', { isPinned: true })
        setActiveTab(defaultTabId)
      }
    }
  }

  /**
   * Close all tabs except the specified one
   */
  function closeOtherTabs(keepTabId: string) {
    const toRemove = tabs.value.filter(
      (t) => t.id !== keepTabId && !t.isPinned && t.toolId !== 'system-overview'
    )
    toRemove.forEach((t) => {
      closedTabsHistory.value.unshift({ ...t })
      try {
        const snapshotStore = useSnapshotStore()
        snapshotStore.removeTabState(t.id)
      } catch {
        // ignore
      }
    })
    tabs.value = tabs.value.filter(
      (t) => t.id === keepTabId || t.isPinned || t.toolId === 'system-overview'
    )
    setActiveTab(keepTabId)
  }

  /**
   * Close all tabs to the right of the given tab ID
   */
  function closeTabsToRight(tabId: string) {
    const index = tabs.value.findIndex((t) => t.id === tabId)
    if (index === -1) return

    const rightTabs = tabs.value.slice(index + 1).filter((t) => !t.isPinned && t.toolId !== 'system-overview')
    rightTabs.forEach((t) => {
      closedTabsHistory.value.unshift({ ...t })
      try {
        const snapshotStore = useSnapshotStore()
        snapshotStore.removeTabState(t.id)
      } catch {
        // ignore
      }
    })

    tabs.value = tabs.value.filter((t, i) => i <= index || t.isPinned || t.toolId === 'system-overview')

    // If active tab was removed, switch to tabId
    if (!tabs.value.some((t) => t.id === activeTabId.value)) {
      setActiveTab(tabId)
    }
  }

  /**
   * Close all unpinned tabs
   */
  function closeAllTabs() {
    const unpinned = tabs.value.filter((t) => !t.isPinned && t.toolId !== 'system-overview')
    unpinned.forEach((t) => {
      closedTabsHistory.value.unshift({ ...t })
      try {
        const snapshotStore = useSnapshotStore()
        snapshotStore.removeTabState(t.id)
      } catch {
        // ignore
      }
    })

    tabs.value = tabs.value.filter((t) => t.isPinned || t.toolId === 'system-overview')

    if (tabs.value.length === 0) {
      const id = openTab('system-overview', { isPinned: true })
      setActiveTab(id)
    } else {
      setActiveTab(tabs.value[0].id)
    }
  }

  /**
   * Duplicate a tab
   */
  function duplicateTab(tabId: string): string | null {
    const source = tabs.value.find((t) => t.id === tabId)
    if (!source || source.toolId === 'system-overview') return null

    const newId = generateTabId(source.toolId)
    const newTab: WorkspaceTab = {
      id: newId,
      toolId: source.toolId,
      title: source.title,
      customTitle: source.customTitle ? `${source.customTitle} (Copy)` : undefined,
      isPinned: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }

    const sourceIndex = tabs.value.findIndex((t) => t.id === tabId)
    tabs.value.splice(sourceIndex + 1, 0, newTab)

    // Clone session state in snapshot store
    try {
      const snapshotStore = useSnapshotStore()
      snapshotStore.cloneTabState(tabId, newId, source.toolId)
    } catch {
      // ignore
    }

    setActiveTab(newId)
    return newId
  }

  /**
   * Toggle pin status of a tab
   */
  function togglePin(tabId: string) {
    const tab = tabs.value.find((t) => t.id === tabId)
    if (!tab || tab.toolId === 'system-overview') return

    tab.isPinned = !tab.isPinned

    // Reorder: pinned tabs go first
    tabs.value.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return 0
    })
  }

  /**
   * Reorder tabs from one position to another
   */
  function reorderTabs(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= tabs.value.length ||
      toIndex < 0 ||
      toIndex >= tabs.value.length ||
      fromIndex === toIndex
    ) {
      return
    }

    const [moved] = tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, moved)
  }

  /**
   * Reopen the most recently closed tab
   */
  function reopenClosedTab(): string | null {
    if (closedTabsHistory.value.length === 0) return null

    const restored = closedTabsHistory.value.shift()!
    // Give it a fresh ID or reuse ID if not present
    const existingIndex = tabs.value.findIndex((t) => t.id === restored.id)
    const tabToInsert: WorkspaceTab = {
      ...restored,
      id: existingIndex === -1 ? restored.id : generateTabId(restored.toolId),
      lastActiveAt: Date.now()
    }

    tabs.value.push(tabToInsert)
    setActiveTab(tabToInsert.id)
    return tabToInsert.id
  }

  /**
   * Switch to next tab
   */
  function nextTab() {
    if (tabs.value.length <= 1) return
    const currentIndex = tabs.value.findIndex((t) => t.id === activeTabId.value)
    const nextIndex = (currentIndex + 1) % tabs.value.length
    setActiveTab(tabs.value[nextIndex].id)
  }

  /**
   * Switch to previous tab
   */
  function previousTab() {
    if (tabs.value.length <= 1) return
    const currentIndex = tabs.value.findIndex((t) => t.id === activeTabId.value)
    const prevIndex = (currentIndex - 1 + tabs.value.length) % tabs.value.length
    setActiveTab(tabs.value[prevIndex].id)
  }

  /**
   * Rename a tab
   */
  function setTabTitle(tabId: string, customTitle: string) {
    const tab = tabs.value.find((t) => t.id === tabId)
    if (tab) {
      tab.customTitle = customTitle.trim() || undefined
    }
  }

  /**
   * Reset / restore tabs from a snapshot
   */
  function restoreTabsFromSnapshot(snapshotTabs: { id: string; toolId: string; title: string }[], activeId?: string) {
    if (!snapshotTabs || snapshotTabs.length === 0) return

    const newTabs: WorkspaceTab[] = snapshotTabs.map((st) => {
      const toolDef = ALL_TOOLS.find((t) => t.id === st.toolId)
      return {
        id: st.id,
        toolId: st.toolId,
        title: toolDef?.name || st.title || st.toolId,
        customTitle: st.title !== toolDef?.name ? st.title : undefined,
        isPinned: st.toolId === 'system-overview',
        createdAt: Date.now(),
        lastActiveAt: Date.now()
      }
    })

    tabs.value = newTabs
    if (activeId && newTabs.some((t) => t.id === activeId || t.toolId === activeId)) {
      const found = newTabs.find((t) => t.id === activeId || t.toolId === activeId)
      if (found) {
        setActiveTab(found.id)
      }
    } else if (newTabs.length > 0) {
      setActiveTab(newTabs[0].id)
    }
  }

  return {
    // State
    tabs,
    activeTabId,
    closedTabsHistory,
    // Getters
    activeTab,
    activeToolId,
    activeToolDef,
    tabCount,
    pinnedTabs,
    unpinnedTabs,
    // Actions
    setActiveTab,
    openTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    duplicateTab,
    togglePin,
    reorderTabs,
    reopenClosedTab,
    nextTab,
    previousTab,
    setTabTitle,
    restoreTabsFromSnapshot
  }
})
