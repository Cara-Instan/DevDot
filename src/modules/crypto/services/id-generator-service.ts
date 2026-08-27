import type { IdGeneratorOptions, IdGeneratorResult, UlidDecodedInfo } from '../types'

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const DEFAULT_NANOID_ALPHABET = 'use-Nanoid_Alphabet0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Generate cryptographically secure random bytes
 */
function getRandomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return bytes
}

/**
 * Generate standard RFC 4122 UUID v4
 */
export function generateUuidV4(options: { uppercase?: boolean; hyphens?: boolean } = {}): string {
  let uuid = ''
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID()
  } else {
    const bytes = getRandomBytes(16)
    // Set version to 0100 (4)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    // Set variant to 10xx
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex: string[] = []
    for (let i = 0; i < 16; i++) {
      hex.push(bytes[i].toString(16).padStart(2, '0'))
    }

    uuid = `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  }

  if (options.hyphens === false) {
    uuid = uuid.replace(/-/g, '')
  }

  return options.uppercase ? uuid.toUpperCase() : uuid.toLowerCase()
}

/**
 * Generate Universally Unique Lexicographically Sortable Identifier (ULID)
 */
export function generateUlid(options: { uppercase?: boolean; timestamp?: number } = {}): string {
  const now = options.timestamp !== undefined ? options.timestamp : Date.now()

  // 1. Encode 48-bit timestamp into 10 Crockford Base32 characters
  let timeStr = ''
  let t = now
  for (let i = 9; i >= 0; i--) {
    const mod = t % 32
    timeStr = CROCKFORD_BASE32.charAt(mod) + timeStr
    t = Math.floor(t / 32)
  }

  // 2. Generate 80-bit random entropy into 16 Crockford Base32 characters
  const randBytes = getRandomBytes(16)
  let randStr = ''
  for (let i = 0; i < 16; i++) {
    const randIndex = randBytes[i] % 32
    randStr += CROCKFORD_BASE32.charAt(randIndex)
  }

  let ulid = timeStr + randStr
  return options.uppercase === false ? ulid.toLowerCase() : ulid.toUpperCase()
}

/**
 * Decodes the timestamp from a ULID string
 */
export function decodeUlid(ulid: string): UlidDecodedInfo {
  const normalized = ulid.trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')
  const timePart = normalized.slice(0, 10)
  const randPart = normalized.slice(10)

  let timestamp = 0
  for (let i = 0; i < timePart.length; i++) {
    const char = timePart.charAt(i)
    const val = CROCKFORD_BASE32.indexOf(char)
    if (val === -1) {
      throw new Error(`Invalid character in ULID timestamp: '${char}'`)
    }
    timestamp = timestamp * 32 + val
  }

  return {
    timestamp,
    dateIso: new Date(timestamp).toISOString(),
    randomness: randPart
  }
}

/**
 * Generate NanoID with custom alphabet and length
 */
export function generateNanoId(options: {
  alphabet?: string
  length?: number
} = {}): string {
  const alphabet = options.alphabet || DEFAULT_NANOID_ALPHABET
  const length = options.length || 21
  const alphabetLength = alphabet.length

  const bytes = getRandomBytes(length)
  let id = ''
  for (let i = 0; i < length; i++) {
    id += alphabet[bytes[i] % alphabetLength]
  }

  return id
}

/**
 * Batch generate IDs (UUIDv4, ULID, NanoID)
 */
export function generateBatchIds(options: IdGeneratorOptions): IdGeneratorResult {
  const count = Math.max(1, Math.min(options.count || 1, 1000))
  const type = options.type || 'uuid'
  const separator = options.separator || '\n'
  const ids: string[] = []

  for (let i = 0; i < count; i++) {
    if (type === 'uuid') {
      ids.push(generateUuidV4({ uppercase: options.uppercase, hyphens: options.hyphens }))
    } else if (type === 'ulid') {
      ids.push(generateUlid({ uppercase: options.uppercase }))
    } else if (type === 'nanoid') {
      ids.push(
        generateNanoId({
          alphabet: options.nanoidAlphabet,
          length: options.nanoidLength
        })
      )
    }
  }

  return {
    ids,
    formatted: ids.join(separator),
    type,
    count: ids.length
  }
}
