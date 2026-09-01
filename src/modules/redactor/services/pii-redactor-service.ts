import type {
  PiiCategory,
  MaskingMode,
  PiiRule,
  PiiRedactOptions,
  PiiMatch,
  PiiRedactResult,
  PiiAnalyzeResult
} from '../types'

/**
 * Built-in default PII detection rules with accurate regex patterns
 */
export const DEFAULT_PII_RULES: PiiRule[] = [
  // 1. Email Addresses
  {
    id: 'rule-email',
    name: 'Email Addresses',
    category: 'email',
    pattern: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
    flags: 'g',
    description: 'Detects standard email addresses (RFC 5322)',
    example: 'user@company.com, admin+support@domain.co.id',
    enabled: true
  },

  // 2. Passwords & Credentials in logs, query params, JSON, or configs
  {
    id: 'rule-password',
    name: 'Passwords & Credentials',
    category: 'password',
    pattern: '(?:(?<=password|passwd|pwd|secret|client_secret|api_secret|auth_token|access_token|db_pass|private_key)[\\s:="\'`]+)([^\\s"\'`&,;}{]+)',
    flags: 'gi',
    description: 'Detects cleartext passwords and secrets assigned in logs or JSON keys',
    example: 'password=superSecret123!, "client_secret": "my-secret"',
    enabled: true
  },

  // 3. Database Connection Strings / URIs
  {
    id: 'rule-database-uri',
    name: 'Database URIs & Connstrings',
    category: 'database-uri',
    pattern: '\\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\\+srv)?|redis|rediss|couchdb|neo4j|amqp|amqps):\\/\\/[A-Za-z0-9._%+-]+:[^@\\s"\'`]+@[A-Za-z0-9.-]+(?::[0-9]+)?(?:\\/[A-Za-z0-9._%+-]*)?(?:\\?[^\\s"\'`]*)?',
    flags: 'gi',
    description: 'Detects database connection URLs with embedded user credentials',
    example: 'postgresql://admin:Pass123@10.0.1.50:5432/prod_db, mongodb+srv://usr:pwd@cluster0.net',
    enabled: true
  },

  // 4. Credit Card Numbers
  {
    id: 'rule-credit-card',
    name: 'Credit Card Numbers',
    category: 'credit-card',
    pattern: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11}|(?:4\\d{3}|5[1-5]\\d{2}|6011|7\\d{3})[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4})\\b',
    flags: 'g',
    description: 'Detects major payment cards (Visa, MasterCard, Amex, Discover, JCB)',
    example: '4532-1234-5678-9012, 378282246310005',
    enabled: true
  },

  // 5. JWT & Bearer Tokens
  {
    id: 'rule-jwt',
    name: 'JWT & Bearer Tokens',
    category: 'jwt',
    pattern: 'Bearer\\s+([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_.+/=-]+)|\\beyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_.+/=-]*\\b',
    flags: 'g',
    description: 'Detects raw JSON Web Tokens and Bearer Authorization headers',
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    enabled: true
  },

  // 6. IPv4 and IPv6 Addresses
  {
    id: 'rule-ip',
    name: 'IP Addresses (v4 & v6)',
    category: 'ip',
    pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\\/(?:[0-2]?[0-9]|3[0-2]))?\\b|\\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\\b|\\b(?:[A-Fa-f0-9]{1,4}:){1,7}:|\\b:(?::[A-Fa-f0-9]{1,4}){1,7}\\b',
    flags: 'g',
    description: 'Detects public and private IPv4/IPv6 addresses and CIDR subnets',
    example: '192.168.1.1, 10.0.0.1/24, 2001:0db8:85a3::8a2e:0370:7334',
    enabled: true
  },

  // 7. Cloud & API Keys (AWS, GitHub, Stripe, Slack, Google)
  {
    id: 'rule-api-key',
    name: 'Cloud & API Keys',
    category: 'api-key',
    pattern: '\\b(?:AKIA|ASIA|AROA)[0-9A-Z]{16}\\b|\\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\\b|\\bgithub_pat_[A-Za-z0-9_]{22}_[A-Za-z0-9_]{59}\\b|\\b(?:sk_live|rk_live|sk_test|rk_test)_[0-9a-zA-Z]{24,99}\\b|\\bxox(?:[baprs]|bot)-[0-9a-zA-Z]{10,48}(?:-[0-9a-zA-Z]{10,48})*\\b|\\bAIza[0-9A-Za-z-_]{30,45}\\b|(?:(?<=api_?key|apikey|auth_?key|secret_?key)[\\s:="\'`]+)([^\\s"\'`&,;}{]{12,})',
    flags: 'gi',
    description: 'Detects AWS keys, GitHub tokens, Stripe API keys, Slack tokens, Google Cloud keys',
    example: 'AKIAIOSFODNN7EXAMPLE, ghp_xxxx, sk_live_51Abc...',
    enabled: true
  },

  // 8. Cloud Secrets & Private Keys (AWS Secret, Azure Conn, RSA/PEM)
  {
    id: 'rule-cloud-secret',
    name: 'Cloud Secrets & Private Keys',
    category: 'cloud-secret',
    pattern: '(?:(?<=AWS_SECRET_ACCESS_KEY|aws_sec_key|SECRET_KEY|secret_key)[\\s:="\'`]+)([A-Za-z0-9/+=]{40})|\\bDefaultEndpointsProtocol=https;AccountName=[A-Za-z0-9_-]+;AccountKey=[A-Za-z0-9+/=]{60,100}\\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    flags: 'gi',
    description: 'Detects AWS Secret Keys (40 chars base64), Azure connection strings, and PEM private keys',
    example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY, DefaultEndpointsProtocol=https;...',
    enabled: true
  },

  // 9. Phone Numbers (International & Local)
  {
    id: 'rule-phone',
    name: 'Phone Numbers',
    category: 'phone',
    pattern: '\\b(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{2,4}\\)?[-.\\s]?\\d{3,4}[-.\\s]?\\d{3,9}\\b',
    flags: 'g',
    description: 'Detects international E.164 and local standard phone numbers',
    example: '+1 (555) 234-5678, +62 812-3456-7890',
    enabled: true
  },

  // 10. Social Security Numbers (SSN)
  {
    id: 'rule-ssn',
    name: 'Social Security Numbers (SSN)',
    category: 'ssn',
    pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
    flags: 'g',
    description: 'Detects US Social Security Numbers (SSN)',
    example: '123-45-6789',
    enabled: true
  },

  // 11. National ID Numbers / NIK / NPWP
  {
    id: 'rule-identity-number',
    name: 'National ID / NIK / NPWP',
    category: 'identity-number',
    pattern: '\\b(?:[1-9][0-9]{15}|[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}\\.[0-9]-[0-9]{3}\\.[0-9]{3})\\b',
    flags: 'g',
    description: 'Detects 16-digit National Identification Numbers (e.g. NIK) and formatted NPWP numbers',
    example: '3171012304950001, 01.385.234.5-012.000',
    enabled: true
  },

  // 12. MAC Addresses
  {
    id: 'rule-mac-address',
    name: 'MAC Addresses',
    category: 'mac-address',
    pattern: '\\b(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})\\b',
    flags: 'g',
    description: 'Detects standard 48-bit MAC/hardware physical addresses',
    example: '00:1A:2B:3C:4D:5E, 00-50-56-C0-00-08',
    enabled: true
  }
]

