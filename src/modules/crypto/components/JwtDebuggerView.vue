<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Clipboard,
  Sparkles,
  Eye,
  EyeOff,
  FileCode,
  Calendar,
  ArrowRightLeft,
  RotateCcw,
  Key,
  Layers,
  Table as TableIcon,
  Code2,
  Dices,
  Share2
} from 'lucide-vue-next'
import {
  M3Card,
  M3Button,
  M3TextField,
  M3TextArea,
  M3Checkbox,
  M3Badge,
  M3Switch,
  CodeEditor
} from '@/components'
import { useSnapshotStore } from '@/stores'
import {
  decodeJwt,
  verifyJwtSignature,
  signJwt,
  formatRelativeTime
} from '../services/jwt-service'
import type {
  JwtDecoded,
  JwtVerifyResult,
  JwtClaimTimeInfo
} from '../types'

const snapshotStore = useSnapshotStore()

// State
const rawToken = ref('')
const secretKey = ref('your-256-bit-secret')
const isBase64Secret = ref(false)
const showSecret = ref(false)
const autoReSignOnEdit = ref(true)

// View Modes
const activeRightTab = ref<'explorer' | 'editor'>('explorer')
const tokenInputMode = ref<'highlight' | 'raw'>('highlight')

// Editable JSON text for editors
const headerJsonText = ref('{}')
const payloadJsonText = ref('{}')

// Decoded State
const decoded = ref<JwtDecoded>({
  header: { alg: 'HS256', typ: 'JWT' },
  payload: {},
  signature: '',
  headerRaw: '',
  payloadRaw: '',
  signatureRaw: '',
  rawToken: '',
  isValidStructure: false,
  timeStatus: 'no-expiry'
})

// Verification State
const verificationResult = ref<JwtVerifyResult>({
  isValid: false,
  algorithm: 'HS256',
  message: 'Enter secret to verify signature',
  isSupportedAlgorithm: true
})

// UI Interaction State
const copyStatus = ref<{ [key: string]: boolean }>({})
const jsonParseError = ref<{ header?: string; payload?: string }>({})
const liveCurrentTimeSec = ref(Math.floor(Date.now() / 1000))
let timerInterval: ReturnType<typeof setInterval> | null = null
let isUpdatingFromCodeEditor = false

// Standard Claim Descriptions dictionary for the Claims Explorer
const STANDARD_CLAIMS: Record<string, { label: string; desc: string }> = {
  iss: { label: 'Issuer', desc: 'Identifies principal that issued the JWT' },
  sub: { label: 'Subject', desc: 'Identifies the principal that is the subject of the JWT' },
  aud: { label: 'Audience', desc: 'Identifies the recipients that the JWT is intended for' },
  exp: { label: 'Expiration Time', desc: 'Identifies expiration time on or after which token must not be accepted' },
  nbf: { label: 'Not Before', desc: 'Identifies time before which the token must not be accepted' },
  iat: { label: 'Issued At', desc: 'Identifies the time at which the JWT was issued' },
  jti: { label: 'JWT ID', desc: 'Unique identifier for the JWT to prevent replay attacks' },
  name: { label: 'Full Name', desc: 'User full name or display name' },
  email: { label: 'Email', desc: 'User primary email address' },
  role: { label: 'Role', desc: 'Assigned system or user role' },
  roles: { label: 'Roles', desc: 'List of assigned user roles' },
  permissions: { label: 'Permissions', desc: 'List of granted authorization scopes / privileges' },
  scope: { label: 'OAuth Scopes', desc: 'OAuth 2.0 authorized scopes' },
  kid: { label: 'Key ID', desc: 'Header hint indicating which key was used to sign the token' },
  alg: { label: 'Algorithm', desc: 'Cryptographic algorithm used to secure the token' },
  typ: { label: 'Type', desc: 'Token type (usually JWT)' }
}

// Sample Presets
const SAMPLES = {
  active: () => {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'HS256', typ: 'JWT' }
    const payload = {
      sub: 'user_1029384756',
      name: 'Herlandro Ando',
      email: 'ando@devdot.local',
      role: 'lead-architect',
      permissions: ['read:all', 'write:all', 'execute:worker'],
      iat: now - 300, // 5 mins ago
      exp: now + 7200, // 2 hours from now
      iss: 'devtoys-dot.auth'
    }
    return {
      header,
      payload,
      secret: 'your-256-bit-secret'
    }
  },
  expired: () => {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'HS256', typ: 'JWT' }
    const payload = {
      sub: 'user_99887766',
      name: 'Expired Session Tester',
      email: 'expired@devdot.local',
      role: 'tester',
      iat: now - 86400 * 3, // 3 days ago
      exp: now - 86400, // 1 day ago
      iss: 'devtoys-dot.auth'
    }
    return {
      header,
      payload,
      secret: 'your-256-bit-secret'
    }
  },
  rbac: () => {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'HS256', typ: 'JWT', kid: 'key-2026-v1' }
    const payload = {
      iss: 'https://auth.devtoys-dot.internal/',
      sub: 'auth0|64e5f2a1b9c8d7e6',
      aud: ['https://api.devtoys-dot.internal/v1', 'https://gateway.devtoys-dot.internal/'],
      iat: now - 120,
      exp: now + 3600 * 24, // 24 hours
      nbf: now,
      scope: 'openid profile email offline_access admin',
      app_metadata: {
        tier: 'enterprise',
        storageQuotaGb: 100
      }
    }
    return {
      header,
      payload,
      secret: 'super-secure-production-secret-key-32b'
    }
  },
  oidc: () => {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'HS256', typ: 'JWT', kid: 'oidc-rsa-2026' }
    const payload = {
      iss: 'https://accounts.google.com',
      sub: '1098472918475928174',
      aud: '1234567890-apps.googleusercontent.com',
      azp: '1234567890-apps.googleusercontent.com',
      email: 'alex.developer@gmail.com',
      email_verified: true,
      name: 'Alex Developer',
      picture: 'https://lh3.googleusercontent.com/a/default-avatar',
      given_name: 'Alex',
      family_name: 'Developer',
      iat: now - 60,
      exp: now + 3600,
      nonce: 'nonce_9a8b7c6d5e'
    }
    return {
      header,
      payload,
      secret: 'oidc-client-secret-key-signature'
    }
  }
}

