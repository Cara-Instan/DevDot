import { md5, hmacMd5 } from './md5-service'
import type { HashAlgorithm, HashOptions, MultiHashResult } from '../types'

/**
 * Converts ArrayBuffer to Hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Computes SHA-1, SHA-256, SHA-512 using Web Crypto API
 */
async function subtleDigest(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512', data: string): Promise<string> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(data)
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest(algorithm, bytes)
    return bufferToHex(hashBuffer)
  }
  
  throw new Error(`Web Crypto API is not available in this environment`)
}

/**
 * Computes HMAC-SHA using Web Crypto API
 */
async function subtleHmac(
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512',
  keyStr: string,
  dataStr: string
): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyStr)
  const data = encoder.encode(dataStr)

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: algorithm } },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
    return bufferToHex(signature)
  }

  throw new Error(`Web Crypto API is not available in this environment`)
}

/**
 * Computes single hash (MD5, SHA-1, SHA-256, SHA-512) with optional HMAC
 */
export async function computeHash(
  algorithm: HashAlgorithm,
  input: string,
  options: HashOptions = {}
): Promise<string> {
  const isHmac = !!options.hmacSecret

  let result = ''
  if (algorithm === 'md5') {
    result = isHmac ? hmacMd5(options.hmacSecret!, input) : md5(input)
  } else {
    const subtleAlgo = algorithm === 'sha1' ? 'SHA-1' : algorithm === 'sha256' ? 'SHA-256' : 'SHA-512'
    if (isHmac) {
      result = await subtleHmac(subtleAlgo, options.hmacSecret!, input)
    } else {
      result = await subtleDigest(subtleAlgo, input)
    }
  }

  return options.uppercase ? result.toUpperCase() : result.toLowerCase()
}

/**
 * Computes all 4 hash algorithms (MD5, SHA-1, SHA-256, SHA-512) simultaneously
 */
export async function computeMultiHash(
  input: string,
  options: HashOptions = {},
  hashToMatch?: string
): Promise<MultiHashResult> {
  const [md5Hash, sha1Hash, sha256Hash, sha512Hash] = await Promise.all([
    computeHash('md5', input, options),
    computeHash('sha1', input, options),
    computeHash('sha256', input, options),
    computeHash('sha512', input, options)
  ])

  let matchedAlgorithm: HashAlgorithm | null = null
  if (hashToMatch && hashToMatch.trim()) {
    const target = hashToMatch.trim().toLowerCase()
    if (md5Hash.toLowerCase() === target) matchedAlgorithm = 'md5'
    else if (sha1Hash.toLowerCase() === target) matchedAlgorithm = 'sha1'
    else if (sha256Hash.toLowerCase() === target) matchedAlgorithm = 'sha256'
    else if (sha512Hash.toLowerCase() === target) matchedAlgorithm = 'sha512'
  }

  return {
    md5: md5Hash,
    sha1: sha1Hash,
    sha256: sha256Hash,
    sha512: sha512Hash,
    isHmac: !!options.hmacSecret,
    matchedAlgorithm
  }
}
