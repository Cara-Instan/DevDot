import { isTauri } from '../adapters/platform'

export interface DroppedFilePayload {
  path?: string
  name: string
  content: string
  size: number
  isToolkitSnapshot: boolean
}

export type NativeDropCallback = (files: DroppedFilePayload[]) => void

/**
 * Attaches a native window file drag-and-drop listener when running inside Tauri v2.
 * Returns an unlisten function to clean up when destroyed.
 */
export async function setupNativeDragDrop(
  onDrop: NativeDropCallback,
  onDragStateChange?: (isDragging: boolean) => void
): Promise<() => void> {
  if (!isTauri()) {
    return () => {}
  }

  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { readTextFile, stat } = await import('@tauri-apps/plugin-fs')

    const currentWindow = getCurrentWebviewWindow()

    const unlisten = await currentWindow.onDragDropEvent(async (event) => {
      const payload = event.payload

      if (payload.type === 'enter' || payload.type === 'over') {
        onDragStateChange?.(true)
      } else if (payload.type === 'leave') {
        onDragStateChange?.(false)
      } else if (payload.type === 'drop') {
        onDragStateChange?.(false)
        const paths = payload.paths || []
        if (paths.length === 0) return

        const droppedFiles: DroppedFilePayload[] = []

        for (const filePath of paths) {
          try {
            const content = await readTextFile(filePath)
            let size = content.length
            try {
              const fileStat = await stat(filePath)
              if (fileStat && typeof fileStat.size === 'number') {
                size = fileStat.size
              }
            } catch {
              // fallback
            }

            const fileName = filePath.split(/[/\\]/).pop() || 'file'
            const isToolkitSnapshot =
              fileName.endsWith('.toolkit') ||
              (content.includes('"app": "dev-toolkit"') && content.includes('"schemaVersion": "1.0.0"'))

            droppedFiles.push({
              path: filePath,
              name: fileName,
              content,
              size,
              isToolkitSnapshot
            })
          } catch (err) {
            console.error(`Failed to read dropped file at path ${filePath}:`, err)
          }
        }

        if (droppedFiles.length > 0) {
          onDrop(droppedFiles)
        }
      }
    })

    return () => {
      unlisten()
    }
  } catch (err) {
    console.warn('Could not initialize native drag-and-drop listener:', err)
    return () => {}
  }
}
