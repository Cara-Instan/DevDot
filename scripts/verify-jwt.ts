import {
  base64UrlEncode,
  base64UrlDecode,
  decodeJwt,
  verifyJwtSignature,
  signJwt,
  computeClaimTimeInfo,
  formatRelativeTime
} from '../src/modules/crypto/services/jwt-service'
import { dispatchTask } from '../src/core/workers/task-router'
import '../src/modules/crypto/handlers/crypto-handlers'

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${testName}`)
    failed++
  }
}

async function runTests() {
  console.log('=== RUNNING DEVTOOLS-DOT SUB-PHASE 3.2: OFFLINE JWT DEBUGGER VERIFICATION ===\n')

  // 1. Base64URL Unicode Tests
  console.log('1. Testing Base64URL Encoding & UTF-8 Decoding...')
  const sampleString = 'Hello DevDot! 🚀 Über-Token 漢字 & Symbols @#$%'
  const encodedUrl = base64UrlEncode(sampleString)
  const decodedUrl = base64UrlDecode(encodedUrl)
  assert(!encodedUrl.includes('+') && !encodedUrl.includes('/') && !encodedUrl.includes('='), 'Base64URL has no +, /, or = characters')
  assert(decodedUrl === sampleString, 'Base64URL round-trip preserved UTF-8 Unicode characters')

  // 2. Token Creation & Signing (HS256)
  console.log('\n2. Testing JWT Signing (HMAC-SHA256)...')
  const secret = 'devdot-super-secret-key-2026'
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: 'user_12345',
    name: 'Ando Lead Dev',
    roles: ['admin', 'architect'],
    iat: now - 600, // 10 minutes ago
    exp: now + 3600, // in 1 hour
    iss: 'devtoys-dot.local'
  }

  const generatedToken = await signJwt({
    header,
    payload,
    secret,
    algorithm: 'HS256'
  })

  assert(typeof generatedToken === 'string' && generatedToken.split('.').length === 3, 'Generated 3-part valid JWT structure')

  // 3. Decoding Header, Payload, Claims
  console.log('\n3. Testing JWT Decoding & Claims Inspection...')
  const decodedResult = decodeJwt(generatedToken)
  assert(decodedResult.isValidStructure === true, 'Token parsed as valid structure')
  assert(decodedResult.header.alg === 'HS256', 'Header algorithm correctly decoded as HS256')
  assert(decodedResult.payload.sub === 'user_12345', 'Payload subject correctly decoded')
  assert(decodedResult.payload.name === 'Ando Lead Dev', 'Payload name correctly decoded')
  assert(decodedResult.timeStatus === 'active', 'Time status evaluated as active')
  assert(decodedResult.expiresAt !== undefined && decodedResult.expiresAt.isPast === false, 'Expiry claim is active and not in the past')
  assert(decodedResult.issuedAt !== undefined && decodedResult.issuedAt.isPast === true, 'IssuedAt claim is properly marked in the past')

  // 4. Timing Calculations & Countdown formatting
  console.log('\n4. Testing Timing Calculations & Formatting...')
  const relFuture = formatRelativeTime(3600) // in 1 hour
  const relPast = formatRelativeTime(-3600 * 24) // 1 day ago
  assert(relFuture.includes('in 1h'), `formatRelativeTime future format matches ('${relFuture}')`)
  assert(relPast.includes('1d') && relPast.includes('ago'), `formatRelativeTime past format matches ('${relPast}')`)

  // Expired token test
  const expiredPayload = {
    sub: 'user_expired',
    exp: now - 7200 // 2 hours ago
  }
  const expiredToken = await signJwt({
    header,
    payload: expiredPayload,
    secret
  })
  const decodedExpired = decodeJwt(expiredToken)
  assert(decodedExpired.timeStatus === 'expired', 'Expired token correctly flagged as timeStatus: expired')
  assert(decodedExpired.expiresAt?.isPast === true, 'expiresAt.isPast is true for expired token')

  // 5. Offline Signature Verification (Valid & Invalid cases)
  console.log('\n5. Testing Offline Signature Verification...')
  const validVerification = await verifyJwtSignature(generatedToken, { secret })
  assert(validVerification.isValid === true, 'Signature verified with correct secret (valid = true)')
  assert(validVerification.message.includes('verified successfully'), 'Verification success message returned')

  const wrongSecretVerification = await verifyJwtSignature(generatedToken, { secret: 'wrong-fake-secret' })
  assert(wrongSecretVerification.isValid === false, 'Signature rejected with incorrect secret (valid = false)')
  assert(wrongSecretVerification.message.includes('failed') || wrongSecretVerification.message.includes('mismatch'), 'Mismatch message returned on wrong secret')

  // Tampered payload test (modify payload segment without changing signature)
  const tokenParts = generatedToken.split('.')
  const tamperedPayloadB64 = base64UrlEncode(JSON.stringify({ ...payload, name: 'Tampered Hacker Name' }))
  const tamperedToken = `${tokenParts[0]}.${tamperedPayloadB64}.${tokenParts[2]}`
  const tamperedVerification = await verifyJwtSignature(tamperedToken, { secret })
  assert(tamperedVerification.isValid === false, 'Tampered token payload rejected by signature verification')

  // 6. Multi-Algorithm HMAC Support (HS384 & HS512)
  console.log('\n6. Testing HS384 and HS512 Algorithms...')
  const tokenHS384 = await signJwt({ header, payload, secret, algorithm: 'HS384' })
  const verifyHS384 = await verifyJwtSignature(tokenHS384, { secret })
  assert(verifyHS384.isValid === true && verifyHS384.algorithm === 'HS384', 'HS384 token successfully signed and verified')

  const tokenHS512 = await signJwt({ header, payload, secret, algorithm: 'HS512' })
  const verifyHS512 = await verifyJwtSignature(tokenHS512, { secret })
  assert(verifyHS512.isValid === true && verifyHS512.algorithm === 'HS512', 'HS512 token successfully signed and verified')

  // 7. Base64-Encoded Secret Verification
  console.log('\n7. Testing Base64-Encoded Secret Support...')
  const rawSecret = 'secret-key-1234567890-test'
  const base64Secret = Buffer.from(rawSecret, 'utf-8').toString('base64')
  const tokenB64 = await signJwt({
    header,
    payload,
    secret: base64Secret,
    isBase64Secret: true
  })
  const verifyB64 = await verifyJwtSignature(tokenB64, {
    secret: base64Secret,
    isBase64Secret: true
  })
  assert(verifyB64.isValid === true, 'Base64 encoded secret correctly verified')

  // 8. Error Handling for Malformed Tokens
  console.log('\n8. Testing Malformed Token Error Handling...')
  const invalidFormatToken = 'this-is-not-a-jwt'
  const malformedDecoded = decodeJwt(invalidFormatToken)
  assert(malformedDecoded.isValidStructure === false, 'Non-JWT string flagged as invalid structure')
  assert(malformedDecoded.error !== undefined, 'Error message provided for malformed string')

  const invalidJsonToken = 'eyJhbGciOiJIUzI1NiJ9.bm90LWpzb24tcGF5bG9hZA.signature'
  const invalidJsonDecoded = decodeJwt(invalidJsonToken)
  assert(invalidJsonDecoded.isValidStructure === false, 'Non-JSON payload flagged as invalid structure')

  // 9. Web Worker & Task Router Integration
  console.log('\n9. Testing Web Worker Task Router Execution...')
  const workerDecoded = await dispatchTask({
    id: 'test-jwt-1',
    tool: 'crypto',
    action: 'decode-jwt',
    data: { token: generatedToken }
  })
  assert(workerDecoded.isValidStructure === true && workerDecoded.payload.sub === 'user_12345', 'Worker dispatch crypto:decode-jwt succeeded')

  const workerVerified = await dispatchTask({
    id: 'test-jwt-2',
    tool: 'crypto',
    action: 'verify-jwt',
    data: { token: generatedToken, secret }
  })
  assert(workerVerified.isValid === true, 'Worker dispatch crypto:verify-jwt succeeded')

  const workerSigned = await dispatchTask({
    id: 'test-jwt-3',
    tool: 'crypto',
    action: 'sign-jwt',
    data: { header, payload, secret, algorithm: 'HS256' }
  })
  assert(typeof workerSigned.token === 'string' && workerSigned.token.split('.').length === 3, 'Worker dispatch crypto:sign-jwt succeeded')

  // Summary
  console.log(`\n========================================`)
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
