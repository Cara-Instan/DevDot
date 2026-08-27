import { registerTaskHandler } from '../../../core/workers/task-registry'
import { computeHash, computeMultiHash, computeFileChecksums } from '../services/hash-service'
import { generateBcryptHash, verifyBcryptHash, parseBcryptHash } from '../services/bcrypt-service'
import { detectHashType, reverseLookupHash } from '../services/hash-lookup-service'
import { encryptAes, decryptAes } from '../services/aes-cipher-service'
import { generateBatchIds, decodeUlid } from '../services/id-generator-service'
import { decodeJwt, verifyJwtSignature, signJwt } from '../services/jwt-service'
import type {
  HashAlgorithm,
  HashOptions,
  MultiHashResult,
  FileChecksumResult,
  BcryptHashOptions,
  BcryptHashResult,
  BcryptVerifyResult,
  BcryptParsedInfo,
  DetectedHashType,
  HashLookupOptions,
  HashLookupResult,
  AesEncryptOptions,
  AesEncryptResult,
  AesDecryptOptions,
  AesDecryptResult,
  IdGeneratorOptions,
  IdGeneratorResult,
  UlidDecodedInfo,
  JwtDecoded,
  JwtVerifyResult,
  JwtSignOptions
} from '../types'

/**
 * Register all Crypto, Hashing, Bcrypt, Cipher & ID Generator Worker Handlers
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

  // Multi-Hash Computation (MD5, SHA-1, SHA-256, SHA-384, SHA-512, CRC32)
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

  // File Checksum Computation
  registerTaskHandler<
    { fileData: ArrayBuffer; fileName: string; uppercase?: boolean },
    FileChecksumResult
  >('crypto', 'file-checksum', async (payload) => {
    return computeFileChecksums(payload.fileData, payload.fileName, payload.uppercase)
  })

  // Bcrypt Generate Hash
  registerTaskHandler<
    { password: string; options?: BcryptHashOptions },
    BcryptHashResult
  >('crypto', 'bcrypt-hash', async (payload) => {
    return generateBcryptHash(payload.password, payload.options)
  })

  // Bcrypt Verify Hash
  registerTaskHandler<
    { password: string; hash: string },
    BcryptVerifyResult
  >('crypto', 'bcrypt-verify', async (payload) => {
    return verifyBcryptHash(payload.password, payload.hash)
  })

  // Bcrypt Parse / Inspect Hash
  registerTaskHandler<
    { hash: string } | string,
    BcryptParsedInfo
  >('crypto', 'bcrypt-parse', async (data) => {
    const hash = typeof data === 'string' ? data : data.hash || ''
    return parseBcryptHash(hash)
  })

  // Hash Auto-Type Detector
  registerTaskHandler<
    { hash: string } | string,
    DetectedHashType[]
  >('crypto', 'detect-hash', async (data) => {
    const hash = typeof data === 'string' ? data : data.hash || ''
    return detectHashType(hash)
  })

  // Hash Reverse Lookup ("Decrypt" / Preimage Search)
  registerTaskHandler<
    { targetHash: string; options?: HashLookupOptions },
    HashLookupResult
  >('crypto', 'hash-lookup', async (payload) => {
    return reverseLookupHash(payload.targetHash, payload.options)
  })

  // Symmetric AES Encrypt
  registerTaskHandler<
    { plaintext: string; options: AesEncryptOptions },
    AesEncryptResult
  >('crypto', 'aes-encrypt', async (payload) => {
    return encryptAes(payload.plaintext, payload.options)
  })

  // Symmetric AES Decrypt
  registerTaskHandler<
    AesDecryptOptions,
    AesDecryptResult
  >('crypto', 'aes-decrypt', async (payload) => {
    return decryptAes(payload)
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
