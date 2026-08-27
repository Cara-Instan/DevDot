<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  Clipboard,
  Sparkles,
  Eye,
  EyeOff,
  FileCode,
  Calendar,
  ArrowRightLeft
} from 'lucide-vue-next'
import {
  M3Card,
  M3Button,
  M3TextField,
  M3TextArea,
  M3Checkbox,
  M3Badge
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


// Editable JSON views
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
const isEditingDecoded = ref(false)
const jsonParseError = ref<{ header?: string; payload?: string }>({})
const liveCurrentTimeSec = ref(Math.floor(Date.now() / 1000))
let timerInterval: ReturnType<typeof setInterval> | null = null

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
      iat: now - 60,
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

// Expiry Status Banner computation
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

  if (result.isValidStructure) {
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

  rawToken.value = token
  await processToken(token)
}

// Apply Sample Preset
async function loadSample(type: 'active' | 'expired' | 'rbac') {
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

// Watchers
watch(rawToken, (newVal) => {
  if (!isEditingDecoded.value) {
    processToken(newVal)
  }
})

watch([secretKey, isBase64Secret], () => {
  performVerification()
})

// Snapshot sync
watch([rawToken, secretKey, isBase64Secret], () => {
  snapshotStore.setToolState('jwt-debugger', {
    rawToken: rawToken.value,
    secretKey: secretKey.value,
    isBase64Secret: isBase64Secret.value
  })
})

onMounted(async () => {
  // Setup live clock ticker every 1 second
  timerInterval = setInterval(() => {
    liveCurrentTimeSec.value = Math.floor(Date.now() / 1000)
  }, 1000)

  // Restore snapshot or load active sample default
  const saved = snapshotStore.getToolState('jwt-debugger')
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
  <div class="jwt-debugger-view">
    <!-- Top Header Banner & Preset Quick Actions -->
    <div class="jwt-header-card">
      <div class="jwt-header-left">
        <div class="jwt-icon-wrapper">
          <KeyRound :size="24" />
        </div>
        <div class="jwt-titles">
          <div class="jwt-title-row">
            <h2>Offline JWT Debugger & Inspector</h2>
            <M3Badge
              v-if="decoded.isValidStructure"
              :variant="tokenTimeStatus === 'active' ? 'primary' : tokenTimeStatus === 'expired' ? 'error' : 'secondary'"
            >
              {{ tokenTimeStatus === 'active' ? '● Token Active' : tokenTimeStatus === 'expired' ? '✕ Expired' : tokenTimeStatus === 'future' ? '⏳ Not Yet Valid' : 'No Expiry' }}
            </M3Badge>
            <M3Badge v-else-if="rawToken.trim()" variant="error">
              Invalid JWT Format
            </M3Badge>
          </div>
          <p class="jwt-subtitle">
            Decode headers & claims, monitor live expiration countdowns, and verify HMAC signatures 100% offline.
          </p>
        </div>
      </div>

      <!-- Presets Selector -->
      <div class="preset-actions">
        <span class="preset-label">Presets:</span>
        <button type="button" class="preset-btn" @click="loadSample('active')">
          <Sparkles :size="13" />
          Active HS256
        </button>
        <button type="button" class="preset-btn" @click="loadSample('expired')">
          <Clock :size="13" />
          Expired Token
        </button>
        <button type="button" class="preset-btn" @click="loadSample('rbac')">
          <ShieldCheck :size="13" />
          Auth & RBAC Claims
        </button>
      </div>
    </div>

    <!-- Main Workspace Layout: 2 Columns -->
    <div class="jwt-grid-layout">
      <!-- LEFT COLUMN: Encoded Token Area -->
      <div class="jwt-column left-pane">
        <M3Card variant="outlined" padding="medium" class="column-card">
          <template #header>
            <div class="card-header-row">
              <div class="header-title-group">
                <FileCode :size="18" class="text-primary" />
                <h3>Encoded Token</h3>
                <span class="segment-badge" v-if="tokenParts.isValid">3 Segments</span>
              </div>

              <div class="header-actions">
                <M3Button variant="text" size="small" @click="handlePaste">
                  <template #icon><Clipboard :size="14" /></template>
                  Paste
                </M3Button>
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
                <M3Button variant="text" size="small" :disabled="!rawToken" @click="handleClear">
                  <template #icon><Trash2 :size="14" /></template>
                  Clear
                </M3Button>
              </div>
            </div>
          </template>

          <!-- Color-Coded Segments Legend & Token Highlight -->
          <div class="token-legend">
            <span class="legend-chip header-chip">
              <span class="color-dot header-dot"></span>
              Header
            </span>
            <span class="legend-chip payload-chip">
              <span class="color-dot payload-dot"></span>
              Payload
            </span>
            <span class="legend-chip signature-chip">
              <span class="color-dot signature-dot"></span>
              Signature
            </span>
          </div>

          <!-- Color-Segmented Highlight Preview Box -->
          <div v-if="tokenParts.isValid" class="colored-token-display">
            <span class="part-header">{{ tokenParts.header }}</span>
            <span class="part-dot">.</span>
            <span class="part-payload">{{ tokenParts.payload }}</span>
            <span class="part-dot">.</span>
            <span class="part-signature">{{ tokenParts.signature }}</span>
          </div>

          <!-- Raw Input Textarea -->
          <div class="token-input-wrapper">
            <M3TextArea
              v-model="rawToken"
              placeholder="Paste or type encoded JWT string here (e.g. eyJhbGciOiJIUzI1Ni...)"
              :rows="12"
              class="token-textarea"
            />
          </div>

          <!-- Token Stats Footer -->
          <div class="token-stats-footer">
            <div class="stat-item">
              <span class="stat-name">Length:</span>
              <span class="stat-val">{{ rawToken.length }} chars</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Algorithm:</span>
              <span class="stat-val bold">{{ decoded.header.alg || 'none' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-name">Type:</span>
              <span class="stat-val">{{ decoded.header.typ || 'JWT' }}</span>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="decoded.error" class="error-banner">
            <AlertTriangle :size="16" class="error-icon" />
            <span>{{ decoded.error }}</span>
          </div>
        </M3Card>
      </div>

      <!-- RIGHT COLUMN: Decoded Sections (Header, Payload, Expiry, Signature) -->
      <div class="jwt-column right-pane">
        <!-- 1. LIVE TIME CLAIMS & EXPIRATION COUNTDOWN CARD -->
        <M3Card
          v-if="decoded.isValidStructure && (computedExpiresInfo || computedNotBeforeInfo || computedIssuedAtInfo)"
          variant="elevated"
          padding="medium"
          class="time-claims-card"
        >
          <div class="time-card-header">
            <div class="time-header-title">
              <Clock :size="18" class="text-primary" />
              <h4>Time Claims Inspector (Live Timer)</h4>
            </div>
            <div class="live-clock-badge">
              <span class="live-pulse-dot" :class="{ 'expired-dot': tokenTimeStatus === 'expired' }"></span>
              Live Synced (1s)
            </div>
          </div>

          <!-- Expiry Countdown Large Banner -->
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
              <CheckCircle2 v-if="tokenTimeStatus === 'active'" :size="24" />
              <AlertTriangle v-else :size="24" />
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
                Exact Expiration: {{ computedExpiresInfo.formatted }} ({{ computedExpiresInfo.timestamp }})
              </div>
            </div>
          </div>

          <!-- Claims Timing Detail Grid -->
          <div class="claims-time-grid">
            <!-- iat: Issued At -->
            <div v-if="computedIssuedAtInfo" class="claim-time-cell">
              <div class="cell-label">
                <Calendar :size="13" />
                <span>iat (Issued At)</span>
              </div>
              <div class="cell-time-val">{{ computedIssuedAtInfo.formatted }}</div>
              <div class="cell-rel-val">{{ computedIssuedAtInfo.relative }}</div>
            </div>

            <!-- nbf: Not Before -->
            <div v-if="computedNotBeforeInfo" class="claim-time-cell">
              <div class="cell-label">
                <Clock :size="13" />
                <span>nbf (Not Before)</span>
              </div>
              <div class="cell-time-val">{{ computedNotBeforeInfo.formatted }}</div>
              <div class="cell-rel-val">{{ computedNotBeforeInfo.relative }}</div>
            </div>

            <!-- exp: Expiration Time -->
            <div v-if="computedExpiresInfo" class="claim-time-cell">
              <div class="cell-label">
                <Clock :size="13" />
                <span>exp (Expires At)</span>
              </div>
              <div class="cell-time-val">{{ computedExpiresInfo.formatted }}</div>
              <div class="cell-rel-val" :class="{ 'text-error': computedExpiresInfo.isPast, 'text-success': !computedExpiresInfo.isPast }">
                {{ computedExpiresInfo.relative }}
              </div>
            </div>
          </div>
        </M3Card>

        <!-- 2. HEADER JSON CARD -->
        <M3Card variant="outlined" padding="medium" class="decoded-card">
          <template #header>
            <div class="card-header-row">
              <div class="header-title-group">
                <span class="section-indicator-dot header-dot"></span>
                <h3>Header: Algorithm & Token Type</h3>
              </div>
              <div class="header-actions">
                <M3Button
                  variant="text"
                  size="small"
                  @click="copyText(headerJsonText, 'header')"
                >
                  <template #icon>
                    <Check v-if="copyStatus['header']" :size="14" class="text-success" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copyStatus['header'] ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
          </template>

          <M3TextArea
            v-model="headerJsonText"
            :rows="4"
            class="code-textarea header-code"
          />
          <span v-if="jsonParseError.header" class="field-error-msg">
            {{ jsonParseError.header }}
          </span>
        </M3Card>

        <!-- 3. PAYLOAD JSON CARD -->
        <M3Card variant="outlined" padding="medium" class="decoded-card">
          <template #header>
            <div class="card-header-row">
              <div class="header-title-group">
                <span class="section-indicator-dot payload-dot"></span>
                <h3>Payload: Data & Claims</h3>
              </div>
              <div class="header-actions">
                <M3Button
                  variant="text"
                  size="small"
                  @click="copyText(payloadJsonText, 'payload')"
                >
                  <template #icon>
                    <Check v-if="copyStatus['payload']" :size="14" class="text-success" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copyStatus['payload'] ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
          </template>

          <M3TextArea
            v-model="payloadJsonText"
            :rows="10"
            class="code-textarea payload-code"
          />
          <span v-if="jsonParseError.payload" class="field-error-msg">
            {{ jsonParseError.payload }}
          </span>

          <!-- Re-sign Action Toolbar if editing payload directly -->
          <div class="re-sign-bar">
            <M3Button variant="tonal" size="small" @click="handleSignFromEditors">
              <template #icon><ArrowRightLeft :size="14" /></template>
              Update & Re-Sign Token from JSON
            </M3Button>
          </div>
        </M3Card>

        <!-- 4. SIGNATURE VERIFICATION CARD (100% OFFLINE) -->
        <M3Card variant="outlined" padding="medium" class="decoded-card signature-card">
          <template #header>
            <div class="card-header-row">
              <div class="header-title-group">
                <span class="section-indicator-dot signature-dot"></span>
                <h3>Verify Signature (Offline HMAC)</h3>
              </div>
              <M3Badge
                :variant="verificationResult.isValid ? 'primary' : 'error'"
              >
                {{ verificationResult.isValid ? '✓ Signature Verified' : 'Invalid Signature' }}
              </M3Badge>
            </div>
          </template>

          <!-- Secret Input Field -->
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
                @click="showSecret = !showSecret"
              >
                <template #icon>
                  <EyeOff v-if="showSecret" :size="16" />
                  <Eye v-else :size="16" />
                </template>
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
                <span>Expected: <code>{{ verificationResult.expectedSignature.slice(0, 24) }}...</code></span>
                <span>Token: <code>{{ decoded.signature.slice(0, 24) }}...</code></span>
              </div>
            </div>
          </div>
        </M3Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jwt-debugger-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

/* Header Card */
.jwt-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-large);
  flex-wrap: wrap;
  gap: 1rem;
}

.jwt-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  flex: 1;
}

.jwt-icon-wrapper {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.75rem;
  border-radius: var(--md-sys-shape-corner-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.jwt-titles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.jwt-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.jwt-title-row h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  margin: 0;
}

.jwt-subtitle {
  font-size: 0.875rem;
  color: var(--md-sys-color-on-surface-variant);
  margin: 0;
}

.preset-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface-variant);
  font-weight: 500;
}

.preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.preset-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  border-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-primary);
}

