<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Fingerprint,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  ShieldCheck,
  Calendar,
  Layers,
  Search,
  Lock,
  Unlock,
  KeyRound,
  FileCode2,
  Eye,
  EyeOff,
  ArrowRight,
  FileCheck,
  Sparkles,
  Maximize2,
  Minimize2,
  Clock,
  RotateCcw,
  Sliders
} from 'lucide-vue-next'
import {
  M3Tooltip
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore } from '@/stores'
import { decodeUlid } from '../services/id-generator-service'
import { parseBcryptHash } from '../services/bcrypt-service'
import { detectHashType } from '../services/hash-lookup-service'
import type {
  IdType,
  MultiHashResult,
  UlidDecodedInfo,
  HashEncoding,
  FileChecksumResult,
  BcryptHashResult,
  BcryptVerifyResult,
  BcryptParsedInfo,
  DetectedHashType,
  HashLookupResult,
  AesMode,
  CipherEncoding
} from '../types'

const { execute } = useExecutionEngine()
const snapshotStore = useSnapshotStore()

// Fullscreen & UI Container
const rootRef = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)

// ----------------------------------------------------
// STATE PERSISTENCE INITIALIZATION
// ----------------------------------------------------
const initialSaved = snapshotStore.getToolState('hash-generator', {
  activeTab: 'hash' as 'hash' | 'id-gen' | 'bcrypt' | 'cipher' | 'decrypt',
  // Tab 1: Hash Generator
  hashInput: 'DevDot: 100% Offline Universal Developer Toolkit',
  hashUppercase: false,
  hashEncoding: 'hex' as HashEncoding,
  saltPrefix: '',
  saltSuffix: '',
  enableHmac: false,
  hmacSecret: 'secret-key-123',
  hashToMatch: '',
  showAdvancedHash: false,
  showFileChecksum: false,
  showMatcher: false,
  // Tab 2: ID Gen
  idType: 'uuid' as IdType,
  idCount: 5,
  idUppercase: false,
  uuidHyphens: true,
  nanoidLength: 21,
  nanoidPreset: 'default' as const,
  nanoidAlphabet: 'use-Nanoid_Alphabet0123456789abcdefghijklmnopqrstuvwxyz',
  inspectUlidInput: '',
  // Tab 3: Bcrypt
  bcryptInputPassword: 'SuperSecretPassword2026!',
  bcryptRounds: 10,
  bcryptVerifyPassword: 'SuperSecretPassword2026!',
  bcryptVerifyHash: '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa',
  // Tab 4: AES Cipher
  cipherMode: 'encrypt' as 'encrypt' | 'decrypt',
  cipherInput: 'Sensitive developer data payload to secure offline.',
  cipherPassphrase: 'master-encryption-key-2026',
  cipherAesMode: 'GCM' as AesMode,
  cipherEncoding: 'base64' as CipherEncoding,
  cipherIv: '',
  cipherSalt: '',
  // Tab 5: Hash Decrypt / Lookup
  lookupTargetHash: '5f4dcc3b5aa765d61d8327deb882cf99',
  customWordlist: ''
})

const activeTab = ref<'hash' | 'id-gen' | 'bcrypt' | 'cipher' | 'decrypt'>(initialSaved.activeTab || 'hash')

// ----------------------------------------------------
// TAB 1: HASH GENERATOR & FILE CHECKSUM
// ----------------------------------------------------
const hashInput = ref(initialSaved.hashInput)
const hashUppercase = ref(initialSaved.hashUppercase)
const hashEncoding = ref<HashEncoding>(initialSaved.hashEncoding)
const saltPrefix = ref(initialSaved.saltPrefix)
const saltSuffix = ref(initialSaved.saltSuffix)
const enableHmac = ref(initialSaved.enableHmac)
const hmacSecret = ref(initialSaved.hmacSecret)
const hashToMatch = ref(initialSaved.hashToMatch)
const showAdvancedHash = ref(initialSaved.showAdvancedHash ?? false)
const showFileChecksum = ref(initialSaved.showFileChecksum ?? false)
const showMatcher = ref(initialSaved.showMatcher ?? false)

const hashResults = ref<MultiHashResult>({
  md5: '',
  sha1: '',
  sha256: '',
  sha384: '',
  sha512: '',
  crc32: '',
  isHmac: false,
  matchedAlgorithm: null
})
const hashExecTime = ref<number | null>(null)
const hashError = ref<string | null>(null)
const copiedKey = ref<string | null>(null)

// File Checksum State
const fileChecksumResult = ref<FileChecksumResult | null>(null)
const isComputingFile = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const inputCharCount = computed(() => hashInput.value.length)
const inputByteCount = computed(() => new TextEncoder().encode(hashInput.value).length)

function loadSampleText() {
  hashInput.value = 'DevDot: 100% Offline Universal Developer Toolkit'
}

function loadSampleJson() {
  hashInput.value = '{\n  "appName": "DevDot",\n  "offline": true,\n  "version": "1.0.0"\n}'
}

async function calculateHashes() {
  hashError.value = null
  if (!hashInput.value && !saltPrefix.value && !saltSuffix.value) {
    hashResults.value = {
      md5: '',
      sha1: '',
      sha256: '',
      sha384: '',
      sha512: '',
      crc32: '',
      isHmac: false,
      matchedAlgorithm: null
    }
    return
  }

  try {
    const res = await execute('crypto', 'multi-hash', {
      input: hashInput.value,
      options: {
        uppercase: hashUppercase.value,
        encoding: hashEncoding.value,
        saltPrefix: saltPrefix.value || undefined,
        saltSuffix: saltSuffix.value || undefined,
        hmacSecret: enableHmac.value ? hmacSecret.value : undefined
      },
      hashToMatch: hashToMatch.value
    })

    if (res.success && res.result) {
      hashResults.value = res.result
      hashExecTime.value = res.executionTimeMs
    } else {
      hashError.value = res.error || 'Failed to compute hashes'
    }
  } catch (err: any) {
    hashError.value = err.message || 'Hash calculation failed'
  }
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  isComputingFile.value = true

  try {
    const buffer = await file.arrayBuffer()
    const res = await execute('crypto', 'file-checksum', {
      fileData: buffer,
      fileName: file.name,
      uppercase: hashUppercase.value
    })

    if (res.success && res.result) {
      fileChecksumResult.value = res.result
    }
  } catch (err: any) {
    console.error('File hash calculation failed:', err)
  } finally {
    isComputingFile.value = false
  }
}

// ----------------------------------------------------
// TAB 2: ID GENERATOR STATE
// ----------------------------------------------------
const idType = ref<IdType>(initialSaved.idType || 'uuid')
const idCount = ref(initialSaved.idCount || 5)
const idUppercase = ref(initialSaved.idUppercase || false)
const uuidHyphens = ref(initialSaved.uuidHyphens ?? true)

const nanoidLength = ref(initialSaved.nanoidLength || 21)
const nanoidPreset = ref<'default' | 'hex' | 'numbers' | 'letters' | 'custom'>(initialSaved.nanoidPreset || 'default')
const nanoidAlphabet = ref(initialSaved.nanoidAlphabet || 'use-Nanoid_Alphabet0123456789abcdefghijklmnopqrstuvwxyz')

const generatedIds = ref<string[]>([])
const idExecTime = ref<number | null>(null)
const copiedAllIds = ref(false)
const copiedSingleIdIndex = ref<number | null>(null)

// ULID Timestamp Inspector
const inspectUlidInput = ref(initialSaved.inspectUlidInput || '')
const inspectedUlidInfo = ref<UlidDecodedInfo | null>(null)
const inspectUlidError = ref<string | null>(null)

const NANOID_PRESETS: Record<string, string> = {
  default: 'use-Nanoid_Alphabet0123456789abcdefghijklmnopqrstuvwxyz',
  hex: '0123456789abcdef',
  numbers: '0123456789',
  letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
}

watch(nanoidPreset, (val) => {
  if (val !== 'custom') {
    nanoidAlphabet.value = NANOID_PRESETS[val] || NANOID_PRESETS.default
  }
})

async function handleGenerateIds() {
  try {
    const res = await execute('crypto', 'generate-ids', {
      type: idType.value,
      count: Math.max(1, Math.min(1000, Number(idCount.value))),
      uppercase: idUppercase.value,
      hyphens: uuidHyphens.value,
      nanoidLength: Number(nanoidLength.value),
      nanoidAlphabet: nanoidAlphabet.value
    })

    if (res.success && res.result) {
      generatedIds.value = res.result.ids
      idExecTime.value = res.executionTimeMs
    }
  } catch (err: any) {
    console.error('ID generation failed:', err)
  }
}

function handleInspectUlid(customUlid?: string) {
  inspectUlidError.value = null
  inspectedUlidInfo.value = null
  const target = (customUlid || inspectUlidInput.value).trim()
  if (!target) return

  inspectUlidInput.value = target
  try {
    inspectedUlidInfo.value = decodeUlid(target)
  } catch (err: any) {
    inspectUlidError.value = err.message || 'Invalid ULID format'
  }
}

// ----------------------------------------------------
// TAB 3: BCRYPT GENERATOR & VERIFIER / CHECKER
// ----------------------------------------------------
const bcryptInputPassword = ref(initialSaved.bcryptInputPassword)
const bcryptRounds = ref(initialSaved.bcryptRounds)
const bcryptShowPassword = ref(false)
const bcryptGeneratedResult = ref<BcryptHashResult | null>(null)
const isGeneratingBcrypt = ref(false)

