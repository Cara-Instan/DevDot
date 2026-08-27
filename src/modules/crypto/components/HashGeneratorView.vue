<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
  FileCheck
} from 'lucide-vue-next'
import {
  M3Button,
  M3Card,
  M3Switch,
  M3TextField,
  M3TextArea
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

// ----------------------------------------------------
// STATE PERSISTENCE INITIALIZATION
// ----------------------------------------------------
const initialSaved = snapshotStore.getToolState('hash-generator', {
  activeTab: 'hash' as 'hash' | 'decrypt' | 'bcrypt' | 'cipher' | 'id-gen',
  // Tab 1: Hash Generator
  hashInput: 'DevDot: 100% Offline Universal Developer Toolkit',
  hashUppercase: false,
  hashEncoding: 'hex' as HashEncoding,
  saltPrefix: '',
  saltSuffix: '',
  enableHmac: false,
  hmacSecret: 'secret-key-123',
  hashToMatch: '',
  // Tab 2: Hash Decrypt / Lookup
  lookupTargetHash: '5f4dcc3b5aa765d61d8327deb882cf99',
  customWordlist: '',
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
  // Tab 5: ID Gen
  idType: 'uuid' as IdType,
  idCount: 5,
  idUppercase: false,
  uuidHyphens: true,
  nanoidLength: 21,
  nanoidPreset: 'default' as const,
  nanoidAlphabet: 'use-Nanoid_Alphabet0123456789abcdefghijklmnopqrstuvwxyz',
  inspectUlidInput: ''
})

const activeTab = ref<'hash' | 'decrypt' | 'bcrypt' | 'cipher' | 'id-gen'>(initialSaved.activeTab)

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
// TAB 2: HASH DECRYPT & PREIMAGE LOOKUP
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
// TAB 5: ID GENERATOR STATE
// ----------------------------------------------------
const idType = ref<IdType>(initialSaved.idType)
const idCount = ref(initialSaved.idCount)
const idUppercase = ref(initialSaved.idUppercase)
const uuidHyphens = ref(initialSaved.uuidHyphens)

const nanoidLength = ref(initialSaved.nanoidLength)
const nanoidPreset = ref<'default' | 'hex' | 'numbers' | 'letters' | 'custom'>(initialSaved.nanoidPreset)
const nanoidAlphabet = ref(initialSaved.nanoidAlphabet)

const generatedIds = ref<string[]>([])
const idExecTime = ref<number | null>(null)
const copiedAllIds = ref(false)
const copiedSingleIdIndex = ref<number | null>(null)

// ULID Timestamp Inspector
const inspectUlidInput = ref(initialSaved.inspectUlidInput)
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
      count: Number(idCount.value),
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

function handleInspectUlid() {
  inspectUlidError.value = null
  inspectedUlidInfo.value = null
  if (!inspectUlidInput.value.trim()) return

  try {
    inspectedUlidInfo.value = decodeUlid(inspectUlidInput.value.trim())
  } catch (err: any) {
    inspectUlidError.value = err.message || 'Invalid ULID format'
  }
}

// ----------------------------------------------------
// CLIPBOARD UTILITY
// ----------------------------------------------------
function copyToClipboard(text: string, key: string) {
  if (!text) return
  navigator.clipboard.writeText(text)
  copiedKey.value = key
  setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = null
    }
  }, 2000)
}

function handleCopyAllIds() {
  if (!generatedIds.value.length) return
  navigator.clipboard.writeText(generatedIds.value.join('\n'))
  copiedAllIds.value = true
  setTimeout(() => {
    copiedAllIds.value = false
  }, 2000)
}

