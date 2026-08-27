import { bufferToHex, bufferToBase64 } from './hash-service'
import type {
  AesEncryptOptions,
  AesEncryptResult,
  AesDecryptOptions,
  AesDecryptResult,
  AesMode,
  CipherEncoding
} from '../types'

/**
 * Converts Base64 or Hex string to Uint8Array
 */
function parseCipherBytes(input: string, encoding: CipherEncoding): Uint8Array {
  const clean = input.trim()
  if (encoding === 'hex') {
    const hex = clean.replace(/[^0-9a-fA-F]/g, '')
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return bytes
  } else {
    let normalized = clean.replace(/-/g, '+').replace(/_/g, '/')
    while (normalized.length % 4 !== 0) normalized += '='
    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}

/**
 * Derives CryptoKey from passphrase + salt using PBKDF2 (SHA-256, 100k iterations)
 */
async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array,
  mode: AesMode,
  keySize: number = 256
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase) as unknown as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  const algoName = mode === 'GCM' ? 'AES-GCM' : 'AES-CBC'

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: algoName, length: keySize },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts plaintext string using AES (GCM or CBC) with PBKDF2 derived key
 */
export async function encryptAes(
  plaintext: string,
  options: AesEncryptOptions
): Promise<AesEncryptResult> {
  const start = performance.now()
  const mode: AesMode = options.mode || 'GCM'
  const encoding: CipherEncoding = options.encoding || 'base64'
  const keySize = options.keySize || 256

  // Generate 16-byte random salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Generate IV (12 bytes for GCM, 16 bytes for CBC)
  let iv: Uint8Array
  if (options.customIvHex) {
    const cleanHex = options.customIvHex.replace(/[^0-9a-fA-F]/g, '')
    iv = parseCipherBytes(cleanHex, 'hex')
  } else {
    iv = crypto.getRandomValues(new Uint8Array(mode === 'GCM' ? 12 : 16))
  }

  const key = await deriveAesKey(options.passphrase, salt, mode, keySize)
  const dataBytes = new TextEncoder().encode(plaintext)

  let encryptedBuffer: ArrayBuffer
  if (mode === 'GCM') {
    encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      dataBytes as unknown as BufferSource
    )
  } else {
    encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: iv as unknown as BufferSource },
      key,
      dataBytes as unknown as BufferSource
    )
  }

  const ciphertext =
    encoding === 'base64'
      ? bufferToBase64(encryptedBuffer)
      : bufferToHex(encryptedBuffer)

  const end = performance.now()

  return {
    ciphertext,
    iv: bufferToHex(iv),
    salt: bufferToHex(salt),
    mode,
    encoding,
    executionTimeMs: Math.round((end - start) * 100) / 100
  }
}

/**
 * Decrypts ciphertext back to plaintext string using AES
 */
export async function decryptAes(
  options: AesDecryptOptions
): Promise<AesDecryptResult> {
  const start = performance.now()
  const mode: AesMode = options.mode || 'GCM'
  const encoding: CipherEncoding = options.encoding || 'base64'

  try {
    if (!options.ciphertext.trim()) {
      return {
        plaintext: '',
        success: false,
        error: 'Ciphertext is empty',
        executionTimeMs: 0
      }
    }

    if (!options.passphrase) {
      return {
        plaintext: '',
        success: false,
        error: 'Passphrase / Key is required',
        executionTimeMs: 0
      }
    }

    const cipherBytes = parseCipherBytes(options.ciphertext, encoding)
    const saltBytes = options.salt ? parseCipherBytes(options.salt, 'hex') : new Uint8Array(16)
    const ivBytes = options.iv
      ? parseCipherBytes(options.iv, 'hex')
      : new Uint8Array(mode === 'GCM' ? 12 : 16)

    const key = await deriveAesKey(options.passphrase, saltBytes, mode, 256)

    let decryptedBuffer: ArrayBuffer
    if (mode === 'GCM') {
      decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
        key,
        cipherBytes as unknown as BufferSource
      )
    } else {
      decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: ivBytes as unknown as BufferSource },
        key,
        cipherBytes as unknown as BufferSource
      )
    }

    const plaintext = new TextDecoder().decode(decryptedBuffer)
    const end = performance.now()

    return {
      plaintext,
      success: true,
      executionTimeMs: Math.round((end - start) * 100) / 100
    }
  } catch (err: any) {
    return {
      plaintext: '',
      success: false,
      error: 'Decryption failed: Incorrect key, corrupted ciphertext, or invalid IV/Salt parameters.',
      executionTimeMs: Math.round((performance.now() - start) * 100) / 100
    }
  }
}