const bcryptVerifyPassword = ref(initialSaved.bcryptVerifyPassword)
const bcryptVerifyHash = ref(initialSaved.bcryptVerifyHash)
const bcryptShowVerifyPassword = ref(false)
const bcryptVerificationResult = ref<BcryptVerifyResult | null>(null)
const isVerifyingBcrypt = ref(false)

const parsedVerifyBcryptInfo = computed<BcryptParsedInfo>(() => {
  return parseBcryptHash(bcryptVerifyHash.value)
})

async function handleGenerateBcrypt() {
  if (!bcryptInputPassword.value) return
  isGeneratingBcrypt.value = true

  try {
    const res = await execute('crypto', 'bcrypt-hash', {
      password: bcryptInputPassword.value,
      options: { rounds: Number(bcryptRounds.value) }
    })

    if (res.success && res.result) {
      bcryptGeneratedResult.value = res.result
    }
  } catch (err: any) {
    console.error('Bcrypt generation failed:', err)
  } finally {
    isGeneratingBcrypt.value = false
  }
}

async function handleVerifyBcrypt() {
  if (!bcryptVerifyHash.value.trim()) return
  isVerifyingBcrypt.value = true

  try {
    const res = await execute('crypto', 'bcrypt-verify', {
      password: bcryptVerifyPassword.value,
      hash: bcryptVerifyHash.value.trim()
    })

    if (res.success && res.result) {
      bcryptVerificationResult.value = res.result
    }
  } catch (err: any) {
    console.error('Bcrypt verification failed:', err)
  } finally {
    isVerifyingBcrypt.value = false
  }
}

function sendBcryptToVerifier() {
  if (bcryptGeneratedResult.value) {
    bcryptVerifyHash.value = bcryptGeneratedResult.value.hash
    bcryptVerifyPassword.value = bcryptInputPassword.value
    handleVerifyBcrypt()
  }
}

// ----------------------------------------------------
// TAB 4: AES CIPHER (ENCRYPT / DECRYPT)
// ----------------------------------------------------
const cipherMode = ref<'encrypt' | 'decrypt'>(initialSaved.cipherMode)
const cipherInput = ref(initialSaved.cipherInput)
const cipherPassphrase = ref(initialSaved.cipherPassphrase)
const cipherShowPassphrase = ref(false)
const cipherAesMode = ref<AesMode>(initialSaved.cipherAesMode)
const cipherEncoding = ref<CipherEncoding>(initialSaved.cipherEncoding)
const cipherIv = ref(initialSaved.cipherIv)
const cipherSalt = ref(initialSaved.cipherSalt)

const cipherOutput = ref('')
const cipherError = ref<string | null>(null)
const cipherExecTime = ref<number | null>(null)
const isProcessingCipher = ref(false)

async function handleProcessCipher() {
  cipherError.value = null
  if (!cipherInput.value || !cipherPassphrase.value) {
    cipherOutput.value = ''
    return
  }

  isProcessingCipher.value = true
  try {
    if (cipherMode.value === 'encrypt') {
      const res = await execute('crypto', 'aes-encrypt', {
        plaintext: cipherInput.value,
        options: {
          passphrase: cipherPassphrase.value,
          mode: cipherAesMode.value,
          encoding: cipherEncoding.value,
          customIvHex: cipherIv.value || undefined
        }
      })

      if (res.success && res.result) {
        cipherOutput.value = res.result.ciphertext
        cipherIv.value = res.result.iv
        cipherSalt.value = res.result.salt
        cipherExecTime.value = res.result.executionTimeMs
      } else {
        cipherError.value = res.error || 'Encryption failed'
      }
    } else {
      const res = await execute('crypto', 'aes-decrypt', {
        ciphertext: cipherInput.value,
        passphrase: cipherPassphrase.value,
        iv: cipherIv.value || undefined,
        salt: cipherSalt.value || undefined,
        mode: cipherAesMode.value,
        encoding: cipherEncoding.value
      })

      if (res.success && res.result) {
        if (res.result.success) {
          cipherOutput.value = res.result.plaintext
          cipherExecTime.value = res.result.executionTimeMs
        } else {
          cipherError.value = res.result.error || 'Decryption failed'
        }
      } else {
        cipherError.value = res.error || 'Decryption failed'
      }
    }
  } catch (err: any) {
    cipherError.value = err.message || 'Operation failed'
  } finally {
    isProcessingCipher.value = false
  }
}

// ----------------------------------------------------
// TAB 5: HASH DECRYPT & PREIMAGE LOOKUP
// ----------------------------------------------------
const lookupTargetHash = ref(initialSaved.lookupTargetHash)
const customWordlist = ref(initialSaved.customWordlist)
const lookupResult = ref<HashLookupResult | null>(null)
const isSearchingLookup = ref(false)
const detectedTypes = computed<DetectedHashType[]>(() => {
  return detectHashType(lookupTargetHash.value)
})

async function handleReverseLookup() {
  if (!lookupTargetHash.value.trim()) return
  isSearchingLookup.value = true
  lookupResult.value = null

  try {
    const customWords = customWordlist.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    const res = await execute('crypto', 'hash-lookup', {
      targetHash: lookupTargetHash.value.trim(),
      options: {
        includeCommonWords: true,
        includePins: true,
        customDictionary: customWords.length ? customWords : undefined
      }
    })

    if (res.success && res.result) {
      lookupResult.value = res.result
    }
  } catch (err: any) {
    console.error('Reverse lookup error:', err)
  } finally {
    isSearchingLookup.value = false
  }
}

// ----------------------------------------------------
// CLIPBOARD UTILITIES
// ----------------------------------------------------
async function copyToClipboard(text: string, key: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) {
        copiedKey.value = null
      }
    }, 2000)
  } catch (err) {
    console.error('Clipboard copy failed:', err)
  }
}

