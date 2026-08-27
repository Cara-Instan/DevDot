import { ref, onMounted, onUnmounted } from 'vue'
import { isTauri } from '@/core/adapters/platform'
import {
  openNativeFileDialog,
  saveNativeFileDialog,
  registerGlobalShortcuts,
  unregisterGlobalShortcuts,
  setupNativeDragDrop,
  type OpenDialogOptions,
  type SaveDialogOptions,
  type OpenedFileResult,
  type DroppedFilePayload
} from '@/core/native'
import { useNavigationStore, useSnapshotStore, useSecurityStore, type ToolkitSnapshot } from '@/stores'

export function useNativeIntegration() {
  const navStore = useNavigationStore()
  const snapshotStore = useSnapshotStore()
  const securityStore = useSecurityStore()


  const isNative = ref(isTauri())
  const isDraggingNative = ref(false)
  const shortcutsRegistered = ref(false)
  const lastDroppedFiles = ref<DroppedFilePayload[]>([])

  let unlistenDragDrop: (() => void) | null = null

  /**
   * Open file dialog (Native dialog in Tauri, File Input in Web)
   */
  async function openFile(options?: OpenDialogOptions): Promise<OpenedFileResult[]> {
    return await openNativeFileDialog(options)
  }

  /**
   * Save file dialog (Native save in Tauri, Blob download in Web)
   */
  async function saveFile(
    content: string,
    options?: SaveDialogOptions
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    return await saveNativeFileDialog(content, options)
  }

  /**
   * Export session to .toolkit file using Native Dialog or Web download
   */
  async function exportSnapshotNative(options?: {
    title?: string
    description?: string
    selectedToolIds?: string[]
  }): Promise<{ success: boolean; filePath?: string }> {
    const snapshot = snapshotStore.exportSession(options)
    const safeTitle = (options?.title || 'devdot-session')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const defaultPath = `${safeTitle}-${Date.now()}.toolkit`
    const jsonContent = JSON.stringify(snapshot, null, 2)

    if (isNative.value) {
      const res = await saveNativeFileDialog(jsonContent, {
        title: 'Export DevDot Session (.toolkit)',
        defaultPath,
        filters: [
          { name: 'DevDot Snapshot (*.toolkit)', extensions: ['toolkit'] },
          { name: 'JSON Document (*.json)', extensions: ['json'] },
          { name: 'All Files (*.*)', extensions: ['*'] }
        ]
      })
      return { success: res.success, filePath: res.filePath }
    } else {
      snapshotStore.downloadSnapshotFile(snapshot, defaultPath)
      return { success: true }
    }
  }

  /**
   * Open file dialog to import a .toolkit snapshot
   */
  async function importSnapshotNative(): Promise<{
    success: boolean
    snapshot?: ToolkitSnapshot
    message?: string
    errors?: string[]
  }> {
    const files = await openNativeFileDialog({
      title: 'Import DevDot Session (.toolkit)',
      multiple: false,
      filters: [
        { name: 'DevDot Snapshot (*.toolkit, *.json)', extensions: ['toolkit', 'json'] },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ]
    })

    if (!files || files.length === 0) {
      return { success: false, message: 'No file selected.' }
    }

    const file = files[0]
    const importResult = snapshotStore.importSession(file.content)
    if (importResult.success && importResult.data) {
      return {
        success: true,
        snapshot: importResult.data,
        message: importResult.message
      }
    } else {
      return {
        success: false,
        message: importResult.message,
        errors: importResult.errors
      }
    }
  }

  /**
   * Handle dropped native files
   */
  function handleNativeDrop(files: DroppedFilePayload[]) {
    lastDroppedFiles.value = files

    // Check if any dropped file is a .toolkit snapshot
    const toolkitFile = files.find((f) => f.isToolkitSnapshot)
    if (toolkitFile) {
      const result = snapshotStore.importSession(toolkitFile.content)
      if (result.success && result.data) {
        // Open snapshot dialog in import view to let user preview & restore
        navStore.openSnapshotModal('import')
      }
    }
  }

  /**
   * Initialize native handlers and shortcuts
   */
  async function initNative() {
    if (!isNative.value) return

    // 1. Setup Global Hotkeys
    const registered = await registerGlobalShortcuts({
      onToggleWindow: () => {
        // Window toggle / focus
      },
      onOpenCommandPalette: () => {
        navStore.openCommandPalette()
      },
      onQuickPanic: () => {
        securityStore.openPanicModal()
      }

    })
    shortcutsRegistered.value = registered

    // 2. Setup Native Drag & Drop
    unlistenDragDrop = await setupNativeDragDrop(
      handleNativeDrop,
      (dragging) => {
        isDraggingNative.value = dragging
      }
    )
  }

  /**
   * Clean up native listeners
   */
  async function cleanupNative() {
    if (!isNative.value) return
    if (unlistenDragDrop) {
      unlistenDragDrop()
      unlistenDragDrop = null
    }
    await unregisterGlobalShortcuts()
    shortcutsRegistered.value = false
  }

  onMounted(() => {
    initNative()
  })

  onUnmounted(() => {
    cleanupNative()
  })

  return {
    isNative,
    isDraggingNative,
    shortcutsRegistered,
    lastDroppedFiles,
    openFile,
    saveFile,
    exportSnapshotNative,
    importSnapshotNative,
    initNative,
    cleanupNative
  }
}