function handleCopySingleId(id: string, index: number) {
  navigator.clipboard.writeText(id)
  copiedSingleIdIndex.value = index
  setTimeout(() => {
    if (copiedSingleIdIndex.value === index) {
      copiedSingleIdIndex.value = null
    }
  }, 2000)
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
    lookupTargetHash,
    customWordlist,
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
    idType,
    idCount,
    idUppercase,
    uuidHyphens,
    nanoidLength,
    nanoidPreset,
    nanoidAlphabet,
    inspectUlidInput
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
      lookupTargetHash: lookupTargetHash.value,
      customWordlist: customWordlist.value,
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
      idType: idType.value,
      idCount: idCount.value,
      idUppercase: idUppercase.value,
      uuidHyphens: uuidHyphens.value,
      nanoidLength: nanoidLength.value,
      nanoidPreset: nanoidPreset.value,
      nanoidAlphabet: nanoidAlphabet.value,
      inspectUlidInput: inspectUlidInput.value
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

// Auto-trigger ID Generator on Tab 5 changes
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
</script>

<template>
  <div class="hash-workspace-view">
    <!-- Top Navigation Subtabs Bar -->
    <div class="subtabs-bar">
      <div class="tabs-group">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'hash' }"
          @click="activeTab = 'hash'"
        >
          <Fingerprint :size="15" />
          <span>Hash & Checksum</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'decrypt' }"
          @click="activeTab = 'decrypt'"
        >
          <Search :size="15" />
          <span>Matcher & "Decrypt"</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'bcrypt' }"
          @click="activeTab = 'bcrypt'"
        >
          <ShieldCheck :size="15" />
          <span>Bcrypt Checker</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'cipher' }"
          @click="activeTab = 'cipher'"
        >
          <Lock :size="15" />
          <span>AES Cipher</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'id-gen' }"
          @click="activeTab = 'id-gen'"
        >
          <Layers :size="15" />
          <span>ID Generator</span>
        </button>
      </div>

      <div class="status-summary">
        <span v-if="activeTab === 'hash' && hashExecTime !== null" class="exec-pill">
          ⚡ Computed in {{ hashExecTime }} ms
        </span>
        <span v-if="activeTab === 'decrypt' && lookupResult?.executionTimeMs" class="exec-pill">
          🔍 Checked {{ lookupResult.iterationsChecked }} words in {{ lookupResult.executionTimeMs }} ms
        </span>
        <span v-if="activeTab === 'bcrypt' && bcryptGeneratedResult" class="exec-pill">
          🛡️ Bcrypt 2^{{ bcryptRounds }} in {{ bcryptGeneratedResult.executionTimeMs }} ms
        </span>
        <span v-if="activeTab === 'cipher' && cipherExecTime !== null" class="exec-pill">
          🔐 AES-{{ cipherAesMode }} in {{ cipherExecTime }} ms
        </span>
        <span v-if="activeTab === 'id-gen' && idExecTime !== null" class="exec-pill">
          🆔 {{ generatedIds.length }} IDs in {{ idExecTime }} ms
        </span>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- TAB 1: HASH GENERATOR & FILE CHECKSUM -->
    <!-- ==================================================== -->
    <template v-if="activeTab === 'hash'">
      <div class="tab-layout">
        <!-- Configuration Card -->
        <M3Card variant="filled" padding="medium" class="config-card">
          <div class="input-section">
            <div class="section-top-row">
              <div class="heading-group">
                <span class="label-heading">Payload / Text Input</span>
                <span class="meta-pill">{{ inputCharCount }} chars • {{ inputByteCount }} bytes</span>
              </div>
              <div class="input-actions">
                <button
                  type="button"
                  class="small-action-btn"
                  @click="loadSampleText"
                >
                  Sample Text
                </button>
                <button
                  type="button"
                  class="small-action-btn"
                  @click="loadSampleJson"
                >
                  Sample JSON
                </button>
                <button
                  type="button"
                  class="small-action-btn"
                  @click="hashInput = ''"
                >
                  Clear
                </button>
              </div>
            </div>

            <M3TextArea
              v-model="hashInput"
              :rows="3"
              placeholder="Type or paste payload to generate real-time hashes..."
            />
          </div>

          <!-- Quick Controls Toolbar -->
          <div class="options-toolbar">
            <div class="toolbar-toggles">
              <M3Switch
                v-model="hashUppercase"
                label="Uppercase HEX"
              />
              <M3Switch
                v-model="enableHmac"
                label="HMAC Secret Key"
              />
            </div>

            <div class="encoding-selector">
              <span class="sub-label">Output Digest:</span>
              <div class="pill-group">
                <button
                  type="button"
                  class="pill-btn"
                  :class="{ active: hashEncoding === 'hex' }"
                  @click="hashEncoding = 'hex'"
                >
                  HEX
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  :class="{ active: hashEncoding === 'base64' }"
                  @click="hashEncoding = 'base64'"
                >
                  Base64
                </button>
              </div>
            </div>
          </div>

          <!-- HMAC & Salt Expandable Inputs -->
          <div v-if="enableHmac || saltPrefix || saltSuffix" class="advanced-params-grid">
            <div v-if="enableHmac" class="param-item">
              <M3TextField
                v-model="hmacSecret"
                label="HMAC Secret Key"
                supporting-text="Cryptographic secret key for Keyed-Hash"
              />
            </div>
            <div class="param-item">
              <M3TextField
                v-model="saltPrefix"
                label="Salt Prefix (Prepend)"
                placeholder="e.g. s@lt_"
              />
            </div>
            <div class="param-item">
              <M3TextField
                v-model="saltSuffix"
                label="Salt Suffix (Append)"
                placeholder="e.g. _p@ss"
              />
            </div>
          </div>

          <!-- File Checksum Upload Zone -->
          <div class="file-checksum-zone">
            <div class="file-zone-header">
              <div class="file-zone-title">
                <FileCheck :size="16" class="zone-icon" />
                <span>Compute Checksums from Local File (100% In-Memory Offline)</span>
              </div>
              <input
                ref="fileInputRef"
                type="file"
                class="hidden-file-input"
                @change="handleFileUpload"
              />
              <M3Button
                variant="outlined"
                class="file-pick-btn"
                @click="fileInputRef?.click()"
              >
                <template #icon>
                  <RefreshCw v-if="isComputingFile" class="spin-icon" :size="14" />
                  <FileCode2 v-else :size="14" />
                </template>
                {{ isComputingFile ? 'Hashing File...' : 'Choose File' }}
              </M3Button>
            </div>

            <div v-if="fileChecksumResult" class="file-result-summary">
              <div class="file-meta">
                <strong>{{ fileChecksumResult.fileName }}</strong>
                <span>({{ (fileChecksumResult.fileSize / 1024).toFixed(1) }} KB) • Computed in {{ fileChecksumResult.executionTimeMs }} ms</span>
              </div>
              <div class="file-digests">
                <div class="file-digest-row">
                  <span class="digest-tag">SHA-256</span>
                  <code>{{ fileChecksumResult.sha256 }}</code>
                  <button type="button" class="mini-copy-btn" @click="copyToClipboard(fileChecksumResult.sha256, 'file-sha256')">
                    <Check v-if="copiedKey === 'file-sha256'" :size="12" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
                <div class="file-digest-row">
                  <span class="digest-tag">MD5</span>
                  <code>{{ fileChecksumResult.md5 }}</code>
                  <button type="button" class="mini-copy-btn" @click="copyToClipboard(fileChecksumResult.md5, 'file-md5')">
                    <Check v-if="copiedKey === 'file-md5'" :size="12" />
                    <Copy v-else :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Real-Time Hash Matcher Section -->
          <div class="matcher-section">
            <div class="matcher-header">
              <ShieldCheck :size="16" class="matcher-icon" />
              <span class="matcher-title">Live Checksum Verifier & Match Highlighter</span>
            </div>
            <M3TextField
              v-model="hashToMatch"
              label="Paste Expected Hash / Checksum to Compare"
              placeholder="e.g. 5eb63bbbe01eeed093cb22bb8f5acdc3"
              supporting-text="Instantly compares against MD5, SHA-1, SHA-256, SHA-384, SHA-512, and CRC-32"
            />
            <div v-if="hashResults.matchedAlgorithm" class="matched-alert">
              <CheckCircle2 :size="18" class="match-success-icon" />
              <span>
                <strong>EXACT MATCH!</strong> The input payload matches algorithm
                <strong>{{ hashResults.matchedAlgorithm.toUpperCase() }}</strong>.
              </span>
            </div>
          </div>
        </M3Card>

        <!-- Hash Results Digest Cards Grid -->
        <div class="hash-cards-grid">
          <!-- SHA-256 -->
          <div
            class="hash-digest-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha256' }"
          >
            <div class="digest-header">
              <div class="digest-title-group">
                <span class="algo-badge sha256">SHA-256</span>
                <span class="bits-tag">256-bit (64 hex chars) • FIPS 180-4 Standard</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="digest-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha256'" class="matched-badge">
                  MATCHED
                </span>
                <M3Button
                  variant="tonal"
                  class="copy-btn"
                  :disabled="!hashResults.sha256"
                  @click="copyToClipboard(hashResults.sha256, 'sha256')"
                >
                  <template #icon>
                    <Check v-if="copiedKey === 'sha256'" :size="14" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copiedKey === 'sha256' ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
            <div class="digest-value-box">
              <code>{{ hashResults.sha256 || 'No payload input' }}</code>
            </div>
          </div>

          <!-- SHA-512 -->
          <div
            class="hash-digest-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha512' }"
          >
            <div class="digest-header">
              <div class="digest-title-group">
                <span class="algo-badge sha512">SHA-512</span>
                <span class="bits-tag">512-bit (128 hex chars) • Maximum Collision Resistance</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="digest-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha512'" class="matched-badge">
                  MATCHED
                </span>
                <M3Button
                  variant="tonal"
                  class="copy-btn"
                  :disabled="!hashResults.sha512"
                  @click="copyToClipboard(hashResults.sha512, 'sha512')"
                >
                  <template #icon>
                    <Check v-if="copiedKey === 'sha512'" :size="14" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copiedKey === 'sha512' ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
            <div class="digest-value-box">
              <code>{{ hashResults.sha512 || 'No payload input' }}</code>
            </div>
          </div>

          <!-- MD5 -->
          <div
            class="hash-digest-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'md5' }"
          >
            <div class="digest-header">
              <div class="digest-title-group">
                <span class="algo-badge md5">MD5</span>
                <span class="bits-tag">128-bit (32 hex chars) • Legacy Checksums</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="digest-actions">
                <span v-if="hashResults.matchedAlgorithm === 'md5'" class="matched-badge">
                  MATCHED
                </span>
                <M3Button
                  variant="tonal"
                  class="copy-btn"
                  :disabled="!hashResults.md5"
                  @click="copyToClipboard(hashResults.md5, 'md5')"
                >
                  <template #icon>
                    <Check v-if="copiedKey === 'md5'" :size="14" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copiedKey === 'md5' ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
            <div class="digest-value-box">
              <code>{{ hashResults.md5 || 'No payload input' }}</code>
            </div>
          </div>

          <!-- SHA-1 -->
          <div
            class="hash-digest-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha1' }"
          >
            <div class="digest-header">
              <div class="digest-title-group">
                <span class="algo-badge sha1">SHA-1</span>
                <span class="bits-tag">160-bit (40 hex chars) • Git Commit Hashes</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="digest-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha1'" class="matched-badge">
                  MATCHED
                </span>
                <M3Button
                  variant="tonal"
                  class="copy-btn"
                  :disabled="!hashResults.sha1"
                  @click="copyToClipboard(hashResults.sha1, 'sha1')"
                >
                  <template #icon>
                    <Check v-if="copiedKey === 'sha1'" :size="14" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copiedKey === 'sha1' ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
            <div class="digest-value-box">
              <code>{{ hashResults.sha1 || 'No payload input' }}</code>
            </div>
          </div>

          <!-- SHA-384 -->
          <div
            class="hash-digest-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha384' }"
          >
            <div class="digest-header">
              <div class="digest-title-group">
                <span class="algo-badge sha384">SHA-384</span>
                <span class="bits-tag">384-bit (96 hex chars) • NSA Suite B</span>
                <span v-if="enableHmac" class="hmac-tag">HMAC</span>
              </div>
              <div class="digest-actions">
                <span v-if="hashResults.matchedAlgorithm === 'sha384'" class="matched-badge">
                  MATCHED
                </span>
                <M3Button
                  variant="tonal"
                  class="copy-btn"
                  :disabled="!hashResults.sha384"
                  @click="copyToClipboard(hashResults.sha384, 'sha384')"
                >
                  <template #icon>
                    <Check v-if="copiedKey === 'sha384'" :size="14" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copiedKey === 'sha384' ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
            <div class="digest-value-box">
              <code>{{ hashResults.sha384 || 'No payload input' }}</code>
            </div>
          </div>

          <!-- CRC-32 -->
          <div
            class="hash-digest-card"
            :class="{ 'is-matched': hashResults.matchedAlgorithm === 'crc32' }"
          >
            <div class="digest-header">
              <div class="digest-title-group">
                <span class="algo-badge crc32">CRC-32</span>
                <span class="bits-tag">32-bit (8 hex chars) • Fast Integrity Checksum</span>
              </div>
              <div class="digest-actions">
                <span v-if="hashResults.matchedAlgorithm === 'crc32'" class="matched-badge">
                  MATCHED
                </span>
                <M3Button
                  variant="tonal"
                  class="copy-btn"
                  :disabled="!hashResults.crc32"
                  @click="copyToClipboard(hashResults.crc32, 'crc32')"
                >
                  <template #icon>
                    <Check v-if="copiedKey === 'crc32'" :size="14" />
                    <Copy v-else :size="14" />
                  </template>
                  {{ copiedKey === 'crc32' ? 'Copied' : 'Copy' }}
                </M3Button>
              </div>
            </div>
            <div class="digest-value-box">
              <code>{{ hashResults.crc32 || 'No payload input' }}</code>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================================================== -->
    <!-- TAB 2: HASH MATCHER & OFFLINE "DECRYPT" / LOOKUP -->
    <!-- ==================================================== -->
    <template v-else-if="activeTab === 'decrypt'">
      <div class="decrypt-layout">
        <!-- Target Hash Input Card -->
        <M3Card variant="filled" padding="medium" class="config-card">
          <div class="input-section">
            <div class="section-top-row">
              <span class="label-heading">Target Hash to Inspect & Reverse Lookup</span>
              <div class="input-actions">
                <button
                  type="button"
                  class="small-action-btn"
                  @click="lookupTargetHash = '5f4dcc3b5aa765d61d8327deb882cf99'"
                >
                  Sample MD5 (password)
                </button>
                <button
                  type="button"
                  class="small-action-btn"
                  @click="lookupTargetHash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'"
                >
                  Sample SHA-256 (password)
                </button>
              </div>
            </div>

            <M3TextField
              v-model="lookupTargetHash"
              label="Target Hash String"
              placeholder="Paste MD5, SHA-1, SHA-256, or Bcrypt hash..."
            />
          </div>

          <!-- Auto-Detected Hash Type Pills -->
          <div v-if="detectedTypes.length" class="detected-types-box">
            <span class="detected-label">Detected Hash Format:</span>
            <div class="detected-list">
              <div
                v-for="(dt, idx) in detectedTypes"
                :key="idx"
                class="detected-pill"
                :class="dt.confidence"
              >
                <strong>{{ dt.name }}</strong>
                <small>{{ dt.description }}</small>
              </div>
            </div>
          </div>

          <!-- Custom Wordlist Accordion / Input -->
          <div class="wordlist-section">
            <span class="sub-label">Custom Wordlist Dictionary (Optional, 1 per line):</span>
            <M3TextArea
              v-model="customWordlist"
              :rows="2"
              placeholder="Enter custom dictionary words to search against target hash..."
            />
          </div>

          <div class="action-btn-row">
            <M3Button
              variant="filled"
              :disabled="!lookupTargetHash.trim() || isSearchingLookup"
              @click="handleReverseLookup"
            >
              <template #icon>
                <RefreshCw v-if="isSearchingLookup" class="spin-icon" :size="16" />
                <Search v-else :size="16" />
              </template>
              {{ isSearchingLookup ? 'Searching Offline Dictionaries...' : 'Offline Reverse Lookup ("Decrypt")' }}
            </M3Button>
          </div>
        </M3Card>

        <!-- Lookup Result Card -->
        <M3Card v-if="lookupResult" variant="outlined" padding="medium" class="result-card">
          <div v-if="lookupResult.found" class="result-found-box">
            <div class="result-status-header">
              <CheckCircle2 :size="20" class="success-icon" />
              <span class="result-status-title">PREIMAGE RECOVERED!</span>
            </div>
            <div class="plaintext-display">
              <span class="plaintext-label">Original Plaintext String:</span>
              <code class="plaintext-value">{{ lookupResult.plaintext }}</code>
              <M3Button
                variant="tonal"
                class="copy-btn"
                @click="copyToClipboard(lookupResult.plaintext || '', 'lookup-found')"
              >
                <template #icon>
                  <Check v-if="copiedKey === 'lookup-found'" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedKey === 'lookup-found' ? 'Copied' : 'Copy' }}
              </M3Button>
            </div>
            <div class="lookup-meta">
              <span>Source: <strong>{{ lookupResult.source }}</strong></span>
              <span>• Checked {{ lookupResult.iterationsChecked }} candidates</span>
              <span>• Search time: {{ lookupResult.executionTimeMs }} ms</span>
            </div>
          </div>

          <div v-else class="result-notfound-box">
            <div class="result-status-header not-found">
              <AlertTriangle :size="20" class="warning-icon" />
              <span class="result-status-title">No Match Found in Built-in Dictionaries</span>
            </div>
            <p class="notfound-desc">
              Checked {{ lookupResult.iterationsChecked }} common passwords & 4-digit PINs in {{ lookupResult.executionTimeMs }} ms. Try adding custom words in the dictionary input above.
            </p>
          </div>
        </M3Card>
      </div>
    </template>

    <!-- ==================================================== -->
    <!-- TAB 3: BCRYPT GENERATOR & VERIFIER / CHECKER -->
    <!-- ==================================================== -->
    <template v-else-if="activeTab === 'bcrypt'">
      <div class="bcrypt-dual-layout">
        <!-- Panel 1: Bcrypt Generator -->
        <M3Card variant="filled" padding="medium" class="bcrypt-panel">
          <div class="panel-header">
            <KeyRound :size="18" class="panel-icon" />
            <span class="label-heading">Bcrypt Hash Generator</span>
          </div>

          <div class="input-group">
            <div class="section-top-row">
              <span class="sub-label">Plaintext Password</span>
              <div class="input-actions">
                <button
                  type="button"
                  class="small-action-btn"
                  @click="bcryptInputPassword = 'SuperSecretPassword2026!'"
                >
                  Sample Pass
                </button>
              </div>
            </div>

            <div class="password-input-wrapper">
              <input
                v-model="bcryptInputPassword"
                :type="bcryptShowPassword ? 'text' : 'password'"
                class="styled-text-input"
                placeholder="Enter password to hash..."
              />
              <button
                type="button"
                class="pwd-toggle-btn"
                @click="bcryptShowPassword = !bcryptShowPassword"
              >
                <EyeOff v-if="bcryptShowPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <!-- Salt Rounds Slider -->
          <div class="slider-group">
            <div class="slider-header">
              <span class="sub-label">Cost Factor / Salt Rounds: <strong>{{ bcryptRounds }}</strong></span>
              <span class="iterations-pill">2^{{ bcryptRounds }} = {{ Math.pow(2, Number(bcryptRounds)).toLocaleString() }} iterations</span>
            </div>
            <input
              v-model.number="bcryptRounds"
              type="range"
              min="4"
              max="14"
              class="styled-range"
            />
            <div class="slider-hints">
              <span>4 (Fast / Dev)</span>
              <span>10 (Recommended Standard)</span>
              <span>14 (High Security / Heavy)</span>
            </div>
          </div>

          <div class="generate-btn-row">
            <M3Button
              variant="filled"
              :disabled="!bcryptInputPassword || isGeneratingBcrypt"
              @click="handleGenerateBcrypt"
            >
              <template #icon>
                <RefreshCw v-if="isGeneratingBcrypt" class="spin-icon" :size="16" />
                <ShieldCheck v-else :size="16" />
              </template>
              {{ isGeneratingBcrypt ? 'Generating Bcrypt Hash...' : 'Generate Bcrypt Hash' }}
            </M3Button>
          </div>

          <!-- Generated Bcrypt Result Box -->
          <div v-if="bcryptGeneratedResult" class="bcrypt-result-box">
            <div class="result-header">
              <span class="result-label">Generated Bcrypt Hash:</span>
              <span class="time-pill">Computed in {{ bcryptGeneratedResult.executionTimeMs }} ms</span>
            </div>
            <div class="code-box">
              <code>{{ bcryptGeneratedResult.hash }}</code>
            </div>
            <div class="result-actions">
              <M3Button
                variant="tonal"
                @click="copyToClipboard(bcryptGeneratedResult.hash, 'bcrypt-hash')"
              >
                <template #icon>
                  <Check v-if="copiedKey === 'bcrypt-hash'" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedKey === 'bcrypt-hash' ? 'Copied' : 'Copy Hash' }}
              </M3Button>

              <M3Button
                variant="outlined"
                @click="sendBcryptToVerifier"
              >
                <template #icon>
                  <ArrowRight :size="14" />
                </template>
                Send to Verifier
              </M3Button>
            </div>
          </div>
        </M3Card>

        <!-- Panel 2: Bcrypt Verifier / Checker -->
        <M3Card variant="filled" padding="medium" class="bcrypt-panel">
          <div class="panel-header">
            <ShieldCheck :size="18" class="panel-icon" />
            <span class="label-heading">Bcrypt Verifier & Structural Checker</span>
          </div>

          <div class="input-group">
            <span class="sub-label">Candidate Plaintext Password</span>
            <div class="password-input-wrapper">
              <input
                v-model="bcryptVerifyPassword"
                :type="bcryptShowVerifyPassword ? 'text' : 'password'"
                class="styled-text-input"
                placeholder="Enter password to verify..."
              />
              <button
                type="button"
                class="pwd-toggle-btn"
                @click="bcryptShowVerifyPassword = !bcryptShowVerifyPassword"
              >
                <EyeOff v-if="bcryptShowVerifyPassword" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <div class="input-group">
            <span class="sub-label">Target Bcrypt Hash ($2a$, $2b$, $2y$)</span>
            <M3TextField
              v-model="bcryptVerifyHash"
              label="Target Bcrypt Hash"
              placeholder="e.g. $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
            />
          </div>

          <div class="generate-btn-row">
            <M3Button
              variant="tonal"
              :disabled="!bcryptVerifyHash.trim() || isVerifyingBcrypt"
              @click="handleVerifyBcrypt"
            >
              <template #icon>
                <RefreshCw v-if="isVerifyingBcrypt" class="spin-icon" :size="16" />
                <CheckCircle2 v-else :size="16" />
              </template>
              {{ isVerifyingBcrypt ? 'Verifying...' : 'Verify Password Against Hash' }}
            </M3Button>
          </div>

          <!-- Verification Outcome Banner -->
          <div v-if="bcryptVerificationResult" class="verification-banner-box">
            <!-- MATCH -->
            <div v-if="bcryptVerificationResult.isValid" class="banner-status valid">
              <CheckCircle2 :size="20" class="status-icon" />
              <div>
                <strong>VALID MATCH!</strong>
                <p>The candidate password matches the provided Bcrypt hash (Verified in {{ bcryptVerificationResult.executionTimeMs }} ms).</p>
              </div>
            </div>

            <!-- MISMATCH -->
            <div v-else-if="bcryptVerificationResult.isFormatValid" class="banner-status mismatch">
              <XCircle :size="20" class="status-icon" />
              <div>
                <strong>MISMATCH!</strong>
                <p>The password does NOT match the hash.</p>
              </div>
            </div>

            <!-- INVALID FORMAT -->
            <div v-else class="banner-status invalid">
              <AlertTriangle :size="20" class="status-icon" />
              <div>
                <strong>INVALID BCRYPT FORMAT!</strong>
                <p>{{ bcryptVerificationResult.error }}</p>
              </div>
            </div>
          </div>

          <!-- Bcrypt Structural Breakdown -->
          <div v-if="parsedVerifyBcryptInfo.isValid" class="bcrypt-anatomy-card">
            <span class="anatomy-title">Bcrypt Hash Structural Decomposition:</span>
            <div class="anatomy-grid">
              <div class="anatomy-item">
                <span class="item-label">Algorithm:</span>
                <span class="item-val">{{ parsedVerifyBcryptInfo.algorithm }} (Standard Blowfish)</span>
              </div>
              <div class="anatomy-item">
                <span class="item-label">Cost Factor:</span>
                <span class="item-val">{{ parsedVerifyBcryptInfo.formattedRounds }}</span>
              </div>
              <div class="anatomy-item full">
                <span class="item-label">Extracted Salt (22 Chars):</span>
                <code class="item-val font-mono">{{ parsedVerifyBcryptInfo.salt }}</code>
              </div>
              <div class="anatomy-item full">
                <span class="item-label">Ciphertext Hash (31 Chars):</span>
                <code class="item-val font-mono">{{ parsedVerifyBcryptInfo.hashValue }}</code>
              </div>
            </div>
          </div>
        </M3Card>
      </div>
    </template>

    <!-- ==================================================== -->
    <!-- TAB 4: AES CIPHER (ENCRYPT & DECRYPT) -->
    <!-- ==================================================== -->
    <template v-else-if="activeTab === 'cipher'">
      <div class="cipher-layout">
        <!-- Configuration Card -->
        <M3Card variant="filled" padding="medium" class="config-card">
          <div class="cipher-top-toolbar">
            <div class="pill-group">
              <button
                type="button"
                class="pill-btn mode"
                :class="{ active: cipherMode === 'encrypt' }"
                @click="cipherMode = 'encrypt'"
              >
                <Lock :size="14" />
                <span>Encrypt Mode</span>
              </button>
              <button
                type="button"
                class="pill-btn mode"
                :class="{ active: cipherMode === 'decrypt' }"
                @click="cipherMode = 'decrypt'"
              >
                <Unlock :size="14" />
                <span>Decrypt Mode</span>
              </button>
            </div>

            <div class="cipher-options-row">
              <div class="option-pill-select">
                <span class="sub-label">Mode:</span>
                <button
                  type="button"
                  class="pill-btn"
                  :class="{ active: cipherAesMode === 'GCM' }"
                  @click="cipherAesMode = 'GCM'"
                >
                  AES-256-GCM (Auth)
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  :class="{ active: cipherAesMode === 'CBC' }"
                  @click="cipherAesMode = 'CBC'"
                >
                  AES-256-CBC
                </button>
              </div>

              <div class="option-pill-select">
                <span class="sub-label">Format:</span>
                <button
                  type="button"
                  class="pill-btn"
                  :class="{ active: cipherEncoding === 'base64' }"
                  @click="cipherEncoding = 'base64'"
                >
                  Base64
                </button>
                <button
                  type="button"
                  class="pill-btn"
                  :class="{ active: cipherEncoding === 'hex' }"
                  @click="cipherEncoding = 'hex'"
                >
                  Hex
                </button>
              </div>
            </div>
          </div>

          <!-- Payload Input -->
          <div class="input-section">
            <div class="section-top-row">
              <span class="label-heading">{{ cipherMode === 'encrypt' ? 'Plaintext to Encrypt' : 'Ciphertext to Decrypt' }}</span>
              <div class="input-actions">
                <button
                  type="button"
                  class="small-action-btn"
                  @click="cipherInput = 'Sensitive developer data payload to secure offline.'"
                >
                  Sample
                </button>
                <button
                  type="button"
                  class="small-action-btn"
                  @click="cipherInput = ''"
                >
                  Clear
                </button>
              </div>
            </div>

            <M3TextArea
              v-model="cipherInput"
              :rows="3"
              :placeholder="cipherMode === 'encrypt' ? 'Type or paste plaintext string...' : 'Paste ciphertext (Base64 or Hex)...'"
            />
          </div>

          <!-- Passphrase Input -->
          <div class="input-group">
            <span class="sub-label">Passphrase / Secret Key (PBKDF2 Key Derivation 100k rounds)</span>
            <div class="password-input-wrapper">
              <input
                v-model="cipherPassphrase"
                :type="cipherShowPassphrase ? 'text' : 'password'"
                class="styled-text-input"
                placeholder="Enter secret passphrase..."
              />
              <button
                type="button"
                class="pwd-toggle-btn"
                @click="cipherShowPassphrase = !cipherShowPassphrase"
              >
                <EyeOff v-if="cipherShowPassphrase" :size="16" />
                <Eye v-else :size="16" />
              </button>
            </div>
          </div>

          <!-- Advanced IV / Salt Params (for Decrypt) -->
          <div class="advanced-params-grid">
            <div class="param-item">
              <M3TextField
                v-model="cipherIv"
                label="IV / Nonce (Hex)"
                placeholder="Auto-generated on Encrypt or paste for Decrypt"
              />
            </div>
            <div class="param-item">
              <M3TextField
                v-model="cipherSalt"
                label="Salt (Hex)"
                placeholder="Auto-generated on Encrypt or paste for Decrypt"
              />
            </div>
          </div>

          <div class="generate-btn-row">
            <M3Button
              variant="filled"
              :disabled="!cipherInput || !cipherPassphrase || isProcessingCipher"
              @click="handleProcessCipher"
            >
              <template #icon>
                <RefreshCw v-if="isProcessingCipher" class="spin-icon" :size="16" />
                <Lock v-else-if="cipherMode === 'encrypt'" :size="16" />
                <Unlock v-else :size="16" />
              </template>
              {{ isProcessingCipher ? 'Processing Cipher...' : cipherMode === 'encrypt' ? 'Encrypt Payload' : 'Decrypt Payload' }}
            </M3Button>
          </div>

          <!-- Cipher Output Card -->
          <div v-if="cipherOutput" class="cipher-result-box">
            <div class="result-header">
              <span class="result-label">{{ cipherMode === 'encrypt' ? 'Encrypted Ciphertext:' : 'Decrypted Plaintext:' }}</span>
              <span v-if="cipherExecTime !== null" class="time-pill">Computed in {{ cipherExecTime }} ms</span>
            </div>
            <div class="code-box">
              <code>{{ cipherOutput }}</code>
            </div>
            <div class="result-actions">
              <M3Button
                variant="tonal"
                @click="copyToClipboard(cipherOutput, 'cipher-out')"
              >
                <template #icon>
                  <Check v-if="copiedKey === 'cipher-out'" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedKey === 'cipher-out' ? 'Copied' : 'Copy Output' }}
              </M3Button>
            </div>
          </div>

          <p v-if="cipherError" class="cipher-error-msg">{{ cipherError }}</p>
        </M3Card>
      </div>
    </template>

    <!-- ==================================================== -->
    <!-- TAB 5: ID GENERATOR (UUID, ULID, NANOID) -->
    <!-- ==================================================== -->
    <template v-else-if="activeTab === 'id-gen'">
      <div class="id-gen-layout">
        <!-- Configuration Card -->
        <M3Card variant="filled" padding="medium" class="config-card">
          <div class="id-type-selector">
            <span class="label-heading">Select Identifier Format</span>
            <div class="type-btn-group">
              <button
                type="button"
                class="type-btn"
                :class="{ active: idType === 'uuid' }"
                @click="idType = 'uuid'"
              >
                <strong>UUID v4</strong>
                <small>RFC 4122 Standard</small>
              </button>

              <button
                type="button"
                class="type-btn"
                :class="{ active: idType === 'ulid' }"
                @click="idType = 'ulid'"
              >
                <strong>ULID</strong>
                <small>Lexicographically Sortable</small>
              </button>

              <button
                type="button"
                class="type-btn"
                :class="{ active: idType === 'nanoid' }"
                @click="idType = 'nanoid'"
              >
                <strong>NanoID</strong>
                <small>Custom Alphabet & Size</small>
              </button>
            </div>
          </div>

          <!-- Common Batch Options -->
          <div class="options-grid">
            <div class="option-box">
              <label class="input-label">Batch Count (1 – 1,000)</label>
              <input
                v-model.number="idCount"
                type="number"
                min="1"
                max="1000"
                class="number-input"
              />
            </div>

            <div class="option-box toggle-box">
              <M3Switch
                v-model="idUppercase"
                label="Uppercase Characters"
              />
            </div>

            <!-- UUID SPECIFIC -->
            <template v-if="idType === 'uuid'">
              <div class="option-box toggle-box">
                <M3Switch
                  v-model="uuidHyphens"
                  label="Include Hyphens (8-4-4-4-12)"
                />
              </div>
            </template>

            <!-- NANOID SPECIFIC -->
            <template v-if="idType === 'nanoid'">
              <div class="option-box">
                <label class="input-label">NanoID Length (Chars)</label>
                <input
                  v-model.number="nanoidLength"
                  type="number"
                  min="1"
                  max="128"
                  class="number-input"
                />
              </div>

              <div class="option-box">
                <label class="input-label">Alphabet Preset</label>
                <select v-model="nanoidPreset" class="preset-select">
                  <option value="default">Default URL-Safe (A-Z, a-z, 0-9, _, -)</option>
                  <option value="hex">Hexadecimal (0-9, a-f)</option>
                  <option value="numbers">Numbers Only (0-9)</option>
                  <option value="letters">Letters Only (A-Z, a-z)</option>
                  <option value="custom">Custom Alphabet</option>
                </select>
              </div>

              <div v-if="nanoidPreset === 'custom'" class="option-box full-width">
                <M3TextField
                  v-model="nanoidAlphabet"
                  label="Custom Character Alphabet"
                  supporting-text="Unique characters to use in generation"
                />
              </div>
            </template>
          </div>

          <div class="generate-btn-row">
            <M3Button
              variant="filled"
              @click="handleGenerateIds"
            >
              <template #icon>
                <RefreshCw :size="16" />
              </template>
              Regenerate IDs
            </M3Button>
          </div>
        </M3Card>

        <!-- Generated IDs Output List -->
        <M3Card variant="outlined" padding="medium" class="output-card">
          <div class="output-header">
            <div class="output-title-group">
              <span class="label-heading">Generated Identifiers ({{ generatedIds.length }})</span>
              <span class="engine-tag">{{ idType.toUpperCase() }}</span>
            </div>

            <div class="output-actions">
              <M3Button
                variant="tonal"
                :disabled="!generatedIds.length"
                @click="handleCopyAllIds"
              >
                <template #icon>
                  <Check v-if="copiedAllIds" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedAllIds ? 'All Copied!' : 'Copy All' }}
              </M3Button>

              <M3Button
                variant="outlined"
                :disabled="!generatedIds.length"
                @click="handleDownloadIds"
              >
                <template #icon>
                  <Download :size="14" />
                </template>
                Save as .txt
              </M3Button>
            </div>
          </div>

          <div class="ids-scroll-container">
            <div
              v-for="(id, index) in generatedIds"
              :key="index"
              class="id-item-row"
            >
              <span class="id-index">{{ index + 1 }}</span>
              <code class="id-text">{{ id }}</code>
              <button
                type="button"
                class="id-copy-btn"
                :title="`Copy ID #${index + 1}`"
                @click="handleCopySingleId(id, index)"
              >
                <Check v-if="copiedSingleIdIndex === index" :size="14" class="success-icon" />
                <Copy v-else :size="14" />
              </button>
            </div>
          </div>
        </M3Card>

        <!-- ULID TIMESTAMP INSPECTOR -->
        <M3Card v-if="idType === 'ulid'" variant="filled" padding="medium" class="inspector-card">
          <div class="inspector-header">
            <Calendar :size="18" class="inspect-icon" />
            <span class="label-heading">ULID Timestamp Inspector</span>
          </div>
          <p class="inspect-desc">
            ULIDs encode a 48-bit UNIX timestamp in the first 10 characters (Crockford's Base32). Paste any ULID below to extract its embedded generation timestamp.
          </p>

          <div class="inspect-input-row">
            <div style="flex: 1;">
              <M3TextField
                v-model="inspectUlidInput"
                label="Paste ULID to Inspect"
                placeholder="e.g. 01ARZ3NDEKTSV4RRFFQ69G5FAV"
              />
            </div>
            <M3Button variant="tonal" @click="handleInspectUlid">
              Inspect
            </M3Button>
          </div>

          <div v-if="inspectedUlidInfo" class="inspect-result-box">
            <div class="inspect-item">
              <span class="inspect-label">UTC Timestamp:</span>
              <span class="inspect-val">{{ inspectedUlidInfo.dateIso }}</span>
            </div>
            <div class="inspect-item">
              <span class="inspect-label">Unix Milliseconds:</span>
              <span class="inspect-val">{{ inspectedUlidInfo.timestamp }} ms</span>
            </div>
            <div class="inspect-item">
              <span class="inspect-label">Random Entropy:</span>
              <span class="inspect-val font-mono">{{ inspectedUlidInfo.randomness }}</span>
            </div>
          </div>

          <p v-if="inspectUlidError" class="inspect-error">{{ inspectUlidError }}</p>
        </M3Card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hash-workspace-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.subtabs-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 0.375rem 0.75rem;
  min-height: 42px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.tabs-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-full);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.tab-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.exec-pill {
  font-size: 0.6875rem;
  font-family: var(--md-sys-typescale-code-font, monospace);
  font-weight: 500;
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.2rem 0.55rem;
  border-radius: var(--md-sys-shape-corner-small);
}