// Token Segments for color-coded preview
const tokenParts = computed(() => {
  const token = rawToken.value.trim()
  if (!token) return { header: '', payload: '', signature: '', isValid: false }
  const parts = token.split('.')
  return {
    header: parts[0] || '',
    payload: parts[1] || '',
    signature: parts[2] || '',
    isValid: parts.length === 3
  }
})

// Dynamic Expiry Calculation based on current live ticker
const computedExpiresInfo = computed<JwtClaimTimeInfo | null>(() => {
  if (typeof decoded.value.payload?.exp !== 'number') return null
  const exp = decoded.value.payload.exp
  const diffSec = exp - liveCurrentTimeSec.value
  const date = new Date(exp * 1000)
  return {
    timestamp: exp,
    dateIso: date.toISOString(),
    formatted: date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }),
    relative: formatRelativeTime(diffSec),
    isPast: diffSec < 0,
    remainingSeconds: diffSec
  }
})

const computedNotBeforeInfo = computed<JwtClaimTimeInfo | null>(() => {
  if (typeof decoded.value.payload?.nbf !== 'number') return null
  const nbf = decoded.value.payload.nbf
  const diffSec = nbf - liveCurrentTimeSec.value
  const date = new Date(nbf * 1000)
  return {
    timestamp: nbf,
    dateIso: date.toISOString(),
    formatted: date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }),
    relative: formatRelativeTime(diffSec),
    isPast: diffSec < 0,
    remainingSeconds: diffSec
  }
})

const computedIssuedAtInfo = computed<JwtClaimTimeInfo | null>(() => {
  if (typeof decoded.value.payload?.iat !== 'number') return null
  const iat = decoded.value.payload.iat
  const diffSec = iat - liveCurrentTimeSec.value
  const date = new Date(iat * 1000)
  return {
    timestamp: iat,
    dateIso: date.toISOString(),
    formatted: date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }),
    relative: formatRelativeTime(diffSec),
    isPast: diffSec < 0,
    remainingSeconds: diffSec
  }
})

// Lifespan progress percentage calculation: (now - iat) / (exp - iat) * 100
const lifespanProgress = computed(() => {
  const iat = decoded.value.payload?.iat
  const exp = decoded.value.payload?.exp
  if (typeof iat !== 'number' || typeof exp !== 'number' || exp <= iat) return null

  const now = liveCurrentTimeSec.value
  if (now <= iat) return 0
  if (now >= exp) return 100

  const percent = ((now - iat) / (exp - iat)) * 100
  return Math.min(Math.max(percent, 0), 100)
})

// Expiry Status computation
const tokenTimeStatus = computed<'active' | 'expired' | 'future' | 'no-expiry'>(() => {
  if (computedExpiresInfo.value) {
    if (computedExpiresInfo.value.isPast) return 'expired'
    if (computedNotBeforeInfo.value && !computedNotBeforeInfo.value.isPast) return 'future'
    return 'active'
  }
  if (computedNotBeforeInfo.value && !computedNotBeforeInfo.value.isPast) return 'future'
  return 'no-expiry'
})

// Process Raw Token Input
async function processToken(tokenStr: string) {
  if (!tokenStr.trim()) {
    decoded.value = {
      header: { alg: 'HS256', typ: 'JWT' },
      payload: {},
      signature: '',
      headerRaw: '',
      payloadRaw: '',
      signatureRaw: '',
      rawToken: '',
      isValidStructure: false,
      timeStatus: 'no-expiry'
    }
    headerJsonText.value = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}'
    payloadJsonText.value = '{\n}'
    verificationResult.value = {
      isValid: false,
      algorithm: 'HS256',
      message: 'Enter token to decode and verify',
      isSupportedAlgorithm: true
    }
    return
  }

  const result = decodeJwt(tokenStr)
  decoded.value = result

  if (result.isValidStructure && !isUpdatingFromCodeEditor) {
    headerJsonText.value = JSON.stringify(result.header, null, 2)
    payloadJsonText.value = JSON.stringify(result.payload, null, 2)
    jsonParseError.value = {}
  }

  await performVerification()
}

// Verify Signature
async function performVerification() {
  if (!rawToken.value.trim()) return

  if (!decoded.value.isValidStructure) {
    verificationResult.value = {
      isValid: false,
      algorithm: decoded.value.header?.alg || 'UNKNOWN',
      message: decoded.value.error || 'Malformed token format',
      isSupportedAlgorithm: false
    }
    return
  }

  const res = await verifyJwtSignature(rawToken.value, {
    secret: secretKey.value,
    isBase64Secret: isBase64Secret.value
  })

  verificationResult.value = res
}

// Re-generate Token from Header + Payload JSON + Secret
async function handleSignFromEditors() {
  jsonParseError.value = {}
  let headerObj: any = {}
  let payloadObj: any = {}

  try {
    headerObj = JSON.parse(headerJsonText.value)
  } catch (err: any) {
    jsonParseError.value.header = `Invalid JSON in Header: ${err?.message || 'Syntax Error'}`
    return
  }

  try {
    payloadObj = JSON.parse(payloadJsonText.value)
  } catch (err: any) {
    jsonParseError.value.payload = `Invalid JSON in Payload: ${err?.message || 'Syntax Error'}`
    return
  }

  const alg = headerObj.alg || 'HS256'
  const token = await signJwt({
    header: headerObj,
    payload: payloadObj,
    secret: secretKey.value,
    isBase64Secret: isBase64Secret.value,
    algorithm: alg
  })

  isUpdatingFromCodeEditor = true
  rawToken.value = token
  await processToken(token)
  isUpdatingFromCodeEditor = false
}

