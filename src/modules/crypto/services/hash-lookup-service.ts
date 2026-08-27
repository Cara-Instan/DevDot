import { md5 } from './md5-service'
import { computeHash, crc32 } from './hash-service'
import { isValidBcryptHash } from './bcrypt-service'
import type {
  HashAlgorithm,
  DetectedHashType,
  HashLookupOptions,
  HashLookupResult
} from '../types'

/**
 * Top common developer, system, and default passwords dictionary for fast offline lookup
 */
const COMMON_DICTIONARY: string[] = [
  '',
  '123456',
  'password',
  '12345678',
  'qwerty',
  '123456789',
  '12345',
  '1234',
  '111111',
  '1234567',
  'dragon',
  'welcome',
  'ninja',
  'admin',
  'administrator',
  'root',
  'toor',
  'guest',
  'user',
  'test',
  'testing',
  'letmein',
  'sunshine',
  'princess',
  'football',
  'iloveyou',
  'monkey',
  'shadow',
  'master',
  'super',
  'superman',
  'batman',
  'trustno1',
  'secret',
  'secret123',
  'devdot',
  'devtoys',
  'developer',
  'development',
  'password123',
  'admin123',
  'root123',
  'pass123',
  'pass@123',
  'admin@123',
  'changeme',
  'default',
  'database',
  'oracle',
  'postgres',
  'mysql',
  'redis',
  'mongo',
  'mongodb',
  'docker',
  'system',
  'manager',
  'access',
  'login',
  'hello',
  'world',
  'helloworld',
  'foobar',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '654321',
  '987654321',
  '000000',
  '1111',
  '0000',
  '123123',
  '666666',
  '7777777',
  '888888',
  'abc123',
  'abc123456',
  'internet',
  'computer',
  'keyboard',
  'coffee',
  'orange',
  'banana',
  'apple',
  'google',
  'github',
  'gitlab',
  'spring',
  'summer',
  'winter',
  'autumn',
  'matrix',
  'neo',
  'starwars',
  'freedom',
  'forever',
  'champion',
  'qwerty123',
  'qazwsx',
  'zaq12wsx',
  '1q2w3e4r',
  'p@ssw0rd',
  'P@ssw0rd123',
  'Pa$$w0rd'
]

/**
 * Automatically inspects a hash string and identifies possible cryptographic algorithms
 */
export function detectHashType(input: string): DetectedHashType[] {
  if (!input || typeof input !== 'string') return []

  const clean = input.trim()
  const len = clean.length
  const isHex = /^[0-9a-fA-F]+$/.test(clean)
  const results: DetectedHashType[] = []

  // Check Bcrypt
  if (isValidBcryptHash(clean)) {
    results.push({
      name: 'Bcrypt (Blowfish-based crypt)',
      algorithm: 'bcrypt',
      confidence: 'high',
      description: 'Standard salted and cost-adaptive password hashing function ($2a$, $2b$, $2y$).'
    })
    return results
  }

  if (isHex) {
    if (len === 8) {
      results.push({
        name: 'CRC-32 / Adler-32',
        algorithm: 'crc32',
        bits: 32,
        confidence: 'high',
        description: '32-bit cyclic redundancy checksum often used for file integrity verification.'
      })
    } else if (len === 32) {
      results.push({
        name: 'MD5',
        algorithm: 'md5',
        bits: 128,
        confidence: 'high',
        description: '128-bit hash function widely used in legacy systems, checksums, and HMAC-MD5.'
      })
      results.push({
        name: 'NTLM / MD4',
        algorithm: 'unknown',
        bits: 128,
        confidence: 'medium',
        description: 'Windows NT LAN Manager password hash format.'
      })
    } else if (len === 40) {
      results.push({
        name: 'SHA-1',
        algorithm: 'sha1',
        bits: 160,
        confidence: 'high',
        description: '160-bit Secure Hash Algorithm used in Git commit IDs and legacy TLS certificates.'
      })
      results.push({
        name: 'RIPEMD-160',
        algorithm: 'unknown',
        bits: 160,
        confidence: 'low',
        description: '160-bit cryptographic hash function used in Bitcoin address generation.'
      })
    } else if (len === 56) {
      results.push({
        name: 'SHA-224',
        algorithm: 'unknown',
        bits: 224,
        confidence: 'high',
        description: '224-bit variant of the SHA-2 family.'
      })
    } else if (len === 64) {
      results.push({
        name: 'SHA-256',
        algorithm: 'sha256',
        bits: 256,
        confidence: 'high',
        description: '256-bit Secure Hash Algorithm standard for modern cryptography, blockchain, and TLS.'
      })
      results.push({
        name: 'SHA3-256 / Keccak-256',
        algorithm: 'unknown',
        bits: 256,
        confidence: 'medium',
        description: '256-bit Keccak sponge function standard for Ethereum and modern crypto.'
      })
    } else if (len === 96) {
      results.push({
        name: 'SHA-384',
        algorithm: 'sha384',
        bits: 384,
        confidence: 'high',
        description: '384-bit Secure Hash Algorithm from the SHA-2 family.'
      })
    } else if (len === 128) {
      results.push({
        name: 'SHA-512',
        algorithm: 'sha512',
        bits: 512,
        confidence: 'high',
        description: '512-bit Secure Hash Algorithm offering highest collision resistance in SHA-2.'
      })
      results.push({
        name: 'Whirlpool / SHA3-512',
        algorithm: 'unknown',
        bits: 512,
        confidence: 'low',
        description: '512-bit hash standard based on modified AES cipher structure.'
      })
    }
  }

  return results
}

