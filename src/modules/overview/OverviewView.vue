<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  ShieldCheck,
  Cpu,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Send,
  Search,
  ArrowRight,
  Copy,
  Check,
  KeyRound,
  Fingerprint,
  Repeat,
  EyeOff,
  FileJson,
  Flame,
  Download,
  Upload,
  Layers,
  Lock,
  Star,
  Clock,
  LayoutGrid,
  List,
  Binary,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-vue-next'
import {
  M3Button,
  ToolIcon
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useNavigationStore, useSecurityStore, ToolDefinition, ToolCategory } from '@/stores'

const navStore = useNavigationStore()
const securityStore = useSecurityStore()
const { engine, platform, isExecuting, lastResult, error, execute } = useExecutionEngine()

// Dashboard View Mode & Filters
const overviewSearch = ref('')
const selectedCategory = ref<ToolCategory>('all')
const viewMode = ref<'grid' | 'list'>('grid')
const isDiagnosticsOpen = ref(false)

// Copy Feedback state
const isCopied = ref<Record<string, boolean>>({})

async function copyToClipboard(key: string, text: string) {
  if (!text) return
  await navigator.clipboard.writeText(text)
  isCopied.value[key] = true
  setTimeout(() => {
    isCopied.value[key] = false
  }, 1800)
}

// ----------------------------------------------------
// Quick Scratchpad / Micro-Tools State
// ----------------------------------------------------
type ScratchpadTab = 'ids' | 'hash' | 'encoder' | 'timestamp'
const activeScratchTab = ref<ScratchpadTab>('ids')

// 1. ID Generator
const quickIdType = ref<'uuid' | 'nanoid' | 'ulid'>('uuid')
const quickGeneratedId = ref('')

function generateQuickId() {
  if (quickIdType.value === 'uuid') {
    quickGeneratedId.value = crypto.randomUUID()
  } else if (quickIdType.value === 'ulid') {
    const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
    let time = Date.now()
    let timeStr = ''
    for (let i = 9; i >= 0; i--) {
      const mod = time % 32
      timeStr = ENCODING.charAt(mod) + timeStr
      time = (time - mod) / 32
    }
    const randArr = new Uint8Array(10)
    crypto.getRandomValues(randArr)
    let randStr = ''
    for (let i = 0; i < 10; i++) {
      randStr += ENCODING.charAt(randArr[i] % 32)
    }
    quickGeneratedId.value = (timeStr + randStr).toLowerCase()
  } else {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    const arr = new Uint8Array(21)
    crypto.getRandomValues(arr)
    quickGeneratedId.value = Array.from(arr).map((b) => chars[b % chars.length]).join('')
  }
}

// 2. Hasher
const quickHashInput = ref('DevDot')
const quickHashAlgo = ref<'SHA-256' | 'SHA-512' | 'SHA-1'>('SHA-256')
const quickHashOutput = ref('')