/**
 * Deterministic hash function for consistent pseudonymization
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(6, '0')
  return hex.slice(0, 6)
}

/**
 * Generate masked replacement string based on category and masking mode
 */
export function generateMask(
  val: string,
  category: PiiCategory,
  mode: MaskingMode,
  customMask?: string,
  preserveLength: boolean = false,
  ruleReplacement?: string
): string {
  // If rule has an explicit fixed replacement defined and mode is category-tag
  if (ruleReplacement && mode === 'category-tag') {
    return ruleReplacement
  }

  switch (mode) {
    case 'category-tag': {
      const tagMap: Record<PiiCategory, string> = {
        email: '[EMAIL]',
        password: '[PASSWORD]',
        'credit-card': '[CREDIT_CARD]',
        jwt: '[JWT_TOKEN]',
        ip: '[IP_ADDRESS]',
        'api-key': '[API_KEY]',
        'cloud-secret': '[CLOUD_SECRET]',
        'database-uri': '[DATABASE_URI]',
        phone: '[PHONE_NUMBER]',
        ssn: '[SSN]',
        'identity-number': '[NATIONAL_ID]',
        'mac-address': '[MAC_ADDRESS]',
        custom: '[REDACTED]'
      }
      return tagMap[category] || '[REDACTED]'
    }

    case 'fixed-mask': {
      return customMask && customMask.trim() ? customMask : '[REDACTED]'
    }

    case 'asterisks': {
      if (preserveLength) {
        return '*'.repeat(val.length)
      }
      return '***'
    }

    case 'partial': {
      // Partial masking tailored per category
      if (category === 'email') {
        const parts = val.split('@')
        if (parts.length === 2) {
          const name = parts[0]
          const domain = parts[1]
          if (name.length <= 2) {
            return `${name[0]}*@${domain}`
          }
          return `${name[0]}***${name[name.length - 1]}@${domain}`
        }
      }

      if (category === 'credit-card') {
        const clean = val.replace(/[\s-]/g, '')
        if (clean.length >= 8) {
          const last4 = clean.slice(-4)
          return `****-****-****-${last4}`
        }
      }

      if (category === 'phone') {
        const clean = val.trim()
        if (clean.length > 4) {
          const last4 = clean.slice(-4)
          return `***-***-${last4}`
        }
      }

      if (category === 'ip') {
        const parts = val.split('.')
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.*.*`
        }
      }

      if (category === 'identity-number') {
        if (val.length >= 8) {
          return `${val.slice(0, 4)}********${val.slice(-4)}`
        }
      }

      if (category === 'database-uri') {
        return val.replace(/:([^@\s]+)@/, ':***@')
      }

      if (category === 'jwt' || category === 'api-key' || category === 'cloud-secret' || category === 'password') {
        if (val.length > 8) {
          return `${val.slice(0, 4)}***${val.slice(-3)}`
        }
      }

      // Default partial fallback
      if (val.length <= 4) return '***'
      return `${val.slice(0, 2)}***${val.slice(-2)}`
    }

    case 'hash-pseudonym': {
      const hash = hashString(val)
      return `[REDACTED_#${hash}]`
    }

    default:
      return '[REDACTED]'
  }
}

/**
 * Build array of start-of-line character offsets for fast O(log N) line lookup
 */
function buildLineOffsets(text: string): number[] {
  const offsets = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      offsets.push(i + 1)
    }
  }
  return offsets
}

