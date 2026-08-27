export type IndentType = '2-spaces' | '4-spaces' | 'tab' | 'custom'

export type SortKeysOrder = 'none' | 'asc' | 'desc'

export interface JsonFormatOptions {
  indentType?: IndentType
  customIndentSize?: number
  minify?: boolean
  sortKeys?: SortKeysOrder
  autoRepair?: boolean
}

export interface JsonStats {
  originalSizeBytes: number
  formattedSizeBytes: number
  byteSavingsBytes: number
  byteSavingsPercent: number
  linesCount: number
  keysCount: number
  arraysCount: number
  objectsCount: number
  maxDepth: number
  dataType: 'object' | 'array' | 'primitive'
}

export interface JsonFormatResult {
  formatted: string
  repaired: boolean
  repairs: string[]
  stats: JsonStats
  isValid: boolean
  error?: string
  errorLocation?: {
    line: number
    column: number
  }
}

export interface JsonRepairResult {
  repairedText: string
  wasRepaired: boolean
  repairs: string[]
  parsedData: any
}

// Type Generator Types
export type TargetLanguage = 'typescript' | 'go' | 'rust' | 'java' | 'python' | 'csharp' | 'json-schema'

export interface TypeScriptOptions {
  rootName: string
  useInterface: boolean // true: interface, false: type
  exportTypes: boolean
  optionalFields: boolean
  readonlyProperties: boolean
  allOptional: boolean
}

export interface GoOptions {
  rootName: string
  includeJsonTags: boolean
  includeYamlTags: boolean
  includeXmlTags: boolean
  omitempty: boolean
  usePointersForNullable: boolean
}

export interface RustOptions {
  rootName: string
  deriveMacros: string[]
  useOptionForNullable: boolean
  renameAll: 'none' | 'camelCase' | 'snake_case'
}

export interface JavaOptions {
  rootName: string
  style: 'record' | 'class' | 'lombok'
  useJacksonAnnotations: boolean
  packageName?: string
}

export interface PythonOptions {
  rootName: string
  style: 'pydantic' | 'dataclass' | 'typeddict'
  useSnakeCase: boolean
}

export interface CSharpOptions {
  rootName: string
  useSystemTextJson: boolean
  useRecords: boolean
  namespace?: string
}

export interface JsonSchemaOptions {
  schemaDraft: 'draft-07' | '2020-12'
  title: string
  includeRequired: boolean
  includeExamples: boolean
}

export interface TypeGeneratorPayload {
  input: string
  target: TargetLanguage
  tsOptions?: Partial<TypeScriptOptions>
  goOptions?: Partial<GoOptions>
  rustOptions?: Partial<RustOptions>
  javaOptions?: Partial<JavaOptions>
  pythonOptions?: Partial<PythonOptions>
  csharpOptions?: Partial<CSharpOptions>
  schemaOptions?: Partial<JsonSchemaOptions>
}

export interface TypeGeneratorResult {
  code: string
  targetLanguage: TargetLanguage
  rootName: string
  stats: {
    typesGenerated: number
    linesCount: number
    characterCount: number
  }
}

// JSON Visual Diff Types
export type DiffViewMode = 'side-by-side' | 'unified'
export type DiffChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface InlineDiffChunk {
  type: 'added' | 'removed' | 'unchanged'
  text: string
}

export interface DiffLine {
  id: string
  type: DiffChangeType
  leftLineNumber?: number
  rightLineNumber?: number
  leftContent?: string
  rightContent?: string
  unifiedLineNumber?: number
  content: string
  path?: string
  inlineDiffs?: InlineDiffChunk[]
  isCollapsedPlaceholder?: boolean
  collapsedCount?: number
}

export type StructuralChangeType = 'added' | 'removed' | 'modified' | 'type_changed'

export interface StructuralDiffItem {
  id: string
  path: string
  type: StructuralChangeType
  oldValue?: any
  newValue?: any
  oldType?: string
  newType?: string
  message: string
}

export interface JsonDiffOptions {
  ignoreWhitespace?: boolean
  sortKeys?: boolean
  autoFormat?: boolean
  collapseUnchanged?: boolean
  contextLines?: number
  indentSize?: number
}

export interface JsonDiffStats {
  additions: number
  deletions: number
  modifications: number
  unchanged: number
  totalDifferences: number
  similarityPercentage: number
  leftLinesCount: number
  rightLinesCount: number
}

export interface DiffMarker {
  index: number
  lineIndex: number
  type: DiffChangeType
  percentage: number
  label: string
}

export interface JsonDiffResult {
  areEqual: boolean
  stats: JsonDiffStats
  leftFormatted: string
  rightFormatted: string
  leftLines: DiffLine[]
  rightLines: DiffLine[]
  unifiedLines: DiffLine[]
  structuralDiff: StructuralDiffItem[]
  markers: DiffMarker[]
  leftValid: boolean
  rightValid: boolean
  error?: string
  leftError?: string
  rightError?: string
}

