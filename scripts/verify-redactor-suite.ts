import {
  redactPii,
  analyzePii,
  DEFAULT_PII_RULES
} from '../src/modules/redactor/services/pii-redactor-service'
import { getTaskHandler } from '../src/core/workers/task-registry'
import '../src/core/workers/task-router' // Load all task handlers
import type { PiiRule, PiiRedactResult, PiiAnalyzeResult } from '../src/modules/redactor/types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

console.log('\n🚀 Starting DevDot Phase 3.4 Suite Verification (PII Log Redactor & Sanitizer)...\n')

// ==========================================
// 1. Built-in Rule Detection Tests
// ==========================================
console.log('--- 1. Testing Built-In PII Detection Rules ---')

// 1.1 Email Redaction
const emailSample = 'Contact dev team at support@devdot.io and admin.master+ops@internal-corp.co.uk for issues.'
const emailResult = redactPii(emailSample, { maskingMode: 'category-tag' })
assert(emailResult.totalMatches === 2, 'Email: Exactly 2 emails detected')
assert(emailResult.matchesByCategory.email === 2, 'Email: Category count is 2')
assert(emailResult.redactedText.includes('[EMAIL]'), 'Email: Replaced with [EMAIL] tag')
assert(!emailResult.redactedText.includes('support@devdot.io'), 'Email: Original email 1 scrubbed')
assert(!emailResult.redactedText.includes('admin.master+ops@internal-corp.co.uk'), 'Email: Original email 2 scrubbed')

// 1.2 Password & Secret Key Assignments
const passSample = 'Logging error: password=MySecretP@ssw0rd! and client_secret: "super-secret-token-xyz"'
const passResult = redactPii(passSample, { maskingMode: 'category-tag' })
assert(passResult.totalMatches === 2, 'Password: Detected 2 credentials assignments')
assert(passResult.matchesByCategory.password === 2, 'Password: Category count is 2')
assert(!passResult.redactedText.includes('MySecretP@ssw0rd!'), 'Password: Password value scrubbed')
assert(!passResult.redactedText.includes('super-secret-token-xyz'), 'Password: Secret value scrubbed')

// 1.3 Credit Card Numbers
const ccSample = 'Cards: Visa 4532-1234-5678-9012, Amex 378282246310005, Master 5105105105105100'
const ccResult = redactPii(ccSample, { maskingMode: 'category-tag' })
assert(ccResult.totalMatches === 3, 'Credit Card: Detected 3 major credit cards')
assert(ccResult.matchesByCategory['credit-card'] === 3, 'Credit Card: Category count is 3')
assert(!ccResult.redactedText.includes('4532-1234-5678-9012'), 'Credit Card: Visa scrubbed')
assert(!ccResult.redactedText.includes('378282246310005'), 'Credit Card: Amex scrubbed')

