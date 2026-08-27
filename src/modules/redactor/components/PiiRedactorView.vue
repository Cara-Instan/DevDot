<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  EyeOff,
  Copy,
  Check,
  RotateCcw,
  Download,
  Play,
  SlidersHorizontal,
  Plus,
  Minus,
  X,
  FileText,
  Layers,
  Search,
  Key,
  CreditCard,
  Mail,
  Lock,
  Globe,
  Phone,
  Hash,
  Cpu,
  Table,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  FileCheck2
} from 'lucide-vue-next'
import {
  M3Button,
  M3Switch,
  M3TextField,
  M3Dialog
} from '@/components'
import { CodeEditor } from '@/components/editor'
import { useSnapshotStore, useSecurityStore } from '@/stores'
import {
  DEFAULT_PII_RULES,
  redactPii
} from '../services/pii-redactor-service'
import type {
  PiiCategory,
  MaskingMode,
  PiiRule,
  PiiRedactResult,
  PiiMatch
} from '../types'

const snapshotStore = useSnapshotStore()
const securityStore = useSecurityStore()

// Root & Fullscreen
const rootRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)

// State
const initialSaved = snapshotStore.getToolState('pii-redactor', {
  inputText: '',
  maskingMode: 'category-tag' as MaskingMode,
  customMask: '[REDACTED]',
  preserveLength: false,
  activeRuleIds: DEFAULT_PII_RULES.map((r) => r.id),
  customRules: [] as PiiRule[],
  showStructural: true,
  structuralPanelHeight: 260,
  isPanelMaximized: false
})

const inputText = ref(initialSaved.inputText || '')
const outputText = ref('')
const maskingMode = ref<MaskingMode>(initialSaved.maskingMode || 'category-tag')
const customMask = ref(initialSaved.customMask || '[REDACTED]')
const preserveLength = ref(initialSaved.preserveLength || false)
const isCopied = ref(false)
const copiedMatchId = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)
const totalMatches = ref(0)
const matchesByCategory = ref<Record<PiiCategory, number>>({
  email: 0,
  password: 0,
  'credit-card': 0,
  jwt: 0,
  ip: 0,
  'api-key': 0,
  phone: 0,
  ssn: 0,
  'mac-address': 0,
  custom: 0
})
const matchesList = ref<PiiMatch[]>([])

// Bottom Structural Panel State
const showStructural = ref<boolean>(initialSaved.showStructural ?? true)
const structuralPanelHeight = ref<number>(initialSaved.structuralPanelHeight ?? 260)
const isPanelMaximized = ref<boolean>(initialSaved.isPanelMaximized ?? false)
const isPanelDragging = ref(false)
const filterQuery = ref('')
const selectedFilterCategory = ref<string>('all')

// Rules Management
const activeRuleIds = ref<string[]>(initialSaved.activeRuleIds || DEFAULT_PII_RULES.map((r) => r.id))
const customRules = ref<PiiRule[]>(initialSaved.customRules || [])
const isRulesDrawerOpen = ref(false)
const isAddCustomRuleDialogOpen = ref(false)

// New Custom Rule Form State
const newRuleName = ref('')
const newRulePattern = ref('')
const newRuleFlags = ref('g')
const newRuleReplacement = ref('[CUSTOM_REDACTED]')
const newRuleCategory = ref<PiiCategory>('custom')
const customRuleError = ref<string | null>(null)

// Masking Modes list
const MASKING_MODES: { id: MaskingMode; label: string; description: string; example: string }[] = [
  {
    id: 'category-tag',
    label: 'Category Tag',
    description: 'Replace with descriptive category placeholder tags',
    example: '[EMAIL], [CREDIT_CARD], [IP_ADDRESS]'
  },
  {
    id: 'fixed-mask',
    label: 'Fixed String',
    description: 'Replace all matches with a uniform custom string',
    example: '[REDACTED] or ***'
  },
  {
    id: 'asterisks',
    label: 'Asterisks (*)',
    description: 'Mask with asterisks (fixed length or matching length)',
    example: '*** or **********'
  },
  {
    id: 'partial',
    label: 'Partial Masking',
    description: 'Keep start/end characters visible for debugging context',
    example: 'j***e@domain.com, 4111-****-1234'
  },
  {
    id: 'hash-pseudonym',
    label: 'Hash Pseudonym',
    description: 'Deterministic hash pseudonym preserving referential logs',
    example: '[REDACTED_#3f8a] (same key = same hash)'
  }
]

