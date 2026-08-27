import { md5, hmacMd5 } from './md5-service'
import type { HashAlgorithm, HashOptions, MultiHashResult, FileChecksumResult } from '../types'

/**
 * Precomputed CRC32 Lookup Table (IEEE 802.3)
 */
let crcTable: Uint32Array | null = null
function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable
  crcTable = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    crcTable[i] = c >>> 0
  }
  return crcTable
}

/**
 * Computes standard CRC-32 checksum (Hex string)
 */
export function crc32(input: string | Uint8Array): string {
  const table = getCrcTable()
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let crc = 0 ^ (-1)
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF]
  }
  const result = (crc ^ (-1)) >>> 0
  return result.toString(16).padStart(8, '0')
}

/**
 * Converts ArrayBuffer to Hex string
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Converts ArrayBuffer to Base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Converts hex string to byte array
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '')
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Computes SHA-1, SHA-256, SHA-384, SHA-512 using Web Crypto API
 */
async function subtleDigest(
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  data: Uint8Array
): Promise<ArrayBuffer> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return await crypto.subtle.digest(algorithm, data as unknown as BufferSource)
  }
  throw new Error('Web Crypto API is not available in this environment')
}

/**
 * Computes HMAC using Web Crypto API
 */
async function subtleHmac(
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512',
  keyBytes: Uint8Array,
  dataBytes: Uint8Array
): Promise<ArrayBuffer> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: { name: algorithm } },
      false,
      ['sign']
    )
    return await crypto.subtle.sign('HMAC', cryptoKey, dataBytes as unknown as BufferSource)
  }
  throw new Error('Web Crypto API is not available in this environment')
}

/**
 * Computes single hash with optional salt, HMAC, and format options
 */
export async function computeHash(
  algorithm: HashAlgorithm,
  input: string | Uint8Array,
  options: HashOptions = {}
): Promise<string> {
  let dataBytes: Uint8Array
  if (typeof input === 'string') {
    let payload = input
    if (options.saltPrefix) payload = options.saltPrefix + payload
    if (options.saltSuffix) payload = payload + options.saltSuffix
    dataBytes = new TextEncoder().encode(payload)
  } else {
    dataBytes = input
  }

  const isHmac = !!options.hmacSecret

  let rawBuffer: ArrayBuffer | Uint8Array

  if (algorithm === 'crc32') {
    const hex = crc32(dataBytes)
    return options.uppercase ? hex.toUpperCase() : hex.toLowerCase()
  }

  if (algorithm === 'md5') {
    if (isHmac) {
      const text = typeof input === 'string' ? input : new TextDecoder().decode(input)
      const hex = hmacMd5(options.hmacSecret!, text)
      if (options.encoding === 'base64') {
        const bytes = hexToBytes(hex)
        return bufferToBase64(bytes)
      }
      return options.uppercase ? hex.toUpperCase() : hex.toLowerCase()
    } else {
      const text = typeof input === 'string' ? input : new TextDecoder().decode(input)
      const hex = md5(text)
      if (options.encoding === 'base64') {
        const bytes = hexToBytes(hex)
        return bufferToBase64(bytes)
      }
      return options.uppercase ? hex.toUpperCase() : hex.toLowerCase()
    }
  }

  const subtleAlgo: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' =
    algorithm === 'sha1'
      ? 'SHA-1'
      : algorithm === 'sha256'
      ? 'SHA-256'
      : algorithm === 'sha384'
      ? 'SHA-384'
      : 'SHA-512'

  if (isHmac) {
    const keyBytes = new TextEncoder().encode(options.hmacSecret!)
    rawBuffer = await subtleHmac(subtleAlgo, keyBytes, dataBytes)
  } else {
    rawBuffer = await subtleDigest(subtleAlgo, dataBytes)
  }

  let formatted = options.encoding === 'base64' ? bufferToBase64(rawBuffer) : bufferToHex(rawBuffer)
  return options.uppercase && options.encoding !== 'base64' ? formatted.toUpperCase() : formatted.toLowerCase()
}

/**
 * Computes all supported hash algorithms simultaneously
 */
export async function computeMultiHash(
  input: string,
  options: HashOptions = {},
  hashToMatch?: string
): Promise<MultiHashResult> {
  const [md5Hash, sha1Hash, sha256Hash, sha384Hash, sha512Hash, crc32Hash] = await Promise.all([
    computeHash('md5', input, options),
    computeHash('sha1', input, options),
    computeHash('sha256', input, options),
    computeHash('sha384', input, options),
    computeHash('sha512', input, options),
    computeHash('crc32', input, options)
  ])

  let matchedAlgorithm: HashAlgorithm | null = null
  if (hashToMatch && hashToMatch.trim()) {
    const target = hashToMatch.trim().toLowerCase()
    if (md5Hash.toLowerCase() === target) matchedAlgorithm = 'md5'
    else if (sha1Hash.toLowerCase() === target) matchedAlgorithm = 'sha1'
    else if (sha256Hash.toLowerCase() === target) matchedAlgorithm = 'sha256'
    else if (sha384Hash.toLowerCase() === target) matchedAlgorithm = 'sha384'
    else if (sha512Hash.toLowerCase() === target) matchedAlgorithm = 'sha512'
    else if (crc32Hash.toLowerCase() === target) matchedAlgorithm = 'crc32'
  }

  return {
    md5: md5Hash,
    sha1: sha1Hash,
    sha256: sha256Hash,
    sha384: sha384Hash,
    sha512: sha512Hash,
    crc32: crc32Hash,
    isHmac: !!options.hmacSecret,
    matchedAlgorithm
  }
}

/**
 * Computes hashes for an uploaded file / ArrayBuffer
 */
export async function computeFileChecksums(
  fileData: ArrayBuffer,
  fileName: string,
  uppercase = false
): Promise<FileChecksumResult> {
  const start = performance.now()
  const bytes = new Uint8Array(fileData)

  const [md5Hex, sha1Buf, sha256Buf, sha512Buf] = await Promise.all([
    // MD5 for raw bytes
    (async () => {
      // Chunked or binary string MD5
      let binary = ''
      const len = bytes.length
      // Process in slices if huge
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return md5(binary)
    })(),
    subtleDigest('SHA-1', bytes),
    subtleDigest('SHA-256', bytes),
    subtleDigest('SHA-512', bytes)
  ])

  const crc32Val = crc32(bytes)
  const sha1Hex = bufferToHex(sha1Buf)
  const sha256Hex = bufferToHex(sha256Buf)
  const sha512Hex = bufferToHex(sha512Buf)
  const end = performance.now()

  const fmt = (s: string) => (uppercase ? s.toUpperCase() : s.toLowerCase())

  return {
    fileName,
    fileSize: bytes.byteLength,
    md5: fmt(md5Hex),
    sha1: fmt(sha1Hex),
    sha256: fmt(sha256Hex),
    sha512: fmt(sha512Hex),
    crc32: fmt(crc32Val),
    executionTimeMs: Math.round((end - start) * 100) / 100
  }
}
