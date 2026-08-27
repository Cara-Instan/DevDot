export type DataFormat = 'json' | 'yaml' | 'toml' | 'csv'

export interface TranspileOptions {
  // JSON options
  jsonIndent?: 2 | 4 | 'tab' | 0
  // YAML options
  yamlIndent?: 2 | 4
  yamlSortKeys?: boolean
  // CSV options
  csvDelimiter?: ',' | ';' | '\t' | '|'
  csvHeader?: boolean
  csvDynamicTyping?: boolean
  csvQuotes?: boolean
  // Conversion options
  flattenNested?: boolean
}

export interface TranspileResult {
  output: string
  sourceFormat: DataFormat
  targetFormat: DataFormat
  itemCount?: number
  executionTimeMs?: number
  warnings?: string[]
}

export type CurlTargetLanguage = 'fetch' | 'axios' | 'python' | 'go'

export interface ParsedCurlHeader {
  name: string
  value: string
}

export interface ParsedCurlQueryParam {
  name: string
  value: string
}

export interface ParsedCurlRequest {
  rawCommand: string
  method: string
  url: string
  baseUrl: string
  path: string
  queryParams: ParsedCurlQueryParam[]
  headers: Record<string, string>
  cookies: Record<string, string>
  auth?: {
    type: 'basic' | 'bearer' | 'custom'
    username?: string
    password?: string
    token?: string
  }
  data?: string
  dataJson?: any
  isJsonBody: boolean
  isFormUrlEncoded: boolean
  compressed?: boolean
  insecure?: boolean
  followRedirects?: boolean
  warnings?: string[]
}

export interface CurlConvertOptions {
  targetLanguage: CurlTargetLanguage
  includeComments?: boolean
  useAsyncAwait?: boolean // For JS/TS
  includeErrorHandling?: boolean
  timeoutMs?: number
  indent?: 2 | 4 | 'tab'
}

export interface CurlConvertResult {
  code: string
  targetLanguage: CurlTargetLanguage
  parsed: ParsedCurlRequest
  executionTimeMs?: number
}