/* ========================================= */
/* TAB 1: HASH GENERATOR & CHECKSUM          */
/* ========================================= */
.tab-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.config-card,
.config-card :deep(.m3-card-content) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.heading-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label-heading {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.meta-pill {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.input-actions {
  display: flex;
  gap: 0.5rem;
}

.small-action-btn {
  font-size: 0.6875rem;
  font-weight: 600;
  background: transparent;
  border: 1px solid var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-primary);
  cursor: pointer;
  padding: 0.2rem 0.55rem;
  border-radius: var(--md-sys-shape-corner-small);
  transition: all 0.15s ease;
}

.small-action-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.options-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.toolbar-toggles {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.encoding-selector,
.option-pill-select {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sub-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.pill-group {
  display: inline-flex;
  background-color: var(--md-sys-color-surface-container-highest);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 2px;
  gap: 2px;
}

.pill-btn {
  padding: 0.25rem 0.6rem;
  font-size: 0.6875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--md-sys-shape-corner-small);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.pill-btn.active {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-primary);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.advanced-params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
}

.param-item {
  display: flex;
  flex-direction: column;
}

/* File Checksum Zone */
.file-checksum-zone {
  margin-top: 0.5rem;
  padding: 0.85rem 1rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px dashed var(--md-sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.file-zone-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.zone-icon {
  color: var(--md-sys-color-primary);
}

.hidden-file-input {
  display: none;
}

.file-result-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--md-sys-color-surface);
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
}

.file-meta span {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.6875rem;
}

.file-digests {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.file-digest-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.75rem;
}

.digest-tag {
  font-weight: 700;
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  min-width: 60px;
  text-align: center;
}

.file-digest-row code {
  flex: 1;
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 0.75rem;
  word-break: break-all;
}

.mini-copy-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--md-sys-color-primary);
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: var(--md-sys-shape-corner-small);
}

