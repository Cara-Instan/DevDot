import type {
  JwtDecoded,
  JwtHeader,
  JwtPayload,
  JwtVerifyOptions,
  JwtVerifyResult,
  JwtSignOptions,
  JwtClaimTimeInfo
} from '../types'

/**
 * Encodes a Uint8Array to a Base64URL string (RFC 7515 / RFC 4648 §5)
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decodes a Base64URL or regular Base64 string to a Uint8Array
 */
export function base64UrlToBytes(input: string): Uint8Array {
  let normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/')
  while (normalized.length % 4 !== 0) {
    normalized += '='
  }

  const binary = atob(normalized)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Encode string to Base64URL (UTF-8 safe)
 */
export function base64UrlEncode(input: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  return bytesToBase64Url(bytes)
}

/**
 * Decode Base64URL to UTF-8 string
 */
export function base64UrlDecode(input: string): string {
  const bytes = base64UrlToBytes(input)
  const decoder = new TextDecoder('utf-8', { fatal: false })
  return decoder.decode(bytes)
}

/**
 * Formats relative time description (e.g. "in 2 hours", "5 minutes ago")
 */
export function formatRelativeTime(secondsDiff: number): string {
  const isPast = secondsDiff < 0
  const absDiff = Math.abs(secondsDiff)

  let timeString = ''
  if (absDiff < 60) {
    timeString = `${Math.floor(absDiff)}s`
  } else if (absDiff < 3600) {
    const mins = Math.floor(absDiff / 60)
    const secs = Math.floor(absDiff % 60)
    timeString = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  } else if (absDiff < 86400) {
    const hours = Math.floor(absDiff / 3600)
    const mins = Math.floor((absDiff % 3600) / 60)
    timeString = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  } else {
    const days = Math.floor(absDiff / 86400)
    const hours = Math.floor((absDiff % 86400) / 3600)
    timeString = hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }

  return isPast ? `${timeString} ago` : `in ${timeString}`
}

/**
 * Computes structured time claim information (for exp, nbf, iat)
 */
export function computeClaimTimeInfo(timestampSec: number): JwtClaimTimeInfo {
  const date = new Date(timestampSec * 1000)
  const nowSec = Math.floor(Date.now() / 1000)
  const diffSec = timestampSec - nowSec
  const isPast = diffSec < 0

  return {
    timestamp: timestampSec,
    dateIso: date.toISOString(),
    formatted: date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }),
    relative: formatRelativeTime(diffSec),
    isPast,
    remainingSeconds: diffSec
  }
}

/**
 * Decodes a raw JWT string into Header, Payload, Signature, and claim metadata
 */
export function decodeJwt(rawToken: string): JwtDecoded {
  const trimmed = (rawToken || '').trim()

  const defaultResult: JwtDecoded = {
    header: { alg: 'none' },
    payload: {},
    signature: '',
    headerRaw: '',
    payloadRaw: '',
    signatureRaw: '',
    rawToken: trimmed,
    isValidStructure: false,
    timeStatus: 'no-expiry'
  }

  if (!trimmed) {
    return defaultResult
  }

  const parts = trimmed.split('.')
  if (parts.length < 2 || parts.length > 3) {
    return {
      ...defaultResult,
      isValidStructure: false,
      error: `Invalid JWT format. Expected 2 or 3 dot-separated segments, got ${parts.length}.`
    }
  }

  const [headerPart, payloadPart, signaturePart = ''] = parts

  let header: JwtHeader = { alg: 'none' }
  let payload: JwtPayload = {}
  let headerRaw = ''
  let payloadRaw = ''

  try {
    headerRaw = base64UrlDecode(headerPart)
    header = JSON.parse(headerRaw)
  } catch (err: any) {
    return {
      ...defaultResult,
      headerRaw,
      signatureRaw: signaturePart,
      isValidStructure: false,
      error: `Failed to decode JWT Header: ${err?.message || 'Invalid Base64URL or JSON'}`
    }
  }

  try {
    payloadRaw = base64UrlDecode(payloadPart)
    payload = JSON.parse(payloadRaw)
  } catch (err: any) {
    return {
      ...defaultResult,
      header,
      headerRaw,
      payloadRaw,
      signatureRaw: signaturePart,
      isValidStructure: false,
      error: `Failed to decode JWT Payload: ${err?.message || 'Invalid Base64URL or JSON'}`
    }
  }

  // Calculate timing claims
  let issuedAt: JwtClaimTimeInfo | undefined
  let expiresAt: JwtClaimTimeInfo | undefined
  let notBefore: JwtClaimTimeInfo | undefined
  let timeStatus: 'active' | 'expired' | 'future' | 'no-expiry' = 'no-expiry'

  if (typeof payload.iat === 'number' && !isNaN(payload.iat)) {
    issuedAt = computeClaimTimeInfo(payload.iat)
  }

  if (typeof payload.nbf === 'number' && !isNaN(payload.nbf)) {
    notBefore = computeClaimTimeInfo(payload.nbf)
  }

  if (typeof payload.exp === 'number' && !isNaN(payload.exp)) {
    expiresAt = computeClaimTimeInfo(payload.exp)
    if (expiresAt.isPast) {
      timeStatus = 'expired'
    } else if (notBefore && !notBefore.isPast) {
      timeStatus = 'future'
    } else {
      timeStatus = 'active'
    }
  } else if (notBefore && !notBefore.isPast) {
    timeStatus = 'future'
  }

  return {
    header,
    payload,
    signature: signaturePart,
    headerRaw,
    payloadRaw,
    signatureRaw: signaturePart,
    rawToken: trimmed,
    isValidStructure: true,
    issuedAt,
    expiresAt,
    notBefore,
    timeStatus
  }
}

