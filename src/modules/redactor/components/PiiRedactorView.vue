<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  EyeOff,
  Copy,
  Check,
  Trash2,
  Download,
  Play,
  SlidersHorizontal,
  Plus,
  X,
  FileText,
  Clock,
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
  Sparkles,
  Info
} from 'lucide-vue-next'
import {
  M3Button,
  M3TextField,
  M3Checkbox,
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

// State
const inputText = ref('')
const outputText = ref('')
const maskingMode = ref<MaskingMode>('category-tag')
const customMask = ref('[REDACTED]')
const preserveLength = ref(false)
const isCopied = ref(false)
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
const selectedFilterCategory = ref<string>('all')

// Rules Management
const activeRuleIds = ref<string[]>(DEFAULT_PII_RULES.map((r) => r.id))
const customRules = ref<PiiRule[]>([])
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
const SAMPLES: Record<string, { title: string; desc: string; content: string }> = {
  serverAccessLog: {
    title: 'Production Server & Access Log',
    desc: 'Web server access log with client IPs, auth tokens, emails, and sensitive query parameters.',
    content: `2026-08-27T08:14:22.104Z [INFO] HTTP/1.1 GET /api/v1/users?email=sarah.connor@cyberdyne.com&auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfODkyMSIsInJvbGUiOiJ1c2VyIn0.wE_45nL_89kM
Client IP: 192.168.1.105 forwarded for 203.0.113.195 - User-Agent: Mozilla/5.0
2026-08-27T08:14:23.412Z [DEBUG] DB query executed for user=sarah.connor@cyberdyne.com (id: 492)
2026-08-27T08:15:01.882Z [ERROR] Failed login attempt for user 'john.doe@example.org' from host 10.240.0.14: password=SuperSecretPassword99!
2026-08-27T08:15:45.301Z [INFO] Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
2026-08-27T08:16:10.005Z [WARN] Rate limit reached for IPv6 client 2001:0db8:85a3:0000:0000:8a2e:0370:7334 on MAC 00:1A:2B:3C:4D:5E`
  },
  paymentLog: {
    title: 'Payment Gateway & Order Webhook',
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
    title: 'Cloud Infrastructure & AWS Terraform Log',
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
    title: 'CRM API Query & Contact Records',
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
  if (selectedFilterCategory.value === 'all') {
    return matchesList.value
  }
  return matchesList.value.filter((m) => m.category === selectedFilterCategory.value)
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
    customRules: customRules.value
  })
}

// Auto-run redact when input or settings change
watch([inputText, maskingMode, customMask, preserveLength, activeRuleIds, customRules], () => {
  handleRedact()
}, { deep: true })

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
    // Validate regex pattern
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

  // Reset form
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

const securityStore = useSecurityStore()

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

// Restore saved state from snapshotStore
onMounted(() => {
  const savedState = snapshotStore.getToolState('pii-redactor')
  if (savedState && savedState.inputText !== undefined) {
    inputText.value = savedState.inputText || ''
    if (savedState.maskingMode) maskingMode.value = savedState.maskingMode
    if (savedState.customMask) customMask.value = savedState.customMask
    if (savedState.preserveLength !== undefined) preserveLength.value = savedState.preserveLength
    if (savedState.activeRuleIds) activeRuleIds.value = savedState.activeRuleIds
    if (savedState.customRules) customRules.value = savedState.customRules
  } else {
    // Load default sample
    loadSample('serverAccessLog')
  }
})
</script>