// Preset Sample Logs
const SAMPLES: Record<string, { label: string; desc: string; content: string }> = {
  serverAccessLog: {
    label: 'Access Log',
    desc: 'Web server access log with client IPs, auth tokens, emails, and sensitive query parameters.',
    content: `2026-08-27T08:14:22.104Z [INFO] HTTP/1.1 GET /api/v1/users?email=sarah.connor@cyberdyne.com&auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfODkyMSIsInJvbGUiOiJ1c2VyIn0.wE_45nL_89kM
Client IP: 192.168.1.105 forwarded for 203.0.113.195 - User-Agent: Mozilla/5.0
2026-08-27T08:14:23.412Z [DEBUG] DB query executed for user=sarah.connor@cyberdyne.com (id: 492)
2026-08-27T08:15:01.882Z [ERROR] Failed login attempt for user 'john.doe@example.org' from host 10.240.0.14: password=SuperSecretPassword99!
2026-08-27T08:15:45.301Z [INFO] Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
2026-08-27T08:16:10.005Z [WARN] Rate limit reached for IPv6 client 2001:0db8:85a3:0000:0000:8a2e:0370:7334 on MAC 00:1A:2B:3C:4D:5E`
  },
  paymentLog: {
    label: 'Payment',
    desc: 'Checkout event payload containing customer card numbers, billing emails, phone, and Stripe API keys.',
    content: `{
  "event": "charge.succeeded",
  "api_key": "sk_live_51MszJ8Kl48v92NlQ9837192837491209384",
  "customer": {
    "name": "Alexander Pierce",
    "email": "a.pierce@shield-defense.gov",
    "phone": "+1 (555) 439-8821",
    "national_id": "452-88-9102",
    "shipping_address": {
      "street": "100 Constitution Ave",
      "city": "Washington",
      "ip_address": "172.56.21.89"
    }
  },
  "payment_method": {
    "type": "credit_card",
    "card_number": "4532-8921-3841-9023",
    "cvv": "892",
    "client_secret": "pi_3N92kLKl48v92NlQ0_secret_8hA71bNq9"
  }
}`
  },
  cloudInfraLog: {
    label: 'AWS Keys',
    desc: 'Deployment log containing AWS access credentials, database connection strings, and Slack webhooks.',
    content: `[terraform-apply] Initializing AWS Provider...
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
Connecting to database instance: postgresql://admin_master:P@ssw0rd2026!@10.0.1.250:5432/production_db
Exporting GitHub deployment token: ghp_918237498172938471928374918237498172
Sending status notification to Slack: xoxb-123456789012-1234567890123-456789abcdefghijklmnopqrstuvwxyz
Google Cloud Storage API Key: AIzaSyD-98127398127398127398127398123`
  },
  crmQueryLog: {
    label: 'Contacts',
    desc: 'Customer export containing phone numbers, SSNs, personal emails, and MAC addresses.',
    content: `ID: 1001 | Name: Ethan Hunt | Email: hunt.e@imf-ops.net | Phone: +62 812-9876-5432 | SSN: 881-23-4910 | Device MAC: 00-50-56-C0-00-08
ID: 1002 | Name: Benji Dunn | Email: benji@imf-tech.org | Phone: (415) 892-1002 | SSN: 992-10-8831 | IP: 198.51.100.45
ID: 1003 | Name: Luther Stickell | Email: luther@hacker-net.io | Phone: +44 20 7946 0912 | Password: correct-horse-battery-staple`
  }
}

// All active rules combined
const allRulesList = computed(() => {
  return [...DEFAULT_PII_RULES, ...customRules.value]
})

// Filtered matches for the inspector table
const filteredMatches = computed(() => {
  let list = matchesList.value
  if (selectedFilterCategory.value !== 'all') {
    list = list.filter((m) => m.category === selectedFilterCategory.value)
  }
  if (filterQuery.value.trim()) {
    const q = filterQuery.value.toLowerCase().trim()
    list = list.filter((m) =>
      m.ruleName.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.originalValue.toLowerCase().includes(q) ||
      m.maskedValue.toLowerCase().includes(q)
    )
  }
  return list
})

// Input line count
const inputLineCount = computed(() => {
  if (!inputText.value) return 0
  return (inputText.value.match(/\n/g) || []).length + 1
})

// Output line count
const outputLineCount = computed(() => {
  if (!outputText.value) return 0
  return (outputText.value.match(/\n/g) || []).length + 1
})

// Redact execution function
function handleRedact() {
  if (!inputText.value.trim()) {
    outputText.value = ''
    totalMatches.value = 0
    matchesList.value = []
    executionTimeMs.value = 0
    return
  }

  const result: PiiRedactResult = redactPii(inputText.value, {
    maskingMode: maskingMode.value,
    customMask: customMask.value,
    preserveLength: preserveLength.value,
    activeRuleIds: activeRuleIds.value,
    customRules: customRules.value
  })

  outputText.value = result.redactedText
  totalMatches.value = result.totalMatches
  matchesByCategory.value = result.matchesByCategory
  matchesList.value = result.matches
  executionTimeMs.value = result.executionTimeMs

  // Save to snapshot store
  snapshotStore.setToolState('pii-redactor', {
    inputText: inputText.value,
    maskingMode: maskingMode.value,
    customMask: customMask.value,
    preserveLength: preserveLength.value,
    activeRuleIds: activeRuleIds.value,
    customRules: customRules.value,
    showStructural: showStructural.value,
    structuralPanelHeight: structuralPanelHeight.value,
    isPanelMaximized: isPanelMaximized.value
  })
}

// Debounced auto-redact
let debounceTimer: any = null
function queueRedact() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    handleRedact()
  }, 150)
}

watch(
  [inputText, maskingMode, customMask, preserveLength, activeRuleIds, customRules],
  () => {
    queueRedact()
  },
  { deep: true }
)

// Sync panel states
watch(
  [showStructural, structuralPanelHeight, isPanelMaximized],
  () => {
    snapshotStore.setToolState('pii-redactor', {
      inputText: inputText.value,
      maskingMode: maskingMode.value,
      customMask: customMask.value,
      preserveLength: preserveLength.value,
      activeRuleIds: activeRuleIds.value,
      customRules: customRules.value,
      showStructural: showStructural.value,
      structuralPanelHeight: structuralPanelHeight.value,
      isPanelMaximized: isPanelMaximized.value
    })
  }
)

