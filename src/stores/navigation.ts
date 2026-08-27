import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ToolCategory = 'all' | 'json' | 'crypto' | 'converters' | 'text' | 'system'

export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategory
  icon: string // Lucide icon name
  keywords: string[]
  shortcut?: string
  badge?: string
  status?: 'ready' | 'in-progress' | 'planned'
}

export const ALL_TOOLS: ToolDefinition[] = [
  // Overview / Dashboard (Top Anchor)
  {
    id: 'system-overview',
    name: 'Overview & Dashboard',
    description: 'Universal developer workspace overview, tool catalog, quick utilities, and engine diagnostics.',
    category: 'system',
    icon: 'LayoutDashboard',
    keywords: ['dashboard', 'system', 'worker', 'overview', 'benchmark', 'status', 'home', 'hub'],
    status: 'ready'
  },

  // JSON Suite
  {
    id: 'json-format',
    name: 'JSON Prettify & Minify',
    description: 'Format, minify, and auto-repair malformed JSON payload with custom indentation.',
    category: 'json',
    icon: 'FileJson',
    keywords: ['json', 'format', 'prettify', 'minify', 'repair', 'beautify', 'indent'],
    status: 'ready'
  },
  {
    id: 'json-schema',
    name: 'JSON Schema & Types',
    description: 'Generate TypeScript interfaces, Go structs, and Rust structs from JSON.',
    category: 'json',
    icon: 'Code2',
    keywords: ['json', 'schema', 'typescript', 'go', 'rust', 'type', 'interface', 'struct'],
    status: 'ready'
  },
  {
    id: 'json-diff',
    name: 'JSON Visual Diff',
    description: 'Side-by-side and unified visual difference checker with syntax highlight.',
    category: 'json',
    icon: 'GitCompare',
    keywords: ['json', 'diff', 'compare', 'difference', 'delta', 'visual'],
    status: 'ready'
  },

  // Crypto & Tokens
  {
    id: 'jwt-debugger',
    name: 'Offline JWT Debugger',
    description: 'Decode and inspect JWT headers, payloads, expiry countdown, and local HMAC signature.',
    category: 'crypto',
    icon: 'KeyRound',
    keywords: ['jwt', 'token', 'decode', 'bearer', 'auth', 'signature', 'expiry'],
    status: 'ready'
  },
  {
    id: 'hash-generator',
    name: 'Hash & ID Generator',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-512 hashes and UUIDv4, ULID, NanoID identifiers.',
    category: 'crypto',
    icon: 'Fingerprint',
    keywords: ['hash', 'md5', 'sha256', 'sha512', 'uuid', 'ulid', 'nanoid', 'generator', 'id'],
    status: 'ready'
  },
  {
    id: 'encoders-decoders',
    name: 'Encoder / Decoder',
    description: 'Convert between Base64, URL encoding, Hexadecimal, and HTML entities.',
    category: 'crypto',
    icon: 'Binary',
    keywords: ['base64', 'url', 'hex', 'html', 'encode', 'decode', 'data uri'],
    status: 'ready'
  },

  // Converters & Transpilers
  {
    id: 'curl-converter',
    name: 'cURL Converter',
    description: 'Convert raw terminal cURL commands into JavaScript Fetch, Axios, Python, and Go code.',
    category: 'converters',
    icon: 'Terminal',
    keywords: ['curl', 'fetch', 'axios', 'python', 'go', 'requests', 'http', 'api'],
    status: 'ready'
  },
  {
    id: 'multi-transpiler',
    name: 'Multi-Format Transpiler',
    description: 'Bi-directional conversions between JSON, YAML, TOML, and CSV.',
    category: 'converters',
    icon: 'Repeat',
    keywords: ['yaml', 'toml', 'csv', 'json', 'transpile', 'convert', 'parser'],
    status: 'ready'
  },
  {
    id: 'pii-redactor',
    name: 'PII Log Redactor & Sanitizer',
    description: 'Mask sensitive credentials, emails, credit cards, and API keys with regex rules.',
    category: 'text',
    icon: 'EyeOff',
    keywords: ['pii', 'redact', 'sanitize', 'mask', 'email', 'password', 'token', 'log', 'security'],
    status: 'ready'
  }
]

export const CATEGORIES: { id: ToolCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All Tools', icon: 'Boxes' },
  { id: 'json', label: 'JSON Suite', icon: 'FileJson' },
  { id: 'crypto', label: 'Crypto & Tokens', icon: 'ShieldCheck' },
  { id: 'converters', label: 'Converters', icon: 'ArrowLeftRight' },
  { id: 'text', label: 'Text & Security', icon: 'FileText' },
  { id: 'system', label: 'System', icon: 'Cpu' }
]

