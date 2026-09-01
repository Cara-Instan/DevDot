<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  EyeOff,
  Copy,
  Check,
  RotateCcw,
  Download,
  Upload,
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
  FileCheck2,
  Database,
  Shield,
  Columns2,
  Rows3,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Fingerprint,
  Tag,
  Binary
} from 'lucide-vue-next'
import {
  M3Button,
  M3TextField,
  M3Dialog,
  M3Tooltip,
  SplitPane
} from '@/components'
import { CodeEditor } from '@/components/editor'
import { useSnapshotStore, useSecurityStore } from '@/stores'
import { openNativeFileDialog, saveNativeFileDialog } from '@/core/native'
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

// Sample Preset Logs
const SAMPLES: Record<string, { label: string; shortLabel: string; desc: string; content: string; icon: any }> = {
  serverAccessLog: {
    label: 'Access Log',
    shortLabel: 'Access',
    desc: 'Web server access log with client IPs, auth tokens, emails, and sensitive query parameters.',
    icon: Sparkles,
    content: `2026-08-27T08:14:22.104Z [INFO] HTTP/1.1 GET /api/v1/users?email=sarah.connor@cyberdyne.com&auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfODkyMSIsInJvbGUiOiJ1c2VyIn0.wE_45nL_89kM
Client IP: 192.168.1.105 forwarded for 203.0.113.195 - User-Agent: Mozilla/5.0
2026-08-27T08:14:23.412Z [DEBUG] DB query executed for user=sarah.connor@cyberdyne.com (id: 492)
2026-08-27T08:15:01.882Z [ERROR] Failed login attempt for user 'john.doe@example.org' from host 10.240.0.14: password=SuperSecretPassword99!
2026-08-27T08:15:45.301Z [INFO] Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
2026-08-27T08:16:10.005Z [WARN] Rate limit reached for IPv6 client 2001:0db8:85a3:0000:0000:8a2e:0370:7334 on MAC 00:1A:2B:3C:4D:5E`
  },
  paymentLog: {
    label: 'Payment',
    shortLabel: 'Payment',
    desc: 'Checkout event payload containing customer card numbers, billing emails, phone, and Stripe API keys.',
    icon: CreditCard,
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
    label: 'Cloud & DevOps',
    shortLabel: 'DevOps',
    desc: 'Deployment log containing AWS credentials, database connection strings, and GitHub PATs.',
    icon: Cpu,
    content: `[terraform-apply] Initializing AWS Provider & Cloud Database...
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
Connecting to primary database: postgresql://admin_master:P@ssw0rd2026!@10.0.1.250:5432/production_db
Exporting GitHub deployment token: ghp_918237498172938471928374918237498172
Sending status notification to Slack: xoxb-123456789012-1234567890123-456789abcdefghijklmnopqrstuvwxyz
Google Cloud Storage API Key: AIzaSyD-98127398127398127398127398123
MongoDB URI: mongodb+srv://db_admin:SecretPass99@cluster0.devdot.mongodb.net/app_prod`
  },
  crmQueryLog: {
    label: 'Customer Contacts',
    shortLabel: 'Contacts',
    desc: 'Customer export containing phone numbers, NIK national IDs, personal emails, and MAC addresses.',
    icon: Fingerprint,
    content: `ID: 1001 | Name: Ethan Hunt | Email: hunt.e@imf-ops.net | Phone: +62 812-9876-5432 | NIK: 3171012304950001 | Device MAC: 00-50-56-C0-00-08
ID: 1002 | Name: Benji Dunn | Email: benji@imf-tech.org | Phone: (415) 892-1002 | SSN: 992-10-8831 | IP: 198.51.100.45
ID: 1003 | Name: Luther Stickell | Email: luther@hacker-net.io | Phone: +44 20 7946 0912 | Password: correct-horse-battery-staple`
  }
}

const props = defineProps<{
  tabId?: string
}>()

const currentTabId = computed(() => props.tabId || 'pii-redactor')

// Initial state from snapshot store
const initialSaved = snapshotStore.getTabOrToolState(props.tabId, 'pii-redactor', {
  inputText: SAMPLES.serverAccessLog.content,
  maskingMode: 'category-tag' as MaskingMode,
  customMask: '[REDACTED]',
  preserveLength: false,
  activeRuleIds: DEFAULT_PII_RULES.map((r) => r.id),
  customRules: [] as PiiRule[],
  splitDirection: 'horizontal' as 'horizontal' | 'vertical',
  showStructural: true,
  structuralPanelHeight: 260,
  isPanelMaximized: false,
  activeBottomTab: 'entities' as 'entities' | 'vault'
})

const inputText = ref(initialSaved.inputText || '')
const outputText = ref('')
const maskingMode = ref<MaskingMode>(initialSaved.maskingMode || 'category-tag')
const customMask = ref(initialSaved.customMask || '[REDACTED]')
const preserveLength = ref(initialSaved.preserveLength || false)
const splitDirection = ref<'horizontal' | 'vertical'>(initialSaved.splitDirection || 'horizontal')
const mobileTab = ref<'both' | 'input' | 'output'>('both')

// Action States
const isCopied = ref(false)
const isInputCopied = ref(false)
const isTokenMapCopied = ref(false)
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
  'cloud-secret': 0,
  'database-uri': 0,
  phone: 0,
  ssn: 0,
  'identity-number': 0,
  'mac-address': 0,
  custom: 0
})
const matchesList = ref<PiiMatch[]>([])
const tokenMap = ref<Record<string, string>>({})

// Bottom Panel State
const showStructural = ref<boolean>(initialSaved.showStructural ?? true)
const structuralPanelHeight = ref<number>(initialSaved.structuralPanelHeight ?? 260)
const isPanelMaximized = ref<boolean>(initialSaved.isPanelMaximized ?? false)
const isPanelDragging = ref(false)
const activeBottomTab = ref<'entities' | 'vault'>(initialSaved.activeBottomTab || 'entities')
const filterQuery = ref('')
const selectedFilterCategory = ref<string>('all')
const revealSecrets = ref(false)

// Editor Refs & Find States
const inputEditorRef = ref<any>(null)
const outputEditorRef = ref<any>(null)

const inputFindOpen = ref(false)
const inputFindQuery = ref('')
const inputFindCase = ref(false)
const inputFindIndex = ref(0)
const inputFindInputRef = ref<HTMLInputElement | null>(null)

const outputFindOpen = ref(false)
const outputFindQuery = ref('')
const outputFindCase = ref(false)
const outputFindIndex = ref(0)
const outputFindInputRef = ref<HTMLInputElement | null>(null)