async function generateQuickHash() {
  if (!quickHashInput.value) {
    quickHashOutput.value = ''
    return
  }
  const encoder = new TextEncoder()
  const data = encoder.encode(quickHashInput.value)
  const hashBuffer = await crypto.subtle.digest(quickHashAlgo.value, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  quickHashOutput.value = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// 3. Encoder / Decoder
const quickEncodeType = ref<'base64-encode' | 'base64-decode' | 'url-encode' | 'url-decode'>('base64-encode')
const quickEncodeInput = ref('Hello DevDot')
const quickEncodeOutput = computed(() => {
  if (!quickEncodeInput.value) return ''
  try {
    switch (quickEncodeType.value) {
      case 'base64-encode':
        return btoa(unescape(encodeURIComponent(quickEncodeInput.value)))
      case 'base64-decode':
        return decodeURIComponent(escape(atob(quickEncodeInput.value)))
      case 'url-encode':
        return encodeURIComponent(quickEncodeInput.value)
      case 'url-decode':
        return decodeURIComponent(quickEncodeInput.value)
      default:
        return ''
    }
  } catch (err: any) {
    return `Error: ${err.message}`
  }
})

// 4. Live Epoch & Timestamp
const currentTimestampSec = ref(Math.floor(Date.now() / 1000))
const currentTimestampMs = ref(Date.now())
const currentIsoString = ref(new Date().toISOString())
let timerInterval: any = null

function updateTimestamps() {
  const now = new Date()
  currentTimestampSec.value = Math.floor(now.getTime() / 1000)
  currentTimestampMs.value = now.getTime()
  currentIsoString.value = now.toISOString()
}

onMounted(() => {
  generateQuickId()
  generateQuickHash()
  updateTimestamps()
  timerInterval = setInterval(updateTimestamps, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

// ----------------------------------------------------
// Filtered Tools & Categories
// ----------------------------------------------------
const allNavTools = computed(() => navStore.tools.filter((t) => t.id !== 'system-overview'))

const dashboardTools = computed(() => {
  let list = allNavTools.value
  if (selectedCategory.value !== 'all') {
    list = list.filter((t) => t.category === selectedCategory.value)
  }
  if (overviewSearch.value.trim()) {
    const q = overviewSearch.value.toLowerCase().trim()
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q))
    )
  }
  return list
})

// Group tools by Category
const groupedTools = computed(() => {
  const groups: { category: ToolCategory; label: string; icon: any; tools: ToolDefinition[] }[] = [
    {
      category: 'json',
      label: 'JSON & Data Structs',
      icon: FileJson,
      tools: []
    },
    {
      category: 'crypto',
      label: 'Crypto, Tokens & Hashes',
      icon: KeyRound,
      tools: []
    },
    {
      category: 'converters',
      label: 'Transpilers & Converters',
      icon: Repeat,
      tools: []
    },
    {
      category: 'text',
      label: 'Text, Logs & Security',
      icon: EyeOff,
      tools: []
    }
  ]

  dashboardTools.value.forEach((tool) => {
    const grp = groups.find((g) => g.category === tool.category)
    if (grp) {
      grp.tools.push(tool)
    }
  })

  return groups.filter((g) => g.tools.length > 0)
})

// Diagnostics Handlers
async function handlePing() {
  await execute('system', 'ping', {})
}

async function handleBenchmark() {
  await execute('system', 'benchmark', { count: 150000 })
}

async function handleEcho() {
  await execute('system', 'echo', {
    message: 'DevDot Execution Pipeline Active',
    timestamp: new Date().toISOString()
  })
}
</script>

<template>
  <div class="overview-launchpad">
    <!-- 1. Streamlined Workspace HUD Header -->
    <header class="workspace-hud">
      <div class="hud-main">
        <div class="hud-badge-row">
          <span class="hud-status-badge">
            <span class="status-indicator-dot"></span>
            AIR-GAPPED WORKSPACE
          </span>
          <span class="hud-sub-badge">
            <Cpu :size="13" />
            Worker Engine Ready
          </span>
        </div>

        <h1 class="hud-title">Developer Launchpad</h1>
        <p class="hud-subtitle">
          High-performance, air-gapped utilities for formatting, crypto inspection, schema generation, and data conversion.
        </p>

        <!-- Quick HUD Stats Pills -->
        <div class="hud-stat-pills">
          <div class="hud-stat-pill">
            <Lock :size="13" class="stat-pill-icon" />
            <span>0 Outbound Leaks</span>
          </div>
          <div class="hud-stat-pill">
            <Layers :size="13" class="stat-pill-icon" />
            <span>{{ allNavTools.length }} Local Tools</span>
          </div>
          <div class="hud-stat-pill">
            <ShieldCheck :size="13" class="stat-pill-icon" />
            <span>Web Crypto Native</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div class="hud-actions-box">
        <M3Button
          variant="filled"
          class="hud-cmd-btn"
          @click="navStore.openCommandPalette()"
        >
          <template #icon>
            <Search :size="16" />
          </template>
          Command Palette
          <kbd class="hud-kbd">Ctrl+K</kbd>
        </M3Button>

        <div class="hud-secondary-actions">
          <M3Button
            variant="tonal"
            @click="navStore.openSnapshotModal('export')"
          >
            <template #icon>
              <Download :size="14" />
            </template>
            Snapshot Export
          </M3Button>

          <M3Button
            variant="outlined"
            @click="navStore.openSnapshotModal('import')"
          >
            <template #icon>
              <Upload :size="14" />
            </template>
            Import
          </M3Button>

          <button
            type="button"
            class="hud-panic-btn"
            title="Panic Clear Storage & Sensitive Data"
            @click="securityStore.openPanicModal()"
          >
            <Flame :size="16" />
          </button>
        </div>
      </div>
    </header>

    <!-- 2. Pinned Favorites & Recent Tools Section (Personalized Launchpad) -->
    <section v-if="navStore.favoriteTools.length > 0 || navStore.recentTools.length > 0" class="pinned-section">
      <!-- Favorites Grid -->
      <div v-if="navStore.favoriteTools.length > 0" class="pinned-group">
        <div class="pinned-header">
          <Star :size="16" class="star-icon-filled" />
          <span class="pinned-title">Pinned Favorites</span>
          <span class="pinned-count">{{ navStore.favoriteTools.length }}</span>
        </div>

        <div class="favorites-grid">
          <div
            v-for="tool in navStore.favoriteTools"
            :key="tool.id"
            class="favorite-card"
            @click="navStore.selectTool(tool.id)"
          >
            <div class="fav-icon-box">
              <ToolIcon :name="tool.icon" :size="18" />
            </div>
            <div class="fav-info">
              <span class="fav-name">{{ tool.name }}</span>
              <span class="fav-category">{{ tool.category.toUpperCase() }}</span>
            </div>
            <button
              type="button"
              class="fav-unpin-btn"
              title="Remove from favorites"
              @click.stop="navStore.toggleFavorite(tool.id)"
            >
              <Star :size="14" class="star-icon-filled" />
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Tools Row -->
      <div v-if="navStore.recentTools.length > 0" class="pinned-group">
        <div class="pinned-header">
          <Clock :size="15" class="clock-icon" />
          <span class="pinned-title">Recently Used</span>
        </div>

        <div class="recents-row">
          <button
            v-for="tool in navStore.recentTools"
            :key="tool.id"
            type="button"
            class="recent-chip"
            @click="navStore.selectTool(tool.id)"
          >
            <ToolIcon :name="tool.icon" :size="14" />
            <span>{{ tool.name }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 3. Unified 4-in-1 Quick Scratchpad & Micro-Tools Widget -->
    <section class="scratchpad-section">
      <div class="scratchpad-card">
        <div class="scratchpad-header">
          <div class="scratchpad-nav-tabs">
            <button
              type="button"
              class="scratch-tab-btn"
              :class="{ active: activeScratchTab === 'ids' }"
              @click="activeScratchTab = 'ids'"
            >
              <Fingerprint :size="15" />
              <span>Instant ID</span>
            </button>

            <button
              type="button"
              class="scratch-tab-btn"
              :class="{ active: activeScratchTab === 'hash' }"
              @click="activeScratchTab = 'hash'"
            >
              <KeyRound :size="15" />
              <span>Quick Hash</span>
            </button>

            <button
              type="button"
              class="scratch-tab-btn"
              :class="{ active: activeScratchTab === 'encoder' }"
              @click="activeScratchTab = 'encoder'"
            >
              <Binary :size="15" />
              <span>Base64 / URL</span>
            </button>

            <button
              type="button"
              class="scratch-tab-btn"
              :class="{ active: activeScratchTab === 'timestamp' }"
              @click="activeScratchTab = 'timestamp'"
            >
              <Clock :size="15" />
              <span>Unix Epoch</span>
            </button>
          </div>

          <div class="scratchpad-badge">
            <span>Micro Scratchpad</span>
          </div>
        </div>

        <div class="scratchpad-body">
          <!-- TAB 1: ID GENERATOR -->
          <div v-if="activeScratchTab === 'ids'" class="tab-panel">
            <div class="tab-controls-row">
              <div class="sub-segmented-control">
                <button
                  type="button"
                  :class="{ active: quickIdType === 'uuid' }"
                  @click="quickIdType = 'uuid'; generateQuickId()"
                >
                  UUIDv4
                </button>
                <button
                  type="button"
                  :class="{ active: quickIdType === 'nanoid' }"
                  @click="quickIdType = 'nanoid'; generateQuickId()"
                >
                  NanoID
                </button>
                <button
                  type="button"
                  :class="{ active: quickIdType === 'ulid' }"
                  @click="quickIdType = 'ulid'; generateQuickId()"
                >
                  ULID
                </button>
              </div>

              <div class="scratchpad-actions">
                <button
                  type="button"
                  class="scratch-action-btn"
                  title="Generate New Identifier"
                  @click="generateQuickId"
                >
                  <Repeat :size="14" />
                  <span>Regenerate</span>
                </button>
                <button
                  type="button"
                  class="scratch-action-btn copy-btn"
                  title="Copy Identifier"
                  @click="copyToClipboard('scratchId', quickGeneratedId)"
                >
                  <Check v-if="isCopied['scratchId']" :size="14" class="success-icon" />
                  <Copy v-else :size="14" />
                  <span>{{ isCopied['scratchId'] ? 'Copied' : 'Copy' }}</span>
                </button>
              </div>
            </div>

            <div class="scratch-output-box">
              <code class="scratch-code">{{ quickGeneratedId }}</code>
            </div>
          </div>

          <!-- TAB 2: QUICK HASHER -->
          <div v-else-if="activeScratchTab === 'hash'" class="tab-panel">
            <div class="tab-controls-row">
              <div class="sub-segmented-control">
                <button
                  type="button"
                  :class="{ active: quickHashAlgo === 'SHA-256' }"
                  @click="quickHashAlgo = 'SHA-256'; generateQuickHash()"
                >
                  SHA-256
                </button>
                <button
                  type="button"
                  :class="{ active: quickHashAlgo === 'SHA-512' }"
                  @click="quickHashAlgo = 'SHA-512'; generateQuickHash()"
                >
                  SHA-512
                </button>
                <button
                  type="button"
                  :class="{ active: quickHashAlgo === 'SHA-1' }"
                  @click="quickHashAlgo = 'SHA-1'; generateQuickHash()"
                >
                  SHA-1
                </button>
              </div>

              <button
                type="button"
                class="scratch-action-btn copy-btn"
                title="Copy Hash"
                @click="copyToClipboard('scratchHash', quickHashOutput)"
              >
                <Check v-if="isCopied['scratchHash']" :size="14" class="success-icon" />
                <Copy v-else :size="14" />
                <span>{{ isCopied['scratchHash'] ? 'Copied' : 'Copy Hash' }}</span>
              </button>
            </div>

            <div class="scratch-hash-layout">
              <input
                v-model="quickHashInput"
                type="text"
                class="scratch-inline-input"
                placeholder="Type string to compute hash..."
                @input="generateQuickHash"
              />
              <div class="scratch-output-box truncate">
                <code class="scratch-code">{{ quickHashOutput || 'Hash output will appear here...' }}</code>
              </div>
            </div>
          </div>

          <!-- TAB 3: BASE64 / URL ENCODER -->
          <div v-else-if="activeScratchTab === 'encoder'" class="tab-panel">
            <div class="tab-controls-row">
              <div class="sub-segmented-control">
                <button
                  type="button"
                  :class="{ active: quickEncodeType === 'base64-encode' }"
                  @click="quickEncodeType = 'base64-encode'"
                >
                  Base64 Encode
                </button>
                <button
                  type="button"
                  :class="{ active: quickEncodeType === 'base64-decode' }"
                  @click="quickEncodeType = 'base64-decode'"
                >
                  Base64 Decode
                </button>
                <button
                  type="button"
                  :class="{ active: quickEncodeType === 'url-encode' }"
                  @click="quickEncodeType = 'url-encode'"
                >
                  URL Encode
                </button>
                <button
                  type="button"
                  :class="{ active: quickEncodeType === 'url-decode' }"
                  @click="quickEncodeType = 'url-decode'"
                >
                  URL Decode
                </button>
              </div>

              <button
                type="button"
                class="scratch-action-btn copy-btn"
                title="Copy Result"
                @click="copyToClipboard('scratchEncode', quickEncodeOutput)"
              >
                <Check v-if="isCopied['scratchEncode']" :size="14" class="success-icon" />
                <Copy v-else :size="14" />
                <span>{{ isCopied['scratchEncode'] ? 'Copied' : 'Copy Result' }}</span>
              </button>
            </div>

            <div class="scratch-hash-layout">
              <input
                v-model="quickEncodeInput"
                type="text"
                class="scratch-inline-input"
                placeholder="Type text to convert..."
              />
              <div class="scratch-output-box truncate">
                <code class="scratch-code">{{ quickEncodeOutput || 'Conversion preview...' }}</code>
              </div>
            </div>
          </div>

          <!-- TAB 4: UNIX EPOCH & TIMESTAMPS -->
          <div v-else-if="activeScratchTab === 'timestamp'" class="tab-panel">
            <div class="epoch-grid">
              <div class="epoch-card">
                <div class="epoch-label">Unix Seconds</div>
                <div class="epoch-value-row">
                  <code>{{ currentTimestampSec }}</code>
                  <button
                    type="button"
                    class="scratch-mini-copy"
                    @click="copyToClipboard('epochSec', currentTimestampSec.toString())"
                  >
                    <Check v-if="isCopied['epochSec']" :size="12" class="success-icon" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
              </div>

              <div class="epoch-card">
                <div class="epoch-label">Unix Milliseconds</div>
                <div class="epoch-value-row">
                  <code>{{ currentTimestampMs }}</code>
                  <button
                    type="button"
                    class="scratch-mini-copy"
                    @click="copyToClipboard('epochMs', currentTimestampMs.toString())"
                  >
                    <Check v-if="isCopied['epochMs']" :size="12" class="success-icon" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
              </div>

              <div class="epoch-card span-full">
                <div class="epoch-label">ISO-8601 UTC Time</div>
                <div class="epoch-value-row">
                  <code>{{ currentIsoString }}</code>
                  <button
                    type="button"
                    class="scratch-mini-copy"
                    @click="copyToClipboard('epochIso', currentIsoString)"
                  >
                    <Check v-if="isCopied['epochIso']" :size="12" class="success-icon" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Tool Catalog & Filters Section -->
    <section class="catalog-section">
      <!-- Catalog Controls Bar -->
      <div class="catalog-filter-bar">
        <div class="filter-left">
          <div class="catalog-search-wrapper">
            <Search :size="16" class="search-icon" />
            <input
              v-model="overviewSearch"
              type="text"
              class="catalog-search-field"
              placeholder="Filter tools by name, tag, or keyword..."
            />
            <button
              v-if="overviewSearch"
              type="button"
              class="clear-filter-btn"
              @click="overviewSearch = ''"
            >
              <X :size="14" />
            </button>
          </div>

          <!-- Category Filter Pills -->
          <div class="category-pills">
            <button
              v-for="cat in navStore.categories"
              :key="cat.id"
              type="button"
              class="cat-pill"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- View Density Toggle (Grid vs List) -->
        <div class="view-mode-toggle">
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ active: viewMode === 'grid' }"
            title="Grid View"
            @click="viewMode = 'grid'"
          >
            <LayoutGrid :size="16" />
          </button>
          <button
            type="button"
            class="view-toggle-btn"
            :class="{ active: viewMode === 'list' }"
            title="List View"
            @click="viewMode = 'list'"
          >
            <List :size="16" />
          </button>
        </div>
      </div>

      <!-- Tool Catalog Grid/List Container -->
      <div v-if="groupedTools.length > 0" class="tool-groups-wrapper">
        <div
          v-for="group in groupedTools"
          :key="group.category"
          class="category-group"
        >
          <!-- Category Section Header -->
          <div class="group-header">
            <div class="group-title-box">
              <component :is="group.icon" :size="18" class="group-icon" />
              <h3>{{ group.label }}</h3>
            </div>
            <span class="group-badge">{{ group.tools.length }} tools</span>
          </div>

          <!-- Tools Container (Grid View) -->
          <div v-if="viewMode === 'grid'" class="tool-cards-grid">
            <div
              v-for="tool in group.tools"
              :key="tool.id"
              class="tool-card"
              @click="navStore.selectTool(tool.id)"
            >
              <div class="card-top-row">
                <div class="card-icon-container">
                  <ToolIcon :name="tool.icon" :size="22" />
                </div>
                <div class="card-top-actions">
                  <span class="category-tag">{{ tool.category.toUpperCase() }}</span>
                  <button
                    type="button"
                    class="card-star-btn"
                    :class="{ active: navStore.isFavorite(tool.id) }"
                    :title="navStore.isFavorite(tool.id) ? 'Remove Favorite' : 'Add to Favorites'"
                    @click.stop="navStore.toggleFavorite(tool.id)"
                  >
                    <Star :size="15" :class="{ 'star-filled': navStore.isFavorite(tool.id) }" />
                  </button>
                </div>
              </div>

              <div class="card-content">
                <h4 class="card-name">{{ tool.name }}</h4>
                <p class="card-desc">{{ tool.description }}</p>
              </div>

              <div class="card-keywords-row">
                <span
                  v-for="kw in tool.keywords.slice(0, 3)"
                  :key="kw"
                  class="kw-badge"
                >
                  {{ kw }}
                </span>
              </div>

              <div class="card-footer">
                <span class="launch-text">Launch Tool</span>
                <ArrowRight :size="15" class="launch-arrow" />
              </div>
            </div>
          </div>

          <!-- Tools Container (List View) -->
          <div v-else class="tool-cards-list">
            <div
              v-for="tool in group.tools"
              :key="tool.id"
              class="tool-list-row"
              @click="navStore.selectTool(tool.id)"
            >
              <div class="list-icon-box">
                <ToolIcon :name="tool.icon" :size="18" />
              </div>
              <div class="list-content">
                <div class="list-title-row">
                  <span class="list-name">{{ tool.name }}</span>
                  <span class="category-tag small">{{ tool.category.toUpperCase() }}</span>
                </div>
                <p class="list-desc">{{ tool.description }}</p>
              </div>
              <div class="list-actions">
                <button
                  type="button"
                  class="card-star-btn"
                  :class="{ active: navStore.isFavorite(tool.id) }"
                  @click.stop="navStore.toggleFavorite(tool.id)"
                >
                  <Star :size="15" :class="{ 'star-filled': navStore.isFavorite(tool.id) }" />
                </button>
                <div class="list-launch-pill">
                  <span>Open</span>
                  <ArrowRight :size="13" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-search-state">
        <AlertTriangle :size="32" class="empty-icon" />
        <h3>No tools found</h3>
        <p>No tools matched "{{ overviewSearch }}". Try clearing the search query or selecting another category.</p>
        <M3Button variant="tonal" @click="overviewSearch = ''; selectedCategory = 'all'">
          Reset Filter
        </M3Button>
      </div>
    </section>

    <!-- 5. Collapsible System Engine & Diagnostic Drawer -->
    <section class="diagnostics-drawer-section">
      <div class="diagnostics-card">
        <button
          type="button"
          class="diagnostics-toggle-header"
          @click="isDiagnosticsOpen = !isDiagnosticsOpen"
        >
          <div class="toggle-left">
            <Activity :size="18" class="diag-header-icon" />
            <div class="toggle-titles">
              <span class="diag-title">Execution Engine & Diagnostics</span>
              <span class="diag-sub">Multi-threaded Web Worker Runtime ({{ engine.name }})</span>
            </div>
          </div>

          <div class="toggle-right">
            <span class="engine-pill">{{ platform }}</span>
            <ChevronUp v-if="isDiagnosticsOpen" :size="18" />
            <ChevronDown v-else :size="18" />
          </div>
        </button>

        <div v-if="isDiagnosticsOpen" class="diagnostics-content-body">
          <div class="diagnostics-actions-bar">
            <M3Button
              variant="filled"
              :disabled="isExecuting"
              @click="handlePing"
            >
              <template #icon>
                <Activity :size="15" />
              </template>
              Ping Worker Engine
            </M3Button>

            <M3Button
              variant="tonal"
              :disabled="isExecuting"
              @click="handleBenchmark"
            >
              <template #icon>
                <Zap :size="15" />
              </template>
              Run Worker Benchmark
            </M3Button>

            <M3Button
              variant="outlined"
              :disabled="isExecuting"
              @click="handleEcho"
            >
              <template #icon>
                <Send :size="15" />
              </template>
              Echo Pipeline Test
            </M3Button>
          </div>

          <!-- Formatted Benchmark / Diagnostics Result -->
          <div v-if="lastResult || isExecuting" class="diagnostics-output-box">
            <div class="output-top-row">
              <div class="status-summary">
                <template v-if="isExecuting">
                  <span class="executing-pulse">Executing on Web Worker thread...</span>
                </template>
                <template v-else-if="lastResult?.success">
                  <CheckCircle2 :size="16" class="success-icon" />
                  <span>Pipeline Success ({{ lastResult.executionTimeMs }} ms latency)</span>
                </template>
                <template v-else>
                  <AlertTriangle :size="16" class="error-icon" />
                  <span>Pipeline Error ({{ lastResult?.executionTimeMs }} ms)</span>
                </template>
              </div>
            </div>

            <pre v-if="lastResult" class="formatted-output">{{ JSON.stringify(lastResult, null, 2) }}</pre>
            <p v-if="error" class="error-msg">{{ error }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.overview-launchpad {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  max-width: 1400px;
  margin: 0 auto;
  font-family: var(--md-sys-typescale-font-family);
  color: var(--md-sys-color-on-surface);
  padding-bottom: 3rem;
}

/* 1. Workspace HUD Header */
.workspace-hud {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  background: linear-gradient(135deg, var(--md-sys-color-surface-container-low) 0%, var(--md-sys-color-surface-container) 100%);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.hud-main {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.hud-badge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hud-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.status-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.hud-sub-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.hud-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--md-sys-color-on-surface);
}

.hud-subtitle {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--md-sys-color-on-surface-variant);
  max-width: 580px;
}

.hud-stat-pills {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.hud-stat-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.stat-pill-icon {
  color: var(--md-sys-color-primary);
}

.hud-actions-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.75rem;
}

.hud-cmd-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hud-kbd {
  font-family: inherit;
  font-size: 0.6875rem;
  padding: 0.15rem 0.4rem;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: var(--md-sys-shape-corner-extra-small);
  margin-left: auto;
}

.hud-secondary-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hud-panic-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 9999px;
  background-color: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;
}

.hud-panic-btn:hover {
  background-color: #ef4444;
  color: #ffffff;
}

/* 2. Pinned & Favorites Section */
.pinned-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.pinned-group {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.pinned-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--md-sys-color-on-surface-variant);
}