/**
 * Searches for original preimage plaintext corresponding to a hash ("Hash Decrypt / Lookup")
 */
export async function reverseLookupHash(
  targetHash: string,
  options: HashLookupOptions = {}
): Promise<HashLookupResult> {
  const start = performance.now()
  const cleanTarget = (targetHash || '').trim().toLowerCase()

  if (!cleanTarget) {
    return {
      found: false,
      iterationsChecked: 0,
      executionTimeMs: 0
    }
  }

  // Detect which algorithm candidate to test
  let primaryAlgo: HashAlgorithm = 'md5'
  if (cleanTarget.length === 32) primaryAlgo = 'md5'
  else if (cleanTarget.length === 40) primaryAlgo = 'sha1'
  else if (cleanTarget.length === 64) primaryAlgo = 'sha256'
  else if (cleanTarget.length === 8) primaryAlgo = 'crc32'
  else if (cleanTarget.length === 128) primaryAlgo = 'sha512'

  let iterations = 0

  // 1. Check custom dictionary if provided
  if (options.customDictionary && options.customDictionary.length > 0) {
    for (const word of options.customDictionary) {
      iterations++
      let computed = ''
      if (primaryAlgo === 'md5') computed = md5(word)
      else if (primaryAlgo === 'crc32') computed = crc32(word)
      else computed = await computeHash(primaryAlgo, word)

      if (computed.toLowerCase() === cleanTarget) {
        return {
          found: true,
          plaintext: word,
          algorithm: primaryAlgo,
          iterationsChecked: iterations,
          executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
          source: 'custom-dictionary'
        }
      }
    }
  }

  // 2. Check built-in common passwords dictionary
  if (options.includeCommonWords !== false) {
    for (const word of COMMON_DICTIONARY) {
      iterations++
      let computed = ''
      if (primaryAlgo === 'md5') computed = md5(word)
      else if (primaryAlgo === 'crc32') computed = crc32(word)
      else computed = await computeHash(primaryAlgo, word)

      if (computed.toLowerCase() === cleanTarget) {
        return {
          found: true,
          plaintext: word,
          algorithm: primaryAlgo,
          iterationsChecked: iterations,
          executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
          source: 'common-passwords'
        }
      }
    }
  }

  // 3. Check 4-digit PINs (0000 - 9999)
  if (options.includePins !== false) {
    // 4-digit pins
    for (let pin = 0; pin <= 9999; pin++) {
      iterations++
      const word = pin.toString().padStart(4, '0')
      let computed = ''
      if (primaryAlgo === 'md5') computed = md5(word)
      else if (primaryAlgo === 'crc32') computed = crc32(word)
      else computed = await computeHash(primaryAlgo, word)

      if (computed.toLowerCase() === cleanTarget) {
        return {
          found: true,
          plaintext: word,
          algorithm: primaryAlgo,
          iterationsChecked: iterations,
          executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
          source: 'numeric-pin'
        }
      }
    }
  }

  return {
    found: false,
    iterationsChecked: iterations,
    executionTimeMs: Math.round((performance.now() - start) * 100) / 100
  }
}
