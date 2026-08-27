import { registerTaskHandler } from '../../../core/workers/task-registry'
import { computeHash, computeMultiHash } from '../services/hash-service'
import { generateBatchIds, decodeUlid } from '../services/id-generator-service'
import { decodeJwt, verifyJwtSignature, signJwt } from '../services/jwt-service'
import type {
  HashAlgorithm,
  HashOptions,
  MultiHashResult,
  IdGeneratorOptions,
  IdGeneratorResult,
  UlidDecodedInfo,
  JwtDecoded,
  JwtVerifyResult,
  JwtSignOptions
} from '../types'

/**
 * Register all Crypto & ID Generator Worker Handlers
 */
export function registerCryptoTaskHandlers(): void {
  // Single Hash Computation
  registerTaskHandler<
    { algorithm: HashAlgorithm; input: string; options?: HashOptions },
    { hash: string; algorithm: HashAlgorithm }
  >('crypto', 'hash', async (payload) => {
    const { algorithm, input, options = {} } = payload
    const hash = await computeHash(algorithm, input, options)
    return { hash, algorithm }
  })

  // Multi-Hash Computation (MD5, SHA-1, SHA-256, SHA-512 simultaneously)
  registerTaskHandler<
    { input: string; options?: HashOptions; hashToMatch?: string } | string,
    MultiHashResult
  >('crypto', 'multi-hash', async (data, options) => {
    let input = ''
    let hashOptions: HashOptions = options || {}
    let hashToMatch: string | undefined

    if (typeof data === 'string') {
      input = data
    } else if (data && typeof data === 'object') {
      input = data.input || ''
      hashOptions = { ...data.options, ...options }
      hashToMatch = data.hashToMatch
    }

    return computeMultiHash(input, hashOptions, hashToMatch)
  })

  // Batch ID Generation (UUID, ULID, NanoID)
  registerTaskHandler<IdGeneratorOptions, IdGeneratorResult>(
    'crypto',
    'generate-ids',
    async (options) => {
      return generateBatchIds(options)
    }
  )

  // Decode ULID Timestamp
  registerTaskHandler<{ ulid: string } | string, UlidDecodedInfo>(
    'crypto',
    'decode-ulid',
    async (data) => {
      const ulid = typeof data === 'string' ? data : data.ulid || ''
      return decodeUlid(ulid)
    }
  )

  // Decode JWT (Header, Payload, Signature, Claims)
  registerTaskHandler<{ token: string } | string, JwtDecoded>(
    'crypto',
    'decode-jwt',
    async (data) => {
      const token = typeof data === 'string' ? data : data.token || ''
      return decodeJwt(token)
    }
  )

  // Verify JWT Signature (HMAC-SHA256, HMAC-SHA384, HMAC-SHA512)
  registerTaskHandler<
    { token: string; secret: string; isBase64Secret?: boolean },
    JwtVerifyResult
  >('crypto', 'verify-jwt', async (payload) => {
    return verifyJwtSignature(payload.token, {
      secret: payload.secret,
      isBase64Secret: payload.isBase64Secret
    })
  })

  // Sign new JWT
  registerTaskHandler<JwtSignOptions, { token: string }>(
    'crypto',
    'sign-jwt',
    async (payload) => {
      const token = await signJwt(payload)
      return { token }
    }
  )
}

// Auto-register handlers on load
registerCryptoTaskHandlers()