async function handleCopyAllIds() {
  if (!generatedIds.value.length) return
  try {
    await navigator.clipboard.writeText(generatedIds.value.join('\n'))
    copiedAllIds.value = true
    setTimeout(() => {
      copiedAllIds.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy IDs:', err)
  }
}

async function handleCopySingleId(id: string, index: number) {
  try {
    await navigator.clipboard.writeText(id)
    copiedSingleIdIndex.value = index
    setTimeout(() => {
      if (copiedSingleIdIndex.value === index) {
        copiedSingleIdIndex.value = null
      }
    }, 2000)
  } catch (err) {
    console.error('Failed to copy ID:', err)
  }
}

function handleDownloadIds() {
  if (!generatedIds.value.length) return
  const blob = new Blob([generatedIds.value.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${idType.value}-batch-${generatedIds.value.length}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

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
    if (isFullscreen.value) toggleFullscreen()
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    if (activeTab.value === 'id-gen') {
      handleGenerateIds()
    } else if (activeTab.value === 'hash') {
      calculateHashes()
    } else if (activeTab.value === 'bcrypt') {
      handleGenerateBcrypt()
    } else if (activeTab.value === 'cipher') {
      handleProcessCipher()
    }
  }
}

// ----------------------------------------------------
// WATCHERS & STATE PERSISTENCE
// ----------------------------------------------------
watch(
  [
    activeTab,
    hashInput,
    hashUppercase,
    hashEncoding,
    saltPrefix,
    saltSuffix,
    enableHmac,
    hmacSecret,
    hashToMatch,
    showAdvancedHash,
    showFileChecksum,
    showMatcher,
    idType,
    idCount,
    idUppercase,
    uuidHyphens,
    nanoidLength,
    nanoidPreset,
    nanoidAlphabet,
    inspectUlidInput,
    bcryptInputPassword,
    bcryptRounds,
    bcryptVerifyPassword,
    bcryptVerifyHash,
    cipherMode,
    cipherInput,
    cipherPassphrase,
    cipherAesMode,
    cipherEncoding,
    cipherIv,
    cipherSalt,
    lookupTargetHash,
    customWordlist
  ],
  () => {
    snapshotStore.setToolState('hash-generator', {
      activeTab: activeTab.value,
      hashInput: hashInput.value,
      hashUppercase: hashUppercase.value,
      hashEncoding: hashEncoding.value,
      saltPrefix: saltPrefix.value,
      saltSuffix: saltSuffix.value,
      enableHmac: enableHmac.value,
      hmacSecret: hmacSecret.value,
      hashToMatch: hashToMatch.value,
      showAdvancedHash: showAdvancedHash.value,
      showFileChecksum: showFileChecksum.value,
      showMatcher: showMatcher.value,
      idType: idType.value,
      idCount: idCount.value,
      idUppercase: idUppercase.value,
      uuidHyphens: uuidHyphens.value,
      nanoidLength: nanoidLength.value,
      nanoidPreset: nanoidPreset.value,
      nanoidAlphabet: nanoidAlphabet.value,
      inspectUlidInput: inspectUlidInput.value,
      bcryptInputPassword: bcryptInputPassword.value,
      bcryptRounds: bcryptRounds.value,
      bcryptVerifyPassword: bcryptVerifyPassword.value,
      bcryptVerifyHash: bcryptVerifyHash.value,
      cipherMode: cipherMode.value,
      cipherInput: cipherInput.value,
      cipherPassphrase: cipherPassphrase.value,
      cipherAesMode: cipherAesMode.value,
      cipherEncoding: cipherEncoding.value,
      cipherIv: cipherIv.value,
      cipherSalt: cipherSalt.value,
      lookupTargetHash: lookupTargetHash.value,
      customWordlist: customWordlist.value
    })
  },
  { deep: true }
)

// Auto-trigger Hash Calculations on Tab 1 changes
watch(
  [hashInput, hashUppercase, hashEncoding, saltPrefix, saltSuffix, enableHmac, hmacSecret, hashToMatch],
  () => {
    calculateHashes()
  },
  { immediate: true }
)

// Auto-trigger ID Generator on Tab 2 changes
watch(
  [idType, idCount, idUppercase, uuidHyphens, nanoidLength, nanoidAlphabet],
  () => {
    handleGenerateIds()
  },
  { immediate: true }
)

// Auto-trigger Bcrypt initial generation
watch(
  [bcryptRounds],
  () => {
    if (activeTab.value === 'bcrypt' && !bcryptGeneratedResult.value) {
      handleGenerateBcrypt()
    }
  }
)

// Auto-trigger Bcrypt verification
watch(
  [bcryptVerifyPassword, bcryptVerifyHash],
  () => {
    if (bcryptVerifyHash.value.trim() && activeTab.value === 'bcrypt') {
      handleVerifyBcrypt()
    }
  },
  { immediate: true }
)

onMounted(() => {
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
    class="crypto-workspace-container"
    :class="{ 'is-fullscreen': isFullscreen }"
  >
    <!-- Compact 1-Line Modern Top Toolbar -->
    <div class="crypto-toolbar">
      <div class="toolbar-left">
        <!-- Segmented Navigation Pill Group -->
        <div class="segment-group" role="group" aria-label="Tool Navigation Tabs">
          <M3Tooltip text="Compute MD5, SHA-1, SHA-256, SHA-512 & CRC-32" placement="bottom">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: activeTab === 'hash' }"
              @click="activeTab = 'hash'"
            >
              <Fingerprint :size="13" />
              <span>Hashes</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Batch UUID v4, ULID, and NanoID Generator" placement="bottom">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: activeTab === 'id-gen' }"
              @click="activeTab = 'id-gen'"
            >
              <Layers :size="13" />
              <span>ID Generator</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Bcrypt Password Hash Generator & Verifier" placement="bottom">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: activeTab === 'bcrypt' }"
              @click="activeTab = 'bcrypt'"
            >
              <ShieldCheck :size="13" />
              <span>Bcrypt Tool</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="AES-GCM / CBC Offline File & Text Cipher" placement="bottom">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: activeTab === 'cipher' }"
              @click="activeTab = 'cipher'"
            >
              <Lock :size="13" />
              <span>AES Cipher</span>
            </button>
          </M3Tooltip>

          <M3Tooltip text="Offline Hash Type Detection & Preimage Lookup" placement="bottom">
            <button
              type="button"
              class="segment-btn"
              :class="{ active: activeTab === 'decrypt' }"
              @click="activeTab = 'decrypt'"
            >
              <Search :size="13" />
              <span>Hash Lookup</span>
            </button>
          </M3Tooltip>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Execution Metric Pill -->
        <span v-if="activeTab === 'hash' && hashExecTime !== null" class="exec-badge">
          <Clock :size="11" />
          {{ hashExecTime }} ms
        </span>
        <span v-else-if="activeTab === 'id-gen' && idExecTime !== null" class="exec-badge">
          <Clock :size="11" />
          {{ generatedIds.length }} IDs ({{ idExecTime }} ms)
        </span>
        <span v-else-if="activeTab === 'bcrypt' && bcryptGeneratedResult" class="exec-badge">
          <Clock :size="11" />
          2^{{ bcryptRounds }} in {{ bcryptGeneratedResult.executionTimeMs }} ms
        </span>
        <span v-else-if="activeTab === 'cipher' && cipherExecTime !== null" class="exec-badge">
          <Clock :size="11" />
          AES-{{ cipherAesMode }} ({{ cipherExecTime }} ms)
        </span>

        <!-- Quick Regenerate / Action Button -->
        <M3Tooltip
          v-if="activeTab === 'id-gen'"
          text="Regenerate Batch IDs (Ctrl+Enter)"
          placement="bottom"
        >
          <button
            type="button"
            class="compact-action-btn primary-btn"
            @click="handleGenerateIds"
          >
            <RefreshCw :size="12" />
            <span>Regenerate</span>
          </button>
        </M3Tooltip>

        <M3Tooltip
          v-if="activeTab === 'id-gen'"
          text="Copy all generated IDs"
          placement="bottom"
        >
          <button
            type="button"
            class="compact-action-btn tonal-btn"
            :disabled="!generatedIds.length"
            @click="handleCopyAllIds"
          >
            <Check v-if="copiedAllIds" :size="12" />
            <Copy v-else :size="12" />
            <span>{{ copiedAllIds ? 'Copied' : 'Copy All' }}</span>
          </button>
        </M3Tooltip>

        <div class="toolbar-divider"></div>

        <!-- Fullscreen Button -->
        <M3Tooltip :text="isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen View'" placement="bottom">
          <button
            type="button"
            class="icon-action-btn"
            :class="{ active: isFullscreen }"
            aria-label="Toggle Fullscreen"
            @click="toggleFullscreen"
          >
            <Minimize2 v-if="isFullscreen" :size="13" />
            <Maximize2 v-else :size="13" />
          </button>
        </M3Tooltip>
      </div>
    </div>

    <!-- MAIN CONTENT VIEWPORT -->
    <div class="crypto-content-body">
      <!-- ==================================================== -->
      <!-- TAB 1: HASH GENERATOR & FILE CHECKSUMS -->
      <!-- ==================================================== -->
      <div v-if="activeTab === 'hash'" class="tab-pane-view hash-pane">
        <!-- Compact Input & Option Bar -->
        <div class="compact-config-section">
          <!-- Input Header Row -->
          <div class="config-header-row">
            <div class="row-title-group">
              <span class="section-title">Input Payload</span>
              <span class="meta-tag">{{ inputCharCount }} chars • {{ inputByteCount }} bytes</span>
            </div>

            <div class="row-actions-group">
              <button type="button" class="mini-chip-btn" @click="loadSampleText">
                <Sparkles :size="11" />
                <span>Sample Text</span>
              </button>
              <button type="button" class="mini-chip-btn" @click="loadSampleJson">
                <FileCode2 :size="11" />
                <span>Sample JSON</span>
              </button>
              <button type="button" class="mini-chip-btn danger-chip" @click="hashInput = ''; hashToMatch = ''">
                <RotateCcw :size="11" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <!-- Input Textarea -->
          <div class="compact-textarea-wrap">
            <textarea
              v-model="hashInput"
              class="compact-styled-textarea"
              rows="2"
              placeholder="Type or paste payload to calculate hashes in real-time..."
              spellcheck="false"
            ></textarea>
          </div>

          <!-- Inline Control Bar -->
          <div class="inline-controls-bar">
            <!-- Output Encoding Segment -->
            <div class="control-unit">
              <span class="control-label">Digest:</span>
              <div class="segment-group mini" role="group">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: hashEncoding === 'hex' }"
                  @click="hashEncoding = 'hex'"
                >
                  HEX
                </button>
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: hashEncoding === 'base64' }"
                  @click="hashEncoding = 'base64'"
                >
                  Base64
                </button>
              </div>
            </div>

            <!-- Case Toggle -->
            <div class="control-unit">
              <button
                type="button"
                class="icon-toggle-pill"
                :class="{ active: hashUppercase }"
                @click="hashUppercase = !hashUppercase"
              >
                <span>{{ hashUppercase ? 'UPPERCASE' : 'lowercase' }}</span>
              </button>
            </div>

            <div class="control-divider"></div>

            <!-- Option Toggles -->
            <div class="option-toggles-cluster">
              <button
                type="button"
                class="icon-toggle-pill"
                :class="{ active: enableHmac }"
                @click="enableHmac = !enableHmac; if (enableHmac) showAdvancedHash = true"
              >
                <KeyRound :size="12" />
                <span>HMAC Secret</span>
              </button>

              <button
                type="button"
                class="icon-toggle-pill"
                :class="{ active: showAdvancedHash }"
                @click="showAdvancedHash = !showAdvancedHash"
              >
                <Sliders :size="12" />
                <span>Salt Prefix/Suffix</span>
              </button>

              <button
                type="button"
                class="icon-toggle-pill"
                :class="{ active: showMatcher }"
                @click="showMatcher = !showMatcher"
              >
                <ShieldCheck :size="12" />
                <span>Live Matcher</span>
              </button>

              <button
                type="button"
                class="icon-toggle-pill"
                :class="{ active: showFileChecksum }"
                @click="showFileChecksum = !showFileChecksum"
              >
                <FileCheck :size="12" />
                <span>File Checksum</span>
              </button>
            </div>
          </div>

          <!-- Expandable Advanced Hash Controls (HMAC, Salt) -->
          <div v-if="showAdvancedHash || enableHmac" class="expandable-panel-box">
            <div class="expandable-grid">
              <div v-if="enableHmac" class="grid-col">
                <label class="compact-input-label">HMAC Secret Key</label>
                <input
                  v-model="hmacSecret"
                  type="text"
                  class="compact-text-input"
                  placeholder="Cryptographic secret key for Keyed-Hash (HMAC)"
                />
              </div>
              <div class="grid-col">
                <label class="compact-input-label">Salt Prefix (Prepend)</label>
                <input
                  v-model="saltPrefix"
                  type="text"
                  class="compact-text-input"
                  placeholder="e.g. secret_prefix_"
                />
              </div>
              <div class="grid-col">
                <label class="compact-input-label">Salt Suffix (Append)</label>
                <input
                  v-model="saltSuffix"
                  type="text"
                  class="compact-text-input"
                  placeholder="e.g. _salt_suffix"
                />
              </div>
            </div>
          </div>

          <!-- Expandable Live Matcher -->
          <div v-if="showMatcher" class="expandable-panel-box matcher-box">
            <div class="matcher-input-row">
              <ShieldCheck :size="15" class="matcher-lead-icon" />
              <input
                v-model="hashToMatch"
                type="text"
                class="compact-text-input font-mono"
                placeholder="Paste expected hash / checksum to highlight exact algorithm match..."
              />
              <button
                v-if="hashToMatch"
                type="button"
                class="mini-clear-btn"
                @click="hashToMatch = ''"
              >
                ✕
              </button>
            </div>
            <div v-if="hashResults.matchedAlgorithm" class="matched-inline-notice">
              <CheckCircle2 :size="14" />
              <span><strong>EXACT MATCH FOUND:</strong> Matches <strong>{{ hashResults.matchedAlgorithm.toUpperCase() }}</strong></span>
            </div>
          </div>

          <!-- Expandable File Checksum Zone -->
          <div v-if="showFileChecksum" class="expandable-panel-box file-box">
            <div class="file-checksum-header">
              <div class="file-lead">
                <FileCheck :size="15" />
                <span>Compute Checksums from Local File (100% In-Memory Offline)</span>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                class="hidden-file-input"
                @change="handleFileUpload"
              />
              <button
                type="button"
                class="compact-action-btn tonal-btn"
                :disabled="isComputingFile"
                @click="fileInputRef?.click()"
              >
                <RefreshCw v-if="isComputingFile" class="spin-icon" :size="12" />
                <FileCode2 v-else :size="12" />
                <span>{{ isComputingFile ? 'Hashing File...' : 'Select Local File' }}</span>
              </button>
            </div>

            <div v-if="fileChecksumResult" class="file-result-pills">
              <div class="file-meta-row">
                <span class="file-name">{{ fileChecksumResult.fileName }}</span>
                <span class="file-size">({{ (fileChecksumResult.fileSize / 1024).toFixed(1) }} KB in {{ fileChecksumResult.executionTimeMs }} ms)</span>
              </div>
              <div class="file-hashes-grid">
                <div class="file-hash-row">
                  <span class="algo-pill">SHA-256</span>
                  <code class="mono-digest">{{ fileChecksumResult.sha256 }}</code>
                  <button type="button" class="mini-copy-icon-btn" @click="copyToClipboard(fileChecksumResult.sha256, 'file-sha256')">
                    <Check v-if="copiedKey === 'file-sha256'" :size="12" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
                <div class="file-hash-row">
                  <span class="algo-pill">MD5</span>
                  <code class="mono-digest">{{ fileChecksumResult.md5 }}</code>
                  <button type="button" class="mini-copy-icon-btn" @click="copyToClipboard(fileChecksumResult.md5, 'file-md5')">
                    <Check v-if="copiedKey === 'file-md5'" :size="12" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- High-Density Multi-Hash Cards Grid -->
        <div class="dense-hash-grid">
          <!-- SHA-256 -->
          <div
            class="compact-hash-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha256' }"
          >
            <div class="card-top-bar">
              <div class="badge-cluster">
                <span class="algo-badge sha256">SHA-256</span>
                <span class="algo-desc">256-bit • FIPS 180-4 Standard</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="card-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha256'" class="matched-badge">MATCHED</span>
                <M3Tooltip :text="copiedKey === 'sha256' ? 'Copied!' : 'Copy SHA-256'" placement="top">
                  <button
                    type="button"
                    class="hash-copy-btn"
                    :disabled="!hashResults.sha256"
                    @click="copyToClipboard(hashResults.sha256, 'sha256')"
                  >
                    <Check v-if="copiedKey === 'sha256'" :size="12" />
                    <Copy v-else :size="12" />
                    <span>{{ copiedKey === 'sha256' ? 'Copied' : 'Copy' }}</span>
                  </button>
                </M3Tooltip>
              </div>
            </div>
            <div
              class="digest-output-box"
              :class="{ clickable: !!hashResults.sha256 }"
              @click="copyToClipboard(hashResults.sha256, 'sha256')"
            >
              <code class="digest-text">{{ hashResults.sha256 || 'Type or paste input payload above...' }}</code>
            </div>
          </div>

          <!-- SHA-512 -->
          <div
            class="compact-hash-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha512' }"
          >
            <div class="card-top-bar">
              <div class="badge-cluster">
                <span class="algo-badge sha512">SHA-512</span>
                <span class="algo-desc">512-bit • Max Collision Resistance</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="card-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha512'" class="matched-badge">MATCHED</span>
                <M3Tooltip :text="copiedKey === 'sha512' ? 'Copied!' : 'Copy SHA-512'" placement="top">
                  <button
                    type="button"
                    class="hash-copy-btn"
                    :disabled="!hashResults.sha512"
                    @click="copyToClipboard(hashResults.sha512, 'sha512')"
                  >
                    <Check v-if="copiedKey === 'sha512'" :size="12" />
                    <Copy v-else :size="12" />
                    <span>{{ copiedKey === 'sha512' ? 'Copied' : 'Copy' }}</span>
                  </button>
                </M3Tooltip>
              </div>
            </div>
            <div
              class="digest-output-box"
              :class="{ clickable: !!hashResults.sha512 }"
              @click="copyToClipboard(hashResults.sha512, 'sha512')"
            >
              <code class="digest-text">{{ hashResults.sha512 || 'Type or paste input payload above...' }}</code>
            </div>
          </div>

          <!-- MD5 -->
          <div
            class="compact-hash-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'md5' }"
          >
            <div class="card-top-bar">
              <div class="badge-cluster">
                <span class="algo-badge md5">MD5</span>
                <span class="algo-desc">128-bit • Legacy Checksums</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="card-actions">
                <span v-if="hashResults.matchedAlgorithm === 'md5'" class="matched-badge">MATCHED</span>
                <M3Tooltip :text="copiedKey === 'md5' ? 'Copied!' : 'Copy MD5'" placement="top">
                  <button
                    type="button"
                    class="hash-copy-btn"
                    :disabled="!hashResults.md5"
                    @click="copyToClipboard(hashResults.md5, 'md5')"
                  >
                    <Check v-if="copiedKey === 'md5'" :size="12" />
                    <Copy v-else :size="12" />
                    <span>{{ copiedKey === 'md5' ? 'Copied' : 'Copy' }}</span>
                  </button>
                </M3Tooltip>
              </div>
            </div>
            <div
              class="digest-output-box"
              :class="{ clickable: !!hashResults.md5 }"
              @click="copyToClipboard(hashResults.md5, 'md5')"
            >
              <code class="digest-text">{{ hashResults.md5 || 'Type or paste input payload above...' }}</code>
            </div>
          </div>

          <!-- SHA-1 -->
          <div
            class="compact-hash-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha1' }"
          >
            <div class="card-top-bar">
              <div class="badge-cluster">
                <span class="algo-badge sha1">SHA-1</span>
                <span class="algo-desc">160-bit • Git Commit Object ID</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="card-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha1'" class="matched-badge">MATCHED</span>
                <M3Tooltip :text="copiedKey === 'sha1' ? 'Copied!' : 'Copy SHA-1'" placement="top">
                  <button
                    type="button"
                    class="hash-copy-btn"
                    :disabled="!hashResults.sha1"
                    @click="copyToClipboard(hashResults.sha1, 'sha1')"
                  >
                    <Check v-if="copiedKey === 'sha1'" :size="12" />
                    <Copy v-else :size="12" />
                    <span>{{ copiedKey === 'sha1' ? 'Copied' : 'Copy' }}</span>
                  </button>
                </M3Tooltip>
              </div>
            </div>
            <div
              class="digest-output-box"
              :class="{ clickable: !!hashResults.sha1 }"
              @click="copyToClipboard(hashResults.sha1, 'sha1')"
            >
              <code class="digest-text">{{ hashResults.sha1 || 'Type or paste input payload above...' }}</code>
            </div>
          </div>

          <!-- SHA-384 -->
          <div
            class="compact-hash-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha384' }"
          >
            <div class="card-top-bar">
              <div class="badge-cluster">
                <span class="algo-badge sha384">SHA-384</span>
                <span class="algo-desc">384-bit • NSA Suite B Cryptography</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="card-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha384'" class="matched-badge">MATCHED</span>
                <M3Tooltip :text="copiedKey === 'sha384' ? 'Copied!' : 'Copy SHA-384'" placement="top">
                  <button
                    type="button"
                    class="hash-copy-btn"
                    :disabled="!hashResults.sha384"
                    @click="copyToClipboard(hashResults.sha384, 'sha384')"
                  >
                    <Check v-if="copiedKey === 'sha384'" :size="12" />
                    <Copy v-else :size="12" />
                    <span>{{ copiedKey === 'sha384' ? 'Copied' : 'Copy' }}</span>
                  </button>
                </M3Tooltip>
              </div>
            </div>
            <div
              class="digest-output-box"
              :class="{ clickable: !!hashResults.sha384 }"
              @click="copyToClipboard(hashResults.sha384, 'sha384')"
            >
              <code class="digest-text">{{ hashResults.sha384 || 'Type or paste input payload above...' }}</code>
            </div>
          </div>

          <!-- CRC-32 -->
          <div
            class="compact-hash-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'crc32' }"
          >
            <div class="card-top-bar">
              <div class="badge-cluster">
                <span class="algo-badge crc32">CRC-32</span>
                <span class="algo-desc">32-bit • Ultra Fast Integrity Hash</span>
              </div>
              <div class="card-actions">
                <span v-if="hashResults.matchedAlgorithm === 'crc32'" class="matched-badge">MATCHED</span>
                <M3Tooltip :text="copiedKey === 'crc32' ? 'Copied!' : 'Copy CRC-32'" placement="top">
                  <button
                    type="button"
                    class="hash-copy-btn"
                    :disabled="!hashResults.crc32"
                    @click="copyToClipboard(hashResults.crc32, 'crc32')"
                  >
                    <Check v-if="copiedKey === 'crc32'" :size="12" />
                    <Copy v-else :size="12" />
                    <span>{{ copiedKey === 'crc32' ? 'Copied' : 'Copy' }}</span>
                  </button>
                </M3Tooltip>
              </div>
            </div>
            <div
              class="digest-output-box"
              :class="{ clickable: !!hashResults.crc32 }"
              @click="copyToClipboard(hashResults.crc32, 'crc32')"
            >
              <code class="digest-text">{{ hashResults.crc32 || 'Type or paste input payload above...' }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 2: ID GENERATOR (UUID, ULID, NANOID) -->
      <!-- ==================================================== -->
      <div v-else-if="activeTab === 'id-gen'" class="tab-pane-view id-gen-pane">
        <!-- Compact Toolbar Options -->
        <div class="compact-config-section">
          <div class="id-gen-controls-row">
            <!-- Format Selector Segment -->
            <div class="control-unit">
              <span class="control-label">Format:</span>
              <div class="segment-group" role="group">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: idType === 'uuid' }"
                  @click="idType = 'uuid'"
                >
                  <span>UUID v4</span>
                </button>
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: idType === 'ulid' }"
                  @click="idType = 'ulid'"
                >
                  <span>ULID</span>
                </button>
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: idType === 'nanoid' }"
                  @click="idType = 'nanoid'"
                >
                  <span>NanoID</span>
                </button>
              </div>
            </div>

            <!-- Batch Count Input -->
            <div class="control-unit">
              <span class="control-label">Batch:</span>
              <div class="batch-stepper-wrap">
                <input
                  v-model.number="idCount"
                  type="number"
                  min="1"
                  max="1000"
                  class="compact-number-input"
                />
                <div class="batch-chips-group">
                  <button
                    v-for="preset in [1, 5, 10, 50, 100]"
                    :key="preset"
                    type="button"
                    class="batch-chip"
                    :class="{ active: idCount === preset }"
                    @click="idCount = preset"
                  >
                    {{ preset }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Uppercase Toggle -->
            <div class="control-unit">
              <button
                type="button"
                class="icon-toggle-pill"
                :class="{ active: idUppercase }"
                @click="idUppercase = !idUppercase"
              >
                <span>{{ idUppercase ? 'UPPERCASE' : 'lowercase' }}</span>
              </button>
            </div>

            <!-- UUID Hyphens Option -->
            <div v-if="idType === 'uuid'" class="control-unit">
              <button
                type="button"
                class="icon-toggle-pill"
                :class="{ active: uuidHyphens }"
                @click="uuidHyphens = !uuidHyphens"
              >
                <span>Hyphens (8-4-4-4-12)</span>
              </button>
            </div>

            <!-- NanoID Specific Options -->
            <template v-if="idType === 'nanoid'">
              <div class="control-unit">
                <span class="control-label">Length:</span>
                <input
                  v-model.number="nanoidLength"
                  type="number"
                  min="1"
                  max="128"
                  class="compact-number-input"
                />
              </div>

              <div class="control-unit">
                <span class="control-label">Alphabet:</span>
                <select v-model="nanoidPreset" class="compact-select">
                  <option value="default">Default URL-Safe (A-Z, a-z, 0-9, _, -)</option>
                  <option value="hex">Hexadecimal (0-9, a-f)</option>
                  <option value="numbers">Numbers Only (0-9)</option>
                  <option value="letters">Letters Only (A-Z, a-z)</option>
                  <option value="custom">Custom Alphabet</option>
                </select>
              </div>
            </template>
          </div>

          <!-- Custom NanoID Alphabet Input if chosen -->
          <div v-if="idType === 'nanoid' && nanoidPreset === 'custom'" class="custom-alphabet-bar">
            <label class="compact-input-label">Custom Characters Alphabet</label>
            <input
              v-model="nanoidAlphabet"
              type="text"
              class="compact-text-input font-mono"
              placeholder="Specify custom character set..."
            />
          </div>
        </div>

        <!-- Generated IDs High-Density List Container -->
        <div class="id-results-panel">
          <div class="id-panel-header">
            <div class="id-panel-title">
              <span class="pane-title">Generated Identifiers ({{ generatedIds.length }})</span>
              <span class="engine-badge">{{ idType.toUpperCase() }}</span>
            </div>

            <div class="id-panel-actions">
              <M3Tooltip text="Copy all identifiers as multiline text" placement="top">
                <button
                  type="button"
                  class="compact-action-btn tonal-btn"
                  :disabled="!generatedIds.length"
                  @click="handleCopyAllIds"
                >
                  <Check v-if="copiedAllIds" :size="12" />
                  <Copy v-else :size="12" />
                  <span>{{ copiedAllIds ? 'All Copied' : 'Copy All' }}</span>
                </button>
              </M3Tooltip>

              <M3Tooltip text="Download identifiers as .txt file" placement="top">
                <button
                  type="button"
                  class="compact-action-btn outline-btn"
                  :disabled="!generatedIds.length"
                  @click="handleDownloadIds"
                >
                  <Download :size="12" />
                  <span>Save .txt</span>
                </button>
              </M3Tooltip>
            </div>
          </div>

          <div class="ids-scroll-viewport">
            <div
              v-for="(id, index) in generatedIds"
              :key="index"
              class="id-item-tile"
            >
              <div class="id-index-col">#{{ index + 1 }}</div>
              <code class="id-code-text">{{ id }}</code>

              <div class="id-actions-col">
                <button
                  v-if="idType === 'ulid'"
                  type="button"
                  class="mini-inspect-chip"
                  title="Inspect ULID Timestamp"
                  @click="handleInspectUlid(id)"
                >
                  <Calendar :size="11" />
                  <span>Inspect Time</span>
                </button>

                <button
                  type="button"
                  class="mini-copy-icon-btn"
                  :class="{ copied: copiedSingleIdIndex === index }"
                  title="Copy ID"
                  @click="handleCopySingleId(id, index)"
                >
                  <Check v-if="copiedSingleIdIndex === index" :size="12" />
                  <Copy v-else :size="12" />
                </button>
              </div>
            </div>
          </div>

          <!-- ULID Timestamp Decoder Card -->
          <div v-if="inspectedUlidInfo" class="ulid-inspector-card">
            <div class="inspector-header">
              <div class="inspector-title">
                <Calendar :size="14" />
                <span>ULID Timestamp Breakdown: <code>{{ inspectUlidInput }}</code></span>
              </div>
              <button type="button" class="mini-close-btn" @click="inspectedUlidInfo = null">✕</button>
            </div>
            <div class="inspector-grid">
              <div class="insp-item">
                <span class="insp-label">ISO 8601 Timestamp (UTC):</span>
                <strong class="insp-val">{{ inspectedUlidInfo.dateIso }}</strong>
              </div>
              <div class="insp-item">
                <span class="insp-label">Unix Milliseconds:</span>
                <code class="insp-val">{{ inspectedUlidInfo.timestamp }} ms</code>
              </div>
              <div class="insp-item full">
                <span class="insp-label">Randomness Entropy Component:</span>
                <code class="insp-val font-mono">{{ inspectedUlidInfo.randomness }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 3: BCRYPT HASH GENERATOR & VERIFIER -->
      <!-- ==================================================== -->
      <div v-else-if="activeTab === 'bcrypt'" class="tab-pane-view bcrypt-pane">
        <div class="dual-columns-layout">
          <!-- Column 1: Bcrypt Generator -->
          <div class="sub-panel-card">
            <div class="panel-card-header">
              <KeyRound :size="15" />
              <span class="panel-card-title">Bcrypt Hash Generator</span>
            </div>

            <div class="panel-card-body">
              <div class="form-item">
                <label class="compact-input-label">Plaintext Password</label>
                <div class="compact-password-wrapper">
                  <input
                    v-model="bcryptInputPassword"
                    :type="bcryptShowPassword ? 'text' : 'password'"
                    class="compact-text-input font-mono"
                    placeholder="Enter password to hash..."
                  />
                  <button
                    type="button"
                    class="pwd-toggle-mini-btn"
                    @click="bcryptShowPassword = !bcryptShowPassword"
                  >
                    <EyeOff v-if="bcryptShowPassword" :size="13" />
                    <Eye v-else :size="13" />
                  </button>
                </div>
              </div>

              <!-- Cost Factor Slider -->
              <div class="form-item">
                <div class="slider-header-row">
                  <label class="compact-input-label">Cost Factor / Salt Rounds: <strong>{{ bcryptRounds }}</strong></label>
                  <span class="meta-tag">2^{{ bcryptRounds }} = {{ Math.pow(2, Number(bcryptRounds)).toLocaleString() }} iterations</span>
                </div>
                <input
                  v-model.number="bcryptRounds"
                  type="range"
                  min="4"
                  max="14"
                  class="compact-range-slider"
                />
                <div class="slider-marks">
                  <span>4 (Fast / Dev)</span>
                  <span>10 (Standard)</span>
                  <span>14 (Heavy)</span>
                </div>
              </div>

              <div class="action-btn-row">
                <button
                  type="button"
                  class="compact-action-btn primary-btn"
                  :disabled="!bcryptInputPassword || isGeneratingBcrypt"
                  @click="handleGenerateBcrypt"
                >
                  <RefreshCw v-if="isGeneratingBcrypt" class="spin-icon" :size="12" />
                  <ShieldCheck v-else :size="12" />
                  <span>{{ isGeneratingBcrypt ? 'Generating Bcrypt...' : 'Generate Bcrypt Hash' }}</span>
                </button>
              </div>

              <!-- Result Box -->
              <div v-if="bcryptGeneratedResult" class="generated-output-box">
                <div class="gen-output-header">
                  <span class="gen-label">Generated Bcrypt Hash:</span>
                  <span class="time-tag">{{ bcryptGeneratedResult.executionTimeMs }} ms</span>
                </div>
                <code class="gen-code-text">{{ bcryptGeneratedResult.hash }}</code>
                <div class="gen-actions">
                  <button
                    type="button"
                    class="compact-action-btn tonal-btn"
                    @click="copyToClipboard(bcryptGeneratedResult.hash, 'bcrypt-hash')"
                  >
                    <Check v-if="copiedKey === 'bcrypt-hash'" :size="12" />
                    <Copy v-else :size="12" />
                    <span>{{ copiedKey === 'bcrypt-hash' ? 'Copied' : 'Copy Hash' }}</span>
                  </button>

                  <button
                    type="button"
                    class="compact-action-btn outline-btn"
                    @click="sendBcryptToVerifier"
                  >
                    <ArrowRight :size="12" />
                    <span>Send to Verifier</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Bcrypt Verifier & Decomposition -->
          <div class="sub-panel-card">
            <div class="panel-card-header">
              <ShieldCheck :size="15" />
              <span class="panel-card-title">Bcrypt Verifier & Structural Checker</span>
            </div>

            <div class="panel-card-body">
              <div class="form-item">
                <label class="compact-input-label">Candidate Plaintext Password</label>
                <div class="compact-password-wrapper">
                  <input
                    v-model="bcryptVerifyPassword"
                    :type="bcryptShowVerifyPassword ? 'text' : 'password'"
                    class="compact-text-input font-mono"
                    placeholder="Enter candidate password to verify..."
                  />
                  <button
                    type="button"
                    class="pwd-toggle-mini-btn"
                    @click="bcryptShowVerifyPassword = !bcryptShowVerifyPassword"
                  >
                    <EyeOff v-if="bcryptShowVerifyPassword" :size="13" />
                    <Eye v-else :size="13" />
                  </button>
                </div>
              </div>

              <div class="form-item">
                <label class="compact-input-label">Target Bcrypt Hash ($2a$, $2b$, $2y$)</label>
                <input
                  v-model="bcryptVerifyHash"
                  type="text"
                  class="compact-text-input font-mono"
                  placeholder="e.g. $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
                />
              </div>

              <div class="action-btn-row">
                <button
                  type="button"
                  class="compact-action-btn tonal-btn"
                  :disabled="!bcryptVerifyHash.trim() || isVerifyingBcrypt"
                  @click="handleVerifyBcrypt"
                >
                  <RefreshCw v-if="isVerifyingBcrypt" class="spin-icon" :size="12" />
                  <CheckCircle2 v-else :size="12" />
                  <span>{{ isVerifyingBcrypt ? 'Verifying...' : 'Verify Password Against Hash' }}</span>
                </button>
              </div>

              <!-- Verification Outcome Banner -->
              <div v-if="bcryptVerificationResult" class="verification-status-banner">
                <div v-if="bcryptVerificationResult.isValid" class="banner-box valid">
                  <CheckCircle2 :size="16" />
                  <div>
                    <strong>VALID MATCH!</strong>
                    <span>Candidate password matches the provided Bcrypt hash ({{ bcryptVerificationResult.executionTimeMs }} ms).</span>
                  </div>
                </div>
                <div v-else-if="bcryptVerificationResult.isFormatValid" class="banner-box mismatch">
                  <XCircle :size="16" />
                  <div>
                    <strong>MISMATCH!</strong>
                    <span>Password does not match this Bcrypt hash.</span>
                  </div>
                </div>
                <div v-else class="banner-box invalid">
                  <AlertTriangle :size="16" />
                  <div>
                    <strong>INVALID FORMAT!</strong>
                    <span>{{ bcryptVerificationResult.error }}</span>
                  </div>
                </div>
              </div>

              <!-- Bcrypt Structural Breakdown -->
              <div v-if="parsedVerifyBcryptInfo.isValid" class="anatomy-box">
                <span class="anatomy-title">Bcrypt Hash Structural Decomposition:</span>
                <div class="anatomy-grid">
                  <div class="anatomy-item">
                    <span class="item-label">Algorithm:</span>
                    <span class="item-val">{{ parsedVerifyBcryptInfo.algorithm }} (Blowfish)</span>
                  </div>
                  <div class="anatomy-item">
                    <span class="item-label">Cost Factor:</span>
                    <span class="item-val">{{ parsedVerifyBcryptInfo.formattedRounds }}</span>
                  </div>
                  <div class="anatomy-item full">
                    <span class="item-label">Extracted Salt (22 Chars):</span>
                    <code class="item-val font-mono">{{ parsedVerifyBcryptInfo.salt }}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 4: AES CIPHER (ENCRYPT / DECRYPT) -->
      <!-- ==================================================== -->
      <div v-else-if="activeTab === 'cipher'" class="tab-pane-view cipher-pane">
        <div class="compact-config-section">
          <!-- Cipher Mode Segment -->
          <div class="cipher-top-controls">
            <div class="control-unit">
              <span class="control-label">Mode:</span>
              <div class="segment-group" role="group">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: cipherMode === 'encrypt' }"
                  @click="cipherMode = 'encrypt'"
                >
                  <Lock :size="12" />
                  <span>Encrypt</span>
                </button>
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: cipherMode === 'decrypt' }"
                  @click="cipherMode = 'decrypt'"
                >
                  <Unlock :size="12" />
                  <span>Decrypt</span>
                </button>
              </div>
            </div>

            <!-- Algorithm Mode Segment -->
            <div class="control-unit">
              <span class="control-label">Algorithm:</span>
              <div class="segment-group mini" role="group">
                <button
                  v-for="mode in (['GCM', 'CBC', 'CTR'] as AesMode[])"
                  :key="mode"
                  type="button"
                  class="segment-btn"
                  :class="{ active: cipherAesMode === mode }"
                  @click="cipherAesMode = mode"
                >
                  {{ mode }}
                </button>
              </div>
            </div>

            <!-- Output Encoding Segment -->
            <div class="control-unit">
              <span class="control-label">Encoding:</span>
              <div class="segment-group mini" role="group">
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: cipherEncoding === 'base64' }"
                  @click="cipherEncoding = 'base64'"
                >
                  Base64
                </button>
                <button
                  type="button"
                  class="segment-btn"
                  :class="{ active: cipherEncoding === 'hex' }"
                  @click="cipherEncoding = 'hex'"
                >
                  HEX
                </button>
              </div>
            </div>
          </div>

          <!-- Payload Input -->
          <div class="form-item">
            <label class="compact-input-label">{{ cipherMode === 'encrypt' ? 'Plaintext Payload to Encrypt' : 'Ciphertext to Decrypt' }}</label>
            <textarea
              v-model="cipherInput"
              class="compact-styled-textarea"
              rows="2"
              :placeholder="cipherMode === 'encrypt' ? 'Type or paste plaintext string...' : 'Paste ciphertext payload...'"
              spellcheck="false"
            ></textarea>
          </div>

          <!-- Passphrase Row -->
          <div class="form-item">
            <label class="compact-input-label">Passphrase / Secret Key (PBKDF2 Derivation 100k rounds)</label>
            <div class="compact-password-wrapper">
              <input
                v-model="cipherPassphrase"
                :type="cipherShowPassphrase ? 'text' : 'password'"
                class="compact-text-input font-mono"
                placeholder="Enter secret passphrase..."
              />
              <button
                type="button"
                class="pwd-toggle-mini-btn"
                @click="cipherShowPassphrase = !cipherShowPassphrase"
              >
                <EyeOff v-if="cipherShowPassphrase" :size="13" />
                <Eye v-else :size="13" />
              </button>
            </div>
          </div>

          <!-- Process Button Row -->
          <div class="action-btn-row">
            <button
              type="button"
              class="compact-action-btn primary-btn"
              :disabled="!cipherInput || !cipherPassphrase || isProcessingCipher"
              @click="handleProcessCipher"
            >
              <RefreshCw v-if="isProcessingCipher" class="spin-icon" :size="12" />
              <Lock v-else-if="cipherMode === 'encrypt'" :size="12" />
              <Unlock v-else :size="12" />
              <span>{{ isProcessingCipher ? 'Processing...' : cipherMode === 'encrypt' ? 'Encrypt Payload' : 'Decrypt Payload' }}</span>
            </button>
          </div>

          <!-- Cipher Output Result Box -->
          <div v-if="cipherOutput" class="cipher-output-card">
            <div class="cipher-output-header">
              <span class="gen-label">{{ cipherMode === 'encrypt' ? 'Encrypted Ciphertext:' : 'Decrypted Plaintext:' }}</span>
              <span v-if="cipherExecTime !== null" class="time-tag">{{ cipherExecTime }} ms</span>
            </div>
            <code class="gen-code-text">{{ cipherOutput }}</code>
            <div class="gen-actions">
              <button
                type="button"
                class="compact-action-btn tonal-btn"
                @click="copyToClipboard(cipherOutput, 'cipher-out')"
              >
                <Check v-if="copiedKey === 'cipher-out'" :size="12" />
                <Copy v-else :size="12" />
                <span>{{ copiedKey === 'cipher-out' ? 'Copied' : 'Copy Output' }}</span>
              </button>
            </div>
          </div>

          <p v-if="cipherError" class="compact-error-msg">{{ cipherError }}</p>
        </div>
      </div>

      <!-- ==================================================== -->
      <!-- TAB 5: HASH LOOKUP & DETECTOR -->
      <!-- ==================================================== -->
      <div v-else-if="activeTab === 'decrypt'" class="tab-pane-view decrypt-pane">
        <div class="compact-config-section">
          <!-- Input Header -->
          <div class="config-header-row">
            <span class="section-title">Target Hash to Inspect & Reverse Lookup</span>
            <div class="row-actions-group">
              <button
                type="button"
                class="mini-chip-btn"
                @click="lookupTargetHash = '5f4dcc3b5aa765d61d8327deb882cf99'"
              >
                Sample MD5 (password)
              </button>
              <button
                type="button"
                class="mini-chip-btn"
                @click="lookupTargetHash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'"
              >
                Sample SHA-256 (password)
              </button>
            </div>
          </div>

          <div class="compact-textarea-wrap">
            <input
              v-model="lookupTargetHash"
              type="text"
              class="compact-text-input font-mono"
              placeholder="Paste raw hash string (MD5, SHA-1, SHA-256, Bcrypt, etc.)..."
            />
          </div>

          <!-- Hash Type Detection Banner -->
          <div v-if="detectedTypes.length > 0" class="detected-types-bar">
            <span class="detect-label">Detected Format Candidates:</span>
            <div class="candidates-cluster">
              <span
                v-for="(candidate, index) in detectedTypes"
                :key="index"
                class="candidate-pill"
              >
                <strong>{{ candidate.name }}</strong><span v-if="candidate.bits"> ({{ candidate.bits }}-bit)</span>
              </span>
            </div>
          </div>

          <div class="action-btn-row">
            <button
              type="button"
              class="compact-action-btn primary-btn"
              :disabled="!lookupTargetHash.trim() || isSearchingLookup"
              @click="handleReverseLookup"
            >
              <RefreshCw v-if="isSearchingLookup" class="spin-icon" :size="12" />
              <Search v-else :size="12" />
              <span>{{ isSearchingLookup ? 'Searching Dictionary...' : 'Lookup Hash in Offline Dictionary' }}</span>
            </button>
          </div>

          <!-- Lookup Result Outcome Box -->
          <div v-if="lookupResult" class="lookup-outcome-card">
            <div v-if="lookupResult.found" class="lookup-banner found">
              <CheckCircle2 :size="18" />
              <div>
                <strong>PREIMAGE FOUND!</strong>
                <p>Decrypted Plaintext: <code class="found-text">{{ lookupResult.plaintext }}</code></p>
                <span class="meta-tag">Matched algorithm {{ lookupResult.algorithm }} in {{ lookupResult.executionTimeMs }} ms</span>
              </div>
            </div>
            <div v-else class="lookup-banner not-found">
              <XCircle :size="18" />
              <div>
                <strong>NOT FOUND IN LOCAL DICTIONARY</strong>
                <p>Checked {{ lookupResult.iterationsChecked }} common wordlist candidates in {{ lookupResult.executionTimeMs }} ms.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Main Full-Height Container */