function handleEditorChange() {
  if (autoReSignOnEdit.value) {
    handleSignFromEditors()
  }
}

// Apply Sample Preset
async function loadSample(type: 'active' | 'expired' | 'rbac' | 'oidc') {
  const sample = SAMPLES[type]()
  secretKey.value = sample.secret
  isBase64Secret.value = false

  const token = await signJwt({
    header: sample.header,
    payload: sample.payload,
    secret: sample.secret,
    algorithm: sample.header.alg as any
  })

  rawToken.value = token
  await processToken(token)
}

// Generate Random 256-bit Secret Key
function generateRandomSecret() {
  const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+'
  let generated = ''
  for (let i = 0; i < 32; i++) {
    generated += randomChars.charAt(Math.floor(Math.random() * randomChars.length))
  }
  secretKey.value = generated
  performVerification()
}

// Reset / Clear
function handleClear() {
  rawToken.value = ''
  secretKey.value = ''
  processToken('')
}

// Paste from Clipboard
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      rawToken.value = text.trim()
      await processToken(rawToken.value)
    }
  } catch (e) {
    console.error('Clipboard read failed', e)
  }
}

// Copy Helper
async function copyText(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copyStatus.value[key] = true
    setTimeout(() => {
      copyStatus.value[key] = false
    }, 2000)
  } catch (e) {
    console.error('Copy failed', e)
  }
}