.star-icon-filled {
  color: #f59e0b;
  fill: #f59e0b;
}

.clock-icon {
  color: var(--md-sys-color-primary);
}

.pinned-count {
  font-size: 0.6875rem;
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
}

.favorite-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.favorite-card:hover {
  background-color: var(--md-sys-color-surface-container-high);
  border-color: var(--md-sys-color-primary);
  transform: translateY(-1px);
}

.fav-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  flex-shrink: 0;
}

.fav-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.fav-name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-category {
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface-variant);
  letter-spacing: 0.05em;
}

.fav-unpin-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.fav-unpin-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.recents-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.recent-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  transition: all 0.15s ease;
}

.recent-chip:hover {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

/* 3. Unified Quick Scratchpad */
.scratchpad-section {
  width: 100%;
}

.scratchpad-card {
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  overflow: hidden;
}

.scratchpad-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.scratchpad-nav-tabs {
  display: flex;
  gap: 0.25rem;
}

.scratch-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.scratch-tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.scratch-tab-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 700;
}

.scratchpad-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--md-sys-color-on-surface-variant);
}

.scratchpad-body {
  padding: 1rem 1.25rem;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tab-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sub-segmented-control {
  display: flex;
  gap: 0.2rem;
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.2rem;
  border-radius: 9999px;
}

.sub-segmented-control button {
  background: transparent;
  border: none;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.15s ease;
}

.sub-segmented-control button.active {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

.scratchpad-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.scratch-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.scratch-action-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.scratch-action-btn.copy-btn {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: transparent;
}

.scratch-output-box {
  display: flex;
  align-items: center;
  padding: 0.65rem 0.85rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  min-height: 38px;
}

.scratch-code {
  font-family: var(--md-sys-typescale-code-font-family, monospace);
  font-size: 0.8125rem;
  color: var(--md-sys-color-primary);
  word-break: break-all;
}

.scratch-hash-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 0.75rem;
}

.scratch-inline-input {
  padding: 0.65rem 0.85rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.scratch-inline-input:focus {
  border-color: var(--md-sys-color-primary);
}

/* Epoch Timestamp Grid */
.epoch-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.epoch-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
}

.epoch-card.span-full {
  grid-column: 1 / -1;
}

.epoch-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
}