const activeEditorPane = ref<'input' | 'output'>('input')

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

// Masking Modes List
const MASKING_MODES: {
  id: MaskingMode
  label: string
  shortLabel: string
  description: string
  example: string
  icon: any
}[] = [
  {
    id: 'category-tag',
    label: 'Category Tag',
    shortLabel: 'Tag',
    description: 'Category Tag: Replace with descriptive placeholder tags (e.g. [EMAIL], [IP_ADDRESS])',
    example: '[EMAIL], [CREDIT_CARD], [IP_ADDRESS]',
    icon: Tag
  },
  {
    id: 'fixed-mask',
    label: 'Fixed String',
    shortLabel: 'Fixed',
    description: 'Fixed String: Replace all matches with custom string (e.g. [REDACTED])',
    example: '[REDACTED] or ***',
    icon: FileText
  },
  {
    id: 'asterisks',
    label: 'Asterisks (*)',
    shortLabel: '***',
    description: 'Asterisks: Mask with asterisks (e.g. *** or **********)',
    example: '*** or **********',
    icon: Hash
  },
  {
    id: 'partial',
    label: 'Partial Masking',
    shortLabel: 'Partial',
    description: 'Partial Masking: Keep start/end characters visible (e.g. j***e@domain.com)',
    example: 'j***e@domain.com, 4111-****-1234',
    icon: EyeOff
  },
  {
    id: 'hash-pseudonym',
    label: 'Hash Pseudonym',
    shortLabel: 'Hash',
    description: 'Hash Pseudonym: Deterministic pseudonym preserving referential logs',
    example: '[REDACTED_#3f8a] (same key = same hash)',
    icon: Fingerprint
  }
]

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

// Filtered token map entries
const filteredTokenMapEntries = computed(() => {
  const entries = Object.entries(tokenMap.value)
  if (!filterQuery.value.trim()) return entries
  const q = filterQuery.value.toLowerCase().trim()
  return entries.filter(([token, original]) =>
    token.toLowerCase().includes(q) || original.toLowerCase().includes(q)
  )
})

// Input & Output Line & Byte Counts
const inputLineCount = computed(() => {
  if (!inputText.value) return 0
  return (inputText.value.match(/\n/g) || []).length + 1
})

const outputLineCount = computed(() => {
  if (!outputText.value) return 0
  return (outputText.value.match(/\n/g) || []).length + 1
})

const inputByteSize = computed(() => new Blob([inputText.value]).size)
const outputByteSize = computed(() => new Blob([outputText.value]).size)

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// In-Editor Search Matches Calculation
const inputMatches = computed(() => {
  if (!inputFindQuery.value.trim() || !inputText.value) return []
  const matches: { index: number; line: number }[] = []
  const flags = inputFindCase.value ? 'g' : 'gi'
  try {
    const escaped = inputFindQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, flags)
    let m: RegExpExecArray | null
    const lines = inputText.value.split('\n')
    while ((m = regex.exec(inputText.value)) !== null) {
      let charCount = 0
      let lineNum = 1
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length + 1 > m.index) {
          lineNum = i + 1
          break
        }
        charCount += lines[i].length + 1
      }
      matches.push({ index: m.index, line: lineNum })
      if (m.index === regex.lastIndex) regex.lastIndex++
    }
  } catch {
    return []
  }
  return matches
})

const inputMatchCount = computed(() => inputMatches.value.length)

const outputMatches = computed(() => {
  if (!outputFindQuery.value.trim() || !outputText.value) return []
  const matches: { index: number; line: number }[] = []
  const flags = outputFindCase.value ? 'g' : 'gi'
  try {
    const escaped = outputFindQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, flags)
    let m: RegExpExecArray | null
    const lines = outputText.value.split('\n')
    while ((m = regex.exec(outputText.value)) !== null) {
      let charCount = 0
      let lineNum = 1
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length + 1 > m.index) {
          lineNum = i + 1
          break
        }
        charCount += lines[i].length + 1
      }
      matches.push({ index: m.index, line: lineNum })
      if (m.index === regex.lastIndex) regex.lastIndex++
    }
  } catch {
    return []
  }
  return matches
})

const outputMatchCount = computed(() => outputMatches.value.length)

// Redact execution function
function handleRedact() {
  if (!inputText.value.trim()) {
    outputText.value = ''
    totalMatches.value = 0
    matchesList.value = []
    tokenMap.value = {}
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
  tokenMap.value = result.tokenMap || {}
  executionTimeMs.value = result.executionTimeMs

  // Save to snapshot store
  if (!isHydrating) {
    snapshotStore.setTabState(currentTabId.value, 'pii-redactor', {
      inputText: inputText.value,
      maskingMode: maskingMode.value,
      customMask: customMask.value,
      preserveLength: preserveLength.value,
      activeRuleIds: activeRuleIds.value,
      customRules: customRules.value,
      splitDirection: splitDirection.value,
      showStructural: showStructural.value,
      structuralPanelHeight: structuralPanelHeight.value,
      isPanelMaximized: isPanelMaximized.value,
      activeBottomTab: activeBottomTab.value
    })
  }
}

let isHydrating = false

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
    if (isHydrating) return
    queueRedact()
  },
  { deep: true }
)

// Sync panel states
watch(
  [splitDirection, showStructural, structuralPanelHeight, isPanelMaximized, activeBottomTab],
  () => {
    if (isHydrating) return
    snapshotStore.setTabState(currentTabId.value, 'pii-redactor', {
      inputText: inputText.value,
      maskingMode: maskingMode.value,
      customMask: customMask.value,
      preserveLength: preserveLength.value,
      activeRuleIds: activeRuleIds.value,
      customRules: customRules.value,
      splitDirection: splitDirection.value,
      showStructural: showStructural.value,
      structuralPanelHeight: structuralPanelHeight.value,
      isPanelMaximized: isPanelMaximized.value,
      activeBottomTab: activeBottomTab.value
    })
  }
)