// Format claim values for Claims Explorer
function formatClaimValue(val: any): string {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function isDateClaim(key: string): boolean {
  return ['iat', 'exp', 'nbf', 'auth_time'].includes(key)
}

function formatClaimDate(timestampSec: any): string {
  if (typeof timestampSec !== 'number') return ''
  try {
    const d = new Date(timestampSec * 1000)
    return `${d.toLocaleString()} (${formatRelativeTime(timestampSec - liveCurrentTimeSec.value)})`
  } catch {
    return ''
  }
}

// Watchers
watch(rawToken, (newVal) => {
  if (!isUpdatingFromCodeEditor) {
    processToken(newVal)
  }
})

const props = defineProps<{
  tabId?: string
}>()

const currentTabId = computed(() => props.tabId || 'jwt-debugger')

watch([secretKey, isBase64Secret], () => {
  performVerification()
})

let isHydrating = false

// Snapshot sync
watch([rawToken, secretKey, isBase64Secret], () => {
  if (isHydrating) return
  snapshotStore.setTabState(currentTabId.value, 'jwt-debugger', {
    rawToken: rawToken.value,
    secretKey: secretKey.value,
    isBase64Secret: isBase64Secret.value
  })
})

// Hydrate from snapshot store
watch(
  () => snapshotStore.toolStates[currentTabId.value],
  async (newState) => {
    if (newState && !isHydrating) {
      isHydrating = true
      if (newState.rawToken !== undefined && newState.rawToken !== rawToken.value) {
        rawToken.value = newState.rawToken
      }
      if (newState.secretKey !== undefined && newState.secretKey !== secretKey.value) {
        secretKey.value = newState.secretKey
      }
      if (newState.isBase64Secret !== undefined && newState.isBase64Secret !== isBase64Secret.value) {
        isBase64Secret.value = newState.isBase64Secret
      }
      isHydrating = false
      await processToken(rawToken.value)
    }
  },
  { deep: true }
)

onMounted(async () => {
  // Live clock ticker every 1 second
  timerInterval = setInterval(() => {
    liveCurrentTimeSec.value = Math.floor(Date.now() / 1000)
  }, 1000)

  // Restore snapshot or load active sample default
  const saved = snapshotStore.getTabOrToolState<Record<string, any> | null>(props.tabId, 'jwt-debugger', null)
  if (saved && saved.rawToken) {
    rawToken.value = saved.rawToken
    secretKey.value = saved.secretKey ?? 'your-256-bit-secret'
    isBase64Secret.value = saved.isBase64Secret ?? false
    await processToken(rawToken.value)
  } else {
    await loadSample('active')
  }
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})
</script>

<template>
  <div class="jwt-inspector-view">
    <!-- Top Toolbar Header -->
    <div class="jwt-toolbar">
      <div class="toolbar-left">
        <div class="toolbar-brand">
          <FileCode :size="18" class="text-primary brand-icon" />
          <span class="toolbar-title">JWT Inspector</span>
        </div>
        <M3Badge
          v-if="decoded.isValidStructure"
          :variant="tokenTimeStatus === 'active' ? 'primary' : tokenTimeStatus === 'expired' ? 'error' : 'secondary'"
          class="status-pill"
        >
          {{ tokenTimeStatus === 'active' ? '● Active' : tokenTimeStatus === 'expired' ? '✕ Expired' : tokenTimeStatus === 'future' ? '⏳ Future' : 'No Expiry' }}
        </M3Badge>
        <M3Badge v-else-if="rawToken.trim()" variant="error" class="status-pill">
          Invalid Format
        </M3Badge>
      </div>

      <!-- Presets & Quick Actions -->
      <div class="toolbar-right">
        <div class="preset-group">
          <span class="preset-label">Presets:</span>
          <button type="button" class="preset-chip" @click="loadSample('active')">
            <Sparkles :size="12" /> Active
          </button>
          <button type="button" class="preset-chip" @click="loadSample('expired')">
            <Clock :size="12" /> Expired
          </button>
          <button type="button" class="preset-chip" @click="loadSample('rbac')">
            <ShieldCheck :size="12" /> RBAC
          </button>
          <button type="button" class="preset-chip" @click="loadSample('oidc')">
            <Key :size="12" /> OIDC
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <button
          type="button"
          class="action-icon-btn"
          title="Paste from clipboard"
          @click="handlePaste"
        >
          <Clipboard :size="14" />
          <span>Paste</span>
        </button>

        <button
          type="button"
          class="action-icon-btn"
          title="Copy Bearer Authorization Header"
          :disabled="!rawToken"
          @click="copyText(`Bearer ${rawToken}`, 'bearer')"
        >
          <Check v-if="copyStatus['bearer']" :size="14" class="text-success" />
          <Share2 v-else :size="14" />
          <span>{{ copyStatus['bearer'] ? 'Copied' : 'Bearer' }}</span>
        </button>

        <button
          type="button"
          class="action-icon-btn text-danger"
          title="Clear token"
          :disabled="!rawToken"
          @click="handleClear"
        >
          <RotateCcw :size="14" />
          <span>Clear</span>
        </button>
      </div>
    </div>

    <!-- Main Workspace Layout: 2 Columns -->
    <div class="jwt-grid-layout">
      <!-- LEFT COLUMN: Encoded Token Panel -->
      <div class="jwt-column left-pane">
        <M3Card variant="outlined" padding="medium" class="token-panel-card">
          <template #header>
            <div class="card-header-row">
              <div class="header-title-group">
                <Layers :size="18" class="text-primary" />
                <h3>Encoded Token</h3>
                <span class="segment-badge" v-if="tokenParts.isValid">3 Segments</span>
                <span class="segment-badge badge-warn" v-else-if="rawToken.trim()">Malformed</span>
              </div>

              <!-- Segment View Mode Toggle & Copy -->
              <div class="header-actions">
                <div class="mode-toggle-group">
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    :class="{ active: tokenInputMode === 'highlight' }"
                    @click="tokenInputMode = 'highlight'"
                    title="Color-highlighted visual inspection"
                  >
                    Colors
                  </button>
                  <button
                    type="button"
                    class="mode-toggle-btn"
                    :class="{ active: tokenInputMode === 'raw' }"
                    @click="tokenInputMode = 'raw'"
                    title="Direct editable raw token text"
                  >
                    Raw Edit
                  </button>
                </div>

                <M3Button
                  variant="text"
                  size="small"
                  :disabled="!rawToken"
                  @click="copyText(rawToken, 'token')"
                >
                  <template #icon>
                    <Check v-if="copyStatus['token']" :size="14" class="text-success" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copyStatus['token'] ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
          </template>

          <!-- Segment Interactive Pills -->
          <div class="token-segments-bar">
            <button
              type="button"
              class="segment-pill header-pill"
              :title="`Header Base64 (${tokenParts.header.length} chars) - Click to Copy`"
              @click="copyText(tokenParts.header, 'seg-header')"
            >
              <span class="dot-indicator header-dot"></span>
              <span class="pill-title">HEADER</span>
              <span class="pill-chars">{{ tokenParts.header.length || 0 }}c</span>
              <Check v-if="copyStatus['seg-header']" :size="11" class="pill-copy-icon" />
              <Copy v-else :size="11" class="pill-copy-icon" />
            </button>

            <button
              type="button"
              class="segment-pill payload-pill"
              :title="`Payload Base64 (${tokenParts.payload.length} chars) - Click to Copy`"
              @click="copyText(tokenParts.payload, 'seg-payload')"
            >
              <span class="dot-indicator payload-dot"></span>
              <span class="pill-title">PAYLOAD</span>
              <span class="pill-chars">{{ tokenParts.payload.length || 0 }}c</span>
              <Check v-if="copyStatus['seg-payload']" :size="11" class="pill-copy-icon" />
              <Copy v-else :size="11" class="pill-copy-icon" />
            </button>

            <button
              type="button"
              class="segment-pill signature-pill"
              :title="`Signature Base64 (${tokenParts.signature.length} chars) - Click to Copy`"
              @click="copyText(tokenParts.signature, 'seg-sig')"
            >
              <span class="dot-indicator signature-dot"></span>
              <span class="pill-title">SIGNATURE</span>
              <span class="pill-chars">{{ tokenParts.signature.length || 0 }}c</span>
              <Check v-if="copyStatus['seg-sig']" :size="11" class="pill-copy-icon" />
              <Copy v-else :size="11" class="pill-copy-icon" />
            </button>
          </div>

          <!-- Color-Segmented Highlight Preview Box -->
          <div v-if="tokenInputMode === 'highlight'" class="token-preview-container">
            <div v-if="tokenParts.isValid" class="colored-token-display">
              <span class="part-header" title="Header Segment">{{ tokenParts.header }}</span>
              <span class="part-dot">.</span>
              <span class="part-payload" title="Payload Segment">{{ tokenParts.payload }}</span>
              <span class="part-dot">.</span>
              <span class="part-signature" title="Signature Segment">{{ tokenParts.signature }}</span>
            </div>
            <div v-else-if="rawToken.trim()" class="colored-token-display text-muted">
              {{ rawToken }}
            </div>
            <div v-else class="empty-token-placeholder" @click="handlePaste">
              <Clipboard :size="24" class="text-muted" />
              <span>Paste encoded JWT token here or select a preset above</span>
            </div>
          </div>

          <!-- Raw Input Textarea (When in raw edit mode) -->
          <div v-if="tokenInputMode === 'raw'" class="token-input-wrapper">
            <M3TextArea
              v-model="rawToken"
              placeholder="Paste or type encoded JWT string here (e.g. eyJhbGciOiJIUzI1Ni...)"
              :rows="11"
              class="token-textarea"
            />
          </div>

          <!-- Token Stats Footer Bar -->
          <div class="token-stats-footer">
            <div class="stat-badge">
              <span class="stat-name">Length:</span>
              <span class="stat-val">{{ rawToken.length }} chars</span>
            </div>
            <div class="stat-badge">
              <span class="stat-name">Algorithm:</span>
              <span class="stat-val bold-tag">{{ decoded.header.alg || 'none' }}</span>
            </div>
            <div class="stat-badge">
              <span class="stat-name">Type:</span>
              <span class="stat-val">{{ decoded.header.typ || 'JWT' }}</span>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="decoded.error" class="jwt-error-banner">
            <AlertTriangle :size="16" class="error-icon" />
            <span>{{ decoded.error }}</span>
          </div>
        </M3Card>
      </div>

      <!-- RIGHT COLUMN: Decoded Workspace (Claims Explorer, JSON Editors, Signature) -->
      <div class="jwt-column right-pane">
        <!-- 1. TIME CLAIMS LIFESPAN TIMELINE GAUGE -->
        <M3Card
          v-if="decoded.isValidStructure && (computedExpiresInfo || computedNotBeforeInfo || computedIssuedAtInfo)"
          variant="elevated"
          padding="medium"
          class="time-lifecycle-card"
        >
          <div class="lifecycle-header">
            <div class="time-header-title">
              <Clock :size="16" class="text-primary" />
              <h4>Token Lifespan & Time Claims</h4>
            </div>
            <div class="live-clock-badge">
              <span class="live-pulse-dot" :class="{ 'expired-dot': tokenTimeStatus === 'expired' }"></span>
              Live Synced (1s)
            </div>
          </div>

          <!-- Lifespan Visual Timeline Progress Bar -->
          <div v-if="computedIssuedAtInfo && computedExpiresInfo && lifespanProgress !== null" class="lifespan-gauge-wrap">
            <div class="gauge-bar-bg">
              <div
                class="gauge-bar-fill"
                :class="{ 'gauge-expired': tokenTimeStatus === 'expired' }"
                :style="{ width: `${lifespanProgress}%` }"
              ></div>
            </div>
            <div class="gauge-labels">
              <div class="gauge-start">
                <span class="label-dim">Issued:</span> {{ computedIssuedAtInfo.relative }}
              </div>
              <div class="gauge-center">
                <span class="label-dim">{{ Math.round(lifespanProgress) }}% elapsed</span>
              </div>
              <div class="gauge-end" :class="{ 'text-danger': tokenTimeStatus === 'expired', 'text-success': tokenTimeStatus === 'active' }">
                <span class="label-dim">Expires:</span> {{ computedExpiresInfo.relative }}
              </div>
            </div>
          </div>

          <!-- Expiry Alert Pill -->
          <div
            v-if="computedExpiresInfo"
            class="expiry-status-box"
            :class="{
              'is-active': tokenTimeStatus === 'active',
              'is-expired': tokenTimeStatus === 'expired',
              'is-future': tokenTimeStatus === 'future'
            }"
          >
            <div class="expiry-icon-wrap">
              <CheckCircle2 v-if="tokenTimeStatus === 'active'" :size="20" />
              <AlertTriangle v-else :size="20" />
            </div>
            <div class="expiry-text-wrap">
              <div class="expiry-main-msg">
                <template v-if="tokenTimeStatus === 'active'">
                  Token is <strong>Active</strong> (Expires {{ computedExpiresInfo.relative }})
                </template>
                <template v-else-if="tokenTimeStatus === 'expired'">
                  Token is <strong>Expired</strong> ({{ computedExpiresInfo.relative }})
                </template>
                <template v-else>
                  Token is <strong>Not Yet Active</strong> (Valid {{ computedNotBeforeInfo?.relative }})
                </template>
              </div>
              <div class="expiry-sub-msg">
                Exact: {{ computedExpiresInfo.formatted }} <span class="dim">({{ computedExpiresInfo.timestamp }})</span>
              </div>
            </div>
          </div>

          <!-- Claims Timing Detail Grid -->
          <div class="claims-time-grid">
            <!-- iat: Issued At -->
            <div v-if="computedIssuedAtInfo" class="claim-time-cell">
              <div class="cell-label">
                <Calendar :size="12" />
                <span>iat (Issued At)</span>
              </div>
              <div class="cell-time-val">{{ computedIssuedAtInfo.formatted }}</div>
              <div class="cell-rel-val">{{ computedIssuedAtInfo.relative }}</div>
            </div>

            <!-- nbf: Not Before -->
            <div v-if="computedNotBeforeInfo" class="claim-time-cell">
              <div class="cell-label">
                <Clock :size="12" />
                <span>nbf (Not Before)</span>
              </div>
              <div class="cell-time-val">{{ computedNotBeforeInfo.formatted }}</div>
              <div class="cell-rel-val">{{ computedNotBeforeInfo.relative }}</div>
            </div>

            <!-- exp: Expiration Time -->
            <div v-if="computedExpiresInfo" class="claim-time-cell">
              <div class="cell-label">
                <Clock :size="12" />
                <span>exp (Expires At)</span>
              </div>
              <div class="cell-time-val">{{ computedExpiresInfo.formatted }}</div>
              <div class="cell-rel-val" :class="{ 'text-error': computedExpiresInfo.isPast, 'text-success': !computedExpiresInfo.isPast }">
                {{ computedExpiresInfo.relative }}
              </div>
            </div>
          </div>
        </M3Card>

        <!-- 2. DECODED CLAIMS & JSON EDITORS CARD (TABBED) -->
        <M3Card variant="outlined" padding="none" class="decoded-tabs-card">
          <!-- Tab Navigation Bar -->
          <div class="decoded-tabs-header">
            <div class="tab-buttons-group">
              <button
                type="button"
                class="tab-nav-btn"
                :class="{ active: activeRightTab === 'explorer' }"
                @click="activeRightTab = 'explorer'"
              >
                <TableIcon :size="14" />
                <span>Claims Explorer</span>
                <span class="tab-count-badge" v-if="decoded.isValidStructure">
                  {{ Object.keys(decoded.payload || {}).length }}
                </span>
              </button>
              <button
                type="button"
                class="tab-nav-btn"
                :class="{ active: activeRightTab === 'editor' }"
                @click="activeRightTab = 'editor'"
              >
                <Code2 :size="14" />
                <span>JSON Code Editors</span>
              </button>
            </div>

            <!-- Right Controls for Editors -->
            <div class="tab-header-controls" v-if="activeRightTab === 'editor'">
              <div class="auto-sign-toggle">
                <M3Switch
                  v-model="autoReSignOnEdit"
                  label="Auto Re-Sign"
                  size="small"
                />
              </div>
              <M3Button
                variant="tonal"
                size="small"
                @click="handleSignFromEditors"
                title="Re-generate and sign JWT token from JSON editors"
              >
                <template #icon><ArrowRightLeft :size="13" /></template>
                Re-Sign
              </M3Button>
            </div>
          </div>

          <!-- TAB CONTENT 1: CLAIMS EXPLORER -->
          <div v-if="activeRightTab === 'explorer'" class="claims-explorer-pane">
            <!-- Header Metadata Section -->
            <div class="explorer-section">
              <div class="section-title-bar">
                <span class="dot-indicator header-dot"></span>
                <h5>JOSE Header</h5>
                <span class="section-subtitle">{{ decoded.header.alg }} &bull; {{ decoded.header.typ || 'JWT' }}</span>
              </div>
              <div class="claims-table-wrap">
                <table class="claims-table">
                  <thead>
                    <tr>
                      <th style="width: 140px">Claim Key</th>
                      <th style="width: 220px">Description</th>
                      <th>Value</th>
                      <th style="width: 48px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(val, key) in decoded.header" :key="'h_' + key">
                      <td>
                        <code class="claim-key-tag header-key">{{ key }}</code>
                      </td>
                      <td class="claim-desc-cell">
                        {{ STANDARD_CLAIMS[String(key)]?.desc || 'Custom header parameter' }}
                      </td>
                      <td class="claim-value-cell">
                        <span class="value-text">{{ formatClaimValue(val) }}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="claim-copy-btn"
                          title="Copy claim value"
                          @click="copyText(formatClaimValue(val), 'claim_' + key)"
                        >
                          <Check v-if="copyStatus['claim_' + key]" :size="12" class="text-success" />
                          <Copy v-else :size="12" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Payload Claims Section -->
            <div class="explorer-section">
              <div class="section-title-bar">
                <span class="dot-indicator payload-dot"></span>
                <h5>Payload & Claims</h5>
                <span class="section-subtitle">{{ Object.keys(decoded.payload || {}).length }} claims decoded</span>
              </div>
              <div class="claims-table-wrap">
                <table class="claims-table">
                  <thead>
                    <tr>
                      <th style="width: 140px">Claim Key</th>
                      <th style="width: 220px">Description</th>
                      <th>Value</th>
                      <th style="width: 48px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(val, key) in decoded.payload" :key="'p_' + key">
                      <td>
                        <code class="claim-key-tag payload-key">{{ key }}</code>
                        <span v-if="STANDARD_CLAIMS[String(key)]" class="standard-pill">
                          {{ STANDARD_CLAIMS[String(key)].label }}
                        </span>
                      </td>
                      <td class="claim-desc-cell">
                        {{ STANDARD_CLAIMS[String(key)]?.desc || 'Custom payload claim' }}
                      </td>
                      <td class="claim-value-cell">
                        <template v-if="isDateClaim(String(key))">
                          <span class="date-val-highlight">{{ formatClaimDate(val) }}</span>
                          <span class="raw-timestamp"> (timestamp: {{ val }})</span>
                        </template>
                        <template v-else-if="Array.isArray(val)">
                          <div class="array-pills-wrap">
                            <span v-for="(item, idx) in val" :key="idx" class="array-pill">
                              {{ item }}
                            </span>
                          </div>
                        </template>
                        <template v-else>
                          <span class="value-text">{{ formatClaimValue(val) }}</span>
                        </template>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="claim-copy-btn"
                          title="Copy claim value"
                          @click="copyText(formatClaimValue(val), 'claim_' + key)"
                        >
                          <Check v-if="copyStatus['claim_' + key]" :size="12" class="text-success" />
                          <Copy v-else :size="12" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB CONTENT 2: JSON CODE EDITORS -->
          <div v-if="activeRightTab === 'editor'" class="json-editors-pane">
            <!-- Header Editor -->
            <div class="editor-section-box header-editor-box">
              <div class="editor-header-bar">
                <div class="bar-title">
                  <span class="dot-indicator header-dot"></span>
                  <span>Header: Algorithm & Token Type</span>
                </div>
                <button
                  type="button"
                  class="mini-copy-btn"
                  @click="copyText(headerJsonText, 'header_json')"
                >
                  <Check v-if="copyStatus['header_json']" :size="12" class="text-success" />
                  <Copy v-else :size="12" />
                  <span>{{ copyStatus['header_json'] ? 'Copied' : 'Copy' }}</span>
                </button>
              </div>
              <div class="editor-container header-cm">
                <CodeEditor
                  v-model="headerJsonText"
                  language="json"
                  height="120px"
                  :show-toolbar="false"
                  :show-status-bar="false"
                  placeholder='{ "alg": "HS256", "typ": "JWT" }'
                  @change="handleEditorChange"
                />
              </div>
              <span v-if="jsonParseError.header" class="editor-error-msg">
                {{ jsonParseError.header }}
              </span>
            </div>

            <!-- Payload Editor -->
            <div class="editor-section-box payload-editor-box">
              <div class="editor-header-bar">
                <div class="bar-title">
                  <span class="dot-indicator payload-dot"></span>
                  <span>Payload: Data & Claims</span>
                </div>
                <button
                  type="button"
                  class="mini-copy-btn"
                  @click="copyText(payloadJsonText, 'payload_json')"
                >
                  <Check v-if="copyStatus['payload_json']" :size="12" class="text-success" />
                  <Copy v-else :size="12" />
                  <span>{{ copyStatus['payload_json'] ? 'Copied' : 'Copy' }}</span>
                </button>
              </div>
              <div class="editor-container payload-cm">
                <CodeEditor
                  v-model="payloadJsonText"
                  language="json"
                  height="220px"
                  :show-toolbar="false"
                  :show-status-bar="false"
                  placeholder='{ "sub": "1234567890" }'
                  @change="handleEditorChange"
                />
              </div>
              <span v-if="jsonParseError.payload" class="editor-error-msg">
                {{ jsonParseError.payload }}
              </span>
            </div>
          </div>
        </M3Card>

        <!-- 3. OFFLINE HMAC SIGNATURE VERIFICATION CARD -->
        <M3Card variant="outlined" padding="medium" class="signature-card">
          <template #header>
            <div class="card-header-row">
              <div class="header-title-group">
                <span class="dot-indicator signature-dot"></span>
                <h3>Verify Signature</h3>
                <span class="alg-badge">{{ decoded.header.alg || 'HS256' }}</span>
              </div>
              <M3Badge
                :variant="verificationResult.isValid ? 'primary' : 'error'"
              >
                {{ verificationResult.isValid ? '✓ Signature Verified' : 'Invalid Signature' }}
              </M3Badge>
            </div>
          </template>

          <!-- Secret Input Field & Controls -->
          <div class="secret-control-group">
            <div class="secret-input-row">
              <M3TextField
                v-model="secretKey"
                :type="showSecret ? 'text' : 'password'"
                label="HMAC Secret Key"
                placeholder="Enter secret key to verify signature locally"
                class="secret-field"
              />
              <M3Button
                variant="outlined"
                class="toggle-eye-btn"
                :title="showSecret ? 'Hide secret' : 'Show secret'"
                @click="showSecret = !showSecret"
              >
                <template #icon>
                  <EyeOff v-if="showSecret" :size="16" />
                  <Eye v-else :size="16" />
                </template>
              </M3Button>
              <M3Button
                variant="tonal"
                class="random-secret-btn"
                title="Generate Random 256-bit Secret"
                @click="generateRandomSecret"
              >
                <template #icon><Dices :size="15" /></template>
                Random
              </M3Button>
            </div>

            <div class="secret-options-row">
              <M3Checkbox
                v-model="isBase64Secret"
                label="Secret is Base64 encoded"
              />
            </div>
          </div>

          <!-- Signature Status Feedback Banner -->
          <div
            class="sig-status-banner"
            :class="{
              'sig-valid': verificationResult.isValid,
              'sig-invalid': !verificationResult.isValid && secretKey,
              'sig-empty': !secretKey
            }"
          >
            <div class="sig-banner-icon">
              <ShieldCheck v-if="verificationResult.isValid" :size="20" />
              <ShieldAlert v-else :size="20" />
            </div>
            <div class="sig-banner-info">
              <div class="sig-banner-title">
                {{ verificationResult.message }}
              </div>
              <div v-if="verificationResult.expectedSignature && !verificationResult.isValid" class="sig-diff-info">
                <span>Expected: <code>{{ verificationResult.expectedSignature }}</code></span>
                <span>Actual in Token: <code>{{ decoded.signature }}</code></span>
              </div>
            </div>
          </div>
        </M3Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jwt-inspector-view {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

/* Header Toolbar */
.jwt-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  min-height: 40px;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.625rem;
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.status-pill {
  font-size: 0.75rem;
}

.preset-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.preset-label {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 500;
  margin-right: 0.15rem;
}

.preset-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.preset-chip:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-primary);
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: var(--md-sys-color-outline-variant);
}

