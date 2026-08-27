<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Sparkles,
  RotateCcw,
  CheckCircle2
} from 'lucide-vue-next'
import {
  SplitEditor
} from '@/components'
import { useSnapshotStore } from '@/stores'
import { generateTypesFromJson } from '../services/type-generators'
import type {
  TargetLanguage,
  TypeScriptOptions,
  GoOptions,
  RustOptions,
  JavaOptions,
  PythonOptions,
  CSharpOptions,
  JsonSchemaOptions,
  TypeGeneratorPayload,
  TypeGeneratorResult
} from '../types'

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
  javaOptions: {
    rootName: 'DevDotConfig',
    style: 'record' as const,
    useJacksonAnnotations: true
  },
  pythonOptions: {
    rootName: 'DevDotConfig',
    style: 'pydantic' as const,
    useSnakeCase: true
  },
  csharpOptions: {
    rootName: 'DevDotConfig',
    useSystemTextJson: true,
    useRecords: false
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
const selectedTarget = ref<TargetLanguage>(initialSaved.selectedTarget || 'typescript')
const lastResult = ref<TypeGeneratorResult | null>(null)
const genError = ref<string | null>(null)
const executionTimeMs = ref<number | null>(null)

// Target Options
const tsOptions = ref<TypeScriptOptions>(initialSaved.tsOptions || {
  rootName: 'DevDotConfig',
  useInterface: true,
  exportTypes: true,
  optionalFields: false,
  readonlyProperties: false,
  allOptional: false
})
const goOptions = ref<GoOptions>(initialSaved.goOptions || {
  rootName: 'DevDotConfig',
  includeJsonTags: true,
  includeYamlTags: true,
  includeXmlTags: false,
  omitempty: false,
  usePointersForNullable: true
})
const rustOptions = ref<RustOptions>(initialSaved.rustOptions || {
  rootName: 'DevDotConfig',
  deriveMacros: ['Default', 'Debug', 'Clone', 'PartialEq', 'Serialize', 'Deserialize'],
  useOptionForNullable: true,
  renameAll: 'none' as const
})
const javaOptions = ref<JavaOptions>(initialSaved.javaOptions || {
  rootName: 'DevDotConfig',
  style: 'record',
  useJacksonAnnotations: true
})
const pythonOptions = ref<PythonOptions>(initialSaved.pythonOptions || {
  rootName: 'DevDotConfig',
  style: 'pydantic',
  useSnakeCase: true
})
const csharpOptions = ref<CSharpOptions>(initialSaved.csharpOptions || {
  rootName: 'DevDotConfig',
  useSystemTextJson: true,
  useRecords: false
})
const schemaOptions = ref<JsonSchemaOptions>(initialSaved.schemaOptions || {
  schemaDraft: 'draft-07',
  title: 'DevDotConfigSchema',
  includeRequired: true,
  includeExamples: true
})

let isHydrating = false

// Sync changes to snapshot store
watch(
  [inputJson, outputCode, selectedTarget, tsOptions, goOptions, rustOptions, javaOptions, pythonOptions, csharpOptions, schemaOptions],
  () => {
    if (isHydrating) return
    snapshotStore.setToolState('json-schema', {
      inputJson: inputJson.value,
      outputCode: outputCode.value,
      selectedTarget: selectedTarget.value,
      tsOptions: { ...tsOptions.value },
      goOptions: { ...goOptions.value },
      rustOptions: { ...rustOptions.value },
      javaOptions: { ...javaOptions.value },
      pythonOptions: { ...pythonOptions.value },
      csharpOptions: { ...csharpOptions.value },
      schemaOptions: { ...schemaOptions.value }
    })
  },
  { deep: true }
)

// Hydrate from snapshot store on external change
watch(
  () => snapshotStore.toolStates['json-schema'],
  (newState) => {
    if (newState && !isHydrating) {
      isHydrating = true
      if (newState.inputJson !== undefined && newState.inputJson !== inputJson.value) {
        inputJson.value = newState.inputJson
      }
      if (newState.outputCode !== undefined && newState.outputCode !== outputCode.value) {
        outputCode.value = newState.outputCode
      }
      if (newState.selectedTarget !== undefined && newState.selectedTarget !== selectedTarget.value) {
        selectedTarget.value = newState.selectedTarget
      }
      if (newState.tsOptions) tsOptions.value = { ...newState.tsOptions }
      if (newState.goOptions) goOptions.value = { ...newState.goOptions }
      if (newState.rustOptions) rustOptions.value = { ...newState.rustOptions }
      if (newState.javaOptions) javaOptions.value = { ...newState.javaOptions }
      if (newState.pythonOptions) pythonOptions.value = { ...newState.pythonOptions }
      if (newState.csharpOptions) csharpOptions.value = { ...newState.csharpOptions }
      if (newState.schemaOptions) schemaOptions.value = { ...newState.schemaOptions }
      isHydrating = false
    }
  },
  { deep: true }
)

const outputLanguage = computed(() => {
  switch (selectedTarget.value) {
    case 'typescript':
      return 'typescript'
    case 'go':
      return 'go'
    case 'rust':
      return 'rust'
    case 'java':
      return 'java'
    case 'python':
      return 'python'
    case 'csharp':
      return 'csharp'
    case 'json-schema':
      return 'json'
    default:
      return 'text'
  }
})

function handleGenerate() {
  genError.value = null

  if (!inputJson.value.trim()) {
    outputCode.value = ''
    lastResult.value = null
    executionTimeMs.value = null
    return
  }

  const startTime = performance.now()
  const payload: TypeGeneratorPayload = {
    input: inputJson.value,
    target: selectedTarget.value,
    tsOptions: { ...tsOptions.value },
    goOptions: { ...goOptions.value },
    rustOptions: {
      ...rustOptions.value,
      deriveMacros: [...rustOptions.value.deriveMacros]
    },
    javaOptions: { ...javaOptions.value },
    pythonOptions: { ...pythonOptions.value },
    csharpOptions: { ...csharpOptions.value },
    schemaOptions: { ...schemaOptions.value }
  }

  try {
    const res = generateTypesFromJson(payload)
    lastResult.value = res
    outputCode.value = res.code
    executionTimeMs.value = Math.round((performance.now() - startTime) * 100) / 100
  } catch (err: any) {
    genError.value = err.message || 'Generation error'
  }
}

function selectTarget(target: TargetLanguage) {
  selectedTarget.value = target
  handleGenerate()
}

watch(inputJson, () => {
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
    <!-- Compact 1-Line Header Toolbar -->
    <div class="schema-header-toolbar">
      <div class="toolbar-left">
        <div class="target-tabs">
          <button
            type="button"
            class="target-tab-btn"
            :class="{ active: selectedTarget === 'typescript' }"
            @click="selectTarget('typescript')"
          >
            <span class="lang-dot ts-dot"></span>
            TypeScript
          </button>

          <button
            type="button"
            class="target-tab-btn"
            :class="{ active: selectedTarget === 'go' }"
            @click="selectTarget('go')"
          >
            <span class="lang-dot go-dot"></span>
            Go Struct
          </button>

          <button
            type="button"
            class="target-tab-btn"
            :class="{ active: selectedTarget === 'rust' }"
            @click="selectTarget('rust')"
          >
            <span class="lang-dot rust-dot"></span>
            Rust Serde
          </button>

          <button
            type="button"
            class="target-tab-btn"
            :class="{ active: selectedTarget === 'java' }"
            @click="selectTarget('java')"
          >
            <span class="lang-dot java-dot"></span>
            Java Record/POJO
          </button>

          <button
            type="button"
            class="target-tab-btn"
            :class="{ active: selectedTarget === 'python' }"
            @click="selectTarget('python')"
          >
            <span class="lang-dot python-dot"></span>
            Python Pydantic
          </button>

          <button
            type="button"
            class="target-tab-btn"
            :class="{ active: selectedTarget === 'csharp' }"
            @click="selectTarget('csharp')"
          >
            <span class="lang-dot csharp-dot"></span>
            C# Class
          </button>

          <button
            type="button"
            class="target-tab-btn"
            :class="{ active: selectedTarget === 'json-schema' }"
            @click="selectTarget('json-schema')"
          >
            <span class="lang-dot json-dot"></span>
            JSON Schema
          </button>
        </div>

        <!-- Quick Inline Target Config -->
        <div class="quick-config-inline">
          <input
            v-if="selectedTarget === 'typescript'"
            v-model="tsOptions.rootName"
            type="text"
            class="compact-input"
            placeholder="Type Name"
            title="Root Interface / Type Name"
            @input="handleGenerate"
          />
          <input
            v-else-if="selectedTarget === 'go'"
            v-model="goOptions.rootName"
            type="text"
            class="compact-input"
            placeholder="Struct Name"
            title="Root Struct Name"
            @input="handleGenerate"
          />
          <input
            v-else-if="selectedTarget === 'rust'"
            v-model="rustOptions.rootName"
            type="text"
            class="compact-input"
            placeholder="Struct Name"
            title="Root Struct Name"
            @input="handleGenerate"
          />
          <input
            v-else-if="selectedTarget === 'java'"
            v-model="javaOptions.rootName"
            type="text"
            class="compact-input"
            placeholder="Class / Record Name"
            title="Root Java Class / Record Name"
            @input="handleGenerate"
          />
          <input
            v-else-if="selectedTarget === 'python'"
            v-model="pythonOptions.rootName"
            type="text"
            class="compact-input"
            placeholder="Model Name"
            title="Root Pydantic Model Name"
            @input="handleGenerate"
          />
          <input
            v-else-if="selectedTarget === 'csharp'"
            v-model="csharpOptions.rootName"
            type="text"
            class="compact-input"
            placeholder="Class Name"
            title="Root C# Class Name"
            @input="handleGenerate"
          />
          <input
            v-else-if="selectedTarget === 'json-schema'"
            v-model="schemaOptions.title"
            type="text"
            class="compact-input"
            placeholder="Schema Title"
            title="Schema Title"
            @input="handleGenerate"
          />
        </div>
      </div>

      <div class="toolbar-right">
        <span v-if="executionTimeMs !== null" class="exec-badge">
          {{ executionTimeMs }} ms
        </span>

        <button
          type="button"
          class="compact-action-btn primary-btn"
          :disabled="!inputJson.trim()"
          @click="handleGenerate"
        >
          <Sparkles :size="14" />
          <span>Generate</span>
        </button>

        <button
          type="button"
          class="compact-action-btn text-btn"
          @click="handleLoadSample"
        >
          Sample
        </button>

        <button
          type="button"
          class="compact-action-btn text-btn"
          title="Clear"
          @click="handleClear"
        >
          <RotateCcw :size="13" />
          <span>Clear</span>
        </button>
      </div>
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
        :is-executing="false"
        :error="genError"
        :execution-time-ms="executionTimeMs"
        :show-execute-button="false"
        height="100%"
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
        <span class="stat-label">Root:</span>
        <span class="stat-val">{{ lastResult.rootName }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Types:</span>
        <span class="stat-val">{{ lastResult.stats.typesGenerated }}</span>
      </div>

      <div class="stat-pill">
        <span class="stat-label">Lines:</span>
        <span class="stat-val">{{ lastResult.stats.linesCount }}</span>
      </div>

      <div class="stat-pill success-tag">
        <CheckCircle2 :size="13" />
        <span>Generated Cleanly</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-schema-container {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
}

.schema-header-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  min-height: 36px;
  background-color: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
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

.target-tabs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.target-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full);
  border: 1px solid var(--md-sys-color-outline-variant);
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
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
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.ts-dot { background-color: #3178c6; }
.go-dot { background-color: #00add8; }
.rust-dot { background-color: #dea584; }
.java-dot { background-color: #e76f00; }
.python-dot { background-color: #3572a5; }
.csharp-dot { background-color: #178600; }
.json-dot { background-color: #cb3837; }

.quick-config-inline {
  display: flex;
  align-items: center;
  padding-left: 0.35rem;
  border-left: 1px solid var(--md-sys-color-outline-variant);
}

.compact-input {
  height: 24px;
  width: 140px;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  background-color: var(--md-sys-color-surface-container-high);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  color: var(--md-sys-color-on-surface);
  outline: none;
}

.compact-input:focus {
  border-color: var(--md-sys-color-primary);
}

.compact-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--md-sys-shape-corner-full);
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.primary-btn {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-weight: 600;
}

.primary-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.text-btn {
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);
}

.text-btn:hover:not(:disabled) {
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
}

.compact-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exec-badge {
  font-size: 0.6875rem;
  font-family: var(--md-sys-typescale-code-font, monospace);
  color: var(--md-sys-color-on-surface-variant);
  background-color: var(--md-sys-color-surface-container-high);
  padding: 0.15rem 0.45rem;
  border-radius: var(--md-sys-shape-corner-small);
}

.editor-area {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.stats-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background-color: var(--md-sys-color-surface-container-low);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  font-size: 0.6875rem;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.4rem;
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