export const useNavigationStore = defineStore('navigation', () => {
  const activeToolId = ref<string>('system-overview')
  const activeCategory = ref<ToolCategory>('all')
  const isCommandPaletteOpen = ref<boolean>(false)
  const isPrivacyModalOpen = ref<boolean>(false)
  const isSettingsOpen = ref<boolean>(false)
  const isSnapshotModalOpen = ref<boolean>(false)
  const snapshotModalTab = ref<'export' | 'import'>('export')
  const isNavDrawerOpen = ref<boolean>(false)
  const isMobileNavOpen = ref<boolean>(false)
  const isSidebarCollapsed = ref<boolean>(loadSidebarCollapsed())
  const searchQuery = ref<string>('')

  function loadSidebarCollapsed(): boolean {
    try {
      const saved = localStorage.getItem('devdot_sidebar_collapsed')
      if (saved !== null) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore
    }
    return false
  }

  function toggleSidebarCollapsed() {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
    try {
      localStorage.setItem('devdot_sidebar_collapsed', JSON.stringify(isSidebarCollapsed.value))
    } catch {
      // ignore
    }
  }

  // Persistent Favorites
  const favorites = ref<string[]>(loadFavorites())
  // Persistent Recents
  const recents = ref<string[]>(loadRecents())

  function loadFavorites(): string[] {
    try {
      const saved = localStorage.getItem('devdot_favorites')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore
    }
    return ['json-format', 'jwt-debugger', 'hash-generator']
  }

  function saveFavorites() {
    try {
      localStorage.setItem('devdot_favorites', JSON.stringify(favorites.value))
    } catch {
      // ignore
    }
  }

  function loadRecents(): string[] {
    try {
      const saved = localStorage.getItem('devdot_recents')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore
    }
    return []
  }

  function saveRecents() {
    try {
      localStorage.setItem('devdot_recents', JSON.stringify(recents.value))
    } catch {
      // ignore
    }
  }

  function toggleFavorite(toolId: string) {
    if (toolId === 'system-overview') return
    const idx = favorites.value.indexOf(toolId)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push(toolId)
    }
    saveFavorites()
  }

  function isFavorite(toolId: string): boolean {
    return favorites.value.includes(toolId)
  }

  function recordRecent(toolId: string) {
    if (!toolId || toolId === 'system-overview') return
    recents.value = [toolId, ...recents.value.filter((id) => id !== toolId)].slice(0, 6)
    saveRecents()
  }

  const favoriteTools = computed(() => {
    return ALL_TOOLS.filter((t) => favorites.value.includes(t.id))
  })

  const recentTools = computed(() => {
    return recents.value
      .map((id) => ALL_TOOLS.find((t) => t.id === id))
      .filter((t): t is ToolDefinition => !!t)
  })

  const activeTool = computed(() => {
    return ALL_TOOLS.find((t) => t.id === activeToolId.value) || ALL_TOOLS[0]
  })

  const filteredTools = computed(() => {
    let list = ALL_TOOLS
    if (activeCategory.value !== 'all') {
      list = list.filter((t) => t.category === activeCategory.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.keywords.some((k) => k.toLowerCase().includes(q))
      )
    }
    return list
  })

  function selectTool(toolId: string) {
    const found = ALL_TOOLS.find((t) => t.id === toolId)
    if (found) {
      activeToolId.value = toolId
      isNavDrawerOpen.value = false
      isMobileNavOpen.value = false
      if (toolId !== 'system-overview') {
        recordRecent(toolId)
      }
    }
  }

  function setCategory(category: ToolCategory) {
    activeCategory.value = category
  }

  function openNavDrawer() {
    isNavDrawerOpen.value = true
    isMobileNavOpen.value = true
  }

  function closeNavDrawer() {
    isNavDrawerOpen.value = false
    isMobileNavOpen.value = false
  }

  function toggleNavDrawer() {
    isNavDrawerOpen.value = !isNavDrawerOpen.value
    isMobileNavOpen.value = isNavDrawerOpen.value
  }

  function openCommandPalette() {
    isCommandPaletteOpen.value = true
  }

  function closeCommandPalette() {
    isCommandPaletteOpen.value = false
  }

  function toggleCommandPalette() {
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
  }

  function openPrivacyModal() {
    isPrivacyModalOpen.value = true
  }

  function closePrivacyModal() {
    isPrivacyModalOpen.value = false
  }

  function openSnapshotModal(tab: 'export' | 'import' = 'export') {
    snapshotModalTab.value = tab
    isSnapshotModalOpen.value = true
  }

  function closeSnapshotModal() {
    isSnapshotModalOpen.value = false
  }

  function openSettings() {
    isSettingsOpen.value = true
  }

  function closeSettings() {
    isSettingsOpen.value = false
  }

  function toggleSettings() {
    isSettingsOpen.value = !isSettingsOpen.value
  }

  return {
    // State
    activeToolId,
    activeCategory,
    isCommandPaletteOpen,
    isPrivacyModalOpen,
    isSettingsOpen,
    isSnapshotModalOpen,
    snapshotModalTab,
    isNavDrawerOpen,
    isMobileNavOpen,
    isSidebarCollapsed,
    searchQuery,
    favorites,
    recents,
    // Getters
    activeTool,
    filteredTools,
    favoriteTools,
    recentTools,
    tools: ALL_TOOLS,
    categories: CATEGORIES,
    // Actions
    selectTool,
    setCategory,
    toggleFavorite,
    isFavorite,
    recordRecent,
    toggleSidebarCollapsed,
    openNavDrawer,
    closeNavDrawer,
    toggleNavDrawer,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    openPrivacyModal,
    closePrivacyModal,
    openSnapshotModal,
    closeSnapshotModal,
    openSettings,
    closeSettings,
    toggleSettings
  }
})