.action-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.action-icon-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.action-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon-btn.text-danger:hover:not(:disabled) {
  color: var(--md-sys-color-error);
}

/* Grid Layout */
.jwt-grid-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.25fr);
  gap: 1rem;
  align-items: start;
  width: 100%;
}

@media (max-width: 1100px) {
  .jwt-grid-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

.jwt-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.token-panel-card,
.signature-card,
.decoded-tabs-card {
  background-color: var(--md-sys-color-surface-container-low);
  border-color: var(--md-sys-color-outline-variant);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.header-title-group h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
  color: var(--md-sys-color-on-surface);
}

.segment-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-weight: 500;
}

.segment-badge.badge-warn {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.alg-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-radius: var(--md-sys-shape-corner-small);
  font-family: monospace;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mode-toggle-group {
  display: inline-flex;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-full);
  padding: 2px;
}

.mode-toggle-btn {
  padding: 0.15rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full);
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-toggle-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

/* Token Segments Interactive Pills */
.token-segments-bar {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.segment-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.segment-pill:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.header-pill { border-left: 3px solid #f43f5e; }
.payload-pill { border-left: 3px solid #8b5cf6; }
.signature-pill { border-left: 3px solid #0ea5e9; }

.pill-title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--md-sys-color-on-surface);
}

.pill-chars {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  font-family: monospace;
}

.pill-copy-icon {
  color: var(--md-sys-color-on-surface-variant);
}

.dot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.header-dot { background-color: #f43f5e; box-shadow: 0 0 6px rgba(244, 63, 94, 0.4); }
.payload-dot { background-color: #8b5cf6; box-shadow: 0 0 6px rgba(139, 92, 246, 0.4); }
.signature-dot { background-color: #0ea5e9; box-shadow: 0 0 6px rgba(14, 165, 233, 0.4); }

/* Color Highlight Token Box */
.token-preview-container {
  margin-bottom: 0.75rem;
}

.colored-token-display {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  padding: 0.875rem 1rem;
  background-color: var(--md-sys-color-surface-container-highest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  word-break: break-all;
  max-height: 280px;
  min-height: 140px;
  overflow-y: auto;
  user-select: text;
}

.part-header { color: #f43f5e; font-weight: 500; }
.part-payload { color: #a78bfa; font-weight: 500; }
.part-signature { color: #38bdf8; font-weight: 500; }
.part-dot { color: var(--md-sys-color-outline); font-weight: bold; }

.empty-token-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  border: 1px dashed var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8125rem;
  cursor: pointer;
  background-color: var(--md-sys-color-surface-container);
}

.empty-token-placeholder:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.token-input-wrapper {
  margin-bottom: 0.75rem;
}

.token-textarea :deep(textarea) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.token-stats-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  flex-wrap: wrap;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
}

.stat-val {
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}

.bold-tag {
  font-weight: 700;
  color: var(--md-sys-color-primary);
  font-family: monospace;
}

.jwt-error-banner {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  border-radius: var(--md-sys-shape-corner-medium);
  font-size: 0.8125rem;
  margin-top: 0.75rem;
}

/* Time Lifecycle & Progress Gauge Card */
.time-lifecycle-card {
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.lifecycle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.875rem;
}

.time-header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-header-title h4 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  color: var(--md-sys-color-on-surface);
}

.live-clock-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.2rem 0.55rem;
  border-radius: var(--md-sys-shape-corner-full);
}

.live-pulse-dot {
  width: 6px;
  height: 6px;
  background-color: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 8px #22c55e;
  animation: pulse-glow 2s infinite ease-in-out;
}

.live-pulse-dot.expired-dot {
  background-color: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.3); }
}

/* Lifespan Gauge */
.lifespan-gauge-wrap {
  margin-bottom: 0.875rem;
}

.gauge-bar-bg {
  width: 100%;
  height: 6px;
  background-color: var(--md-sys-color-surface-container-highest);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.gauge-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #3b82f6);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.gauge-bar-fill.gauge-expired {
  background: #ef4444;
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  margin-top: 0.25rem;
  color: var(--md-sys-color-on-surface);
}

.label-dim {
  color: var(--md-sys-color-on-surface-variant);
}

.expiry-status-box {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: var(--md-sys-shape-corner-medium);
  margin-bottom: 0.75rem;
}

.expiry-status-box.is-active {
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #16a34a;
}

.expiry-status-box.is-expired {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #dc2626;
}

.expiry-status-box.is-future {
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #d97706;
}

.expiry-main-msg {
  font-size: 0.875rem;
  color: var(--md-sys-color-on-surface);
}

.expiry-sub-msg {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 0.125rem;
}

.expiry-sub-msg .dim {
  opacity: 0.75;
  font-family: monospace;
}

.claims-time-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.5rem;
}

.claim-time-cell {
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.5rem 0.65rem;
}

.cell-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-primary);
  margin-bottom: 0.2rem;
}

