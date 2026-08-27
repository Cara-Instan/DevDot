<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Fingerprint,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  Download,
  ShieldCheck,
  Calendar,
  Layers
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
import type { IdType, MultiHashResult, UlidDecodedInfo } from '../types'

const { execute } = useExecutionEngine()
const snapshotStore = useSnapshotStore()

const initialSaved = snapshotStore.getToolState('hash-generator', {
  activeTab: 'hash' as 'hash' | 'id-gen',
  hashInput: 'DevDot: 100% Offline Universal Developer Toolkit',
  hashUppercase: false,
  enableHmac: false,
  hmacSecret: 'secret-key-123',
  hashToMatch: '',
  idType: 'uuid' as IdType,
  idCount: 5,
  idUppercase: false,
  uuidHyphens: true,
  nanoidLength: 21,
  nanoidPreset: 'default' as const,
  nanoidAlphabet: 'use-Nanoid_Alphabet0123456789abcdefghijklmnopqrstuvwxyz',
  inspectUlidInput: ''
})

// Active Sub-Tab: 'hash' | 'id-gen'
const activeTab = ref<'hash' | 'id-gen'>(initialSaved.activeTab)

// ----------------------------------------------------
// TAB 1: HASH GENERATOR & MATCHER STATE
// ----------------------------------------------------
const hashInput = ref(initialSaved.hashInput)
const hashUppercase = ref(initialSaved.hashUppercase)
const enableHmac = ref(initialSaved.enableHmac)
const hmacSecret = ref(initialSaved.hmacSecret)
const hashToMatch = ref(initialSaved.hashToMatch)

const hashResults = ref<MultiHashResult>({
  md5: '',
  sha1: '',
  sha256: '',
  sha512: '',
  isHmac: false,
  matchedAlgorithm: null
})
const hashExecTime = ref<number | null>(null)
const hashError = ref<string | null>(null)
const copiedHashKey = ref<string | null>(null)