.epoch-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.epoch-value-row code {
  font-family: monospace;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--md-sys-color-primary);
}

.scratch-mini-copy {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  color: var(--md-sys-color-on-surface-variant);
}

/* 4. Tool Catalog & Filters */
.catalog-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.catalog-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
}

.catalog-search-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 9999px;
  min-width: 280px;
}

.search-icon {
  color: var(--md-sys-color-on-surface-variant);
}

.catalog-search-field {
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
  outline: none;
  width: 100%;
}

.clear-filter-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
}

.category-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.cat-pill {
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-pill:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.cat-pill.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.view-mode-toggle {
  display: flex;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.15rem;
}

.view-toggle-btn {
  border: none;
  background: transparent;
  padding: 0.35rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-extra-small);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-toggle-btn.active {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
}

/* Tool Groups & Cards */
.tool-groups-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  padding-bottom: 0.5rem;
}

.group-title-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-icon {
  color: var(--md-sys-color-primary);
}

.group-title-box h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.group-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

/* Grid Cards */
.tool-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1rem;
}

.tool-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.25rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 200px;
}

.tool-card:hover {
  background-color: var(--md-sys-color-surface-container);
  border-color: var(--md-sys-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--md-sys-shape-corner-medium);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.card-top-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.category-tag {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 9999px;
}

.category-tag.small {
  font-size: 0.5625rem;
  padding: 0.1rem 0.4rem;
}

.card-star-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.15s ease;
}