/**
 * Maps JWT algorithm name to Web Crypto subtle HMAC hash algorithm
 */
function getHmacSubtleAlgorithm(alg: string): 'SHA-256' | 'SHA-384' | 'SHA-512' | null {
  const upper = alg.toUpperCase()
  switch (upper) {
    case 'HS256':
      return 'SHA-256'
    case 'HS384':
      return 'SHA-384'
    case 'HS512':
      return 'SHA-512'
    default:
      return null
  }
}

/**
 * Computes HMAC signature for JWT signing input using Web Crypto API
 */
async function computeHmacSignature(
  signingInput: string,
  secret: string,
  subtleAlgo: 'SHA-256' | 'SHA-384' | 'SHA-512',
  isBase64Secret = false
): Promise<string> {
  const encoder = new TextEncoder()
  const keyBytes = isBase64Secret ? base64UrlToBytes(secret) : encoder.encode(secret)
  const dataBytes = encoder.encode(signingInput)

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment')
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: { name: subtleAlgo } },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    dataBytes as unknown as BufferSource
  )
  return bytesToBase64Url(new Uint8Array(signatureBuffer))
}

/**
 * Verifies JWT signature offline using local secret
 */
export async function verifyJwtSignature(
  token: string,
  options: JwtVerifyOptions
): Promise<JwtVerifyResult> {
  const { secret, isBase64Secret = false } = options
  const decoded = decodeJwt(token)

  if (!decoded.isValidStructure) {
    return {
      isValid: false,
      algorithm: decoded.header?.alg || 'UNKNOWN',
      message: decoded.error || 'Invalid token structure',
      isSupportedAlgorithm: false
    }
  }

  const alg = decoded.header?.alg || ''
  if (!alg || alg.toLowerCase() === 'none') {
    return {
      isValid: !decoded.signature,
      algorithm: 'none',
      message: decoded.signature
        ? 'Algorithm is "none" but signature is present.'
        : 'Token uses algorithm "none" (unsecured token).',
      isSupportedAlgorithm: true
    }
  }

  const hmacAlgo = getHmacSubtleAlgorithm(alg)
  if (!hmacAlgo) {
    return {
      isValid: false,
      algorithm: alg,
      message: `Algorithm '${alg}' is not an HMAC symmetric algorithm (HS256/HS384/HS512). Asymmetric verification (RS256/ES256) requires public key.`,
      isSupportedAlgorithm: false
    }
  }

  if (!secret) {
    return {
      isValid: false,
      algorithm: alg,
      message: 'Secret key is required to verify signature.',
      isSupportedAlgorithm: true
    }
  }

  try {
    const parts = token.trim().split('.')
    const signingInput = `${parts[0]}.${parts[1]}`
    const expectedSig = await computeHmacSignature(signingInput, secret, hmacAlgo, isBase64Secret)
    const actualSig = decoded.signature

    const isValid = expectedSig === actualSig

    return {
      isValid,
      algorithm: alg,
      expectedSignature: expectedSig,
      message: isValid
        ? 'Signature verified successfully (HMAC match).'
        : 'Signature verification failed (Signature mismatch).',
      isSupportedAlgorithm: true
    }
  } catch (err: any) {
    return {
      isValid: false,
      algorithm: alg,
      message: `Signature verification error: ${err?.message || String(err)}`,
      isSupportedAlgorithm: true
    }
  }
}

/**
 * Creates and signs a new JWT token offline
 */
export async function signJwt(options: JwtSignOptions): Promise<string> {
  const {
    header: headerInput,
    payload: payloadInput,
    secret,
    isBase64Secret = false,
    algorithm = 'HS256'
  } = options

  const headerObj =
    typeof headerInput === 'string' ? JSON.parse(headerInput) : { ...headerInput }
  const payloadObj =
    typeof payloadInput === 'string' ? JSON.parse(payloadInput) : { ...payloadInput }

  headerObj.alg = algorithm
  if (!headerObj.typ) headerObj.typ = 'JWT'

  const headerEncoded = base64UrlEncode(JSON.stringify(headerObj))
  const payloadEncoded = base64UrlEncode(JSON.stringify(payloadObj))
  const signingInput = `${headerEncoded}.${payloadEncoded}`

  if (algorithm === ('none' as any) || !secret) {
    return `${signingInput}.`
  }

  const hmacAlgo = getHmacSubtleAlgorithm(algorithm)
  if (!hmacAlgo) {
    throw new Error(`Unsupported signing algorithm: ${algorithm}`)
  }

  const signature = await computeHmacSignature(signingInput, secret, hmacAlgo, isBase64Secret)
  return `${signingInput}.${signature}`
}