async function calculateHashes() {
  hashError.value = null
  if (!hashInput.value) {
    hashResults.value = {
      md5: '',
      sha1: '',
      sha256: '',
      sha512: '',
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

function copyToClipboard(text: string, key: string) {
  navigator.clipboard.writeText(text)
  copiedHashKey.value = key
  setTimeout(() => {
    if (copiedHashKey.value === key) {
      copiedHashKey.value = null
    }
  }, 2000)
}

// ----------------------------------------------------
// TAB 2: ID GENERATOR STATE
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

// Sync to snapshot store
watch(
  [
    activeTab,
    hashInput,
    hashUppercase,
    enableHmac,
    hmacSecret,
    hashToMatch,
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
      enableHmac: enableHmac.value,
      hmacSecret: hmacSecret.value,
      hashToMatch: hashToMatch.value,
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

// Hydrate from snapshot store on external change
watch(
  () => snapshotStore.toolStates['hash-generator'],
  (newState) => {
    if (newState) {
      if (newState.activeTab !== undefined) activeTab.value = newState.activeTab
      if (newState.hashInput !== undefined) hashInput.value = newState.hashInput
      if (newState.hashUppercase !== undefined) hashUppercase.value = newState.hashUppercase
      if (newState.enableHmac !== undefined) enableHmac.value = newState.enableHmac
      if (newState.hmacSecret !== undefined) hmacSecret.value = newState.hmacSecret
      if (newState.hashToMatch !== undefined) hashToMatch.value = newState.hashToMatch
      if (newState.idType !== undefined) idType.value = newState.idType
      if (newState.idCount !== undefined) idCount.value = newState.idCount
      if (newState.idUppercase !== undefined) idUppercase.value = newState.idUppercase
      if (newState.uuidHyphens !== undefined) uuidHyphens.value = newState.uuidHyphens
      if (newState.nanoidLength !== undefined) nanoidLength.value = newState.nanoidLength
      if (newState.nanoidPreset !== undefined) nanoidPreset.value = newState.nanoidPreset
      if (newState.nanoidAlphabet !== undefined) nanoidAlphabet.value = newState.nanoidAlphabet
      if (newState.inspectUlidInput !== undefined) inspectUlidInput.value = newState.inspectUlidInput
    }
  },
  { deep: true }
)

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

// Watchers
watch(
  [hashInput, hashUppercase, enableHmac, hmacSecret, hashToMatch],
  () => {
    calculateHashes()
  },
  { immediate: true }
)

watch(
  [idType, idCount, idUppercase, uuidHyphens, nanoidLength, nanoidAlphabet],
  () => {
    handleGenerateIds()
  },
  { immediate: true }
)
</script>

<template>
  <div class="hash-generator-view">
    <!-- Top Navigation Sub-Tabs -->
    <div class="subtabs-bar">
      <div class="tabs-group">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'hash' }"
          @click="activeTab = 'hash'"
        >
          <Fingerprint :size="16" />
          <span>Hash Generator & Matcher</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'id-gen' }"
          @click="activeTab = 'id-gen'"
        >
          <Layers :size="16" />
          <span>ID Generator (UUID, ULID, NanoID)</span>
        </button>
      </div>

      <div class="status-summary">
        <span v-if="activeTab === 'hash' && hashExecTime !== null" class="exec-pill">
          Computed in {{ hashExecTime }} ms
        </span>
        <span v-if="activeTab === 'id-gen' && idExecTime !== null" class="exec-pill">
          Generated {{ generatedIds.length }} IDs in {{ idExecTime }} ms
        </span>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- TAB 1: HASH GENERATOR & MATCHER -->
    <!-- ==================================================== -->
    <template v-if="activeTab === 'hash'">
      <!-- Input & Options Card -->
      <M3Card variant="filled" padding="medium" class="config-card">
        <div class="input-section">
          <div class="section-top-row">
            <span class="label-heading">Input Text / Payload</span>
            <div class="input-actions">
              <button
                type="button"
                class="small-action-btn"
                @click="hashInput = 'DevDot: 100% Offline Universal Developer Toolkit'"
              >
                Sample Text
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
            placeholder="Type or paste payload to generate hashes..."
          />
        </div>

        <div class="options-row">
          <M3Switch
            v-model="hashUppercase"
            label="Uppercase Digits (HEX)"
          />

          <M3Switch
            v-model="enableHmac"
            label="Enable HMAC (Secret Key)"
          />
        </div>

        <div v-if="enableHmac" class="hmac-input-row">
          <M3TextField
            v-model="hmacSecret"
            label="HMAC Secret Key"
            supporting-text="Cryptographic secret key for HMAC calculation"
          />
        </div>

        <!-- Hash Matcher Section -->
        <div class="matcher-section">
          <div class="matcher-header">
            <ShieldCheck :size="16" class="matcher-icon" />
            <span class="matcher-title">Hash Matcher & Checksum Verifier</span>
          </div>
          <M3TextField
            v-model="hashToMatch"
            label="Paste Expected Checksum / Hash to Verify"
            placeholder="e.g. 5d41402abc4b2a76b9719d911017c592"
            supporting-text="Real-time matching against MD5, SHA-1, SHA-256, and SHA-512"
          />
          <div v-if="hashResults.matchedAlgorithm" class="matched-alert">
            <CheckCircle2 :size="18" class="match-success-icon" />
            <span>
              <strong>MATCH FOUND!</strong> The checksum matches algorithm
              <strong>{{ hashResults.matchedAlgorithm.toUpperCase() }}</strong>.
            </span>
          </div>
        </div>
      </M3Card>

      <!-- Hash Results Digest Cards -->
      <div class="hash-cards-grid">
        <!-- MD5 -->
        <div
          class="hash-digest-card"
          :class="{ 'is-matched': hashResults.matchedAlgorithm === 'md5' }"
        >
          <div class="digest-header">
            <div class="digest-title-group">
              <span class="algo-badge md5">MD5</span>
              <span class="bits-tag">128-bit (32 hex chars)</span>
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
                  <Check v-if="copiedHashKey === 'md5'" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedHashKey === 'md5' ? 'Copied' : 'Copy' }}
              </M3Button>
            </div>
          </div>
          <div class="digest-value-box">
            <code>{{ hashResults.md5 || 'No input' }}</code>
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
              <span class="bits-tag">160-bit (40 hex chars)</span>
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
                  <Check v-if="copiedHashKey === 'sha1'" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedHashKey === 'sha1' ? 'Copied' : 'Copy' }}
              </M3Button>
            </div>
          </div>
          <div class="digest-value-box">
            <code>{{ hashResults.sha1 || 'No input' }}</code>
          </div>
        </div>

        <!-- SHA-256 -->
        <div
          class="hash-digest-card"
          :class="{ 'is-matched': hashResults.matchedAlgorithm === 'sha256' }"
        >
          <div class="digest-header">
            <div class="digest-title-group">
              <span class="algo-badge sha256">SHA-256</span>
              <span class="bits-tag">256-bit (64 hex chars)</span>
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
                  <Check v-if="copiedHashKey === 'sha256'" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedHashKey === 'sha256' ? 'Copied' : 'Copy' }}
              </M3Button>
            </div>
          </div>
          <div class="digest-value-box">
            <code>{{ hashResults.sha256 || 'No input' }}</code>
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
              <span class="bits-tag">512-bit (128 hex chars)</span>
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
                  <Check v-if="copiedHashKey === 'sha512'" :size="14" />
                  <Copy v-else :size="14" />
                </template>
                {{ copiedHashKey === 'sha512' ? 'Copied' : 'Copy' }}
              </M3Button>
            </div>
          </div>
          <div class="digest-value-box">
            <code>{{ hashResults.sha512 || 'No input' }}</code>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================================================== -->
    <!-- TAB 2: ID GENERATOR (UUID, ULID, NANOID) -->
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
.hash-generator-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.subtabs-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 0.5rem 0.75rem;
  flex-wrap: wrap;
}

