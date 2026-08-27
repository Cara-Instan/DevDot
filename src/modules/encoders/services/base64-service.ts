import type { Base64Options, Base64Result } from '../types'

/**
 * Encodes a Uint8Array to a Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Decodes a Base64 string to a Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  // Normalize URL-safe characters and padding
  let normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
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
 * Encode a string to Base64 (UTF-8 safe)
 */
export function encodeBase64(input: string, options: Base64Options = {}): Base64Result {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  let base64 = bytesToBase64(bytes)

  if (options.urlSafe) {
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_')
    if (options.pad === false) {
      base64 = base64.replace(/=+$/, '')
    }
  }

  if (options.dataUriPrefix) {
    const mime = options.mimeType || 'text/plain;charset=utf-8'
    base64 = `data:${mime};base64,${base64}`
  }

  return {
    output: base64,
    byteLength: bytes.byteLength,
    isDataUri: !!options.dataUriPrefix,
    mimeType: options.mimeType
  }
}

/**
 * Decode a Base64 string or Data URI to text (UTF-8 safe)
 */
export function decodeBase64(input: string): Base64Result {
  let cleaned = input.trim()
  let isDataUri = false
  let mimeType: string | undefined

  // Check if input is a Data URI
  const dataUriMatch = cleaned.match(/^data:([^;]+)?(?:;charset=[^;]+)?;base64,(.*)$/s)
  if (dataUriMatch) {
    isDataUri = true
    mimeType = dataUriMatch[1] || 'application/octet-stream'
    cleaned = dataUriMatch[2].trim()
  }

  const bytes = base64ToBytes(cleaned)
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const text = decoder.decode(bytes)

  return {
    output: text,
    byteLength: bytes.byteLength,
    isDataUri,
    mimeType
  }
}

/**
 * Convert File / Blob to Data URI and raw Base64 string
 */
export async function fileToBase64(
  file: File | Blob
): Promise<{ base64: string; dataUri: string; mimeType: string; size: number; fileName?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = reader.result as string
      const match = dataUri.match(/^data:([^;]+);base64,(.*)$/)
      const mimeType = match ? match[1] : file.type || 'application/octet-stream'
      const base64 = match ? match[2] : ''

      resolve({
        base64,
        dataUri,
        mimeType,
        size: file.size,
        fileName: 'name' in file ? (file as File).name : undefined
      })
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}
