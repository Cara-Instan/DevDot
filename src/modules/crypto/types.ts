export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512'

export interface HashOptions {
  uppercase?: boolean
  hmacSecret?: string
}

export interface MultiHashResult {
  md5: string
  sha1: string
  sha256: string
  sha512: string
  isHmac: boolean
  matchedAlgorithm?: HashAlgorithm | null
}

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