// Fullscreen Toggle
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    if (rootRef.value?.requestFullscreen) {
      rootRef.value.requestFullscreen().catch(() => {})
    }
  } else {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}

// Panel Height Controls
function increasePanelHeight(step = 80) {
  isPanelMaximized.value = false
  structuralPanelHeight.value = Math.min(650, structuralPanelHeight.value + step)
}

function decreasePanelHeight(step = 80) {
  isPanelMaximized.value = false
  structuralPanelHeight.value = Math.max(120, structuralPanelHeight.value - step)
}

function setPanelPreset(height: number) {
  isPanelMaximized.value = false
  structuralPanelHeight.value = height
}

function togglePanelMaximize() {
  isPanelMaximized.value = !isPanelMaximized.value
}

// Drag & Resize Handlers for Structural Panel
function startPanelDrag(event: MouseEvent | TouchEvent) {
  event.preventDefault()
  isPanelDragging.value = true
  isPanelMaximized.value = false

  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'

  const startY = 'touches' in event ? event.touches[0].clientY : event.clientY
  const startHeight = structuralPanelHeight.value

  function onDrag(moveEvent: MouseEvent | TouchEvent) {
    if (!isPanelDragging.value) return
    const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
    const deltaY = startY - currentY
    const newHeight = Math.max(120, Math.min(650, startHeight + deltaY))
    structuralPanelHeight.value = newHeight
  }

  function stopDrag() {
    isPanelDragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onDrag)
    window.removeEventListener('touchmove', onDrag)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchend', stopDrag)
  }

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchend', stopDrag)
}

// Toggle individual rule
function toggleRule(ruleId: string) {
  if (activeRuleIds.value.includes(ruleId)) {
    activeRuleIds.value = activeRuleIds.value.filter((id) => id !== ruleId)
  } else {
    activeRuleIds.value.push(ruleId)
  }
}

// Toggle all rules
function toggleAllRules(enable: boolean) {
  if (enable) {
    activeRuleIds.value = allRulesList.value.map((r) => r.id)
  } else {
    activeRuleIds.value = []
  }
}

// Add custom regex rule
function handleAddCustomRule() {
  customRuleError.value = null

  if (!newRuleName.value.trim()) {
    customRuleError.value = 'Rule name is required.'
    return
  }

  if (!newRulePattern.value.trim()) {
    customRuleError.value = 'Regex pattern is required.'
    return
  }

  try {
    new RegExp(newRulePattern.value.trim(), newRuleFlags.value)
  } catch (err: any) {
    customRuleError.value = `Invalid Regular Expression: ${err.message}`
    return
  }

  const newRule: PiiRule = {
    id: `custom-rule-${Date.now()}`,
    name: newRuleName.value.trim(),
    category: newRuleCategory.value,
    pattern: newRulePattern.value.trim(),
    flags: newRuleFlags.value || 'g',
    replacement: newRuleReplacement.value.trim() || '[REDACTED]',
    enabled: true,
    isCustom: true,
    description: `User-defined custom regex rule`
  }

  customRules.value.push(newRule)
  activeRuleIds.value.push(newRule.id)

  newRuleName.value = ''
  newRulePattern.value = ''
  newRuleFlags.value = 'g'
  newRuleReplacement.value = '[CUSTOM_REDACTED]'
  isAddCustomRuleDialogOpen.value = false
}

// Remove custom rule
function removeCustomRule(ruleId: string) {
  customRules.value = customRules.value.filter((r) => r.id !== ruleId)
  activeRuleIds.value = activeRuleIds.value.filter((id) => id !== ruleId)
}

// Load sample preset
function loadSample(key: string) {
  if (SAMPLES[key]) {
    inputText.value = SAMPLES[key].content
  }
}

// Clear input & output
function handleClear() {
  inputText.value = ''
  outputText.value = ''
  totalMatches.value = 0
  matchesList.value = []
}