// 1.4 JWT and Bearer Tokens
const jwtSample = 'Auth Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.wE_45nL_89kM'
const jwtResult = redactPii(jwtSample, { maskingMode: 'category-tag' })
assert(jwtResult.totalMatches >= 1, 'JWT: Detected Bearer JWT Token')
assert(jwtResult.matchesByCategory.jwt >= 1, 'JWT: Category count is at least 1')
assert(!jwtResult.redactedText.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT: Token header scrubbed')

// 1.5 IP Addresses (IPv4 and IPv6)
const ipSample = 'Traffic from IPv4 192.168.1.1, subnet 10.0.0.0/24, and IPv6 2001:0db8:85a3:0000:0000:8a2e:0370:7334'
const ipResult = redactPii(ipSample, { maskingMode: 'category-tag' })
assert(ipResult.totalMatches === 3, 'IP: Detected 3 IP addresses (IPv4, CIDR, IPv6)')
assert(ipResult.matchesByCategory.ip === 3, 'IP: Category count is 3')
assert(!ipResult.redactedText.includes('192.168.1.1'), 'IP: IPv4 scrubbed')
assert(!ipResult.redactedText.includes('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), 'IP: IPv6 scrubbed')

// 1.6 Cloud & API Keys (AWS, GitHub, Stripe, Slack, Google)
const keysSample = `
AWS: AKIAIOSFODNN7EXAMPLE
GitHub: ghp_918237498172938471928374918237498172
Stripe: sk_live_51MszJ8Kl48v92NlQ9837192837491209384
Slack: xoxb-123456789012-1234567890123-456789abcdefghijklmnopqrstuvwxyz
Google: AIzaSyD-98127398127398127398127398123
`
const keysResult = redactPii(keysSample, { maskingMode: 'category-tag' })
assert(keysResult.totalMatches === 5, 'API Keys: Detected 5 cloud provider API keys')
assert(keysResult.matchesByCategory['api-key'] === 5, 'API Keys: Category count is 5')
assert(!keysResult.redactedText.includes('AKIAIOSFODNN7EXAMPLE'), 'API Keys: AWS key scrubbed')
assert(!keysResult.redactedText.includes('ghp_918237498172938471928374918237498172'), 'API Keys: GitHub token scrubbed')
assert(!keysResult.redactedText.includes('sk_live_51MszJ8Kl48v92NlQ9837192837491209384'), 'API Keys: Stripe key scrubbed')

// 1.7 Phone Numbers, SSN & MAC Address
const identitySample = 'Phone: +1 (555) 234-5678, SSN: 123-45-6789, Device: 00:1A:2B:3C:4D:5E'
const identityResult = redactPii(identitySample, { maskingMode: 'category-tag' })
assert(identityResult.matchesByCategory.phone >= 1, 'Phone: Phone number detected')
assert(identityResult.matchesByCategory.ssn === 1, 'SSN: SSN detected')
assert(identityResult.matchesByCategory['mac-address'] === 1, 'MAC: MAC Address detected')
assert(!identityResult.redactedText.includes('123-45-6789'), 'SSN: Value scrubbed')
assert(!identityResult.redactedText.includes('00:1A:2B:3C:4D:5E'), 'MAC: Value scrubbed')

// ==========================================
// 2. Masking Transformations Tests
// ==========================================
console.log('\n--- 2. Testing Masking Modes & Transformations ---')

const testInput = 'User alice@test.com with card 4532-1234-5678-9012 from IP 192.168.1.50'

// 2.1 Category Tag Mode
const catRes = redactPii(testInput, { maskingMode: 'category-tag' })
assert(catRes.redactedText.includes('[EMAIL]') && catRes.redactedText.includes('[CREDIT_CARD]') && catRes.redactedText.includes('[IP_ADDRESS]'), 'Mode category-tag: Contains descriptive tags')

// 2.2 Fixed Mask Mode
const fixedRes = redactPii(testInput, { maskingMode: 'fixed-mask', customMask: '***CONFIDENTIAL***' })
assert(fixedRes.redactedText.includes('***CONFIDENTIAL***'), 'Mode fixed-mask: Custom string replacement applied')
assert(!fixedRes.redactedText.includes('alice@test.com'), 'Mode fixed-mask: Original text absent')

// 2.3 Asterisks Mode (Fixed vs Length Preserving)
const astFixedRes = redactPii(testInput, { maskingMode: 'asterisks', preserveLength: false })
assert(astFixedRes.redactedText.includes('***'), 'Mode asterisks fixed: Contains ***')

const astLengthRes = redactPii(testInput, { maskingMode: 'asterisks', preserveLength: true })
assert(astLengthRes.redactedText.includes('*'.repeat('alice@test.com'.length)), 'Mode asterisks preserve-length: Exact character length matched')

// 2.4 Partial Masking Mode
const partialRes = redactPii(testInput, { maskingMode: 'partial' })
assert(partialRes.redactedText.includes('a***e@test.com'), 'Mode partial: Email retains initial and domain hints')
assert(partialRes.redactedText.includes('****-****-****-9012'), 'Mode partial: Card retains last 4 digits')
assert(partialRes.redactedText.includes('192.168.*.*'), 'Mode partial: IP retains subnet prefix')

// 2.5 Deterministic Hash Pseudonymization
const hashInput = 'User bob@example.com logged in. Session for bob@example.com expired.'
const hashRes = redactPii(hashInput, { maskingMode: 'hash-pseudonym' })
const matches = hashRes.redactedText.match(/\[REDACTED_#[a-f0-9]{6}\]/g)
assert(matches !== null && matches.length === 2, 'Mode hash-pseudonym: Found 2 hashed tokens')
assert(matches![0] === matches![1], 'Mode hash-pseudonym: Same secret string produces identical hash token for correlation')

// ==========================================
// 3. Custom Regex Rules Tests
// ==========================================
console.log('\n--- 3. Testing Custom Regex Rules ---')

const customRules: PiiRule[] = [
  {
    id: 'rule-emp-id',
    name: 'Employee ID',
    category: 'custom',
    pattern: 'EMP-[0-9]{5}',
    flags: 'g',
    replacement: '[EMP_ID]',
    enabled: true,
    description: 'Corporate employee badge'
  },
  {
    id: 'rule-order-no',
    name: 'Order Number',
    category: 'custom',
    pattern: 'ORD-[A-Z]{3}-[0-9]{4}',
    flags: 'g',
    replacement: '[ORDER_REF]',
    enabled: true,
    description: 'E-commerce order code'
  }
]

const customInput = 'Employee EMP-89214 processed order ORD-XYZ-4019 on server 10.0.0.5'
const customRes = redactPii(customInput, {
  maskingMode: 'category-tag',
  customRules
})
assert(customRes.totalMatches === 3, 'Custom Rules: Found 2 custom matches + 1 IP match')
assert(customRes.redactedText.includes('[EMP_ID]'), 'Custom Rules: Employee ID custom mask applied')
assert(customRes.redactedText.includes('[ORDER_REF]'), 'Custom Rules: Order Number custom mask applied')
assert(!customRes.redactedText.includes('EMP-89214'), 'Custom Rules: Original EMP ID scrubbed')

// ==========================================
// 4. Web Worker Handler Integration Tests
// ==========================================
console.log('\n--- 4. Testing Web Worker Task Handlers ---')

const redactHandler = getTaskHandler('redactor', 'redact')
assert(typeof redactHandler === 'function', 'Worker Handler: redactor:redact is registered')

const analyzeHandler = getTaskHandler('redactor', 'analyze')
assert(typeof analyzeHandler === 'function', 'Worker Handler: redactor:analyze is registered')

async function testWorkerExecution() {
  const handler = getTaskHandler('redactor', 'redact')!
  const res: PiiRedactResult = await handler({
    input: 'Critical token: ghp_918237498172938471928374918237498172 for user admin@devdot.io',
    options: { maskingMode: 'category-tag' }
  })
  assert(res.totalMatches === 2, 'Worker Execution: Redact returns 2 matches')
  assert(res.matchesByCategory['api-key'] === 1, 'Worker Execution: Category breakdown valid')
  assert(typeof res.executionTimeMs === 'number', 'Worker Execution: Execution time measured')

  const analyzeH = getTaskHandler('redactor', 'analyze')!
  const analyzeRes: PiiAnalyzeResult = await analyzeH({
    input: 'Critical token: ghp_918237498172938471928374918237498172 for user admin@devdot.io',
    options: {}
  })
  assert(analyzeRes.totalMatches === 2, 'Worker Analyze: Returns match statistics without modifying text')
}

// ==========================================
// 5. Large Scale Log Benchmark Test
// ==========================================
console.log('\n--- 5. Testing Large Log Benchmark (5,000 Lines) ---')

let largeLog = ''
for (let i = 1; i <= 5000; i++) {
  largeLog += `2026-08-27T10:00:${(i % 60).toString().padStart(2, '0')}.000Z [INFO] User usr_${i}@example.com requested /api/data from IP 192.168.${i % 255}.${(i * 3) % 255} with auth_token=token_${i}_secret\n`
}

const benchStart = performance.now()
const benchRes = redactPii(largeLog, { maskingMode: 'category-tag' })
const benchDuration = performance.now() - benchStart

assert(benchRes.lineCount === 5001, `Large Benchmark: Processed ${benchRes.lineCount} lines`)
assert(benchRes.totalMatches >= 15000, `Large Benchmark: Found ${benchRes.totalMatches} PII items`)
assert(benchDuration < 2000, `Large Benchmark: Completed 5,000 lines in ${Math.round(benchDuration)}ms (< 2000ms threshold)`)

testWorkerExecution().then(() => {
  console.log('\n🎉 ALL PII Log Redactor & Sanitizer (Phase 3.4) tests PASSED successfully!\n')
}).catch((err) => {
  console.error('Worker test failed:', err)
  process.exit(1)
})
