import type { UrlOptions, UrlResult } from '../types'

/**
 * Encodes string for URL usage
 */
export function encodeUrl(input: string, options: UrlOptions = {}): UrlResult {
  const mode = options.mode || 'component'
  let result = ''

  if (mode === 'full-uri') {
    result = encodeURI(input)
  } else if (mode === 'rfc3986') {
    result = encodeURIComponent(input).replace(/[!'()*]/g, (c) => {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase()
    })
  } else {
    result = encodeURIComponent(input)
  }

  if (options.spaceAsPlus) {
    result = result.replace(/%20/g, '+')
  }

  return {
    output: result,
    charCount: result.length
  }
}

/**
 * Decodes URL-encoded string
 */
export function decodeUrl(input: string, options: UrlOptions = {}): UrlResult {
  let toDecode = input
  if (options.spaceAsPlus) {
    toDecode = toDecode.replace(/\+/g, ' ')
  }

  let result = ''
  try {
    result = decodeURIComponent(toDecode)
  } catch {
    // Fallback for malformed % sequences
    result = unescape(toDecode)
  }

  return {
    output: result,
    charCount: result.length
  }
}