<template>
  <div class="pii-redactor-container">
    <!-- Top Settings & Controls Bar -->
    <header class="redactor-controls-card">
      <div class="controls-top-row">
        <!-- Masking Mode Selector -->
        <div class="mode-selector-group">
          <label class="control-label">
            <Sparkles :size="14" class="label-icon" />
            Masking Mode:
          </label>
          <div class="mode-pills">
            <button
              v-for="mode in MASKING_MODES"
              :key="mode.id"
              type="button"
              class="mode-pill-btn"
              :class="{ active: maskingMode === mode.id }"
              :title="mode.description"
              @click="maskingMode = mode.id"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="header-actions">
          <M3Button
            variant="tonal"
            @click="isRulesDrawerOpen = !isRulesDrawerOpen"
          >
            <template #icon>
              <SlidersHorizontal :size="16" />
            </template>
            Rules Manager ({{ activeRuleIds.length }}/{{ allRulesList.length }})
          </M3Button>

          <M3Button
            variant="filled"
            @click="handleRedact"
          >
            <template #icon>
              <Play :size="16" />
            </template>
            Sanitize Log
          </M3Button>
        </div>
      </div>

      <!-- Secondary Controls: Custom mask, length toggle, & Samples -->
      <div class="controls-bottom-row">
        <!-- Contextual options for chosen mode -->
        <div class="mode-context-options">
          <template v-if="maskingMode === 'fixed-mask'">
            <div class="custom-mask-input">
              <span class="sub-label">Custom Mask:</span>
              <input
                v-model="customMask"
                type="text"
                class="mask-text-input"
                placeholder="[REDACTED]"
              />
            </div>
          </template>

          <template v-else-if="maskingMode === 'asterisks'">
            <M3Checkbox
              v-model="preserveLength"
              label="Match Original Text Length (e.g. **********)"
            />
          </template>

          <template v-else>
            <span class="mode-hint-text">
              <Info :size="14" />
              {{ MASKING_MODES.find(m => m.id === maskingMode)?.example }}
            </span>
          </template>
        </div>

        <!-- Sample Log Presets -->
        <div class="sample-presets">
          <span class="sub-label">Sample Logs:</span>
          <button
            type="button"
            class="sample-chip"
            @click="loadSample('serverAccessLog')"
          >
            Server Access
          </button>
          <button
            type="button"
            class="sample-chip"
            @click="loadSample('paymentLog')"
          >
            Payment & Cards
          </button>
          <button
            type="button"
            class="sample-chip"
            @click="loadSample('cloudInfraLog')"
          >
            AWS & Cloud Keys
          </button>
          <button
            type="button"
            class="sample-chip"
            @click="loadSample('crmQueryLog')"
          >
            CRM & Contacts
          </button>
        </div>
      </div>
    </header>

    <!-- Rules Configuration Accordion / Drawer -->
    <transition name="expand">
      <div v-if="isRulesDrawerOpen" class="rules-manager-panel">
        <div class="rules-header">
          <div class="rules-title">
            <SlidersHorizontal :size="18" />
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
              @click="isRulesDrawerOpen = false"
            >
              <X :size="18" />
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
                  :size="16"
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
                  <Trash2 :size="13" />
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

    <!-- Main Dual Split Workspace (Raw Input vs Redacted Output) -->
    <div class="redactor-workspace">
      <!-- Input Panel -->
      <div class="editor-pane input-pane">
        <div class="pane-header">
          <div class="pane-title-group">
            <FileText :size="16" />
            <span>Raw Log / Text Input</span>
            <span class="line-badge">{{ (inputText.match(/\n/g) || []).length + 1 }} lines</span>
          </div>
          <div class="pane-actions">
            <M3Button
              v-if="inputText"
              variant="text"
              size="small"
              @click="handleClear"
            >
              <template #icon>
                <Trash2 :size="14" />
              </template>
              Clear
            </M3Button>
          </div>
        </div>

        <div class="editor-wrapper">
          <CodeEditor
            v-model="inputText"
            language="text"
            placeholder="Paste server logs, JSON dumps, curl headers, or confidential data here to redact..."
            height="100%"
          />
        </div>
      </div>

      <!-- Redacted Output Panel -->
      <div class="editor-pane output-pane">
        <div class="pane-header">
          <div class="pane-title-group">
            <EyeOff :size="16" class="sanitized-icon" />
            <span>Sanitized & Redacted Log</span>
            <span v-if="totalMatches > 0" class="matches-badge">
              {{ totalMatches }} PII Redacted
            </span>
            <span v-else class="clean-badge">
              0 PII Detected
            </span>
          </div>
          <div class="pane-actions">
            <M3Button
              variant="tonal"
              size="small"
              :disabled="!outputText"
              @click="copyOutput"
            >
              <template #icon>
                <Check v-if="isCopied" :size="14" />
                <Copy v-else :size="14" />
              </template>
              {{ isCopied ? 'Copied!' : 'Copy' }}
            </M3Button>

            <M3Button
              variant="filled"
              size="small"
              :disabled="!outputText"
              @click="downloadOutput"
            >
              <template #icon>
                <Download :size="14" />
              </template>
              Download .log
            </M3Button>
          </div>
        </div>

        <div class="editor-wrapper">
          <CodeEditor
            v-model="outputText"
            language="text"
            placeholder="Sanitized and redacted output will appear here in real-time..."
            height="100%"
          />
        </div>
      </div>
    </div>

    <!-- Match Statistics & Inspection Bar -->
    <footer class="redactor-stats-bar">
      <div class="stats-left">
        <div class="stat-pill total-stat">
          <EyeOff :size="14" />
          <span>Total Redactions: <strong>{{ totalMatches }}</strong></span>
        </div>

        <div v-if="executionTimeMs !== null" class="stat-pill">
          <Clock :size="14" />
          <span>{{ executionTimeMs }}ms</span>
        </div>

        <!-- Breakdown Badges -->
        <div class="category-breakdown-row">
          <template v-for="(count, cat) in matchesByCategory" :key="cat">
            <button
              v-if="count > 0"
              type="button"
              class="cat-filter-btn"
              :class="[getCategoryBadgeClass(cat as PiiCategory), { active: selectedFilterCategory === cat }]"
              @click="selectedFilterCategory = selectedFilterCategory === cat ? 'all' : cat"
            >
              <component :is="getCategoryIcon(cat as PiiCategory)" :size="12" />
              <span>{{ cat }}: {{ count }}</span>
            </button>
          </template>
        </div>
      </div>

      <div class="stats-right">
        <span class="privacy-note">
          <Lock :size="13" />
          100% Offline Client-Side Execution Guarantee
        </span>
      </div>
    </footer>

    <!-- Match Inspector Table Details (if matches exist) -->
    <section v-if="matchesList.length > 0" class="match-inspector-section">
      <div class="inspector-header">
        <div class="inspector-title">
          <Search :size="16" />
          <h4>Detected PII Entity Inspector ({{ filteredMatches.length }})</h4>
        </div>
        <div v-if="selectedFilterCategory !== 'all'" class="filter-reset">
          <span>Filtered by: <strong>{{ selectedFilterCategory }}</strong></span>
          <button type="button" class="reset-link" @click="selectedFilterCategory = 'all'">Show All</button>
        </div>
      </div>

      <div class="table-container">
        <table class="inspector-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>Rule Name</th>
              <th>Location</th>
              <th>Masked Output</th>
              <th>Original Value (Preview)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in filteredMatches.slice(0, 100)" :key="idx">
              <td class="idx-col">{{ idx + 1 }}</td>
              <td>
                <span class="cat-badge" :class="getCategoryBadgeClass(m.category)">
                  {{ m.category }}
                </span>
              </td>
              <td class="rule-col">{{ m.ruleName }}</td>
              <td class="loc-col">Line {{ m.line }}:{{ m.column }}</td>
              <td>
                <code class="masked-code">{{ m.maskedValue }}</code>
              </td>
              <td>
                <code class="original-preview">{{ m.originalValue }}</code>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredMatches.length > 100" class="table-overflow-hint">
          Showing first 100 of {{ filteredMatches.length }} matches.
        </div>
      </div>
    </section>

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
  gap: 1rem;
  width: 100%;
  padding-bottom: 2rem;
}