.crypto-workspace-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--md-sys-color-surface, #111416);
  color: var(--md-sys-color-on-surface, #e1e2e5);
  font-family: var(--md-ref-typeface-plain, sans-serif);
  overflow: hidden;
  position: relative;
}

.crypto-workspace-container.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* ==================================================== */
/* TOP 1-LINE TOOLBAR (Matching JsonFormatterView) */
/* ==================================================== */
.crypto-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px;
  background: var(--md-sys-color-surface-container-low, #191c1e);
  border-bottom: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  flex-shrink: 0;
  min-height: 42px;
  z-index: 10;
  overflow-x: auto;
  scrollbar-width: none;
}

.crypto-toolbar::-webkit-scrollbar {
  display: none;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  margin: 0 4px;
}

/* Segmented Group Styles */
.segment-group {
  display: inline-flex;
  align-items: center;
  background: var(--md-sys-color-surface-container-highest, #2a2d30);
  padding: 2px;
  border-radius: var(--md-sys-shape-corner-small, 8px);
  gap: 2px;
}

.segment-group.mini {
  padding: 1px;
  border-radius: var(--md-sys-shape-corner-extra-small, 4px);
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant, #c0c8cd);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.segment-group.mini .segment-btn {
  padding: 2px 7px;
  font-size: 11px;
  border-radius: 4px;
}

.segment-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--md-sys-color-on-surface, #ffffff);
}