.cell-time-val {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}

.cell-rel-val {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 0.1rem;
}

/* Decoded Tabbed Card */
.decoded-tabs-card {
  overflow: hidden;
}

.decoded-tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.tab-buttons-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.tab-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-nav-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.tab-nav-btn.active {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-primary);
  font-weight: 600;
}

.tab-count-badge {
  font-size: 0.6875rem;
  padding: 0.05rem 0.4rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-full);
}

.tab-header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.auto-sign-toggle {
  display: flex;
  align-items: center;
}

/* Claims Explorer Table Pane */
.claims-explorer-pane {
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.explorer-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-title-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title-bar h5 {
  font-size: 0.8125rem;
  font-weight: 600;
  margin: 0;
  color: var(--md-sys-color-on-surface);
}

.section-subtitle {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.claims-table-wrap {
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  overflow-x: auto;
  background-color: var(--md-sys-color-surface-container-lowest);
}

.claims-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
  text-align: left;
}

.claims-table th {
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 600;
  padding: 0.4rem 0.625rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.claims-table td {
  padding: 0.45rem 0.625rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  vertical-align: middle;
}

.claims-table tr:last-child td {
  border-bottom: none;
}

.claims-table tr:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.claim-key-tag {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.header-key {
  color: #f43f5e;
  background-color: rgba(244, 63, 94, 0.1);
}

.payload-key {
  color: #8b5cf6;
  background-color: rgba(139, 92, 246, 0.1);
}

.standard-pill {
  display: block;
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 0.15rem;
}

.claim-desc-cell {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.75rem;
}

.claim-value-cell {
  word-break: break-all;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
}

.date-val-highlight {
  color: var(--md-sys-color-primary);
  font-weight: 500;
}

.raw-timestamp {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
}

.array-pills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.array-pill {
  font-size: 0.6875rem;
  padding: 0.1rem 0.4rem;
  background-color: var(--md-sys-color-surface-container-highest);
  border-radius: var(--md-sys-shape-corner-full);
  color: var(--md-sys-color-on-surface);
}

.claim-copy-btn {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.claim-copy-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

/* JSON Code Editors Pane */
.json-editors-pane {
  padding: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.editor-section-box {
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  overflow: hidden;
  background-color: var(--md-sys-color-surface-container-lowest);
}

.header-editor-box {
  border-left: 3px solid #f43f5e;
}

.payload-editor-box {
  border-left: 3px solid #8b5cf6;
}

.editor-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-surface-container);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.bar-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mini-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.mini-copy-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.editor-container {
  min-height: 100px;
}

.editor-error-msg {
  font-size: 0.75rem;
  color: var(--md-sys-color-error);
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-error-container);
  display: block;
}

/* Signature Card */
.signature-card {
  border-left: 3px solid #0ea5e9;
}

.secret-control-group {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-bottom: 0.75rem;
}

.secret-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.secret-field {
  flex: 1;
}

.toggle-eye-btn,
.random-secret-btn {
  margin-bottom: 0.25rem;
  height: 52px;
}

.secret-options-row {
  display: flex;
  align-items: center;
}

.sig-status-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--md-sys-shape-corner-medium);
  font-size: 0.8125rem;
}

.sig-status-banner.sig-valid {
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #16a34a;
}

.sig-status-banner.sig-invalid {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #dc2626;
}

.sig-status-banner.sig-empty {
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface-variant);
}

.sig-banner-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sig-banner-title {
  font-weight: 600;
}

.sig-diff-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.6875rem;
  font-family: monospace;
}

.text-success { color: #16a34a; }
.text-error { color: #dc2626; }
.text-danger { color: var(--md-sys-color-error); }
.text-primary { color: var(--md-sys-color-primary); }
.text-muted { color: var(--md-sys-color-on-surface-variant); }
</style>
