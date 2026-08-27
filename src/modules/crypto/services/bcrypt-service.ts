import bcrypt from 'bcryptjs'
import type {
  BcryptHashOptions,
  BcryptHashResult,
  BcryptParsedInfo,
  BcryptVerifyResult
} from '../types'

/**
 * Bcrypt Hash Regex format: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 */
const BCRYPT_REGEX = /^\$(2[abyx])\$([0-9]{2})\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})$/

/**
 * Validates if a string is a valid Bcrypt hash format
 */
export function isValidBcryptHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') return false
  return BCRYPT_REGEX.test(hash.trim())
}

/**
 * Parses and breaks down a Bcrypt hash into its constituent cryptographic parts
 */
export function parseBcryptHash(hash: string): BcryptParsedInfo {
  if (!hash || typeof hash !== 'string') {
    return {
      isValid: false,
      algorithm: 'Unknown',
      rounds: 0,
      salt: '',
      hashValue: '',
      formattedRounds: '0 iterations'
    }
  }

  const clean = hash.trim()
  const match = clean.match(BCRYPT_REGEX)

  if (!match) {
    return {
      isValid: false,
      algorithm: 'Invalid Format',
      rounds: 0,
      salt: '',
      hashValue: '',
      formattedRounds: 'N/A'
    }
  }

  const [, version, costStr, salt, hashValue] = match
  const rounds = parseInt(costStr, 10)
  const iterations = Math.pow(2, rounds).toLocaleString()

  return {
    isValid: true,
    algorithm: `$${version}$`,
    rounds,
    salt,
    hashValue,
    formattedRounds: `2^${rounds} (${iterations} rounds)`
  }
}

/**
 * Asynchronously generates a Bcrypt hash with specified work factor / rounds
 */
export async function generateBcryptHash(
  password: string,
  options: BcryptHashOptions = {}
): Promise<BcryptHashResult> {
  const start = performance.now()
  const rounds = Math.min(Math.max(Number(options.rounds) || 10, 4), 16)

  const salt = await bcrypt.genSalt(rounds)
  const hash = await bcrypt.hash(password, salt)
  const end = performance.now()

  return {
    hash,
    rounds,
    salt,
    executionTimeMs: Math.round((end - start) * 100) / 100
  }
}

/**
 * Asynchronously verifies if a plaintext password matches a Bcrypt hash
 */
export async function verifyBcryptHash(
  password: string,
  hash: string
): Promise<BcryptVerifyResult> {
  const start = performance.now()
  const cleanHash = (hash || '').trim()

  if (!cleanHash) {
    return {
      isValid: false,
      isFormatValid: false,
      error: 'Empty hash provided',
      executionTimeMs: 0
    }
  }

  const parsed = parseBcryptHash(cleanHash)
  if (!parsed.isValid) {
    return {
      isValid: false,
      isFormatValid: false,
      details: parsed,
      error: 'Invalid Bcrypt hash structure. Must start with $2a$, $2b$, $2y$ followed by cost and 53 Base64 chars.',
      executionTimeMs: Math.round((performance.now() - start) * 100) / 100
    }
  }

  try {
    const isMatch = await bcrypt.compare(password, cleanHash)
    const end = performance.now()

    return {
      isValid: isMatch,
      isFormatValid: true,
      details: parsed,
      executionTimeMs: Math.round((end - start) * 100) / 100
    }
  } catch (err: any) {
    return {
      isValid: false,
      isFormatValid: false,
      details: parsed,
      error: err.message || 'Comparison failed',
      executionTimeMs: Math.round((performance.now() - start) * 100) / 100
    }
  }
}