.card-star-btn:hover {
  color: #f59e0b;
  transform: scale(1.15);
}

.card-star-btn.active .star-filled {
  color: #f59e0b;
  fill: #f59e0b;
}

.card-content {
  margin: 0.75rem 0 0.5rem 0;
}

.card-name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.card-desc {
  margin: 0.35rem 0 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--md-sys-color-on-surface-variant);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-keywords-row {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin: 0.5rem 0;
}

.kw-badge {
  font-size: 0.625rem;
  padding: 0.1rem 0.4rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-extra-small);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.launch-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--md-sys-color-primary);
}

.launch-arrow {
  color: var(--md-sys-color-primary);
  transition: transform 0.2s ease;
}

.tool-card:hover .launch-arrow {
  transform: translateX(4px);
}

/* List View */
.tool-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-list-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tool-list-row:hover {
  background-color: var(--md-sys-color-surface-container);
  border-color: var(--md-sys-color-primary);
}

.list-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  flex-shrink: 0;
}

.list-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.list-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.list-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.list-desc {
  margin: 0.15rem 0 0 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.list-launch-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
}

/* Empty State */
.empty-search-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  gap: 0.75rem;
}

.empty-icon {
  color: #f59e0b;
}

/* 5. Diagnostics Drawer */
.diagnostics-drawer-section {
  margin-top: 1rem;
}