.mini-copy-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

/* Matcher Section */
.matcher-section {
  margin-top: 0.5rem;
  padding: 0.85rem 1rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.matcher-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.matcher-icon {
  color: var(--md-sys-color-primary);
}

.matcher-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.matched-alert {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
  color: #10b981;
  font-size: 0.75rem;
}

/* Hash Grid & Cards */
.hash-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.hash-digest-card {
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.hash-digest-card.is-matched {
  border-color: #10b981;
  background-color: rgba(16, 185, 129, 0.06);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.digest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.digest-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.algo-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-small);
}

.algo-badge.sha256 { background-color: #10b981; color: #ffffff; }
.algo-badge.sha512 { background-color: #f59e0b; color: #ffffff; }
.algo-badge.md5 { background-color: #6366f1; color: #ffffff; }
.algo-badge.sha1 { background-color: #0ea5e9; color: #ffffff; }
.algo-badge.sha384 { background-color: #8b5cf6; color: #ffffff; }
.algo-badge.crc32 { background-color: #ec4899; color: #ffffff; }

.bits-tag {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.hmac-tag {
  font-size: 0.625rem;
  font-weight: 700;
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  padding: 0.12rem 0.4rem;
  border-radius: 9999px;
}

.matched-badge {
  font-size: 0.625rem;
  font-weight: 700;
  background-color: #10b981;
  color: #ffffff;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  letter-spacing: 0.05em;
}

.digest-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.digest-value-box {
  background-color: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.55rem 0.75rem;
  overflow-x: auto;
}

.digest-value-box code {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
  word-break: break-all;
}

/* ========================================= */
/* TAB 2: DECRYPT & LOOKUP STYLING           */
/* ========================================= */
.decrypt-layout,
.cipher-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detected-types-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.detected-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.detected-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.detected-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.detected-pill strong {
  color: var(--md-sys-color-primary);
}

.detected-pill small {
  color: var(--md-sys-color-on-surface-variant);
}

.wordlist-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

.action-btn-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.result-card,
.result-card :deep(.m3-card-content) {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-found-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: rgba(16, 185, 129, 0.08);
  border: 1px solid #10b981;
  border-radius: var(--md-sys-shape-corner-medium);
}

.result-status-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #10b981;
  font-weight: 700;
  font-size: 0.8125rem;
}

.plaintext-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.6rem 0.85rem;
}

.plaintext-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.plaintext-value {
  flex: 1;
  font-family: monospace;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--md-sys-color-primary);
}

.lookup-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  flex-wrap: wrap;
}

.result-notfound-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.85rem 1rem;
  background-color: rgba(245, 158, 11, 0.08);
  border: 1px solid #f59e0b;
  border-radius: var(--md-sys-shape-corner-medium);
}

.result-status-header.not-found {
  color: #f59e0b;
}

.notfound-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface);
  line-height: 1.4;
}

/* ========================================= */
/* TAB 3: BCRYPT DUAL LAYOUT                 */
/* ========================================= */
.bcrypt-dual-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1rem;
}