/**
 * Computes 1-indexed line and column for a character index using precomputed line offsets
 */
function getLineAndColumn(offsets: number[], index: number): { line: number; column: number } {
  let low = 0
  let high = offsets.length - 1
  let lineIndex = 0

  while (low <= high) {
    const mid = (low + high) >> 1
    if (offsets[mid] <= index) {
      lineIndex = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const line = lineIndex + 1
  const column = index - offsets[lineIndex] + 1
  return { line, column }
}

/**
 * Scan input text and locate all sensitive PII matches
 */
export function analyzePii(
  input: string,
  options: PiiRedactOptions = {}
): PiiAnalyzeResult {
  const startTime = performance.now()

  const emptyCategories: Record<PiiCategory, number> = {
    email: 0,
    password: 0,
    'credit-card': 0,
    jwt: 0,
    ip: 0,
    'api-key': 0,
    'cloud-secret': 0,
    'database-uri': 0,
    phone: 0,
    ssn: 0,
    'identity-number': 0,
    'mac-address': 0,
    custom: 0
  }

  if (!input) {
    return {
      totalMatches: 0,
      matchesByCategory: emptyCategories,
      matchesByRule: {},
      matches: [],
      tokenMap: {},
      executionTimeMs: 0,
      lineCount: 1
    }
  }

  const lineOffsets = buildLineOffsets(input)

  // Combine built-in rules with user custom rules
  const allRules: PiiRule[] = [
    ...DEFAULT_PII_RULES,
    ...(options.customRules || [])
  ]

  // Filter rules by enabled state and activeRuleIds filter if provided
  const enabledRules = allRules.filter((r) => {
    if (options.activeRuleIds && options.activeRuleIds.length > 0) {
      return options.activeRuleIds.includes(r.id)
    }
    return r.enabled !== false
  })

  const matches: PiiMatch[] = []
  const mode = options.maskingMode || 'category-tag'

  // Execute each regex pattern
  for (const rule of enabledRules) {
    try {
      // Ensure 'g' flag is present
      const flags = rule.flags.includes('g') ? rule.flags : `${rule.flags}g`
      const regex = new RegExp(rule.pattern, flags)
      let match: RegExpExecArray | null

      while ((match = regex.exec(input)) !== null) {
        // If the regex has capture groups (like for password/token assignments), mask the captured group
        let originalValue = match[0]
        let matchIndex = match.index

        if (match.length > 1 && match[1] !== undefined) {
          originalValue = match[1]
          // Calculate the offset of capture group 1 inside the full match
          const groupOffset = match[0].indexOf(match[1])
          if (groupOffset !== -1) {
            matchIndex += groupOffset
          }
        }

        // Avoid zero-length infinite loop
        if (originalValue.length === 0) {
          if (regex.lastIndex === match.index) {
            regex.lastIndex++
          }
          continue
        }

        const maskedValue = generateMask(
          originalValue,
          rule.category,
          mode,
          options.customMask,
          options.preserveLength,
          rule.replacement
        )

        const { line, column } = getLineAndColumn(lineOffsets, matchIndex)

        matches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          originalValue,
          maskedValue,
          index: matchIndex,
          length: originalValue.length,
          line,
          column
        })
      }
    } catch {
      // Ignore invalid custom regex execution errors gracefully
    }
  }

  // Sort matches by index ascending, then length descending to resolve overlaps
  matches.sort((a, b) => a.index - b.index || b.length - a.length)

  // Filter out overlapping matches (greedy left-to-right selection)
  const nonOverlappingMatches: PiiMatch[] = []
  let lastEnd = -1

  for (const m of matches) {
    if (m.index >= lastEnd) {
      nonOverlappingMatches.push(m)
      lastEnd = m.index + m.length
    }
  }

  // Calculate statistics breakdown & Token Map
  const matchesByCategory: Record<PiiCategory, number> = { ...emptyCategories }
  const matchesByRule: Record<string, number> = {}
  const tokenMap: Record<string, string> = {}

  for (const m of nonOverlappingMatches) {
    matchesByCategory[m.category] = (matchesByCategory[m.category] || 0) + 1
    matchesByRule[m.ruleName] = (matchesByRule[m.ruleName] || 0) + 1
    tokenMap[m.maskedValue] = m.originalValue
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100
  const lineCount = (input.match(/\n/g) || []).length + 1

  return {
    totalMatches: nonOverlappingMatches.length,
    matchesByCategory,
    matchesByRule,
    matches: nonOverlappingMatches,
    tokenMap,
    executionTimeMs,
    lineCount
  }
}

/**
 * Execute full PII redaction and sanitization on text
 */
export function redactPii(
  input: string,
  options: PiiRedactOptions = {}
): PiiRedactResult {
  const startTime = performance.now()

  const emptyCategories: Record<PiiCategory, number> = {
    email: 0,
    password: 0,
    'credit-card': 0,
    jwt: 0,
    ip: 0,
    'api-key': 0,
    'cloud-secret': 0,
    'database-uri': 0,
    phone: 0,
    ssn: 0,
    'identity-number': 0,
    'mac-address': 0,
    custom: 0
  }

  if (!input) {
    return {
      redactedText: '',
      totalMatches: 0,
      matchesByCategory: emptyCategories,
      matchesByRule: {},
      matches: [],
      tokenMap: {},
      executionTimeMs: 0,
      lineCount: 1,
      charCount: 0,
      redactedCharCount: 0
    }
  }

  const analysis = analyzePii(input, options)
  const nonOverlappingMatches = analysis.matches

  // Construct redacted text by substituting non-overlapping matched intervals
  let result = ''
  let cursor = 0

  for (const m of nonOverlappingMatches) {
    result += input.slice(cursor, m.index)
    result += m.maskedValue
    cursor = m.index + m.length
  }
  result += input.slice(cursor)

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100
  const lineCount = (input.match(/\n/g) || []).length + 1

  return {
    redactedText: result,
    totalMatches: nonOverlappingMatches.length,
    matchesByCategory: analysis.matchesByCategory,
    matchesByRule: analysis.matchesByRule,
    matches: nonOverlappingMatches,
    tokenMap: analysis.tokenMap,
    executionTimeMs,
    lineCount,
    charCount: input.length,
    redactedCharCount: result.length
  }
}
