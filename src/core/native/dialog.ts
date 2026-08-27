import { isTauri } from '../adapters/platform'

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
  multiple?: boolean
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
}

export interface OpenedFileResult {
  name: string
  path?: string
  content: string
  size: number
}

/**
 * Opens a file selection dialog (Native dialog in Tauri, HTML5 file input in Web).
 * Returns array of opened file contents and metadata.
 */
export async function openNativeFileDialog(options: OpenDialogOptions = {}): Promise<OpenedFileResult[]> {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readTextFile, stat } = await import('@tauri-apps/plugin-fs')

      const selected = await open({
        title: options.title || 'Open File - DevDot',
        defaultPath: options.defaultPath,
        multiple: options.multiple || false,
        filters: options.filters
      })

      if (!selected) {
        return []
      }

      const paths = Array.isArray(selected) ? selected : [selected]
      const results: OpenedFileResult[] = []

      for (const filePath of paths) {
        const content = await readTextFile(filePath)
        let size = content.length
        try {
          const fileStat = await stat(filePath)
          if (fileStat && typeof fileStat.size === 'number') {
            size = fileStat.size
          }
        } catch {
          // fallback to content length
        }

        const fileName = filePath.split(/[/\\]/).pop() || 'file'
        results.push({
          name: fileName,
          path: filePath,
          content,
          size
        })
      }

      return results
    } catch (err) {
      console.warn('Tauri native dialog failed, falling back to web file input:', err)
      return openWebFileDialog(options)
    }
  } else {
    return openWebFileDialog(options)
  }
}

/**
 * Fallback HTML5 file input dialog for Web browser environments.
 */
function openWebFileDialog(options: OpenDialogOptions): Promise<OpenedFileResult[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = options.multiple || false

    if (options.filters && options.filters.length > 0) {
      const acceptExtensions = options.filters
        .flatMap((f) => f.extensions.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)))
        .join(',')
      if (acceptExtensions) {
        input.accept = acceptExtensions
      }
    }

    input.onchange = async () => {
      if (!input.files || input.files.length === 0) {
        resolve([])
        return
      }

      const files = Array.from(input.files)
      const results: OpenedFileResult[] = []

      for (const file of files) {
        const content = await file.text()
        results.push({
          name: file.name,
          content,
          size: file.size
        })
      }

      resolve(results)
    }

    input.oncancel = () => {
      resolve([])
    }

    // Trigger file chooser
    input.click()
  })
}

/**
 * Saves content to a file (Native Save dialog in Tauri, browser Blob download in Web).
 */
export async function saveNativeFileDialog(
  content: string,
  options: SaveDialogOptions = {}
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')

      const filePath = await save({
        title: options.title || 'Save File - DevDot',
        defaultPath: options.defaultPath || 'devdot-output.txt',
        filters: options.filters
      })

      if (!filePath) {
        return { success: false, error: 'User cancelled save dialog.' }
      }

      await writeTextFile(filePath, content)
      return { success: true, filePath }
    } catch (err: any) {
      console.warn('Tauri native save failed, falling back to web download:', err)
      downloadViaWeb(content, options.defaultPath || 'devdot-output.txt')
      return { success: true }
    }
  } else {
    downloadViaWeb(content, options.defaultPath || 'devdot-output.txt')
    return { success: true }
  }
}

/**
 * Fallback Web download helper using ObjectURL Blob.
 */
function downloadViaWeb(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
