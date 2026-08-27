import { isTauri } from '../adapters/platform'

export interface ShortcutHandlers {
  onToggleWindow?: () => void
  onOpenCommandPalette?: () => void
  onQuickPanic?: () => void
}

let registeredShortcuts: string[] = []

/**
 * Registers global OS shortcuts when running in Tauri desktop mode.
 */
export async function registerGlobalShortcuts(handlers: ShortcutHandlers): Promise<boolean> {
  if (!isTauri()) {
    return false
  }

  try {
    const { register, unregisterAll, isRegistered } = await import('@tauri-apps/plugin-global-shortcut')
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')

    // Clean up any previously registered shortcuts first
    await unregisterAll()
    registeredShortcuts = []

    const currentWindow = getCurrentWebviewWindow()

    // 1. Toggle / Focus DevDot shortcut (CmdOrCtrl+Alt+D)
    const toggleShortcut = 'CommandOrControl+Alt+D'
    try {
      const alreadyReg = await isRegistered(toggleShortcut)
      if (!alreadyReg) {
        await register(toggleShortcut, async (event) => {
          if (event.state === 'Pressed') {
            const isVisible = await currentWindow.isVisible()
            if (isVisible) {
              const isFocused = await currentWindow.isFocused()
              if (isFocused) {
                // If focused, minimize or hide if desired, or just trigger handler
                handlers.onToggleWindow?.()
              } else {
                await currentWindow.setFocus()
                handlers.onToggleWindow?.()
              }
            } else {
              await currentWindow.show()
              await currentWindow.setFocus()
              handlers.onToggleWindow?.()
            }
          }
        })
        registeredShortcuts.push(toggleShortcut)
      }
    } catch (e) {
      console.warn(`Failed to register global shortcut ${toggleShortcut}:`, e)
    }

    // 2. Quick Command Palette Shortcut (CmdOrCtrl+Shift+K)
    const commandPaletteShortcut = 'CommandOrControl+Shift+K'
    try {
      const alreadyReg = await isRegistered(commandPaletteShortcut)
      if (!alreadyReg) {
        await register(commandPaletteShortcut, async (event) => {
          if (event.state === 'Pressed') {
            await currentWindow.show()
            await currentWindow.setFocus()
            handlers.onOpenCommandPalette?.()
          }
        })
        registeredShortcuts.push(commandPaletteShortcut)
      }
    } catch (e) {
      console.warn(`Failed to register global shortcut ${commandPaletteShortcut}:`, e)
    }

    // 3. Quick Panic Scrubbing Trigger (CmdOrCtrl+Alt+P)
    const panicShortcut = 'CommandOrControl+Alt+P'
    try {
      const alreadyReg = await isRegistered(panicShortcut)
      if (!alreadyReg) {
        await register(panicShortcut, async (event) => {
          if (event.state === 'Pressed') {
            await currentWindow.show()
            await currentWindow.setFocus()
            handlers.onQuickPanic?.()
          }
        })
        registeredShortcuts.push(panicShortcut)
      }
    } catch (e) {
      console.warn(`Failed to register global shortcut ${panicShortcut}:`, e)
    }

    return registeredShortcuts.length > 0
  } catch (err) {
    console.warn('Could not register Tauri global shortcuts:', err)
    return false
  }
}

/**
 * Unregisters all globally active shortcuts on app unmount/shutdown.
 */
export async function unregisterGlobalShortcuts(): Promise<void> {
  if (!isTauri()) {
    return
  }

  try {
    const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')
    await unregisterAll()
    registeredShortcuts = []
  } catch (err) {
    console.warn('Failed to unregister global shortcuts:', err)
  }
}

export function getRegisteredShortcuts(): string[] {
  return [...registeredShortcuts]
}