.bcrypt-panel,
.bcrypt-panel :deep(.m3-card-content) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.panel-icon {
  color: var(--md-sys-color-primary);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.styled-text-input {
  width: 100%;
  padding: 0.55rem 2.2rem 0.55rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  font-size: 0.8125rem;
  outline: none;
}

.styled-text-input:focus {
  border-color: var(--md-sys-color-primary);
}

.pwd-toggle-btn {
  position: absolute;
  right: 0.4rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--md-sys-color-on-surface-variant);
  display: flex;
  align-items: center;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.iterations-pill {
  font-size: 0.6875rem;
  font-family: monospace;
  color: var(--md-sys-color-primary);
  font-weight: 600;
}

.styled-range {
  width: 100%;
  accent-color: var(--md-sys-color-primary);
  cursor: pointer;
}

.slider-hints {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  color: var(--md-sys-color-on-surface-variant);
}

.generate-btn-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.bcrypt-result-box,
.cipher-result-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.time-pill {
  font-size: 0.625rem;
  font-family: monospace;
  color: var(--md-sys-color-on-surface-variant);
}

.code-box {
  background-color: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.5rem 0.75rem;
}

.code-box code {
  font-family: monospace;
  font-size: 0.75rem;
  word-break: break-all;
  color: var(--md-sys-color-on-surface);
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Verification Status Banner */
.verification-banner-box {
  margin-top: 0.5rem;
}

.banner-status {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.75rem;
}

.banner-status p {
  margin: 0.2rem 0 0 0;
  font-size: 0.6875rem;
}

.banner-status.valid {
  background-color: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
  color: #10b981;
}

.banner-status.mismatch {
  background-color: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.banner-status.invalid {
  background-color: rgba(245, 158, 11, 0.15);
  border: 1px solid #f59e0b;
  color: #f59e0b;
}

.bcrypt-anatomy-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.anatomy-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface-variant);
}

.anatomy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.anatomy-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.6875rem;
}

