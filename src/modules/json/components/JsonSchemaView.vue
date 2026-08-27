<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Sparkles,
  RotateCcw,
  CheckCircle2
} from 'lucide-vue-next'
import {
  M3Button,
  M3TextField,
  M3Switch,
  M3Checkbox,
  SplitEditor
} from '@/components'
import { useExecutionEngine } from '@/composables'
import { useSnapshotStore } from '@/stores'
import type {
  TargetLanguage,
  TypeScriptOptions,
  GoOptions,
  RustOptions,
  JsonSchemaOptions,
  TypeGeneratorPayload,
  TypeGeneratorResult
} from '../types'

const { execute, isExecuting } = useExecutionEngine()
const snapshotStore = useSnapshotStore()

const sampleJson = `{
  "id": 101,
  "name": "DevDot Universal Developer Toolkit",
  "version": "1.0.0",
  "is_active": true,
  "author": {
    "name": "Ando",
    "email": "ando@devdot.local",
    "github_handle": "devdot-core"
  },
  "tags": ["offline", "tauri-v2", "vue3", "pinia"],
  "metrics": {
    "total_modules": 12,
    "memory_usage_mb": 14.5,
    "last_synced_at": "2026-08-26T22:00:00Z"
  }
}`

const initialSaved = snapshotStore.getToolState('json-schema', {
  inputJson: sampleJson,
  outputCode: '',
  selectedTarget: 'typescript' as TargetLanguage,
  tsOptions: {
    rootName: 'DevDotConfig',
    useInterface: true,
    exportTypes: true,
    optionalFields: false,
    readonlyProperties: false,
    allOptional: false
  },
  goOptions: {
    rootName: 'DevDotConfig',
    includeJsonTags: true,
    includeYamlTags: true,
    includeXmlTags: false,
    omitempty: false,
    usePointersForNullable: true
  },
  rustOptions: {
    rootName: 'DevDotConfig',
    deriveMacros: ['Default', 'Debug', 'Clone', 'PartialEq', 'Serialize', 'Deserialize'],
    useOptionForNullable: true,
    renameAll: 'none' as const
  },
  schemaOptions: {
    schemaDraft: 'draft-07' as const,
    title: 'DevDotConfigSchema',
    includeRequired: true,
    includeExamples: true
  }
})

const inputJson = ref(initialSaved.inputJson)
const outputCode = ref(initialSaved.outputCode)
const selectedTarget = ref<TargetLanguage>(initialSaved.selectedTarget)
const lastResult = ref<TypeGeneratorResult | null>(null)
const genError = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)

// Target Options
const tsOptions = ref<TypeScriptOptions>(initialSaved.tsOptions)
const goOptions = ref<GoOptions>(initialSaved.goOptions)
const rustOptions = ref<RustOptions>(initialSaved.rustOptions)
const schemaOptions = ref<JsonSchemaOptions>(initialSaved.schemaOptions)

// Sync changes to snapshot store
watch(
  [inputJson, outputCode, selectedTarget, tsOptions, goOptions, rustOptions, schemaOptions],
  () => {
    snapshotStore.setToolState('json-schema', {
      inputJson: inputJson.value,
      outputCode: outputCode.value,
      selectedTarget: selectedTarget.value,
      tsOptions: { ...tsOptions.value },
      goOptions: { ...goOptions.value },
      rustOptions: { ...rustOptions.value },
      schemaOptions: { ...schemaOptions.value }
    })
  },
  { deep: true }
)

// Hydrate from snapshot store on external change
watch(
  () => snapshotStore.toolStates['json-schema'],
  (newState) => {
    if (newState) {
      if (newState.inputJson !== undefined && newState.inputJson !== inputJson.value) {
        inputJson.value = newState.inputJson
      }
      if (newState.outputCode !== undefined && newState.outputCode !== outputCode.value) {
        outputCode.value = newState.outputCode
      }
      if (newState.selectedTarget !== undefined && newState.selectedTarget !== selectedTarget.value) {
        selectedTarget.value = newState.selectedTarget
      }
      if (newState.tsOptions) {
        tsOptions.value = { ...newState.tsOptions }
      }
      if (newState.goOptions) {
        goOptions.value = { ...newState.goOptions }
      }
      if (newState.rustOptions) {
        rustOptions.value = { ...newState.rustOptions }
      }
      if (newState.schemaOptions) {
        schemaOptions.value = { ...newState.schemaOptions }
      }
    }
  },
  { deep: true }
)

const outputLanguage = computed(() => {
  switch (selectedTarget.value) {
    case 'typescript':
      return 'typescript'
    case 'json-schema':
      return 'json'
    case 'go':
      return 'text'
    case 'rust':
      return 'text'
    default:
      return 'text'
  }
})

