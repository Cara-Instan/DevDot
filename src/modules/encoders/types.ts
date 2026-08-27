export type EncoderMode = 'base64' | 'url' | 'hex' | 'html-entities'
export type ConversionDirection = 'encode' | 'decode'

export interface Base64Options {
  urlSafe?: boolean
  pad?: boolean
  dataUriPrefix?: boolean
  mimeType?: string
}

export interface Base64Result {
  output: string
  byteLength: number
  isDataUri?: boolean
  mimeType?: string
  fileName?: string
}

export interface UrlOptions {
  mode?: 'component' | 'full-uri' | 'rfc3986'
  spaceAsPlus?: boolean
}

export interface UrlResult {
  output: string
  charCount: number
}

export interface HexOptions {
  delimiter?: 'none' | 'space' | 'comma' | 'colon' | '0x'
  uppercase?: boolean
  bytesPerLine?: number
}

export interface HexResult {
  output: string
  byteCount: number
}

export interface HtmlEntitiesOptions {
  mode?: 'named' | 'decimal' | 'hex'
  encodeNonAsciiOnly?: boolean
  encodeQuotes?: boolean
}

export interface HtmlEntitiesResult {
  output: string
  entitiesCount: number
}