.diagnostics-card {
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  overflow: hidden;
}

.diagnostics-toggle-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--md-sys-color-on-surface);
  text-align: left;
}

.diagnostics-toggle-header:hover {
  background-color: var(--md-sys-color-surface-container);
}

.toggle-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.diag-header-icon {
  color: var(--md-sys-color-primary);
}

.toggle-titles {
  display: flex;
  flex-direction: column;
}

.diag-title {
  font-size: 0.875rem;
  font-weight: 700;
}

.diag-sub {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

.toggle-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.engine-pill {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 9999px;
  text-transform: uppercase;
}

.diagnostics-content-body {
  padding: 1.25rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.diagnostics-actions-bar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.diagnostics-output-box {
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.85rem;
}

.output-top-row {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.success-icon {
  color: #10b981;
}

.error-icon {
  color: #ef4444;
}

.formatted-output {
  margin: 0;
  font-family: var(--md-sys-typescale-code-font-family, monospace);
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.75rem;
  border-radius: var(--md-sys-shape-corner-extra-small);
  max-height: 200px;
  overflow-y: auto;
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .workspace-hud {
    grid-template-columns: 1fr;
  }
  .scratch-hash-layout {
    grid-template-columns: 1fr;
  }
  .epoch-grid {
    grid-template-columns: 1fr;
  }
}
</style>