.tabs-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid transparent;
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.tab-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border-color: var(--md-sys-color-primary);
}

.exec-pill {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.config-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.label-heading {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
}

.input-actions {
  display: flex;
  gap: 0.5rem;
}

.small-action-btn {
  font-size: 0.6875rem;
  font-weight: 600;
  background: transparent;
  border: none;
  color: var(--md-sys-color-primary);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: var(--md-sys-shape-corner-small);
}

.small-action-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

.options-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
}

.hmac-input-row {
  margin-top: 0.5rem;
}

.matcher-section {
  margin-top: 0.75rem;
  padding: 0.85rem 1rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-medium);
  border: 1px solid var(--md-sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.matcher-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--md-sys-shape-corner-small);
  background-color: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
  color: #10b981;
  font-size: 0.8125rem;
}

.match-success-icon {
  flex-shrink: 0;
}

.hash-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.hash-digest-card {
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  transition: all 0.2s ease;
}

.hash-digest-card.is-matched {
  border-color: #10b981;
  background-color: rgba(16, 185, 129, 0.05);
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
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-small);
}

.algo-badge.md5 {
  background-color: #6366f1;
  color: #ffffff;
}

.algo-badge.sha1 {
  background-color: #0ea5e9;
  color: #ffffff;
}

.algo-badge.sha256 {
  background-color: #10b981;
  color: #ffffff;
}

.algo-badge.sha512 {
  background-color: #f59e0b;
  color: #ffffff;
}

.bits-tag {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
}

.hmac-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
}

.digest-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.matched-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  background-color: #10b981;
  color: #ffffff;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  letter-spacing: 0.05em;
}

.digest-value-box {
  background-color: var(--md-sys-color-surface-container-lowest);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0.65rem 0.85rem;
  overflow-x: auto;
}

.digest-value-box code {
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 0.8125rem;
  color: var(--md-sys-color-on-surface);
  word-break: break-all;
}

/* ID GENERATOR STYLING */
.id-gen-layout {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.type-btn-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
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
}

.type-btn strong {
  font-size: 0.875rem;
}

.type-btn small {
  font-size: 0.6875rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-top: 0.15rem;
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
  opacity: 0.85;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: center;
  margin-top: 0.5rem;
}

.option-box {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.option-box.full-width {
  grid-column: 1 / -1;
}

.option-box.toggle-box {
  padding-top: 1rem;
}

.input-label {
  font-size: 0.75rem;
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
  font-size: 0.8125rem;
  font-weight: 500;
  outline: none;
}

.number-input:focus,
.preset-select:focus {
  border-color: var(--md-sys-color-primary);
}

.generate-btn-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.output-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
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
  font-size: 0.6875rem;
  font-weight: 700;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.ids-scroll-container {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.id-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.75rem;
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
  padding: 0.25rem;
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

.success-icon {
  color: #10b981;
}

/* ULID INSPECTOR */
.inspector-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inspector-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.inspect-icon {
  color: var(--md-sys-color-primary);
}

.inspect-desc {
  margin: 0;
  font-size: 0.8125rem;
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
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background-color: var(--md-sys-color-surface-container-lowest);
  border-radius: var(--md-sys-shape-corner-small);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.inspect-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8125rem;
}

.inspect-label {
  font-weight: 600;
  color: var(--md-sys-color-on-surface-variant);
  min-width: 140px;
}

.inspect-val {
  color: var(--md-sys-color-on-surface);
  font-weight: 500;
}

.font-mono {
  font-family: monospace;
}

.inspect-error {
  color: var(--md-sys-color-error);
  font-size: 0.8125rem;
  margin: 0;
}
</style>
