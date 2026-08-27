import type { HexOptions, HexResult } from '../types'

/**
 * Encodes text to Hexadecimal string (UTF-8)
 */
export function encodeHex(input: string, options: HexOptions = {}): HexResult {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  const hexParts: string[] = []

  const delimiter = options.delimiter ?? 'none'
  const uppercase = !!options.uppercase

  for (let i = 0; i < bytes.length; i++) {
    let hex = bytes[i].toString(16).padStart(2, '0')
    if (uppercase) hex = hex.toUpperCase()

    if (delimiter === '0x') {
      hexParts.push('0x' + hex)
    } else {
      hexParts.push(hex)
    }
  }

  let separator = ''
  if (delimiter === 'space' || delimiter === '0x') separator = ' '
  else if (delimiter === 'comma') separator = ', '
  else if (delimiter === 'colon') separator = ':'

  return {
    output: hexParts.join(separator),
    byteCount: bytes.length
  }
}

/**
 * Decodes Hexadecimal string to text (UTF-8)
 */
export function decodeHex(input: string): HexResult {
  // Strip common hex prefixes, delimiters, and whitespace
  const sanitized = input
    .replace(/0x/gi, '')
    .replace(/[^0-9a-fA-F]/g, '')

  const byteLength = Math.floor(sanitized.length / 2)
  const bytes = new Uint8Array(byteLength)

  for (let i = 0; i < byteLength; i++) {
    const byteHex = sanitized.substring(i * 2, i * 2 + 2)
    bytes[i] = parseInt(byteHex, 16)
  }

  const decoder = new TextDecoder('utf-8', { fatal: false })
  const text = decoder.decode(bytes)

  return {
    output: text,
    byteCount: byteLength
  }
}