.anatomy-item.full {
  grid-column: 1 / -1;
}

.item-label {
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.item-val {
  color: var(--md-sys-color-on-surface);
}

/* ========================================= */
/* TAB 4: AES CIPHER STYLING                 */
/* ========================================= */
.cipher-top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.cipher-options-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.pill-btn.mode {
  padding: 0.35rem 0.85rem;
}

.cipher-error-msg {
  color: var(--md-sys-color-error);
  font-size: 0.75rem;
  margin: 0;
}

/* ========================================= */
/* TAB 5: ID GENERATOR STYLING               */
/* ========================================= */
.id-gen-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.id-type-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-btn-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container);
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--md-sys-color-on-surface);
  gap: 0.2rem;
}

.type-btn strong {
  font-size: 0.8125rem;
}

.type-btn small {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.type-btn:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.type-btn.active {
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.type-btn.active small {
  color: var(--md-sys-color-on-primary-container);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: flex-end;
  margin-top: 0.5rem;
}

.option-box {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.option-box.full-width {
  grid-column: 1 / -1;
}

.option-box.toggle-box {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 42px;
}

.input-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
}

.number-input,
.preset-select {
  padding: 0.5rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline);
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  font-size: 0.75rem;
  outline: none;
  min-height: 40px;
}

.output-card,
.output-card :deep(.m3-card-content) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.output-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.output-actions {
  display: flex;
  gap: 0.5rem;
}

.engine-tag {
  font-size: 0.625rem;
  font-weight: 700;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.ids-scroll-container {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.id-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.85rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  transition: all 0.15s ease;
}

.id-item-row:hover {
  background-color: var(--md-sys-color-surface-container-high);
}

.id-index {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface-variant);
  min-width: 24px;
}

.id-text {
  flex: 1;
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
  user-select: all;
}

.id-copy-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: var(--md-sys-shape-corner-small);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.id-copy-btn:hover {
  color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-highest);
}

/* ULID INSPECTOR */
.inspector-card,
.inspector-card :deep(.m3-card-content) {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspector-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inspect-icon {
  color: var(--md-sys-color-primary);
}

.inspect-desc {
  margin: 0;
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.4;
}

.inspect-input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.inspect-result-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--md-sys-color-surface-container-lowest);
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.inspect-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
}

.inspect-label {
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  min-width: 130px;
}

.inspect-val {
  color: var(--md-sys-color-on-surface);
  font-weight: 500;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