// Copy redacted output
async function copyOutput() {
  if (!outputText.value) return
  const success = await securityStore.copyToClipboard(outputText.value, {
    label: 'Redacted Log Output'
  })
  if (success) {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}

// Copy single entity original value
async function copyEntityValue(val: string, id: string) {
  try {
    await navigator.clipboard.writeText(val)
    copiedMatchId.value = id
    setTimeout(() => {
      if (copiedMatchId.value === id) copiedMatchId.value = null
    }, 1500)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

// Export structural entities as Markdown table
async function copyEntitiesAsMarkdown() {
  if (!matchesList.value.length) return
  const header = `| # | Category | Rule | Location | Masked Value | Original Value |\n|---|---|---|---|---|---|`
  const rows = matchesList.value.map(
    (m, idx) => `| ${idx + 1} | ${m.category.toUpperCase()} | ${m.ruleName} | Line ${m.line}:${m.column} | \`${m.maskedValue}\` | \`${m.originalValue}\` |`
  )
  const md = [header, ...rows].join('\n')
  await navigator.clipboard.writeText(md)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

// Export structural entities as CSV
async function copyEntitiesAsCsv() {
  if (!matchesList.value.length) return
  const header = `"Index","Category","Rule","Line","Column","MaskedValue","OriginalValue"`
  const rows = matchesList.value.map(
    (m, idx) =>
      `"${idx + 1}","${m.category}","${m.ruleName.replace(/"/g, '""')}","${m.line}","${m.column}","${m.maskedValue.replace(/"/g, '""')}","${m.originalValue.replace(/"/g, '""')}"`
  )
  const csv = [header, ...rows].join('\n')
  await navigator.clipboard.writeText(csv)
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

// Download redacted output as file
function downloadOutput() {
  if (!outputText.value) return
  const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sanitized-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper to get category icon component
function getCategoryIcon(category: PiiCategory) {
  switch (category) {
    case 'email': return Mail
    case 'password': return Lock
    case 'credit-card': return CreditCard
    case 'jwt': return Key
    case 'ip': return Globe
    case 'api-key': return Cpu
    case 'phone': return Phone
    case 'ssn': return Hash
    case 'mac-address': return Layers
    default: return EyeOff
  }
}

// Helper to get category badge color class
function getCategoryBadgeClass(category: PiiCategory) {
  switch (category) {
    case 'email': return 'badge-email'
    case 'password': return 'badge-password'
    case 'credit-card': return 'badge-card'
    case 'jwt': return 'badge-jwt'
    case 'ip': return 'badge-ip'
    case 'api-key': return 'badge-api'
    case 'phone': return 'badge-phone'
    case 'ssn': return 'badge-ssn'
    case 'mac-address': return 'badge-mac'
    default: return 'badge-custom'
  }
}

onMounted(() => {
  if (!inputText.value) {
    loadSample('serverAccessLog')
  } else {
    handleRedact()
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    ref="rootRef"
    class="pii-redactor-container"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <!-- Top Toolbar Controls (Matching JSON Diff Toolbar Layout) -->
    <div class="diff-toolbar">
      <div class="toolbar-left">
        <!-- Masking Mode Segment -->
        <div class="control-group">
          <label class="control-label">Masking:</label>
          <div class="segment-group">
            <button
              v-for="mode in MASKING_MODES"
              :key="mode.id"
              type="button"
              class="segment-btn"
              :class="{ active: maskingMode === mode.id }"
              :title="mode.description"
              @click="maskingMode = mode.id"
            >
              <span>{{ mode.label }}</span>
            </button>
          </div>
        </div>

        <!-- Sample Presets Segment -->
        <div class="control-group sample-presets-group">
          <label class="control-label">Samples:</label>
          <div class="segment-group">
            <button
              v-for="(sample, key) in SAMPLES"
              :key="key"
              type="button"
              class="segment-btn"
              :title="sample.desc"
              @click="loadSample(key as string)"
            >
              {{ sample.label }}
            </button>
          </div>
        </div>

        <!-- Custom Mask Input (if fixed-mask selected) -->
        <div v-if="maskingMode === 'fixed-mask'" class="custom-mask-input-wrap">
          <input
            v-model="customMask"
            type="text"
            class="custom-mask-field"
            placeholder="[REDACTED]"
            title="Custom replacement mask"
          />
        </div>

        <!-- Quick Toggles -->
        <div class="toggle-control">
          <M3Switch
            v-model="preserveLength"
            label="Preserve Length"
          />
        </div>

        <!-- Rules Config Toggle Button -->
        <button
          type="button"
          class="mode-toggle-btn"
          :class="{ active: isRulesDrawerOpen }"
          @click="isRulesDrawerOpen = !isRulesDrawerOpen"
        >
          <SlidersHorizontal :size="14" />
          <span>Rules ({{ activeRuleIds.length }}/{{ allRulesList.length }})</span>
        </button>
      </div>

      <div class="toolbar-right">
        <M3Button
          variant="tonal"
          title="Re-run PII Sanitization"
          @click="handleRedact"
        >
          <template #icon>
            <Play :size="14" />
          </template>
          Sanitize
        </M3Button>

        <M3Button
          variant="tonal"
          title="Copy Sanitized Log Output"
          :disabled="!outputText"
          @click="copyOutput"
        >
          <template #icon>
            <component :is="isCopied ? Check : Copy" :size="14" />
          </template>
          {{ isCopied ? 'Copied' : 'Copy Output' }}
        </M3Button>

        <M3Button
          variant="tonal"
          title="Download Sanitized Log File"
          :disabled="!outputText"
          @click="downloadOutput"
        >
          <template #icon>
            <Download :size="14" />
          </template>
          Download .log
        </M3Button>

        <M3Button
          variant="outlined"
          title="Clear Inputs"
          @click="handleClear"
        >
          <template #icon>
            <RotateCcw :size="14" />
          </template>
          Clear
        </M3Button>

        <!-- Fullscreen / Maximize Toggle Button -->
        <M3Button
          :variant="isFullscreen ? 'filled' : 'tonal'"
          :title="isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Mode'"
          class="fullscreen-toggle-btn"
          @click="toggleFullscreen"
        >
          <template #icon>
            <component :is="isFullscreen ? Minimize2 : Maximize2" :size="14" />
          </template>
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </M3Button>
      </div>
    </div>

    <!-- Summary Stats Bar (Matching JSON Diff Stats Bar Layout) -->
    <div class="diff-stats-bar">
      <div class="stats-left">
        <!-- Match / Equality Badge -->
        <div
          class="status-badge"
          :class="totalMatches === 0 ? 'badge-identical' : 'badge-different'"
        >
          <component :is="totalMatches === 0 ? FileCheck2 : EyeOff" :size="14" />
          <span>{{ totalMatches === 0 ? 'Clean / No PII' : `${totalMatches} PII Redacted` }}</span>
        </div>

        <!-- Breakdown Category Pills -->
        <template v-for="(count, cat) in matchesByCategory" :key="cat">
          <div
            v-if="count > 0"
            class="stat-pill"
            :class="`stat-${cat}`"
            :title="`${count} ${cat} entities detected`"
          >
            <component :is="getCategoryIcon(cat as PiiCategory)" :size="12" />
            <span>{{ count }} {{ cat }}</span>
          </div>
        </template>

        <!-- Total Changes Meta -->
        <span class="stat-meta">
          Total entities: <strong>{{ totalMatches }}</strong> ({{ inputLineCount }} lines)
        </span>
      </div>

      <div class="stats-right">
        <!-- Structural / Entity Inspector Toggle Button -->
        <button
          type="button"
          class="structural-toggle-btn"
          :class="{ active: showStructural }"
          @click="showStructural = !showStructural"
        >
          <Table :size="14" />
          <span>Detected Entities ({{ matchesList.length }})</span>
        </button>

        <span class="privacy-note">
          <Lock :size="12" />
          100% Offline Client-Side
        </span>

        <span v-if="executionTimeMs !== null" class="exec-time-pill">
          {{ executionTimeMs }} ms
        </span>
      </div>
    </div>

    <!-- Rules Configuration Accordion / Drawer -->
    <transition name="expand">
      <div v-if="isRulesDrawerOpen" class="rules-manager-panel">
        <div class="rules-header">
          <div class="rules-title">
            <SlidersHorizontal :size="16" />
            <h3>PII Detection Rules & Custom Regular Expressions</h3>
          </div>
          <div class="rules-header-actions">
            <M3Button variant="text" size="small" @click="toggleAllRules(true)">
              Enable All
            </M3Button>
            <M3Button variant="text" size="small" @click="toggleAllRules(false)">
              Disable All
            </M3Button>
            <M3Button variant="tonal" size="small" @click="isAddCustomRuleDialogOpen = true">
              <template #icon>
                <Plus :size="14" />
              </template>
              Add Custom Regex
            </M3Button>
            <button
              type="button"
              class="close-rules-btn"
              title="Close rules manager"
              @click="isRulesDrawerOpen = false"
            >
              <X :size="16" />
            </button>
          </div>
        </div>

        <!-- Rules Grid -->
        <div class="rules-grid">
          <div
            v-for="rule in allRulesList"
            :key="rule.id"
            class="rule-card"
            :class="{ active: activeRuleIds.includes(rule.id) }"
          >
            <div class="rule-card-top">
              <div class="rule-title-group" @click="toggleRule(rule.id)">
                <input
                  type="checkbox"
                  :checked="activeRuleIds.includes(rule.id)"
                  class="rule-checkbox"
                  @click.stop="toggleRule(rule.id)"
                />
                <component
                  :is="getCategoryIcon(rule.category)"
                  :size="15"
                  class="rule-cat-icon"
                />
                <span class="rule-name">{{ rule.name }}</span>
              </div>

              <div class="rule-card-badges">
                <span
                  class="cat-badge"
                  :class="getCategoryBadgeClass(rule.category)"
                >
                  {{ rule.category }}
                </span>
                <button
                  v-if="rule.isCustom"
                  type="button"
                  class="delete-rule-btn"
                  title="Remove Custom Rule"
                  @click="removeCustomRule(rule.id)"
                >
                  <X :size="13" />
                </button>
              </div>
            </div>

            <p class="rule-desc">{{ rule.description }}</p>
            <div v-if="rule.example" class="rule-example">
              <code>{{ rule.example }}</code>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- MAIN REDACTOR WORKSPACE (Split side-by-side like JSON Diff) -->
    <div class="diff-workspace">
      <div class="edit-mode-grid">
        <!-- Left Panel: Raw Input -->
        <div class="edit-panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <FileText :size="14" />
              <span class="panel-title">Raw Log / Text Input</span>
              <span class="line-badge">{{ inputLineCount }} lines</span>
            </div>
            <div class="panel-header-actions">
              <button
                v-if="inputText"
                type="button"
                class="panel-mini-btn"
                title="Clear input"
                @click="handleClear"
              >
                Clear
              </button>
            </div>
          </div>
          <div class="editor-inner-wrap">
            <CodeEditor
              v-model="inputText"
              language="text"
              placeholder="Paste server logs, JSON dumps, curl headers, or confidential data here to redact..."
              height="100%"
            />
          </div>
        </div>

        <!-- Right Panel: Sanitized Output -->
        <div class="edit-panel">
          <div class="panel-header">
            <div class="panel-title-group">
              <EyeOff :size="14" class="sanitized-icon" />
              <span class="panel-title">Sanitized & Redacted Log</span>
              <span class="line-badge">{{ outputLineCount }} lines</span>
              <span v-if="totalMatches > 0" class="matches-badge">
                {{ totalMatches }} PII Redacted
              </span>
              <span v-else class="clean-badge">
                0 PII Detected
              </span>
            </div>
            <div class="panel-header-actions">
              <button
                type="button"
                class="panel-mini-btn"
                :disabled="!outputText"
                title="Copy Redacted Output"
                @click="copyOutput"
              >
                {{ isCopied ? 'Copied' : 'Copy' }}
              </button>
              <button
                type="button"
                class="panel-mini-btn"
                :disabled="!outputText"
                title="Download .log file"
                @click="downloadOutput"
              >
                Download
              </button>
            </div>
          </div>
          <div class="editor-inner-wrap">
            <CodeEditor
              v-model="outputText"
              language="text"
              placeholder="Sanitized and redacted output will appear here in real-time..."
              height="100%"
            />
          </div>
        </div>
      </div>

      <!-- STRUCTURAL RESIZE SPLITTER HANDLE (Matching JSON Diff) -->
      <div
        v-if="showStructural && matchesList.length && !isPanelMaximized"
        class="structural-resize-handle"
        :class="{ 'is-dragging': isPanelDragging }"
        title="Drag up/down to adjust breakdown height (Double click to maximize)"
        @mousedown="startPanelDrag"
        @touchstart.passive="startPanelDrag"
        @dblclick="togglePanelMaximize"
      >
        <div class="resize-handle-bar"></div>
      </div>

      <!-- STRUCTURAL ENTITY BREAKDOWN PANEL (Matching JSON Diff) -->
      <div
        v-if="showStructural && matchesList.length"
        class="structural-panel"
        :class="{ 'is-maximized': isPanelMaximized }"
        :style="{ height: isPanelMaximized ? undefined : `${structuralPanelHeight}px` }"
      >
        <!-- Header -->
        <div class="structural-header">
          <div class="header-left">
            <Layers :size="15" class="primary-icon" />
            <span class="sec-title">Detected PII Entity Breakdown</span>
            <span class="count-tag">{{ matchesList.length }} Entities</span>

            <!-- Quick Height Presets -->
            <div class="panel-presets-group">
              <button
                type="button"
                class="preset-btn"
                :class="{ active: !isPanelMaximized && structuralPanelHeight <= 180 }"
                title="Compact Height (160px)"
                @click="setPanelPreset(160)"
              >
                160px
              </button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: !isPanelMaximized && structuralPanelHeight > 180 && structuralPanelHeight <= 300 }"
                title="Standard Height (260px)"
                @click="setPanelPreset(260)"
              >
                260px
              </button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: !isPanelMaximized && structuralPanelHeight > 300 }"
                title="Expanded Height (420px)"
                @click="setPanelPreset(420)"
              >
                420px
              </button>
            </div>
          </div>

          <div class="header-right">
            <!-- Sizing buttons: Increase & Decrease -->
            <div class="panel-action-group">
              <button
                type="button"
                class="panel-icon-btn"
                title="Decrease Height (-80px)"
                @click="decreasePanelHeight()"
              >
                <Minus :size="13" />
              </button>
              <button
                type="button"
                class="panel-icon-btn"
                title="Increase Height (+80px)"
                @click="increasePanelHeight()"
              >
                <Plus :size="13" />
              </button>
              <button
                type="button"
                class="panel-icon-btn"
                :class="{ active: isPanelMaximized }"
                :title="isPanelMaximized ? 'Restore Down' : 'Maximize Breakdown View'"
                @click="togglePanelMaximize"
              >
                <component :is="isPanelMaximized ? Minimize2 : Maximize2" :size="13" />
              </button>
            </div>

            <!-- Close Panel -->
            <button
              type="button"
              class="close-mini-btn"
              title="Close panel"
              @click="showStructural = false"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar (Matching JSON Diff Subbar) -->
        <div class="structural-subbar">
          <div class="subbar-left">
            <!-- Search input -->
            <div class="search-box">
              <Search :size="13" class="search-icon" />
              <input
                v-model="filterQuery"
                type="text"
                class="search-input"
                placeholder="Filter by entity, category or value..."
                spellcheck="false"
              />
              <button
                v-if="filterQuery"
                type="button"
                class="clear-search-btn"
                @click="filterQuery = ''"
              >
                ✕
              </button>
            </div>

            <!-- Filter Type Chips -->
            <div class="filter-chips">
              <button
                type="button"
                class="filter-chip"
                :class="{ active: selectedFilterCategory === 'all' }"
                @click="selectedFilterCategory = 'all'"
              >
                All ({{ matchesList.length }})
              </button>
              <template v-for="(count, cat) in matchesByCategory" :key="cat">
                <button
                  v-if="count > 0"
                  type="button"
                  class="filter-chip"
                  :class="[getCategoryBadgeClass(cat as PiiCategory), { active: selectedFilterCategory === cat }]"
                  @click="selectedFilterCategory = cat"
                >
                  {{ cat }} ({{ count }})
                </button>
              </template>
            </div>
          </div>

          <div class="subbar-right">
            <!-- Export Options -->
            <button
              type="button"
              class="subbar-btn"
              title="Copy as Markdown Table"
              @click="copyEntitiesAsMarkdown"
            >
              <Copy :size="12" />
              <span>Copy MD</span>
            </button>
            <button
              type="button"
              class="subbar-btn"
              title="Copy as CSV"
              @click="copyEntitiesAsCsv"
            >
              <FileSpreadsheet :size="12" />
              <span>Copy CSV</span>
            </button>
          </div>
        </div>

        <!-- Table View -->
        <div class="structural-table-container">
          <table class="structural-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th style="width: 120px;">Category</th>
                <th style="width: 180px;">Rule Name</th>
                <th style="width: 110px;">Location</th>
                <th style="width: 220px;">Masked Output</th>
                <th>Original Value (Confidential Preview)</th>
                <th style="width: 70px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in filteredMatches"
                :key="idx"
                class="clickable-struct-row"
              >
                <td class="idx-col">{{ idx + 1 }}</td>
                <td>
                  <span class="struct-type-pill" :class="getCategoryBadgeClass(item.category)">
                    {{ item.category.toUpperCase() }}
                  </span>
                </td>
                <td class="rule-name-cell">
                  <span class="rule-name-text">{{ item.ruleName }}</span>
                </td>
                <td class="location-cell">
                  <code class="loc-code">L{{ item.line }}:C{{ item.column }}</code>
                </td>
                <td class="masked-cell">
                  <code class="masked-code">{{ item.maskedValue }}</code>
                </td>
                <td class="original-cell">
                  <div class="original-val-wrapper">
                    <code class="original-preview">{{ item.originalValue }}</code>
                    <button
                      type="button"
                      class="copy-path-btn"
                      title="Copy original sensitive value"
                      @click="copyEntityValue(item.originalValue, `match-${idx}`)"
                    >
                      <component :is="copiedMatchId === `match-${idx}` ? Check : Copy" :size="11" />
                    </button>
                  </div>
                </td>
                <td class="action-cell">
                  <button
                    type="button"
                    class="jump-pill-btn"
                    title="Copy masked replacement"
                    @click="copyEntityValue(item.maskedValue, `mask-${idx}`)"
                  >
                    {{ copiedMatchId === `mask-${idx}` ? 'Copied' : 'Copy' }}
                  </button>
                </td>
              </tr>

              <tr v-if="!filteredMatches.length">
                <td colspan="7" class="empty-struct-search">
                  No detected entities match your search filter.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Custom Regex Rule Dialog -->
    <M3Dialog
      v-model="isAddCustomRuleDialogOpen"
      title="Add Custom Regular Expression Rule"
    >
      <div class="custom-rule-dialog-form">
        <p class="dialog-desc">
          Define a custom regular expression pattern to detect and sanitize specific domain entities or proprietary secrets.
        </p>

        <M3TextField
          v-model="newRuleName"
          label="Rule Name"
          placeholder="e.g. Internal Employee ID"
        />

        <M3TextField
          v-model="newRulePattern"
          label="Regex Pattern"
          placeholder="e.g. EMP-[0-9]{5}"
          supporting-text="Do not include leading/trailing slashes."
        />

        <div class="form-row-duo">
          <M3TextField
            v-model="newRuleFlags"
            label="Flags"
            placeholder="g or gi"
          />

          <M3TextField
            v-model="newRuleReplacement"
            label="Custom Mask Tag"
            placeholder="[EMPLOYEE_ID]"
          />
        </div>

        <div v-if="customRuleError" class="dialog-error-box">
          {{ customRuleError }}
        </div>
      </div>

      <template #actions>
        <M3Button variant="text" @click="isAddCustomRuleDialogOpen = false">
          Cancel
        </M3Button>
        <M3Button variant="filled" @click="handleAddCustomRule">
          Add Rule
        </M3Button>
      </template>
    </M3Dialog>
  </div>
</template>

<style scoped>
.pii-redactor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  flex: 1;
  min-height: 0;
  gap: 10px;
  position: relative;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Fullscreen / Maximized Mode */
.pii-redactor-container.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  background-color: var(--md-sys-color-surface);
  padding: 1rem 1.25rem;
  box-sizing: border-box;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pii-redactor-container.is-fullscreen .diff-workspace {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

/* Toolbar */
.diff-toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 36px;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.25rem 0.625rem;
  overflow-x: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  flex-shrink: 0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.segment-group {
  display: inline-flex;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.segment-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.segment-btn.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.custom-mask-input-wrap {
  display: inline-flex;
  align-items: center;
}

.custom-mask-field {
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  font-family: monospace;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  width: 110px;
  outline: none;
}

.custom-mask-field:focus {
  border-color: var(--md-sys-color-primary);
}

.mode-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.mode-toggle-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.fullscreen-toggle-btn {
  font-weight: 600;
}

/* Stats Bar */
.diff-stats-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  padding: 6px 12px;
}

.stats-left,
.stats-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 6px;
}

.badge-identical {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-different {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.stat-meta {
  font-size: 11.5px;
  color: var(--md-sys-color-on-surface-variant);
  margin-left: 4px;
}

.structural-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.structural-toggle-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.privacy-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--md-sys-color-primary);
  font-weight: 600;
}

.exec-time-pill {
  font-size: 11px;
  color: var(--md-sys-color-on-surface-variant);
  background: var(--md-sys-color-surface-container-high);
  padding: 2px 7px;
  border-radius: 4px;
}

/* Category Specific Colors */
.cat-badge,
.struct-type-pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-email, .stat-email { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
.badge-password, .stat-password { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
.badge-card, .stat-credit-card { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.badge-jwt, .stat-jwt { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
.badge-ip, .stat-ip { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
.badge-api, .stat-api-key { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
.badge-phone, .stat-phone { background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); }
.badge-ssn, .stat-ssn { background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }
.badge-mac, .stat-mac-address { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
.badge-custom, .stat-custom { background: rgba(107, 114, 128, 0.15); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); }

/* Rules Manager Panel */
.rules-manager-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.rules-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--md-sys-color-on-surface);
}

.rules-title h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.rules-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.close-rules-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
}

.close-rules-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.5rem;
  max-height: 220px;
  overflow-y: auto;
}

.rule-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.65rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.rule-card.active {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-high);
}

.rule-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rule-title-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  user-select: none;
}

.rule-checkbox {
  cursor: pointer;
  accent-color: var(--md-sys-color-primary);
}

.rule-cat-icon {
  color: var(--md-sys-color-primary);
}

.rule-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.rule-card-badges {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.delete-rule-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-error);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.delete-rule-btn:hover {
  background-color: rgba(255, 0, 0, 0.1);
}

.rule-desc {
  font-size: 0.72rem;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0;
  line-height: 1.2;
}

.rule-example {
  margin-top: 0.15rem;
}

.rule-example code {
  font-size: 0.68rem;
  font-family: monospace;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  color: var(--md-sys-color-on-surface-variant);
}

/* Workspace (Matching JSON Diff) */
.diff-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  gap: 10px;
}

.edit-mode-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.edit-panel {
  display: flex;
  flex-direction: column;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
  overflow: hidden;
  min-width: 0;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.panel-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-title {
  color: var(--md-sys-color-on-surface);
}

.sanitized-icon {
  color: #10b981;
}

.line-badge {
  font-size: 11px;
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface-variant);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.matches-badge {
  font-size: 11px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.clean-badge {
  font-size: 11px;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.panel-mini-btn {
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.panel-mini-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.panel-mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-inner-wrap {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

/* Structural Resize Handle (Matching JSON Diff) */
.structural-resize-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 8px;
  cursor: row-resize;
  background: transparent;
  user-select: none;
  margin: 2px 0 -4px 0;
  z-index: 10;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.structural-resize-handle:hover,
.structural-resize-handle.is-dragging {
  background: var(--md-sys-color-surface-container-highest);
}

.resize-handle-bar {
  width: 44px;
  height: 3.5px;
  border-radius: 2px;
  background: var(--md-sys-color-outline-variant);
  transition: background 0.15s ease, width 0.15s ease;
}

.structural-resize-handle:hover .resize-handle-bar,
.structural-resize-handle.is-dragging .resize-handle-bar {
  background: var(--md-sys-color-primary);
  width: 72px;
}

/* Structural Breakdown Panel (Matching JSON Diff) */
.structural-panel {
  display: flex;
  flex-direction: column;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
  min-height: 120px;
  flex-shrink: 0;
  position: relative;
  transition: height 0.12s ease-out;
}

.structural-panel.is-maximized {
  position: absolute;
  inset: 0;
  height: 100% !important;
  max-height: 100% !important;
  z-index: 40;
  border-radius: 10px;
}

.structural-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
  gap: 8px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sec-title {
  font-size: 12px;
  font-weight: 600;
}

.count-tag {
  font-size: 11px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 600;
}

.panel-presets-group {
  display: inline-flex;
  background: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  margin-left: 6px;
}

.preset-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.preset-btn:hover {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.preset-btn.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.panel-action-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 2px;
}

.panel-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.panel-icon-btn:hover {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.panel-icon-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.close-mini-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.close-mini-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-error);
}

/* Structural Subbar (Filter & Export) */
.structural-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  background: var(--md-sys-color-surface-container-lowest);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  flex-shrink: 0;
  gap: 8px;
  overflow-x: auto;
}

.subbar-left,
.subbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 0 6px;
  width: 200px;
}

.search-icon {
  color: var(--md-sys-color-on-surface-variant);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 11px;
  padding: 3px 4px;
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.clear-search-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 0 2px;
  font-size: 10px;
}

.filter-chips {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-chip {
  border: 1px solid var(--md-sys-color-outline-variant);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.filter-chip:hover {
  background: var(--md-sys-color-surface-container-high);
}

.filter-chip.active {
  box-shadow: 0 0 0 2px var(--md-sys-color-primary);
  font-weight: 700;
}

.subbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.subbar-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

/* Structural Table */
.structural-table-container {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.structural-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
  text-align: left;
}

.structural-table th {
  position: sticky;
  top: 0;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  padding: 6px 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  z-index: 2;
}

.structural-table td {
  padding: 5px 12px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  vertical-align: middle;
}

.clickable-struct-row {
  transition: background 0.12s ease;
}

.clickable-struct-row:hover {
  background: var(--md-sys-color-surface-container-high);
}

.idx-col {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
}

.rule-name-text {
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}

.loc-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  background: var(--md-sys-color-surface-container-high);
  padding: 2px 5px;
  border-radius: 4px;
  color: var(--md-sys-color-on-surface-variant);
}

.masked-code {
  font-family: 'JetBrains Mono', monospace;
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.original-val-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.original-preview {
  font-family: 'JetBrains Mono', monospace;
  color: #f87171;
  background-color: rgba(239, 68, 68, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.copy-path-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0.6;
  transition: all 0.12s ease;
}

.copy-path-btn:hover {
  opacity: 1;
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
}

.jump-pill-btn {
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.jump-pill-btn:hover {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.empty-struct-search {
  text-align: center;
  padding: 24px 12px;
  color: var(--md-sys-color-on-surface-variant);
  font-style: italic;
}

/* Custom Rule Dialog Form */
.custom-rule-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

.dialog-desc {
  font-size: 0.85rem;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0;
  line-height: 1.4;
}

.form-row-duo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.dialog-error-box {
  background-color: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
}

/* Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive */
@media (max-width: 1024px) {
  .sample-presets-group {
    display: none;
  }
}

@media (max-width: 768px) {
  .diff-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .diff-stats-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-left,
  .stats-right {
    width: 100%;
    justify-content: flex-start;
  }

  .edit-mode-grid {
    grid-template-columns: 1fr;
    min-height: 400px;
  }
}
</style>
