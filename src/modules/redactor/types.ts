export type PiiCategory =
  | 'email'
  | 'password'
  | 'credit-card'
  | 'jwt'
  | 'ip'
  | 'api-key'
  | 'phone'
  | 'ssn'
  | 'mac-address'
  | 'custom'

export type MaskingMode =
  | 'category-tag'    // [EMAIL], [CREDIT_CARD], [PASSWORD], etc.
  | 'fixed-mask'       // [REDACTED] or custom replacement string
  | 'asterisks'        // * matching length or fixed ***
  | 'partial'          // j***e@domain.com, 4111-****-1234
  | 'hash-pseudonym'   // Deterministic hash pseudonym: [REDACTED_#3f8a]

export interface PiiRule {
  id: string
  name: string
  category: PiiCategory
  pattern: string
  flags: string
  replacement?: string
  enabled: boolean
  isCustom?: boolean
  description: string
  example?: string
}

export interface PartialMaskOptions {
  visibleStartChars?: number
  visibleEndChars?: number
}

export interface PiiRedactOptions {
  maskingMode?: MaskingMode
  customMask?: string
  preserveLength?: boolean
  activeRuleIds?: string[]
  customRules?: PiiRule[]
  partialMaskOptions?: PartialMaskOptions
}

export interface PiiMatch {
  ruleId: string
  ruleName: string
  category: PiiCategory
  originalValue: string
  maskedValue: string
  index: number
  length: number
  line: number
  column: number
}

export interface PiiRedactResult {
  redactedText: string
  totalMatches: number
  matchesByCategory: Record<PiiCategory, number>
  matchesByRule: Record<string, number>
  matches: PiiMatch[]
  executionTimeMs: number
  lineCount: number
  charCount: number
  redactedCharCount: number
}

export interface PiiAnalyzeResult {
  totalMatches: number
  matchesByCategory: Record<PiiCategory, number>
  matchesByRule: Record<string, number>
  matches: PiiMatch[]
  executionTimeMs: number
  lineCount: number
}