.segment-btn.active {
  background: var(--md-sys-color-primary, #7dd0ff);
  color: var(--md-sys-color-on-primary, #00344a);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Execution Badge */
.exec-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  background: rgba(125, 208, 255, 0.08);
  color: var(--md-sys-color-primary, #7dd0ff);
  border: 1px solid rgba(125, 208, 255, 0.2);
  border-radius: 9999px;
}

/* Action Buttons */
.compact-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.compact-action-btn.primary-btn {
  background: var(--md-sys-color-primary, #7dd0ff);
  color: var(--md-sys-color-on-primary, #00344a);
}

.compact-action-btn.primary-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  box-shadow: 0 1px 4px rgba(125, 208, 255, 0.3);
}

.compact-action-btn.tonal-btn {
  background: var(--md-sys-color-secondary-container, #374955);
  color: var(--md-sys-color-on-secondary-container, #d1e5f4);
}

.compact-action-btn.tonal-btn:hover:not(:disabled) {
  filter: brightness(1.12);
}

.compact-action-btn.outline-btn {
  background: transparent;
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.15));
  color: var(--md-sys-color-on-surface, #e1e2e5);
}

.compact-action-btn.outline-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
}

.compact-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant, #c0c8cd);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-action-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--md-sys-color-on-surface, #ffffff);
}

.icon-action-btn.active {
  background: var(--md-sys-color-primary-container, #004c6a);
  color: var(--md-sys-color-primary, #7dd0ff);
}

/* ==================================================== */
/* CONTENT BODY & SCROLL VIEWPORT */
/* ==================================================== */
.crypto-content-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  scrollbar-width: thin;
}

.tab-pane-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1300px;
  margin: 0 auto;
}

/* Compact Configuration Section Card */
.compact-config-section {
  background: var(--md-sys-color-surface-container-low, #191c1e);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.row-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface, #e1e2e5);
  letter-spacing: 0.2px;
}

.meta-tag {
  font-size: 11px;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
  background: rgba(255, 255, 255, 0.04);
  padding: 1px 6px;
  border-radius: 4px;
}

.row-actions-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  font-size: 11px;
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--md-sys-color-on-surface-variant, #c0c8cd);
  cursor: pointer;
  transition: all 0.12s ease;
}

.mini-chip-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--md-sys-color-on-surface, #ffffff);
}

.mini-chip-btn.danger-chip:hover {
  background: rgba(255, 180, 171, 0.15);
  color: #ffb4ab;
  border-color: rgba(255, 180, 171, 0.3);
}

/* Compact Textarea */
.compact-textarea-wrap {
  width: 100%;
}

.compact-styled-textarea {
  width: 100%;
  background: var(--md-sys-color-surface-container-highest, #232629);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
  border-radius: 6px;
  color: var(--md-sys-color-on-surface, #e1e2e5);
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  font-size: 12px;
  padding: 6px 10px;
  resize: vertical;
  line-height: 1.45;
  outline: none;
  transition: border-color 0.15s ease;
}

.compact-styled-textarea:focus {
  border-color: var(--md-sys-color-primary, #7dd0ff);
}

/* Inline Controls Bar */
.inline-controls-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 2px;
}

.control-unit {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-label {
  font-size: 11px;
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
  font-weight: 500;
}

.control-divider {
  width: 1px;
  height: 16px;
  background: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
}

.icon-toggle-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 5px;
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
  background: transparent;
  color: var(--md-sys-color-on-surface-variant, #c0c8cd);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-toggle-pill:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--md-sys-color-on-surface, #ffffff);
}

.icon-toggle-pill.active {
  background: rgba(125, 208, 255, 0.15);
  border-color: rgba(125, 208, 255, 0.35);
  color: var(--md-sys-color-primary, #7dd0ff);
  font-weight: 500;
}

.option-toggles-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* Expandable Panel Boxes */
.expandable-panel-box {
  background: var(--md-sys-color-surface-container, #1f2225);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: fadeIn 0.15s ease-out;
}

.expandable-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.grid-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.compact-input-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant, #a0a6ab);
}

.compact-text-input {
  background: var(--md-sys-color-surface-container-highest, #272a2e);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  border-radius: 4px;
  color: var(--md-sys-color-on-surface, #e1e2e5);
  padding: 4px 8px;
  font-size: 11.5px;
  outline: none;
  width: 100%;
}

.compact-text-input:focus {
  border-color: var(--md-sys-color-primary, #7dd0ff);
}

.matcher-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.matcher-lead-icon {
  color: var(--md-sys-color-primary, #7dd0ff);
}

.mini-clear-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
  cursor: pointer;
  font-size: 10px;
}

.matched-inline-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #4ade80;
  padding-left: 2px;
}

/* File Checksum Box */
.file-checksum-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.file-lead {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--md-sys-color-on-surface, #e1e2e5);
}

.hidden-file-input {
  display: none;
}

.file-result-pills {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 4px;
}

.file-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
}

.file-name {
  font-weight: 600;
  color: var(--md-sys-color-primary, #7dd0ff);
}

.file-size {
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
  font-size: 11px;
}

.file-hashes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 6px;
}

.file-hash-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--md-sys-color-surface-container-highest, #272a2e);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.algo-pill {
  font-weight: 600;
  color: var(--md-sys-color-primary, #7dd0ff);
  font-size: 10px;
}

.mono-digest {
  flex: 1;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-copy-icon-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant, #c0c8cd);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 3px;
}

.mini-copy-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.mini-copy-icon-btn.copied {
  color: #4ade80;
}

/* ==================================================== */
/* HIGH-DENSITY HASH DIGEST CARDS GRID */
/* ==================================================== */
.dense-hash-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 8px;
}

.compact-hash-card {
  background: var(--md-sys-color-surface-container-low, #191c1e);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.15s ease;
}

.compact-hash-card:hover {
  border-color: rgba(125, 208, 255, 0.25);
}

.compact-hash-card.is-matched {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.06);
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.15);
}

.card-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.badge-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
}

.algo-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}

.algo-badge.sha256 { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.algo-badge.sha512 { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.algo-badge.md5 { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
.algo-badge.sha1 { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.algo-badge.sha384 { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
.algo-badge.crc32 { background: rgba(45, 212, 191, 0.15); color: #2dd4bf; }

.algo-desc {
  font-size: 10.5px;
  color: var(--md-sys-color-on-surface-variant, #888e93);
}

.hmac-tag {
  font-size: 9.5px;
  font-weight: 600;
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  padding: 1px 4px;
  border-radius: 3px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.matched-badge {
  font-size: 10px;
  font-weight: 700;
  background: #22c55e;
  color: #052e16;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.4px;
}

.hash-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  font-size: 10.5px;
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.1));
  background: rgba(255, 255, 255, 0.03);
  color: var(--md-sys-color-on-surface-variant, #c0c8cd);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.hash-copy-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.digest-output-box {
  background: var(--md-sys-color-surface-container-highest, #232629);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.06));
  border-radius: 5px;
  padding: 5px 8px;
  overflow: hidden;
  transition: all 0.12s ease;
}

.digest-output-box.clickable {
  cursor: pointer;
}

.digest-output-box.clickable:hover {
  background: rgba(125, 208, 255, 0.06);
  border-color: rgba(125, 208, 255, 0.3);
}

.digest-text {
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  font-size: 11.5px;
  line-height: 1.4;
  word-break: break-all;
  color: var(--md-sys-color-on-surface, #e1e2e5);
  display: block;
}

/* ==================================================== */
/* TAB 2: ID GENERATOR VIEW */
/* ==================================================== */
.id-gen-controls-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.compact-number-input {
  width: 50px;
  background: var(--md-sys-color-surface-container-highest, #272a2e);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  border-radius: 4px;
  color: var(--md-sys-color-on-surface, #e1e2e5);
  padding: 3px 6px;
  font-size: 11.5px;
  text-align: center;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  outline: none;
}

.batch-stepper-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.batch-chips-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.batch-chip {
  padding: 2px 6px;
  font-size: 10.5px;
  border-radius: 3px;
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  background: transparent;
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
  cursor: pointer;
  transition: all 0.12s ease;
}

.batch-chip:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}

.batch-chip.active {
  background: var(--md-sys-color-primary, #7dd0ff);
  color: var(--md-sys-color-on-primary, #00344a);
  font-weight: 600;
}

.compact-select {
  background: var(--md-sys-color-surface-container-highest, #272a2e);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  border-radius: 4px;
  color: var(--md-sys-color-on-surface, #e1e2e5);
  padding: 3px 8px;
  font-size: 11.5px;
  outline: none;
}

.custom-alphabet-bar {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 4px;
}

/* ID Results Panel */
.id-results-panel {
  background: var(--md-sys-color-surface-container-low, #191c1e);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.id-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.id-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pane-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface, #e1e2e5);
}

.engine-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(125, 208, 255, 0.12);
  color: var(--md-sys-color-primary, #7dd0ff);
}

.id-panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ids-scroll-viewport {
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;
  scrollbar-width: thin;
}

.id-item-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--md-sys-color-surface-container-highest, #232629);
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.05));
  transition: all 0.12s ease;
}

.id-item-tile:hover {
  background: rgba(125, 208, 255, 0.04);
  border-color: rgba(125, 208, 255, 0.2);
}

.id-index-col {
  font-size: 10.5px;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  color: var(--md-sys-color-on-surface-variant, #888e93);
  min-width: 32px;
}

.id-code-text {
  flex: 1;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  font-size: 12px;
  color: var(--md-sys-color-on-surface, #e1e2e5);
  word-break: break-all;
}

.id-actions-col {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-inspect-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  font-size: 10.5px;
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.mini-inspect-chip:hover {
  background: rgba(168, 85, 247, 0.22);
}

/* ULID Inspector Card */
.ulid-inspector-card {
  background: var(--md-sys-color-surface-container, #1f2225);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: fadeIn 0.15s ease-out;
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inspector-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: #c084fc;
}

.mini-close-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
  cursor: pointer;
  font-size: 11px;
}

.inspector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 6px;
  font-size: 11px;
}

.insp-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.insp-item.full {
  grid-column: 1 / -1;
}

.insp-label {
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
}

.insp-val {
  color: var(--md-sys-color-on-surface, #ffffff);
}

/* ==================================================== */
/* TAB 3 & 4: BCRYPT & CIPHER DUAL/SPLIT LAYOUTS */
/* ==================================================== */
.dual-columns-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 12px;
}

.sub-panel-card {
  background: var(--md-sys-color-surface-container-low, #191c1e);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  border-radius: var(--md-sys-shape-corner-medium, 12px);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-primary, #7dd0ff);
}

.panel-card-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface, #e1e2e5);
}

.panel-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compact-password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.pwd-toggle-mini-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.slider-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.compact-range-slider {
  width: 100%;
  accent-color: var(--md-sys-color-primary, #7dd0ff);
  cursor: pointer;
}

.slider-marks {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--md-sys-color-on-surface-variant, #888e93);
}

.action-btn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

.generated-output-box,
.cipher-output-card {
  background: var(--md-sys-color-surface-container-highest, #232629);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gen-output-header,
.cipher-output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}

.gen-label {
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
}

.time-tag {
  font-size: 10.5px;
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  color: var(--md-sys-color-primary, #7dd0ff);
}

.gen-code-text {
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  font-size: 12px;
  word-break: break-all;
  color: var(--md-sys-color-on-surface, #ffffff);
}

.gen-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Verification Banners */
.verification-status-banner {
  margin-top: 4px;
}

.banner-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  line-height: 1.4;
}

.banner-box.valid {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.banner-box.mismatch {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.banner-box.invalid {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.anatomy-box {
  background: var(--md-sys-color-surface-container, #1f2225);
  border: 1px solid var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.anatomy-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--md-sys-color-on-surface, #e1e2e5);
}

.anatomy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  font-size: 11px;
}

.anatomy-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.anatomy-item.full {
  grid-column: 1 / -1;
}

.item-label {
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
}

.item-val {
  color: var(--md-sys-color-on-surface, #ffffff);
}

/* Cipher Controls */
.cipher-top-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.compact-error-msg {
  color: #f87171;
  font-size: 11.5px;
}

/* ==================================================== */
/* TAB 5: DECRYPT / LOOKUP */
/* ==================================================== */
.detected-types-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}

.detect-label {
  font-size: 11px;
  color: var(--md-sys-color-on-surface-variant, #9aa0a6);
}

.candidates-cluster {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.candidate-pill {
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(125, 208, 255, 0.12);
  color: var(--md-sys-color-primary, #7dd0ff);
  border: 1px solid rgba(125, 208, 255, 0.2);
}

.lookup-outcome-card {
  margin-top: 4px;
}

.lookup-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11.5px;
  line-height: 1.4;
}

.lookup-banner.found {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.found-text {
  font-family: var(--md-sys-typescale-font-family-mono, monospace);
  font-size: 12.5px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  color: #ffffff;
}

.lookup-banner.not-found {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

/* Animations & Spinners */
.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive Breakpoints */
@media (max-width: 768px) {
  .crypto-toolbar {
    padding: 6px 10px;
  }
  .segment-btn span {
    display: none;
  }
  .segment-btn {
    padding: 4px 6px;
  }
  .dense-hash-grid {
    grid-template-columns: 1fr;
  }
  .dual-columns-layout {
    grid-template-columns: 1fr;
  }
}
</style>