/* Controls Top Card */
.redactor-controls-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.25rem;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 16px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.controls-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.mode-selector-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.label-icon {
  color: var(--md-sys-color-primary);
}

.mode-pills {
  display: flex;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  flex-wrap: wrap;
}

.mode-pill-btn {
  border: none;
  background: transparent;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-pill-btn:hover {
  color: var(--md-sys-color-on-surface);
  background-color: rgba(255, 255, 255, 0.05);
}

.mode-pill-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Secondary Controls Row */
.controls-bottom-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.mode-context-options {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.custom-mask-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sub-label {
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 500;
}

.mask-text-input {
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: monospace;
}

.mask-text-input:focus {
  outline: none;
  border-color: var(--md-sys-color-primary);
}

.mode-hint-text {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant);
  font-family: monospace;
}

.sample-presets {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.sample-chip {
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sample-chip:hover {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  border-color: var(--md-sys-color-primary);
}

/* Rules Manager Panel */
.rules-manager-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 16px;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.rules-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--md-sys-color-on-surface);
}

.rules-title h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}

.rules-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--md-sys-color-on-surface);
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.rule-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 0.85rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 10px;
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
  gap: 0.45rem;
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
  font-size: 0.85rem;
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
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0;
  line-height: 1.3;
}

.rule-example {
  margin-top: 0.2rem;
}

