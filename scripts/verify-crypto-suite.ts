import { encodeBase64, decodeBase64 } from '../src/modules/encoders/services/base64-service'
import { encodeUrl, decodeUrl } from '../src/modules/encoders/services/url-service'
import { encodeHex, decodeHex } from '../src/modules/encoders/services/hex-service'
import { encodeHtmlEntities, decodeHtmlEntities } from '../src/modules/encoders/services/html-entities-service'
import { md5, hmacMd5 } from '../src/modules/crypto/services/md5-service'
import { computeHash, computeMultiHash } from '../src/modules/crypto/services/hash-service'
import {
  generateUuidV4,
  generateUlid,
  decodeUlid,
  generateNanoId,
  generateBatchIds
} from '../src/modules/crypto/services/id-generator-service'

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
  console.log('=== RUNNING DEVTOOLS-DOT SUB-PHASE 2.2 VERIFICATION ===\n')

  // 1. BASE64 TESTS
  console.log('1. Testing Base64 Encoder / Decoder (UTF-8 Unicode Safe)...')
  const utf8Sample = 'Hello World! 🚀 DevDot 100% Offline ⚡ 日本語'
  const b64Encoded = encodeBase64(utf8Sample)
  const b64Decoded = decodeBase64(b64Encoded.output)
  assert(b64Decoded.output === utf8Sample, 'Encodes and decodes multi-byte Unicode/Emoji UTF-8 strings')

  const urlSafeEncoded = encodeBase64('test+string/with/slashes==', { urlSafe: true, pad: false })
  assert(!urlSafeEncoded.output.includes('+') && !urlSafeEncoded.output.includes('/') && !urlSafeEncoded.output.includes('='), 'Produces URL-safe Base64 without +, /, =')
  const urlSafeDecoded = decodeBase64(urlSafeEncoded.output)
  assert(urlSafeDecoded.output === 'test+string/with/slashes==', 'Decodes URL-safe Base64 correctly')

  const dataUri = encodeBase64('console.log("hi")', { dataUriPrefix: true, mimeType: 'text/javascript' })
  assert(dataUri.output.startsWith('data:text/javascript;base64,'), 'Produces formatted Data URI')
  const dataUriDecoded = decodeBase64(dataUri.output)
  assert(dataUriDecoded.output === 'console.log("hi")' && dataUriDecoded.isDataUri, 'Parses and extracts payload from Data URI')

  // 2. URL ENCODER/DECODER TESTS
  console.log('\n2. Testing URL Encoder / Decoder...')
  const urlSample = 'https://devdot.local/search?q=vue 3 & tauri v2 + offline=true&filter=(tag:core)'
  const urlEncoded = encodeUrl(urlSample, { mode: 'component', spaceAsPlus: true })
  assert(urlEncoded.output.includes('+') && !urlEncoded.output.includes(' '), 'Encodes spaces to +')
  const urlDecoded = decodeUrl(urlEncoded.output, { spaceAsPlus: true })
  assert(urlDecoded.output === urlSample, 'Decodes + encoded spaces correctly')

  const rfc3986 = encodeUrl("hello world (test) 'quote' *star* !bang", { mode: 'rfc3986' })
  assert(rfc3986.output.includes('%28') && rfc3986.output.includes('%29') && rfc3986.output.includes('%27'), 'Encodes RFC 3986 reserved punctuation')

  // 3. HEX ENCODER/DECODER TESTS
  console.log('\n3. Testing Hexadecimal Encoder / Decoder...')
  const hexSample = 'DevDot 2026'
  const hexEncoded = encodeHex(hexSample, { delimiter: 'space', uppercase: true })
  assert(hexEncoded.output.startsWith('44 65 76 44 6F 74'), 'Encodes text to uppercase space-delimited hex')
  const hexDecoded = decodeHex(hexEncoded.output)
  assert(hexDecoded.output === hexSample, 'Decodes space-delimited hex string to text')

  const hex0x = encodeHex('ABC', { delimiter: '0x' })
  assert(hex0x.output === '0x61 0x62 0x63' || hex0x.output === '0x41 0x42 0x43', 'Formats hex with 0x prefix')
  const hex0xDecoded = decodeHex(hex0x.output)
  assert(hex0xDecoded.output === 'ABC', 'Decodes 0x prefixed hex')

  // 4. HTML ENTITIES TESTS
  console.log('\n4. Testing HTML Entities Encoder / Decoder...')
  const htmlSample = '<div class="banner">© 2026 DevDot & "Fast" \'Tools\' €100</div>'
  const htmlNamed = encodeHtmlEntities(htmlSample, { mode: 'named' })
  assert(htmlNamed.output.includes('&lt;div') && htmlNamed.output.includes('&copy;') && htmlNamed.output.includes('&amp;'), 'Encodes named HTML entities')
  const htmlDecoded = decodeHtmlEntities(htmlNamed.output)
  assert(htmlDecoded.output === htmlSample, 'Decodes named HTML entities back to raw HTML')

  const htmlNumericDecoded = decodeHtmlEntities('&#60;hello&#62; &#x26; &#169;')
  assert(htmlNumericDecoded.output === '<hello> & ©', 'Decodes decimal and hex numeric entities')

  // 5. MD5 & HASH TESTS
  console.log('\n5. Testing MD5 & Multi-Hash Calculation...')
  const md5Known = md5('hello world')
  assert(md5Known === '5eb63bbbe01eeed093cb22bb8f5acdc3', `Computes MD5 hash accurately (${md5Known})`)

  const hmacMd5Known = hmacMd5('secret', 'hello world')
  assert(hmacMd5Known === '78d6997b1230f38e59b6d1642dfaa3a4', `Computes HMAC-MD5 accurately (${hmacMd5Known})`)

  const sha1Known = await computeHash('sha1', 'hello world')
  assert(sha1Known === '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed', `Computes SHA-1 hash accurately (${sha1Known})`)

  const sha256Known = await computeHash('sha256', 'hello world')
  assert(sha256Known === 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', `Computes SHA-256 hash accurately (${sha256Known})`)

  const sha512Known = await computeHash('sha512', 'hello world')
  assert(sha512Known.startsWith('309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f'), `Computes SHA-512 hash accurately (${sha512Known.slice(0, 32)}...)`)

  const multiResult = await computeMultiHash('hello world', {}, '5eb63bbbe01eeed093cb22bb8f5acdc3')
  assert(multiResult.matchedAlgorithm === 'md5', 'Hash Matcher accurately detects matching MD5 digest')

  // 6. ID GENERATOR TESTS (UUID, ULID, NANOID)
  console.log('\n6. Testing ID Generator (UUIDv4, ULID, NanoID)...')
  const uuid1 = generateUuidV4()
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  assert(uuidRegex.test(uuid1), `Generates valid RFC 4122 UUIDv4 (${uuid1})`)

  const uuidNoHyphens = generateUuidV4({ hyphens: false, uppercase: true })
  assert(uuidNoHyphens.length === 32 && !uuidNoHyphens.includes('-'), `Generates uppercase UUID without hyphens (${uuidNoHyphens})`)

  const testTime = 1700000000000 // 2023-11-14T22:13:20.000Z
  const ulid1 = generateUlid({ timestamp: testTime })
  assert(ulid1.length === 26, `Generates 26-character ULID (${ulid1})`)
  const ulidInfo = decodeUlid(ulid1)
  assert(ulidInfo.timestamp === testTime, `Decodes timestamp from ULID (${ulidInfo.dateIso})`)

  const nanoid1 = generateNanoId({ length: 16 })
  assert(nanoid1.length === 16, `Generates NanoID with custom length 16 (${nanoid1})`)

  const nanoidHex = generateNanoId({ alphabet: '0123456789ABCDEF', length: 10 })
  assert(/^[0-9A-F]{10}$/.test(nanoidHex), `Generates NanoID with custom alphabet (${nanoidHex})`)

  const batch = generateBatchIds({ type: 'ulid', count: 10 })
  assert(batch.ids.length === 10, 'Generates batch of 10 ULIDs')
  assert(batch.formatted.split('\n').length === 10, 'Formats batch with line breaks')

  console.log(`\n=============================================`)
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log(`=============================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