// Hydrate from snapshot store
watch(
  () => snapshotStore.toolStates[currentTabId.value],
  (newState) => {
    if (newState && !isHydrating) {
      isHydrating = true
      if (newState.inputText !== undefined && newState.inputText !== inputText.value) {
        inputText.value = newState.inputText
      }
      if (newState.maskingMode && newState.maskingMode !== maskingMode.value) {
        maskingMode.value = newState.maskingMode
      }
      if (newState.customMask !== undefined && newState.customMask !== customMask.value) {
        customMask.value = newState.customMask
      }
      if (newState.preserveLength !== undefined && newState.preserveLength !== preserveLength.value) {
        preserveLength.value = newState.preserveLength
      }
      if (Array.isArray(newState.activeRuleIds)) {
        activeRuleIds.value = [...newState.activeRuleIds]
      }
      if (Array.isArray(newState.customRules)) {
        customRules.value = [...newState.customRules]
      }
      if (newState.splitDirection && newState.splitDirection !== splitDirection.value) {
        splitDirection.value = newState.splitDirection
      }
      if (newState.showStructural !== undefined && newState.showStructural !== showStructural.value) {
        showStructural.value = newState.showStructural
      }
      if (newState.structuralPanelHeight !== undefined && newState.structuralPanelHeight !== structuralPanelHeight.value) {
        structuralPanelHeight.value = newState.structuralPanelHeight
      }
      if (newState.isPanelMaximized !== undefined && newState.isPanelMaximized !== isPanelMaximized.value) {
        isPanelMaximized.value = newState.isPanelMaximized
      }
      if (newState.activeBottomTab && newState.activeBottomTab !== activeBottomTab.value) {
        activeBottomTab.value = newState.activeBottomTab
      }
      isHydrating = false
      handleRedact()
    }
  },
  { deep: true }
)

// In-Editor Search Navigation
function toggleInputFind() {
  inputFindOpen.value = !inputFindOpen.value
  if (inputFindOpen.value) {
    outputFindOpen.value = false
    nextTick(() => {
      inputFindInputRef.value?.focus()
      inputFindInputRef.value?.select()
    })
  }
}

function toggleOutputFind() {
  outputFindOpen.value = !outputFindOpen.value
  if (outputFindOpen.value) {
    inputFindOpen.value = false
    nextTick(() => {
      outputFindInputRef.value?.focus()
      outputFindInputRef.value?.select()
    })
  }
}

function navigateInputMatch(direction: 'next' | 'prev') {
  if (inputMatchCount.value === 0) return
  if (direction === 'next') {
    inputFindIndex.value = inputFindIndex.value >= inputMatchCount.value ? 1 : inputFindIndex.value + 1
  } else {
    inputFindIndex.value = inputFindIndex.value <= 1 ? inputMatchCount.value : inputFindIndex.value - 1
  }
}

function navigateOutputMatch(direction: 'next' | 'prev') {
  if (outputMatchCount.value === 0) return
  if (direction === 'next') {
    outputFindIndex.value = outputFindIndex.value >= outputMatchCount.value ? 1 : outputFindIndex.value + 1
  } else {
    outputFindIndex.value = outputFindIndex.value <= 1 ? outputMatchCount.value : outputFindIndex.value - 1
  }
}

