import { registerTaskHandler } from '../../../core/workers/task-registry'
import { encodeBase64, decodeBase64 } from '../services/base64-service'
import { encodeUrl, decodeUrl } from '../services/url-service'
import { encodeHex, decodeHex } from '../services/hex-service'
import { encodeHtmlEntities, decodeHtmlEntities } from '../services/html-entities-service'
import type {
  EncoderMode,
  ConversionDirection,
  Base64Options,
  Base64Result,
  UrlOptions,
  UrlResult,
  HexOptions,
  HexResult,
  HtmlEntitiesOptions,
  HtmlEntitiesResult
} from '../types'

/**
 * Register all Encoders / Decoders Worker Handlers
 */
export function registerEncodersTaskHandlers(): void {
  // Base64 Encode
  registerTaskHandler<{ input: string; options?: Base64Options } | string, Base64Result>(
    'encoders',
    'base64-encode',
    async (data, options) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      const opt = typeof data === 'object' ? { ...data.options, ...options } : options
      return encodeBase64(input, opt)
    }
  )

  // Base64 Decode
  registerTaskHandler<{ input: string } | string, Base64Result>(
    'encoders',
    'base64-decode',
    async (data) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      return decodeBase64(input)
    }
  )

  // URL Encode
  registerTaskHandler<{ input: string; options?: UrlOptions } | string, UrlResult>(
    'encoders',
    'url-encode',
    async (data, options) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      const opt = typeof data === 'object' ? { ...data.options, ...options } : options
      return encodeUrl(input, opt)
    }
  )

  // URL Decode
  registerTaskHandler<{ input: string; options?: UrlOptions } | string, UrlResult>(
    'encoders',
    'url-decode',
    async (data, options) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      const opt = typeof data === 'object' ? { ...data.options, ...options } : options
      return decodeUrl(input, opt)
    }
  )

  // Hex Encode
  registerTaskHandler<{ input: string; options?: HexOptions } | string, HexResult>(
    'encoders',
    'hex-encode',
    async (data, options) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      const opt = typeof data === 'object' ? { ...data.options, ...options } : options
      return encodeHex(input, opt)
    }
  )

  // Hex Decode
  registerTaskHandler<{ input: string } | string, HexResult>(
    'encoders',
    'hex-decode',
    async (data) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      return decodeHex(input)
    }
  )

  // HTML Entities Encode
  registerTaskHandler<{ input: string; options?: HtmlEntitiesOptions } | string, HtmlEntitiesResult>(
    'encoders',
    'html-encode',
    async (data, options) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      const opt = typeof data === 'object' ? { ...data.options, ...options } : options
      return encodeHtmlEntities(input, opt)
    }
  )

  // HTML Entities Decode
  registerTaskHandler<{ input: string } | string, HtmlEntitiesResult>(
    'encoders',
    'html-decode',
    async (data) => {
      const input = typeof data === 'string' ? data : data?.input || ''
      return decodeHtmlEntities(input)
    }
  )

  // Unified Transform
  registerTaskHandler<
    {
      input: string
      mode: EncoderMode
      direction: ConversionDirection
      options?: Record<string, any>
    },
    any
  >('encoders', 'transform', async (payload) => {
    const { input, mode, direction, options = {} } = payload
    if (mode === 'base64') {
      return direction === 'encode' ? encodeBase64(input, options) : decodeBase64(input)
    } else if (mode === 'url') {
      return direction === 'encode' ? encodeUrl(input, options) : decodeUrl(input, options)
    } else if (mode === 'hex') {
      return direction === 'encode' ? encodeHex(input, options) : decodeHex(input)
    } else if (mode === 'html-entities') {
      return direction === 'encode' ? encodeHtmlEntities(input, options) : decodeHtmlEntities(input)
    }
    throw new Error(`Unsupported encoder mode: ${mode}`)
  })
}

// Auto-register handlers on load
registerEncodersTaskHandlers()
