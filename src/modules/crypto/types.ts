export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'crc32'

export type HashEncoding = 'hex' | 'base64'

export interface HashOptions {
  uppercase?: boolean
  encoding?: HashEncoding
  saltPrefix?: string
  saltSuffix?: string
  hmacSecret?: string
}

export interface MultiHashResult {
  md5: string
  sha1: string
  sha256: string
  sha384: string
  sha512: string
  crc32: string
  isHmac: boolean
  matchedAlgorithm?: HashAlgorithm | null
}

export interface FileChecksumResult {
  fileName: string
  fileSize: number
  md5: string
  sha1: string
  sha256: string
  sha512: string
  crc32: string
  executionTimeMs: number
}

// ==========================================
// Bcrypt Types
// ==========================================

export interface BcryptHashOptions {
  rounds?: number
}

export interface BcryptHashResult {
  hash: string
  rounds: number
  salt: string
  executionTimeMs: number
}

export interface BcryptParsedInfo {
  isValid: boolean
  algorithm: string
  rounds: number
  salt: string
  hashValue: string
  formattedRounds: string
}

export interface BcryptVerifyResult {
  isValid: boolean
  isFormatValid: boolean
  details?: BcryptParsedInfo
  error?: string
  executionTimeMs: number
}

// ==========================================
// Hash Reverse Lookup ("Decrypt") Types
// ==========================================

export interface DetectedHashType {
  name: string
  algorithm: HashAlgorithm | 'bcrypt' | 'unknown'
  bits?: number
  confidence: 'high' | 'medium' | 'low'
  description: string
}

export interface HashLookupOptions {
  includePins?: boolean
  includeCommonWords?: boolean
  customDictionary?: string[]
}

export interface HashLookupResult {
  found: boolean
  plaintext?: string
  algorithm?: HashAlgorithm
  iterationsChecked: number
  executionTimeMs: number
  source?: 'common-passwords' | 'numeric-pin' | 'custom-dictionary'
}

// ==========================================
// AES Symmetric Cipher Types
// ==========================================

export type AesMode = 'GCM' | 'CBC'
export type AesKeySize = 128 | 192 | 256
export type CipherEncoding = 'base64' | 'hex'

export interface AesEncryptOptions {
  passphrase: string
  mode?: AesMode
  keySize?: AesKeySize
  encoding?: CipherEncoding
  customIvHex?: string
}

export interface AesEncryptResult {
  ciphertext: string
  iv: string
  salt?: string
  tag?: string
  mode: AesMode
  encoding: CipherEncoding
  executionTimeMs: number
}

export interface AesDecryptOptions {
  ciphertext: string
  passphrase: string
  iv?: string
  salt?: string
  mode?: AesMode
  encoding?: CipherEncoding
}

export interface AesDecryptResult {
  plaintext: string
  success: boolean
  error?: string
  executionTimeMs: number
}

// ==========================================
// ID Generator Types
// ==========================================

export type IdType = 'uuid' | 'ulid' | 'nanoid'

export interface IdGeneratorOptions {
  type: IdType
  count?: number
  uppercase?: boolean
  hyphens?: boolean // For UUID
  nanoidAlphabet?: string
  nanoidLength?: number
  separator?: '\n' | ', ' | ';'
}

export interface IdGeneratorResult {
  ids: string[]
  formatted: string
  type: IdType
  count: number
}

export interface UlidDecodedInfo {
  timestamp: number
  dateIso: string
  randomness: string
}

// ==========================================
// JWT (JSON Web Token) Types
// ==========================================

export interface JwtHeader {
  alg: string
  typ?: string
  kid?: string
  [key: string]: any
}

export interface JwtPayload {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  [key: string]: any
}

export interface JwtClaimTimeInfo {
  timestamp: number
  dateIso: string
  formatted: string
  relative: string
  isPast: boolean
  remainingSeconds: number
}

export interface JwtDecoded {
  header: JwtHeader
  payload: JwtPayload
  signature: string
  headerRaw: string
  payloadRaw: string
  signatureRaw: string
  rawToken: string
  isValidStructure: boolean
  error?: string
  issuedAt?: JwtClaimTimeInfo
  expiresAt?: JwtClaimTimeInfo
  notBefore?: JwtClaimTimeInfo
  timeStatus: 'active' | 'expired' | 'future' | 'no-expiry'
}

export interface JwtVerifyOptions {
  secret: string
  isBase64Secret?: boolean
}

export interface JwtVerifyResult {
  isValid: boolean
  algorithm: string
  message: string
  expectedSignature?: string
  isSupportedAlgorithm: boolean
}

export interface JwtSignOptions {
  header: JwtHeader | string
  payload: JwtPayload | string
  secret: string
  isBase64Secret?: boolean
  algorithm?: 'HS256' | 'HS384' | 'HS512'
}