async function handleGenerate() {
  genError.value = null

  if (!inputJson.value.trim()) {
    outputCode.value = ''
    lastResult.value = null
    executionTimeMs.value = null
    return
  }

  const payload: TypeGeneratorPayload = {
    input: inputJson.value,
    target: selectedTarget.value,
    tsOptions: { ...tsOptions.value },
    goOptions: { ...goOptions.value },
    rustOptions: {
      ...rustOptions.value,
      deriveMacros: [...rustOptions.value.deriveMacros]
    },
    schemaOptions: { ...schemaOptions.value }
  }

  try {
    const res = await execute<TypeGeneratorPayload, TypeGeneratorResult>(
      'json',
      'generate-types',
      payload
    )

    if (res.success && res.result) {
      lastResult.value = res.result
      outputCode.value = res.result.code
      executionTimeMs.value = res.executionTimeMs
    } else {
      genError.value = res.error || 'Type generation failed'
    }
  } catch (err: any) {
    genError.value = err.message || 'Generation error'
  }
}

watch(selectedTarget, () => {
  handleGenerate()
})

function handleLoadSample() {
  inputJson.value = sampleJson
  handleGenerate()
}

function handleClear() {
  inputJson.value = ''
  outputCode.value = ''
  lastResult.value = null
  genError.value = null
  executionTimeMs.value = null
}

onMounted(() => {
  handleGenerate()
})
</script>