// Click Category Pill in Stats Bar
function handleCategoryPillClick(category: string) {
  if (selectedFilterCategory.value === category && showStructural.value) {
    selectedFilterCategory.value = 'all'
  } else {
    selectedFilterCategory.value = category
    showStructural.value = true
    activeBottomTab.value = 'entities'
  }
}

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
  if (e.key === 'Escape') {
    if (isFullscreen.value) {
      toggleFullscreen()
    } else if (inputFindOpen.value || outputFindOpen.value) {
      inputFindOpen.value = false
      outputFindOpen.value = false
    }
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
    e.preventDefault()
    if (activeEditorPane.value === 'output') {
      toggleOutputFind()
    } else {
      toggleInputFind()
    }
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
    replacement: newRuleReplacement.value.trim() || '[CUSTOM_REDACTED]',
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
  tokenMap.value = {}
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

// Copy input raw text
async function copyInput() {
  if (!inputText.value) return
  const success = await securityStore.copyToClipboard(inputText.value, {
    label: 'Raw Input Log'
  })
  if (success) {
    isInputCopied.value = true
    setTimeout(() => {
      isInputCopied.value = false
    }, 2000)
  }
}

// Upload file directly into input editor
async function handleUploadInput() {
  const files = await openNativeFileDialog({
    title: 'Open Log File - DevDot',
    multiple: false,
    filters: [
      { name: 'Log & Text Files (*.log;*.txt;*.json)', extensions: ['log', 'txt', 'json'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  })

  if (files && files.length > 0) {
    inputText.value = files[0].content
  }
}

// Download redacted output as file
async function downloadOutput() {
  if (!outputText.value) return
  const defaultFilename = `sanitized-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`
  await saveNativeFileDialog(outputText.value, {
    title: 'Save Sanitized Log - DevDot',
    defaultPath: defaultFilename,
    filters: [
      { name: 'Log File (*.log)', extensions: ['log'] },
      { name: 'Text File (*.txt)', extensions: ['txt'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  })
}

// Export Token Mapping Vault as JSON File
async function downloadTokenMap() {
  if (!Object.keys(tokenMap.value).length) return
  const jsonStr = JSON.stringify(tokenMap.value, null, 2)
  const defaultFilename = `pii-token-vault-${new Date().toISOString().slice(0, 10)}.json`
  await saveNativeFileDialog(jsonStr, {
    title: 'Save De-anonymization Token Vault - DevDot',
    defaultPath: defaultFilename,
    filters: [
      { name: 'JSON Vault (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  })
}

// Copy Token Map JSON to Clipboard
async function copyTokenMap() {
  if (!Object.keys(tokenMap.value).length) return
  const jsonStr = JSON.stringify(tokenMap.value, null, 2)
  const ok = await securityStore.copyToClipboard(jsonStr, { label: 'Token Map Vault' })
  if (ok) {
    isTokenMapCopied.value = true
    setTimeout(() => {
      isTokenMapCopied.value = false
    }, 2000)
  }
}

// Copy single entity original or masked value
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
  await securityStore.copyToClipboard(md, { label: 'PII Entities Markdown' })
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
  await securityStore.copyToClipboard(csv, { label: 'PII Entities CSV' })
  isCopied.value = true
  setTimeout(() => {
    isCopied.value = false
  }, 2000)
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
    case 'cloud-secret': return Shield
    case 'database-uri': return Database
    case 'phone': return Phone
    case 'ssn': return Hash
    case 'identity-number': return Fingerprint
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
    case 'cloud-secret': return 'badge-cloud'
    case 'database-uri': return 'badge-db'
    case 'phone': return 'badge-phone'
    case 'ssn': return 'badge-ssn'
    case 'identity-number': return 'badge-nik'
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
    <!-- Compact Top Toolbar (Aligned with JSON Diff & Formatter) -->
    <div class="diff-toolbar">
      <div class="toolbar-left">
        <!-- Masking Mode Segment -->
        <div class="control-group">
          <label class="control-label">Mask:</label>
          <div class="segment-group" role="group" aria-label="Masking Mode">
            <M3Tooltip
              v-for="mode in MASKING_MODES"
              :key="mode.id"
              :text="mode.description"
              placement="bottom"
            >
              <button
                type="button"
                class="segment-btn"
                :class="{ active: maskingMode === mode.id }"
                :aria-label="mode.label"
                @click="maskingMode = mode.id"
              >
                <component :is="mode.icon" :size="12" />
                <span>{{ mode.shortLabel }}</span>
              </button>
            </M3Tooltip>
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

        <div class="toolbar-divider"></div>

        <!-- Sample Presets -->
        <div class="samples-group">
          <M3Tooltip
            v-for="(sample, key) in SAMPLES"
            :key="key"
            :text="sample.desc"
            placement="bottom"
          >
            <button
              type="button"
              class="pill-sample-btn"
              @click="loadSample(key as string)"
            >
              <component :is="sample.icon" :size="12" />
              <span>{{ sample.shortLabel }}</span>
            </button>
          </M3Tooltip>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Split Orientation Toggle (Side-by-Side vs Stacked) -->
        <div class="segment-group" role="group" aria-label="Split Direction">
          <M3Tooltip text="Side-by-Side Split View" placement="bottom">
            <button
              type="button"
              class="icon-toggle-btn"
              :class="{ active: splitDirection === 'horizontal' }"
              aria-label="Side-by-Side Split View"
              @click="splitDirection = 'horizontal'"
            >
              <Columns2 :size="13" />
            </button>
          </M3Tooltip>
          <M3Tooltip text="Stacked Split View" placement="bottom">
            <button
              type="button"
              class="icon-toggle-btn"
              :class="{ active: splitDirection === 'vertical' }"
              aria-label="Stacked Split View"
              @click="splitDirection = 'vertical'"
            >
              <Rows3 :size="13" />
            </button>
          </M3Tooltip>
        </div>

        <!-- Mobile Column Switcher (Visible on narrow viewports) -->
        <div v-if="splitDirection === 'horizontal'" class="segment-group mobile-column-tabs">
          <button
            type="button"
            class="segment-text-btn"
            :class="{ active: mobileTab === 'both' }"
            @click="mobileTab = 'both'"
          >
            Split
          </button>
          <button
            type="button"
            class="segment-text-btn"
            :class="{ active: mobileTab === 'input' }"
            @click="mobileTab = 'input'"
          >
            Input
          </button>
          <button
            type="button"
            class="segment-text-btn"
            :class="{ active: mobileTab === 'output' }"
            @click="mobileTab = 'output'"
          >
            Output
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Toggles: Preserve Length -->
        <div class="toggles-group">
          <M3Tooltip
            :text="preserveLength ? 'Preserve Length: ON (Pad mask to original character count)' : 'Preserve Length: OFF'"
            placement="bottom"
          >
            <button
              type="button"
              class="icon-toggle-btn"
              :class="{ active: preserveLength }"
              aria-label="Preserve Length"
              @click="preserveLength = !preserveLength"
            >
              <Binary :size="13" />
            </button>
          </M3Tooltip>
        </div>

        <!-- Rules Config Toggle Button -->
        <M3Tooltip text="Configure PII Detection Rules & Custom Regex" placement="bottom">
          <button
            type="button"
            class="mode-badge-btn"
            :class="{ active: isRulesDrawerOpen }"
            aria-label="Toggle Rules Drawer"
            @click="isRulesDrawerOpen = !isRulesDrawerOpen"
          >
            <SlidersHorizontal :size="13" />
            <span>Rules ({{ activeRuleIds.length }}/{{ allRulesList.length }})</span>
          </button>
        </M3Tooltip>
      </div>

      <div class="toolbar-right">
        <!-- Re-run / Sanitize Action -->
        <M3Tooltip text="Re-run PII Sanitization" placement="bottom">
          <button
            type="button"
            class="icon-action-btn btn-primary-accent"
            aria-label="Sanitize"
            @click="handleRedact"
          >
            <Play :size="13" />
          </button>
        </M3Tooltip>

        <!-- Copy Output -->
        <M3Tooltip :text="isCopied ? 'Copied Output to Clipboard!' : 'Copy Sanitized Log Output'" placement="bottom">
          <button
            type="button"
            class="icon-action-btn"
            :class="{ active: isCopied }"
            :disabled="!outputText"
            aria-label="Copy Sanitized Output"
            @click="copyOutput"
          >
            <component :is="isCopied ? Check : Copy" :size="13" />
          </button>
        </M3Tooltip>

        <!-- Open / Upload File -->
        <M3Tooltip text="Open Log File (.log, .txt, .json)" placement="bottom">
          <button
            type="button"
            class="icon-action-btn"
            aria-label="Open Log File"
            @click="handleUploadInput"
          >
            <Upload :size="13" />
          </button>
        </M3Tooltip>

        <!-- Download .log -->
        <M3Tooltip text="Download Sanitized Log File" placement="bottom">
          <button
            type="button"
            class="icon-action-btn"
            :disabled="!outputText"
            aria-label="Download Sanitized Log"
            @click="downloadOutput"
          >
            <Download :size="13" />
          </button>
        </M3Tooltip>

        <!-- Clear -->
        <M3Tooltip text="Clear Inputs and Output" placement="bottom">
          <button
            type="button"
            class="icon-action-btn btn-danger-hover"
            aria-label="Clear Inputs"
            @click="handleClear"
          >
            <RotateCcw :size="13" />
          </button>
        </M3Tooltip>

        <div class="toolbar-divider"></div>

        <!-- Fullscreen Toggle Button -->
        <M3Tooltip :text="isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Mode'" placement="bottom">
          <button
            type="button"
            class="icon-action-btn fullscreen-btn"
            :class="{ active: isFullscreen }"
            aria-label="Toggle Fullscreen"
            @click="toggleFullscreen"
          >
            <component :is="isFullscreen ? Minimize2 : Maximize2" :size="13" />
          </button>
        </M3Tooltip>
      </div>
    </div>

    <!-- Summary Stats Bar (Aligned with JSON Diff) -->
    <div class="diff-stats-bar">
      <div class="stats-left">
        <!-- Match / Status Badge -->
        <div
          class="status-badge"
          :class="totalMatches === 0 ? 'badge-identical' : 'badge-different'"
        >
          <component :is="totalMatches === 0 ? FileCheck2 : EyeOff" :size="14" />
          <span>{{ totalMatches === 0 ? 'Clean / No PII' : `${totalMatches} PII Redacted` }}</span>
        </div>

        <!-- Clickable Category Pills -->
        <template v-for="(count, cat) in matchesByCategory" :key="cat">
          <button
            v-if="count > 0"
            type="button"
            class="stat-pill clickable-pill"
            :class="[`stat-${cat}`, { 'is-active-filter': selectedFilterCategory === cat }]"
            :title="`Click to filter breakdown by ${cat}`"
            @click="handleCategoryPillClick(cat as string)"
          >
            <component :is="getCategoryIcon(cat as PiiCategory)" :size="12" />
            <span>{{ count }} {{ cat }}</span>
          </button>
        </template>

        <!-- Meta Summary Info -->
        <span class="stat-meta">
          Total entities: <strong>{{ totalMatches }}</strong> ({{ inputLineCount }} lines)
        </span>
      </div>

      <div class="stats-right">
        <!-- Entities Breakdown Panel Toggle -->
        <button
          type="button"
          class="structural-toggle-btn"
          :class="{ active: showStructural && activeBottomTab === 'entities' }"
          @click="showStructural = true; activeBottomTab = 'entities'"
        >
          <Table :size="13" />
          <span>Detected Entities ({{ matchesList.length }})</span>
        </button>

        <!-- De-anonymization Vault Toggle -->
        <button
          type="button"
          class="structural-toggle-btn"
          :class="{ active: showStructural && activeBottomTab === 'vault' }"
          :title="`View deterministic token hash map (${Object.keys(tokenMap).length} tokens)`"
          @click="showStructural = true; activeBottomTab = 'vault'"
        >
          <Fingerprint :size="13" />
          <span>Token Vault ({{ Object.keys(tokenMap).length }})</span>
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

    <!-- Rules Configuration Drawer / Accordion -->
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

    <!-- MAIN REDACTOR WORKSPACE WITH DRAGGABLE SPLITPANE -->
    <div class="diff-workspace">
      <SplitPane
        :direction="splitDirection"
        :initial-split="50"
        class="redactor-split-pane"
        :class="`mobile-${mobileTab}`"
      >
        <template #pane-1-tab-label>
          Raw Input
        </template>
        <template #pane-2-tab-label>
          Sanitized Output
        </template>

        <!-- INPUT PANE (Left / Top) -->
        <template #pane-1>
          <div
            class="pane-wrapper"
            :class="{ hidden: mobileTab === 'output' }"
            @click="activeEditorPane = 'input'"
          >
            <!-- Pane Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <FileText :size="14" class="primary-icon" />
                <span class="pane-title">Raw Log / Text Input</span>
                <span class="size-tag">{{ formatBytes(inputByteSize) }}</span>
                <span class="line-badge">{{ inputLineCount }} lines</span>
              </div>

              <div class="pane-header-right">
                <!-- Find Toggle in Header -->
                <M3Tooltip text="Find in Input (Ctrl+F)" placement="top">
                  <button
                    type="button"
                    class="col-find-toggle-btn"
                    :class="{ active: inputFindOpen }"
                    aria-label="Find in Input"
                    @click="toggleInputFind"
                  >
                    <Search :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Copy Input -->
                <M3Tooltip :text="isInputCopied ? 'Copied!' : 'Copy Input'" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :class="{ active: isInputCopied }"
                    aria-label="Copy Input"
                    @click="copyInput"
                  >
                    <component :is="isInputCopied ? Check : Copy" :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Open / Upload File -->
                <M3Tooltip text="Open Log / Text File" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    aria-label="Open File"
                    @click="handleUploadInput"
                  >
                    <Upload :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Clear Input -->
                <M3Tooltip text="Clear Input" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn btn-danger-hover"
                    aria-label="Clear Input"
                    @click="handleClear"
                  >
                    <RotateCcw :size="13" />
                  </button>
                </M3Tooltip>
              </div>
            </div>

            <!-- In-Editor Find Bar for Input -->
            <div v-if="inputFindOpen" class="column-find-bar">
              <div class="find-input-wrap">
                <Search :size="12" class="find-icon" />
                <input
                  ref="inputFindInputRef"
                  v-model="inputFindQuery"
                  type="text"
                  class="find-input"
                  placeholder="Find in Raw Input..."
                  spellcheck="false"
                  @keydown.enter.exact="navigateInputMatch('next')"
                  @keydown.shift.enter="navigateInputMatch('prev')"
                  @keydown.esc="inputFindOpen = false"
                />
                <span v-if="inputFindQuery" class="find-count">
                  {{ inputMatchCount > 0 ? `${inputFindIndex || 1} of ${inputMatchCount}` : '0 results' }}
                </span>
              </div>
              <button
                type="button"
                class="find-opt-btn"
                :class="{ active: inputFindCase }"
                title="Match Case"
                @click="inputFindCase = !inputFindCase"
              >
                Aa
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Previous Match (Shift+Enter)"
                :disabled="inputMatchCount === 0"
                @click="navigateInputMatch('prev')"
              >
                <ChevronUp :size="13" />
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Next Match (Enter)"
                :disabled="inputMatchCount === 0"
                @click="navigateInputMatch('next')"
              >
                <ChevronDown :size="13" />
              </button>
              <button
                type="button"
                class="find-close-btn"
                title="Close (Esc)"
                @click="inputFindOpen = false"
              >
                ✕
              </button>
            </div>

            <!-- Code Editor Component -->
            <div class="editor-inner-wrap">
              <CodeEditor
                ref="inputEditorRef"
                v-model="inputText"
                language="text"
                placeholder="Paste server logs, JSON dumps, curl headers, or confidential data here to redact..."
                height="100%"
              />
            </div>
          </div>
        </template>

        <!-- SANITIZED OUTPUT PANE (Right / Bottom) -->
        <template #pane-2>
          <div
            class="pane-wrapper"
            :class="{ hidden: mobileTab === 'input' }"
            @click="activeEditorPane = 'output'"
          >
            <!-- Pane Header -->
            <div class="pane-header">
              <div class="pane-header-left">
                <EyeOff :size="14" class="sanitized-icon" />
                <span class="pane-title">Sanitized & Redacted Log</span>
                <span class="size-tag">{{ formatBytes(outputByteSize) }}</span>
                <span class="line-badge">{{ outputLineCount }} lines</span>
                <span v-if="totalMatches > 0" class="matches-badge">
                  {{ totalMatches }} Redacted
                </span>
                <span v-else class="clean-badge">
                  0 PII
                </span>
              </div>

              <div class="pane-header-right">
                <!-- Find Toggle in Output Header -->
                <M3Tooltip text="Find in Output (Ctrl+F)" placement="top">
                  <button
                    type="button"
                    class="col-find-toggle-btn"
                    :class="{ active: outputFindOpen }"
                    aria-label="Find in Output"
                    @click="toggleOutputFind"
                  >
                    <Search :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Copy Output -->
                <M3Tooltip :text="isCopied ? 'Copied!' : 'Copy Sanitized Log'" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :class="{ active: isCopied }"
                    :disabled="!outputText"
                    aria-label="Copy Output"
                    @click="copyOutput"
                  >
                    <component :is="isCopied ? Check : Copy" :size="13" />
                  </button>
                </M3Tooltip>

                <!-- Download .log -->
                <M3Tooltip text="Download Sanitized Log" placement="top">
                  <button
                    type="button"
                    class="pane-icon-btn"
                    :disabled="!outputText"
                    aria-label="Download File"
                    @click="downloadOutput"
                  >
                    <Download :size="13" />
                  </button>
                </M3Tooltip>
              </div>
            </div>

            <!-- In-Editor Find Bar for Output -->
            <div v-if="outputFindOpen" class="column-find-bar">
              <div class="find-input-wrap">
                <Search :size="12" class="find-icon" />
                <input
                  ref="outputFindInputRef"
                  v-model="outputFindQuery"
                  type="text"
                  class="find-input"
                  placeholder="Find in Sanitized Output..."
                  spellcheck="false"
                  @keydown.enter.exact="navigateOutputMatch('next')"
                  @keydown.shift.enter="navigateOutputMatch('prev')"
                  @keydown.esc="outputFindOpen = false"
                />
                <span v-if="outputFindQuery" class="find-count">
                  {{ outputMatchCount > 0 ? `${outputFindIndex || 1} of ${outputMatchCount}` : '0 results' }}
                </span>
              </div>
              <button
                type="button"
                class="find-opt-btn"
                :class="{ active: outputFindCase }"
                title="Match Case"
                @click="outputFindCase = !outputFindCase"
              >
                Aa
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Previous Match (Shift+Enter)"
                :disabled="outputMatchCount === 0"
                @click="navigateOutputMatch('prev')"
              >
                <ChevronUp :size="13" />
              </button>
              <button
                type="button"
                class="find-nav-btn"
                title="Next Match (Enter)"
                :disabled="outputMatchCount === 0"
                @click="navigateOutputMatch('next')"
              >
                <ChevronDown :size="13" />
              </button>
              <button
                type="button"
                class="find-close-btn"
                title="Close (Esc)"
                @click="outputFindOpen = false"
              >
                ✕
              </button>
            </div>

            <!-- Code Editor Component -->
            <div class="editor-inner-wrap">
              <CodeEditor
                ref="outputEditorRef"
                v-model="outputText"
                language="text"
                placeholder="Sanitized and redacted output will appear here in real-time..."
                height="100%"
              />
            </div>
          </div>
        </template>
      </SplitPane>

      <!-- STRUCTURAL RESIZE SPLITTER HANDLE -->
      <div
        v-if="showStructural && (matchesList.length || Object.keys(tokenMap).length) && !isPanelMaximized"
        class="structural-resize-handle"
        :class="{ 'is-dragging': isPanelDragging }"
        title="Drag up/down to adjust breakdown height (Double click to maximize)"
        @mousedown="startPanelDrag"
        @touchstart.passive="startPanelDrag"
        @dblclick="togglePanelMaximize"
      >
        <div class="resize-handle-bar"></div>
      </div>

      <!-- BOTTOM STRUCTURAL / VAULT PANEL -->
      <div
        v-if="showStructural && (matchesList.length || Object.keys(tokenMap).length)"
        class="structural-panel"
        :class="{ 'is-maximized': isPanelMaximized }"
        :style="{ height: isPanelMaximized ? undefined : `${structuralPanelHeight}px` }"
      >
        <!-- Header with Tabs -->
        <div class="structural-header">
          <div class="header-left">
            <!-- Tabs Switcher -->
            <div class="inspector-tab-group">
              <button
                type="button"
                class="inspector-tab-btn"
                :class="{ active: activeBottomTab === 'entities' }"
                @click="activeBottomTab = 'entities'"
              >
                <Layers :size="14" />
                <span>Detected Entities</span>
                <span class="count-tag">{{ matchesList.length }}</span>
              </button>
              <button
                type="button"
                class="inspector-tab-btn"
                :class="{ active: activeBottomTab === 'vault' }"
                @click="activeBottomTab = 'vault'"
              >
                <Fingerprint :size="14" />
                <span>De-anonymization Vault</span>
                <span class="count-tag">{{ Object.keys(tokenMap).length }}</span>
              </button>
            </div>

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
            <!-- Sizing buttons: Increase, Decrease & Maximize -->
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

        <!-- Filter & Search Subbar -->
        <div class="structural-subbar">
          <div class="subbar-left">
            <!-- Search input -->
            <div class="search-box">
              <Search :size="13" class="search-icon" />
              <input
                v-model="filterQuery"
                type="text"
                class="search-input"
                :placeholder="activeBottomTab === 'entities' ? 'Filter by rule, category or value...' : 'Filter token vault...'"
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

            <!-- Filter Category Chips (in Entities tab) -->
            <div v-if="activeBottomTab === 'entities'" class="filter-chips">
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

            <!-- Reveal Secrets Toggle -->
            <button
              type="button"
              class="subbar-btn"
              :class="{ active: revealSecrets }"
              title="Toggle reveal plaintext sensitive values"
              @click="revealSecrets = !revealSecrets"
            >
              <component :is="revealSecrets ? Lock : EyeOff" :size="12" />
              <span>{{ revealSecrets ? 'Hide Secrets' : 'Reveal Secrets' }}</span>
            </button>
          </div>

          <div class="subbar-right">
            <!-- Entities Tab Exports -->
            <template v-if="activeBottomTab === 'entities'">
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
            </template>

            <!-- Vault Tab Exports -->
            <template v-else>
              <button
                type="button"
                class="subbar-btn"
                :class="{ active: isTokenMapCopied }"
                title="Copy Token Map JSON"
                @click="copyTokenMap"
              >
                <component :is="isTokenMapCopied ? Check : Copy" :size="12" />
                <span>{{ isTokenMapCopied ? 'Copied' : 'Copy JSON' }}</span>
              </button>
              <button
                type="button"
                class="subbar-btn"
                title="Save Token Map as JSON File"
                @click="downloadTokenMap"
              >
                <Download :size="12" />
                <span>Save Vault .json</span>
              </button>
            </template>
          </div>
        </div>

        <!-- TAB 1: DETECTED ENTITIES TABLE -->
        <div v-if="activeBottomTab === 'entities'" class="structural-table-container">
          <table class="structural-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th style="width: 130px;">Category</th>
                <th style="width: 180px;">Rule Name</th>
                <th style="width: 100px;">Location</th>
                <th style="width: 220px;">Masked Output</th>
                <th>Original Value (Confidential Preview)</th>
                <th style="width: 80px; text-align: right;">Action</th>
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
                    <code class="original-preview" :class="{ blurred: !revealSecrets }">
                      {{ revealSecrets ? item.originalValue : '••••••••••••' }}
                    </code>
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

        <!-- TAB 2: DE-ANONYMIZATION TOKEN VAULT TABLE -->
        <div v-else class="structural-table-container">
          <table class="structural-table">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 320px;">Pseudonym Token / Redacted Hash</th>
                <th>Original Sensitive Plaintext</th>
                <th style="width: 140px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="([token, original], idx) in filteredTokenMapEntries"
                :key="token"
                class="clickable-struct-row"
              >
                <td class="idx-col">{{ idx + 1 }}</td>
                <td class="masked-cell">
                  <code class="masked-code token-vault-key">{{ token }}</code>
                </td>
                <td class="original-cell">
                  <div class="original-val-wrapper">
                    <code class="original-preview" :class="{ blurred: !revealSecrets }">
                      {{ revealSecrets ? original : '••••••••••••' }}
                    </code>
                    <button
                      type="button"
                      class="copy-path-btn"
                      title="Copy original value"
                      @click="copyEntityValue(original, `orig-${idx}`)"
                    >
                      <component :is="copiedMatchId === `orig-${idx}` ? Check : Copy" :size="11" />
                    </button>
                  </div>
                </td>
                <td class="action-cell">
                  <button
                    type="button"
                    class="jump-pill-btn"
                    title="Copy Token"
                    @click="copyEntityValue(token, `tok-${idx}`)"
                  >
                    {{ copiedMatchId === `tok-${idx}` ? 'Copied' : 'Copy Token' }}
                  </button>
                </td>
              </tr>

              <tr v-if="!filteredTokenMapEntries.length">
                <td colspan="4" class="empty-struct-search">
                  No token entries match your filter or no tokens have been generated yet.
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
  gap: 8px;
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
  padding: 0.75rem 1rem;
  box-sizing: border-box;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  gap: 0.375rem;
  min-height: 32px;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  padding: 0.2rem 0.5rem;
  overflow-x: auto;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.375rem;
  flex-shrink: 0;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background: var(--md-sys-color-outline-variant);
  margin: 0 2px;
  opacity: 0.6;
  flex-shrink: 0;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.control-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
}

.segment-group {
  display: inline-flex;
  align-items: center;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.segment-btn {
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
}

.icon-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-toggle-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.icon-toggle-btn.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.segment-text-btn {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.segment-text-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.segment-text-btn.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.samples-group,
.toggles-group {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.pill-sample-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.pill-sample-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.mode-badge-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  height: 26px;
}

.mode-badge-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
}

.mode-badge-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.icon-action-btn:hover:not(:disabled) {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
  border-color: var(--md-sys-color-outline);
}

.icon-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.icon-action-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.btn-primary-accent {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
}

.btn-primary-accent:hover:not(:disabled) {
  background: var(--md-sys-color-primary);
  opacity: 0.9;
  color: var(--md-sys-color-on-primary);
}

.btn-danger-hover:hover:not(:disabled) {
  color: var(--md-sys-color-error);
  border-color: var(--md-sys-color-error);
}

.fullscreen-btn {
  border-color: var(--md-sys-color-outline-variant);
}

.custom-mask-input-wrap {
  display: flex;
  align-items: center;
}

.custom-mask-field {
  background: var(--md-sys-color-surface-container-highest);
  border: 1px solid var(--md-sys-color-outline);
  color: var(--md-sys-color-on-surface);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  outline: none;
  width: 90px;
  height: 24px;
}

.mobile-column-tabs {
  display: none;
}

/* Stats Bar */
.diff-stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  overflow-x: auto;
}

.stats-left,
.stats-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.badge-identical {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge-different {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 500;
}

.clickable-pill {
  background: transparent;
  border: 1px solid var(--md-sys-color-outline-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.clickable-pill:hover {
  transform: translateY(-1px);
}

.clickable-pill.is-active-filter {
  outline: 2px solid var(--md-sys-color-primary);
  font-weight: 700;
}

.stat-email { background: rgba(59, 130, 246, 0.12); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3); }
.stat-password { background: rgba(239, 68, 68, 0.12); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }
.stat-credit-card { background: rgba(245, 158, 11, 0.12); color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
.stat-jwt { background: rgba(168, 85, 247, 0.12); color: #a855f7; border-color: rgba(168, 85, 247, 0.3); }
.stat-ip { background: rgba(6, 182, 212, 0.12); color: #06b6d4; border-color: rgba(6, 182, 212, 0.3); }
.stat-api-key { background: rgba(236, 72, 153, 0.12); color: #ec4899; border-color: rgba(236, 72, 153, 0.3); }
.stat-cloud-secret { background: rgba(249, 115, 22, 0.12); color: #f97316; border-color: rgba(249, 115, 22, 0.3); }
.stat-database-uri { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; border-color: rgba(139, 92, 246, 0.3); }
.stat-phone { background: rgba(16, 185, 129, 0.12); color: #10b981; border-color: rgba(16, 185, 129, 0.3); }
.stat-ssn { background: rgba(234, 88, 12, 0.12); color: #ea580c; border-color: rgba(234, 88, 12, 0.3); }
.stat-identity-number { background: rgba(14, 165, 233, 0.12); color: #0ea5e9; border-color: rgba(14, 165, 233, 0.3); }
.stat-mac-address { background: rgba(100, 116, 139, 0.12); color: #64748b; border-color: rgba(100, 116, 139, 0.3); }

.stat-meta {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.72rem;
}

.structural-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.structural-toggle-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
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
  color: var(--md-sys-color-primary);
  font-size: 0.72rem;
  font-weight: 500;
}

.exec-time-pill {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-family: monospace;
}

/* Rules Manager Panel */
.rules-manager-panel {
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
}

.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rules-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-on-surface);
}

.rules-title h3 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.rules-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.close-rules-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.5rem;
}

.rule-card {
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 6px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.15s ease;
}

.rule-card.active {
  border-color: var(--md-sys-color-primary);
  background: var(--md-sys-color-surface-container-high);
}

.rule-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rule-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.rule-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.rule-desc {
  font-size: 0.7rem;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0;
  line-height: 1.3;
}

.rule-example code {
  font-size: 0.68rem;
  color: var(--md-sys-color-primary);
  background: var(--md-sys-color-surface);
  padding: 1px 4px;
  border-radius: 3px;
}

.cat-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
}

.delete-rule-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-error);
  cursor: pointer;
  padding: 2px;
}

/* Category Badge Styles */
.badge-email { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.badge-password { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.badge-card { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.badge-jwt { background: rgba(168, 85, 247, 0.2); color: #a855f7; }
.badge-ip { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
.badge-api { background: rgba(236, 72, 153, 0.2); color: #ec4899; }
.badge-cloud { background: rgba(249, 115, 22, 0.2); color: #f97316; }
.badge-db { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.badge-phone { background: rgba(16, 185, 129, 0.2); color: #10b981; }
.badge-ssn { background: rgba(234, 88, 12, 0.2); color: #ea580c; }
.badge-nik { background: rgba(14, 165, 233, 0.2); color: #0ea5e9; }
.badge-mac { background: rgba(100, 116, 139, 0.2); color: #64748b; }
.badge-custom { background: rgba(120, 120, 120, 0.2); color: #888; }

/* Main Workspace */
.diff-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.redactor-split-pane {
  flex: 1;
  min-height: 0;
  height: 100%;
}

.pane-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  background: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  overflow: hidden;
}

.pane-wrapper.hidden {
  display: none !important;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  min-height: 28px;
}

.pane-header-left,
.pane-header-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.primary-icon {
  color: var(--md-sys-color-primary);
}

.sanitized-icon {
  color: #10b981;
}

.pane-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.size-tag,
.line-badge {
  font-size: 0.68rem;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  padding: 1px 5px;
  border-radius: 4px;
}

.matches-badge {
  font-size: 0.68rem;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}

.clean-badge {
  font-size: 0.68rem;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}

.pane-icon-btn,
.col-find-toggle-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.pane-icon-btn:hover,
.col-find-toggle-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.col-find-toggle-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.btn-danger-hover:hover {
  color: var(--md-sys-color-error);
}

/* In-Editor Find Bar */
.column-find-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.find-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}

.find-icon {
  position: absolute;
  left: 6px;
  color: var(--md-sys-color-on-surface-variant);
}

.find-input {
  width: 100%;
  background: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline);
  color: var(--md-sys-color-on-surface);
  font-size: 0.72rem;
  padding: 2px 50px 2px 22px;
  border-radius: 4px;
  outline: none;
}

.find-count {
  position: absolute;
  right: 6px;
  font-size: 0.68rem;
  color: var(--md-sys-color-on-surface-variant);
}

.find-opt-btn,
.find-nav-btn,
.find-close-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.72rem;
}

.find-opt-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.editor-inner-wrap {
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* Structural Splitter Handle */
.structural-resize-handle {
  height: 6px;
  width: 100%;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--md-sys-color-surface-container-low);
  border-top: 1px solid var(--md-sys-color-outline-variant);
  transition: background 0.15s ease;
}

.structural-resize-handle:hover,
.structural-resize-handle.is-dragging {
  background: var(--md-sys-color-primary-container);
}

.resize-handle-bar {
  width: 32px;
  height: 3px;
  background: var(--md-sys-color-outline);
  border-radius: 2px;
}

/* Structural & Vault Bottom Panel */
.structural-panel {
  display: flex;
  flex-direction: column;
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  overflow: hidden;
  flex-shrink: 0;
  transition: height 0.1s ease;
}

.structural-panel.is-maximized {
  position: absolute;
  inset: 0;
  height: 100% !important;
  z-index: 100;
}

.structural-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.625rem;
  background: var(--md-sys-color-surface-container-high);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  min-height: 30px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inspector-tab-group {
  display: inline-flex;
  background: var(--md-sys-color-surface-container-low);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.inspector-tab-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.inspector-tab-btn.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.count-tag {
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 8px;
}

.panel-presets-group {
  display: flex;
  gap: 2px;
}

.preset-btn {
  background: transparent;
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.68rem;
  padding: 1px 5px;
  border-radius: 3px;
  cursor: pointer;
}

.preset-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.panel-action-group {
  display: flex;
  gap: 2px;
}

.panel-icon-btn,
.close-mini-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  padding: 3px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.75rem;
}

.panel-icon-btn:hover,
.close-mini-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

/* Subbar */
.structural-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
  background: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  gap: 8px;
  overflow-x: auto;
}

.subbar-left,
.subbar-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 6px;
  color: var(--md-sys-color-on-surface-variant);
}

.search-input {
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline);
  color: var(--md-sys-color-on-surface);
  font-size: 0.72rem;
  padding: 2px 22px 2px 22px;
  border-radius: 4px;
  outline: none;
  width: 180px;
}

.clear-search-btn {
  position: absolute;
  right: 5px;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.65rem;
  cursor: pointer;
}

.filter-chips {
  display: flex;
  gap: 3px;
  overflow-x: auto;
}

.filter-chip {
  background: transparent;
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.68rem;
  padding: 1px 6px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.filter-chip.active {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
}

.subbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  white-space: nowrap;
}

.subbar-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.subbar-btn.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

/* Table */
.structural-table-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.structural-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
  text-align: left;
}

.structural-table th {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  padding: 4px 8px;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  white-space: nowrap;
}

.structural-table td {
  padding: 3px 8px;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
}

.clickable-struct-row:hover {
  background: var(--md-sys-color-surface-container-highest);
}

.idx-col {
  color: var(--md-sys-color-on-surface-variant);
  font-family: monospace;
}

.struct-type-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}

.loc-code {
  font-family: monospace;
  font-size: 0.68rem;
  color: var(--md-sys-color-primary);
}

.masked-code {
  font-family: monospace;
  font-size: 0.7rem;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

.token-vault-key {
  color: #a855f7;
  background: rgba(168, 85, 247, 0.1);
}

.original-val-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.original-preview {
  font-family: monospace;
  font-size: 0.7rem;
  color: var(--md-sys-color-on-surface);
}

.original-preview.blurred {
  filter: blur(4px);
  user-select: none;
}

.copy-path-btn,
.jump-pill-btn {
  background: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.68rem;
  padding: 1px 5px;
  border-radius: 3px;
  cursor: pointer;
}

.copy-path-btn:hover,
.jump-pill-btn:hover {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.empty-struct-search {
  text-align: center;
  padding: 1.5rem;
  color: var(--md-sys-color-on-surface-variant);
  font-style: italic;
}

/* Custom Rule Dialog Form */
.custom-rule-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.dialog-desc {
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0;
}

.form-row-duo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.dialog-error-box {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--md-sys-color-error);
  color: var(--md-sys-color-error);
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .mobile-column-tabs {
    display: inline-flex;
  }
  .samples-group {
    display: none;
  }
}
</style>