/* Grid Layout */
.jwt-grid-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
  width: 100%;
}

@media (max-width: 1024px) {
  .jwt-grid-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

.jwt-column {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
}


.column-card,
.decoded-card {
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
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-small);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Token Legend & Color Coded Box */
.token-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.color-dot,
.section-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.header-chip, .header-dot { color: #f43f5e; background-color: #f43f5e; }
.payload-chip, .payload-dot { color: #8b5cf6; background-color: #8b5cf6; }
.signature-chip, .signature-dot { color: #0ea5e9; background-color: #0ea5e9; }

.colored-token-display {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  padding: 0.875rem 1rem;
  background-color: var(--md-sys-color-surface-container-highest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  word-break: break-all;
  margin-bottom: 0.875rem;
  max-height: 120px;
  overflow-y: auto;
}

.part-header { color: #f43f5e; font-weight: 500; }
.part-payload { color: #a78bfa; font-weight: 500; }
.part-signature { color: #38bdf8; font-weight: 500; }
.part-dot { color: var(--md-sys-color-outline); font-weight: bold; }

.token-input-wrapper {
  margin-bottom: 0.75rem;
}

.token-textarea :deep(textarea) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
}

.token-stats-footer {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface-variant);
}

.stat-item {
  display: flex;
  gap: 0.375rem;
}

.stat-val.bold {
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

/* Time Claims Inspector Card */
.time-claims-card {
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-primary-container);
}

.time-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.time-header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-header-title h4 {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
  color: var(--md-sys-color-on-surface);
}

.live-clock-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.25rem 0.625rem;
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

.expiry-status-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.125rem;
  border-radius: var(--md-sys-shape-corner-medium);
  margin-bottom: 1rem;
}

.expiry-status-box.is-active {
  background-color: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #16a34a;
}

.expiry-status-box.is-expired {
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #dc2626;
}

.expiry-status-box.is-future {
  background-color: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #d97706;
}

.expiry-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.expiry-main-msg {
  font-size: 0.9375rem;
  color: var(--md-sys-color-on-surface);
}

.expiry-sub-msg {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 0.125rem;
}

.claims-time-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.claim-time-cell {
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 0.625rem 0.75rem;
}

.cell-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-primary);
  margin-bottom: 0.25rem;
}

.cell-time-val {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--md-sys-color-on-surface);
}

.cell-rel-val {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 0.125rem;
}

/* Code textareas */
.code-textarea :deep(textarea) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.header-code :deep(textarea) {
  border-left: 3px solid #f43f5e;
}

.payload-code :deep(textarea) {
  border-left: 3px solid #8b5cf6;
}

.field-error-msg {
  font-size: 0.75rem;
  color: var(--md-sys-color-error);
  margin-top: 0.375rem;
  display: block;
}

.re-sign-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.625rem;
}

/* Signature Card */
.signature-card :deep(textarea) {
  border-left: 3px solid #0ea5e9;
}

.secret-control-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.secret-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.secret-field {
  flex: 1;
}

.toggle-eye-btn {
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
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: var(--md-sys-shape-corner-medium);
  font-size: 0.875rem;
}

.sig-status-banner.sig-valid {
  background-color: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #16a34a;
}

.sig-status-banner.sig-invalid {
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
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
  font-weight: 500;
}

.sig-diff-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.75rem;
  font-family: monospace;
}

.error-banner {
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

.text-success { color: #16a34a; }
.text-error { color: #dc2626; }
.text-primary { color: var(--md-sys-color-primary); }
</style>