<template>
  <div class="json-schema-container">
    <!-- Language Selection Header -->
    <div class="schema-header-toolbar">
      <div class="target-tabs">
        <button
          type="button"
          class="target-tab-btn"
          :class="{ active: selectedTarget === 'typescript' }"
          @click="selectedTarget = 'typescript'"
        >
          <span class="lang-dot ts-dot"></span>
          TypeScript Interface
        </button>

        <button
          type="button"
          class="target-tab-btn"
          :class="{ active: selectedTarget === 'go' }"
          @click="selectedTarget = 'go'"
        >
          <span class="lang-dot go-dot"></span>
          Go Struct
        </button>

        <button
          type="button"
          class="target-tab-btn"
          :class="{ active: selectedTarget === 'rust' }"
          @click="selectedTarget = 'rust'"
        >
          <span class="lang-dot rust-dot"></span>
          Rust Struct (Serde)
        </button>

        <button
          type="button"
          class="target-tab-btn"
          :class="{ active: selectedTarget === 'json-schema' }"
          @click="selectedTarget = 'json-schema'"
        >
          <span class="lang-dot json-dot"></span>
          JSON Schema
        </button>
      </div>

      <div class="header-actions">
        <M3Button
          variant="filled"
          :disabled="isExecuting"
          @click="handleGenerate"
        >
          <template #icon>
            <Sparkles :size="16" />
          </template>
          Generate
        </M3Button>

        <M3Button
          variant="text"
          @click="handleLoadSample"
        >
          Sample
        </M3Button>

        <M3Button
          variant="text"
          @click="handleClear"
        >
          <template #icon>
            <RotateCcw :size="14" />
          </template>
          Clear
        </M3Button>
      </div>
    </div>

    <!-- Target Specific Options Panel -->
    <div class="options-panel">
      <!-- TypeScript Options -->
      <template v-if="selectedTarget === 'typescript'">
        <div class="options-row">
          <div class="opt-field">
            <M3TextField
              v-model="tsOptions.rootName"
              label="Root Interface / Type Name"
              @update:model-value="handleGenerate"
            />
          </div>
          <div class="toggles-cluster">
            <M3Switch
              v-model="tsOptions.useInterface"
              label="Use Interface (vs Type)"
              @update:model-value="handleGenerate"
            />
            <M3Switch
              v-model="tsOptions.exportTypes"
              label="Export Types"
              @update:model-value="handleGenerate"
            />
            <M3Switch
              v-model="tsOptions.readonlyProperties"
              label="Readonly Properties"
              @update:model-value="handleGenerate"
            />
            <M3Switch
              v-model="tsOptions.optionalFields"
              label="Optional Fields (?)"
              @update:model-value="handleGenerate"
            />
          </div>
        </div>
      </template>

      <!-- Go Options -->
      <template v-else-if="selectedTarget === 'go'">
        <div class="options-row">
          <div class="opt-field">
            <M3TextField
              v-model="goOptions.rootName"
              label="Root Struct Name"
              @update:model-value="handleGenerate"
            />
          </div>
          <div class="toggles-cluster">
            <M3Checkbox
              v-model="goOptions.includeJsonTags"
              label='json:"..."'
              @update:model-value="handleGenerate"
            />
            <M3Checkbox
              v-model="goOptions.includeYamlTags"
              label='yaml:"..."'
              @update:model-value="handleGenerate"
            />
            <M3Checkbox
              v-model="goOptions.includeXmlTags"
              label='xml:"..."'
              @update:model-value="handleGenerate"
            />
            <M3Switch
              v-model="goOptions.omitempty"
              label="omitempty"
              @update:model-value="handleGenerate"
            />
            <M3Switch
              v-model="goOptions.usePointersForNullable"
              label="*Pointers for Nullables"
              @update:model-value="handleGenerate"
            />
          </div>
        </div>
      </template>

      <!-- Rust Options -->
      <template v-else-if="selectedTarget === 'rust'">
        <div class="options-row">
          <div class="opt-field">
            <M3TextField
              v-model="rustOptions.rootName"
              label="Root Struct Name"
              @update:model-value="handleGenerate"
            />
          </div>
          <div class="toggles-cluster">
            <M3Switch
              v-model="rustOptions.useOptionForNullable"
              label="Option<T> for Nullable Fields"
              @update:model-value="handleGenerate"
            />
            <span class="badge-label">Derives: Default, Debug, Clone, Serialize, Deserialize</span>
          </div>
        </div>
      </template>

      <!-- JSON Schema Options -->
      <template v-else-if="selectedTarget === 'json-schema'">
        <div class="options-row">
          <div class="opt-field">
            <M3TextField
              v-model="schemaOptions.title"
              label="Schema Title"
              @update:model-value="handleGenerate"
            />
          </div>
          <div class="toggles-cluster">
            <div class="segment-group">
              <button
                type="button"
                class="segment-btn"
                :class="{ active: schemaOptions.schemaDraft === 'draft-07' }"
                @click="schemaOptions.schemaDraft = 'draft-07'; handleGenerate()"
              >
                Draft-07
              </button>
              <button
                type="button"
                class="segment-btn"
                :class="{ active: schemaOptions.schemaDraft === '2020-12' }"
                @click="schemaOptions.schemaDraft = '2020-12'; handleGenerate()"
              >
                Draft 2020-12
              </button>
            </div>
            <M3Switch
              v-model="schemaOptions.includeRequired"
              label="Include Required Properties"
              @update:model-value="handleGenerate"
            />
            <M3Switch
              v-model="schemaOptions.includeExamples"
              label="Include Example Values"
              @update:model-value="handleGenerate"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Split Editor Area -->
    <div class="editor-area">
      <SplitEditor
        v-model:input="inputJson"
        v-model:output="outputCode"
        input-language="json"
        :output-language="outputLanguage"
        input-title="Input JSON"
        :output-title="`Generated ${selectedTarget.toUpperCase()} Code`"
        :is-executing="isExecuting"
        :error="genError"
        :execution-time-ms="executionTimeMs"
        :show-execute-button="true"
        :execute-button-label="`Generate ${selectedTarget}`"
        height="calc(100vh - 380px)"
        @execute="handleGenerate"
      />
    </div>

    <!-- Stats & Information Bar -->
    <div v-if="lastResult && !genError" class="stats-footer">
      <div class="stat-pill">
        <span class="stat-label">Target:</span>
        <span class="stat-val uppercase">{{ lastResult.targetLanguage }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Root Type:</span>
        <span class="stat-val">{{ lastResult.rootName }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Types Created:</span>
        <span class="stat-val">{{ lastResult.stats.typesGenerated }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Lines:</span>
        <span class="stat-val">{{ lastResult.stats.linesCount }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Chars:</span>
        <span class="stat-val">{{ lastResult.stats.characterCount }}</span>
      </div>

      <div class="stat-pill success-tag">
        <CheckCircle2 :size="14" />
        <span>Generated Cleanly</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-schema-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.schema-header-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
}

.target-tabs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.target-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
}

.target-tab-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.target-tab-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-color: var(--md-sys-color-primary);
  font-weight: 600;
}

.lang-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ts-dot { background-color: #3178c6; }
.go-dot { background-color: #00add8; }
.rust-dot { background-color: #dea584; }
.json-dot { background-color: #cb3837; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.options-panel {
  padding: 0.875rem 1.25rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
}

.options-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.opt-field {
  width: 260px;
}

.toggles-cluster {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  flex: 1;
}

.badge-label {
  font-size: 0.75rem;
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-highest);
  padding: 0.25rem 0.5rem;
  border-radius: var(--md-sys-shape-corner-small);
}

.segment-group {
  display: inline-flex;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-full);
  padding: 2px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  transition: all 0.15s ease;
}

.segment-btn:hover {
  background-color: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface);
}

.segment-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.editor-area {
  width: 100%;
}

.stats-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.75rem;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--md-sys-color-surface-container-high);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface-variant);
}

.stat-label {
  font-weight: 500;
}

.stat-val {
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
  font-family: var(--md-sys-typescale-code-font, monospace);
}

.uppercase {
  text-transform: uppercase;
}

.success-tag {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 600;
}
</style>