.rule-example code {
  font-size: 0.7rem;
  font-family: monospace;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  color: var(--md-sys-color-on-surface-variant);
}

/* Category Badges */
.cat-badge {
  font-size: 0.68rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-email { background-color: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
.badge-password { background-color: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
.badge-card { background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
.badge-jwt { background-color: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
.badge-ip { background-color: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
.badge-api { background-color: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.3); }
.badge-phone { background-color: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); }
.badge-ssn { background-color: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); }
.badge-mac { background-color: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
.badge-custom { background-color: rgba(107, 114, 128, 0.15); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); }

/* Dual Split Workspace */
.redactor-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  min-height: 460px;
  width: 100%;
}

@media (max-width: 900px) {
  .redactor-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}

.editor-pane {
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 16px;
  overflow: hidden;
  min-width: 0;
}


.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 1rem;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.pane-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.sanitized-icon {
  color: #10b981;
}

.line-badge {
  font-size: 0.72rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.matches-badge {
  font-size: 0.72rem;
  background-color: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

.clean-badge {
  font-size: 0.72rem;
  background-color: rgba(16, 185, 129, 0.15);
  color: #34d399;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

.pane-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.editor-wrapper {
  flex: 1;
  min-height: 420px;
}

/* Stats Bar */
.redactor-stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 12px;
}

.stats-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.total-stat {
  color: var(--md-sys-color-on-surface);
  font-weight: 500;
}

.category-breakdown-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.cat-filter-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.cat-filter-btn.active {
  box-shadow: 0 0 0 2px var(--md-sys-color-primary);
  font-weight: 700;
}

.stats-right {
  display: flex;
  align-items: center;
}

.privacy-note {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--md-sys-color-primary);
  font-weight: 500;
}

/* Match Inspector Section */
.match-inspector-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 16px;
  padding: 1rem 1.25rem;
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inspector-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--md-sys-color-on-surface);
}

.inspector-title h4 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}

.filter-reset {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--md-sys-color-on-surface-variant);
}

.reset-link {
  background: transparent;
  border: none;
  color: var(--md-sys-color-primary);
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.8rem;
}

.table-container {
  overflow-x: auto;
}

.inspector-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  text-align: left;
}

.inspector-table th {
  padding: 0.5rem 0.75rem;
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 600;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.inspector-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
}

.idx-col {
  width: 30px;
  color: var(--md-sys-color-on-surface-variant);
}

.rule-col {
  font-weight: 500;
}

.loc-col {
  font-family: monospace;
  color: var(--md-sys-color-on-surface-variant);
}

.masked-code {
  font-family: monospace;
  color: #10b981;
  background-color: rgba(16, 185, 129, 0.1);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
}

.original-preview {
  font-family: monospace;
  color: #f87171;
  background-color: rgba(239, 68, 68, 0.1);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.table-overflow-hint {
  padding: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
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
</style>
