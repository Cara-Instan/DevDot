import { encodeBase64, decodeBase64 } from '../src/modules/encoders/services/base64-service'
import { encodeUrl, decodeUrl } from '../src/modules/encoders/services/url-service'
import { encodeHex, decodeHex } from '../src/modules/encoders/services/hex-service'
import { encodeHtmlEntities, decodeHtmlEntities } from '../src/modules/encoders/services/html-entities-service'
import { md5, hmacMd5 } from '../src/modules/crypto/services/md5-service'
import { computeHash, computeMultiHash, crc32 } from '../src/modules/crypto/services/hash-service'
import { generateBcryptHash, verifyBcryptHash, parseBcryptHash, isValidBcryptHash } from '../src/modules/crypto/services/bcrypt-service'
import { detectHashType, reverseLookupHash } from '../src/modules/crypto/services/hash-lookup-service'
import { encryptAes, decryptAes } from '../src/modules/crypto/services/aes-cipher-service'
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
  console.log('=== RUNNING DEVTOOLS-DOT COMPREHENSIVE CRYPTO SUITE VERIFICATION ===\n')

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

  // 4. HTML ENTITIES TESTS
  console.log('\n4. Testing HTML Entities Encoder / Decoder...')
  const htmlSample = '<div class="banner">© 2026 DevDot & "Fast" \'Tools\' €100</div>'
  const htmlNamed = encodeHtmlEntities(htmlSample, { mode: 'named' })
  assert(htmlNamed.output.includes('&lt;div') && htmlNamed.output.includes('&copy;') && htmlNamed.output.includes('&amp;'), 'Encodes named HTML entities')
  const htmlDecoded = decodeHtmlEntities(htmlNamed.output)
  assert(htmlDecoded.output === htmlSample, 'Decodes named HTML entities back to raw HTML')

  // 5. MD5, CRC-32 & HASH TESTS
  console.log('\n5. Testing MD5, CRC-32, SHA Family & Multi-Hash Calculation...')
  const md5Known = md5('hello world')
  assert(md5Known === '5eb63bbbe01eeed093cb22bb8f5acdc3', `Computes MD5 hash accurately (${md5Known})`)

  const crc32Known = crc32('hello world')
  assert(crc32Known === '0d4a1185', `Computes CRC-32 checksum accurately (${crc32Known})`)

  const hmacMd5Known = hmacMd5('secret', 'hello world')
  assert(hmacMd5Known === '78d6997b1230f38e59b6d1642dfaa3a4', `Computes HMAC-MD5 accurately (${hmacMd5Known})`)

  const sha1Known = await computeHash('sha1', 'hello world')
  assert(sha1Known === '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed', `Computes SHA-1 hash accurately (${sha1Known})`)

  const sha256Known = await computeHash('sha256', 'hello world')
  assert(sha256Known === 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', `Computes SHA-256 hash accurately (${sha256Known})`)

  const sha384Known = await computeHash('sha384', 'hello world')
  assert(sha384Known === 'fdbd8e75a67f29f701a4e040385e2e23986303ea10239211af907fcbb83578b3e417cb71ce646efd0819dd8c088de1bd', 'Computes SHA-384 accurately')

  const sha512Known = await computeHash('sha512', 'hello world')
  assert(sha512Known.startsWith('309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f'), 'Computes SHA-512 accurately')

  const saltedHash = await computeHash('sha256', 'world', { saltPrefix: 'hello ' })
  assert(saltedHash === sha256Known, 'Computes salted hash with salt prefix')

  const multiResult = await computeMultiHash('hello world', {}, '5eb63bbbe01eeed093cb22bb8f5acdc3')
  assert(multiResult.matchedAlgorithm === 'md5', 'Hash Matcher accurately detects matching MD5 digest')
  assert(multiResult.crc32 === '0d4a1185', 'MultiHash returns CRC32')

  // 6. BCRYPT TESTS
  console.log('\n6. Testing Bcrypt Generator & Verifier...')
  const bcryptGen = await generateBcryptHash('TestPassword123!', { rounds: 4 })
  assert(isValidBcryptHash(bcryptGen.hash), `Generates valid Bcrypt hash format: ${bcryptGen.hash}`)
  assert(bcryptGen.rounds === 4, 'Respects work factor rounds = 4')

  const parsedBcrypt = parseBcryptHash(bcryptGen.hash)
  assert(parsedBcrypt.isValid && parsedBcrypt.rounds === 4, `Correctly decomposes Bcrypt hash (version ${parsedBcrypt.algorithm}, rounds ${parsedBcrypt.rounds})`)

  const verifyPass = await verifyBcryptHash('TestPassword123!', bcryptGen.hash)
  assert(verifyPass.isValid && verifyPass.isFormatValid, 'Verifies valid password against Bcrypt hash (Match)')

  const verifyFail = await verifyBcryptHash('WrongPassword!', bcryptGen.hash)
  assert(!verifyFail.isValid && verifyFail.isFormatValid, 'Rejects incorrect password against Bcrypt hash (Mismatch)')

  const verifyInvalid = await verifyBcryptHash('TestPassword123!', 'invalid-hash-string')
  assert(!verifyInvalid.isFormatValid, 'Identifies invalid Bcrypt hash format')

  // 7. HASH DETECTOR & REVERSE LOOKUP ("DECRYPT") TESTS
  console.log('\n7. Testing Hash Type Detector & Reverse Lookup ("Decrypt")...')
  const detectedMd5 = detectHashType('5f4dcc3b5aa765d61d8327deb882cf99')
  assert(detectedMd5.some(d => d.algorithm === 'md5'), 'Detects MD5 hash type accurately')

  const detectedBcrypt = detectHashType('$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa')
  assert(detectedBcrypt.some(d => d.algorithm === 'bcrypt'), 'Detects Bcrypt format accurately')

  const reverseMd5 = await reverseLookupHash('5f4dcc3b5aa765d61d8327deb882cf99')
  assert(reverseMd5.found && reverseMd5.plaintext === 'password', 'Recovers plaintext "password" from MD5 hash offline')

  const pinHash = md5('1234')
  const reversePin = await reverseLookupHash(pinHash, { includePins: true })
  assert(reversePin.found && reversePin.plaintext === '1234', 'Recovers 4-digit PIN "1234" from hash offline')

  // 8. AES CIPHER (ENCRYPT & DECRYPT) TESTS
  console.log('\n8. Testing Symmetric AES Cipher (GCM & CBC)...')
  const secretPlaintext = 'DevDot 100% Offline Cryptography'
  const passphrase = 'my-super-secret-key-2026'

  // AES-GCM
  const gcmEnc = await encryptAes(secretPlaintext, { passphrase, mode: 'GCM', encoding: 'base64' })
  assert(gcmEnc.ciphertext.length > 0 && gcmEnc.iv.length > 0, 'Encrypts plaintext using AES-256-GCM')

  const gcmDec = await decryptAes({
    ciphertext: gcmEnc.ciphertext,
    passphrase,
    iv: gcmEnc.iv,
    salt: gcmEnc.salt,
    mode: 'GCM',
    encoding: 'base64'
  })
  assert(gcmDec.success && gcmDec.plaintext === secretPlaintext, 'Decrypts AES-256-GCM ciphertext accurately')

  // AES Decrypt with wrong passphrase
  const wrongDec = await decryptAes({
    ciphertext: gcmEnc.ciphertext,
    passphrase: 'wrong-passphrase',
    iv: gcmEnc.iv,
    salt: gcmEnc.salt,
    mode: 'GCM',
    encoding: 'base64'
  })
  assert(!wrongDec.success, 'Rejects decryption with wrong passphrase')

  // 9. ID GENERATOR TESTS (UUID, ULID, NANOID)
  console.log('\n9. Testing ID Generator (UUIDv4, ULID, NanoID)...')
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

  const batch = generateBatchIds({ type: 'ulid', count: 10 })
  assert(batch.ids.length === 10, 'Generates batch of 10 ULIDs')

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
