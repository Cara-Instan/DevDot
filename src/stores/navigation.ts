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
  // JSON Suite
  {
    id: 'json-format',
    name: 'JSON Prettify & Minify',
    description: 'Format, minify, and auto-repair malformed JSON payload with custom indentation.',
    category: 'json',
    icon: 'FileJson',
    keywords: ['json', 'format', 'prettify', 'minify', 'repair', 'beautify', 'indent'],
    status: 'planned'
  },
  {
    id: 'json-schema',
    name: 'JSON Schema & Types',
    description: 'Generate TypeScript interfaces, Go structs, and Rust structs from JSON.',
    category: 'json',
    icon: 'Code2',
    keywords: ['json', 'schema', 'typescript', 'go', 'rust', 'type', 'interface', 'struct'],
    status: 'planned'
  },
  {
    id: 'json-diff',
    name: 'JSON Visual Diff',
    description: 'Side-by-side and unified visual difference checker with syntax highlight.',
    category: 'json',
    icon: 'GitCompare',
    keywords: ['json', 'diff', 'compare', 'difference', 'delta', 'visual'],
    status: 'planned'
  },

  // Crypto & Tokens
  {
    id: 'jwt-debugger',
    name: 'Offline JWT Debugger',
    description: 'Decode and inspect JWT headers, payloads, expiry countdown, and local HMAC signature.',
    category: 'crypto',
    icon: 'KeyRound',
    keywords: ['jwt', 'token', 'decode', 'bearer', 'auth', 'signature', 'expiry'],
    status: 'planned'
  },
  {
    id: 'hash-generator',
    name: 'Hash & ID Generator',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-512 hashes and UUIDv4, ULID, NanoID identifiers.',
    category: 'crypto',
    icon: 'Fingerprint',
    keywords: ['hash', 'md5', 'sha256', 'sha512', 'uuid', 'ulid', 'nanoid', 'generator', 'id'],
    status: 'planned'
  },
  {
    id: 'encoders-decoders',
    name: 'Encoder / Decoder',
    description: 'Convert between Base64, URL encoding, Hexadecimal, and HTML entities.',
    category: 'crypto',
    icon: 'Binary',
    keywords: ['base64', 'url', 'hex', 'html', 'encode', 'decode', 'data uri'],
    status: 'planned'
  },

  // Converters & Transpilers
  {
    id: 'curl-converter',
    name: 'cURL Converter',
    description: 'Convert raw terminal cURL commands into JavaScript Fetch, Axios, Python, and Go code.',
    category: 'converters',
    icon: 'Terminal',
    keywords: ['curl', 'fetch', 'axios', 'python', 'go', 'requests', 'http', 'api'],
    status: 'planned'
  },
  {
    id: 'multi-transpiler',
    name: 'Multi-Format Transpiler',
    description: 'Bi-directional conversions between JSON, YAML, TOML, and CSV.',
    category: 'converters',
    icon: 'Repeat',
    keywords: ['yaml', 'toml', 'csv', 'json', 'transpile', 'convert', 'parser'],
    status: 'planned'
  },
  {
    id: 'pii-redactor',
    name: 'PII Log Redactor & Sanitizer',
    description: 'Mask sensitive credentials, emails, credit cards, and API keys with regex rules.',
    category: 'text',
    icon: 'EyeOff',
    keywords: ['pii', 'redact', 'sanitize', 'mask', 'email', 'password', 'token', 'log', 'security'],
    status: 'planned'
  },

  // System & Overview
  {
    id: 'system-overview',
    name: 'DevDot Overview & Engine Status',
    description: 'Universal developer workspace overview, worker benchmarks, and environment diagnostics.',
    category: 'system',
    icon: 'LayoutDashboard',
    keywords: ['dashboard', 'system', 'worker', 'overview', 'benchmark', 'status'],
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
  const isSnapshotModalOpen = ref<boolean>(false)
  const isMobileNavOpen = ref<boolean>(false)
  const searchQuery = ref<string>('')

  const activeTool = computed(() => {
    return ALL_TOOLS.find((t) => t.id === activeToolId.value) || ALL_TOOLS[ALL_TOOLS.length - 1]
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
      isMobileNavOpen.value = false
    }
  }

  function setCategory(category: ToolCategory) {
    activeCategory.value = category
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

  function openSnapshotModal() {
    isSnapshotModalOpen.value = true
  }

  function closeSnapshotModal() {
    isSnapshotModalOpen.value = false
  }

  return {
    // State
    activeToolId,
    activeCategory,
    isCommandPaletteOpen,
    isPrivacyModalOpen,
    isSnapshotModalOpen,
    isMobileNavOpen,
    searchQuery,
    // Getters
    activeTool,
    filteredTools,
    tools: ALL_TOOLS,
    categories: CATEGORIES,
    // Actions
    selectTool,
    setCategory,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    openPrivacyModal,
    closePrivacyModal,
    openSnapshotModal,
    closeSnapshotModal
  }
})
