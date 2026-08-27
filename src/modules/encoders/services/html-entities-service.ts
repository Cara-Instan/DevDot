import type { HtmlEntitiesOptions, HtmlEntitiesResult } from '../types'

const NAMED_ENTITIES_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '¢': '&cent;',
  '£': '&pound;',
  '¥': '&yen;',
  '€': '&euro;',
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',
  '§': '&sect;',
  '°': '&deg;',
  '±': '&plusmn;',
  '×': '&times;',
  '÷': '&divide;',
  'µ': '&micro;',
  '·': '&middot;',
  '…': '&hellip;',
  '–': '&ndash;',
  '—': '&mdash;',
  '“': '&ldquo;',
  '”': '&rdquo;',
  '‘': '&lsquo;',
  '’': '&rsquo;',
  '«': '&laquo;',
  '»': '&raquo;',
  ' ': '&nbsp;'
}

const REVERSE_NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&cent;': '¢',
  '&pound;': '£',
  '&yen;': '¥',
  '&euro;': '€',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&sect;': '§',
  '&deg;': '°',
  '&plusmn;': '±',
  '&times;': '×',
  '&divide;': '÷',
  '&micro;': 'µ',
  '&middot;': '·',
  '&hellip;': '…',
  '&ndash;': '–',
  '&mdash;': '—',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&laquo;': '«',
  '&raquo;': '»',
  '&nbsp;': ' '
}

/**
 * Encodes string to HTML entities
 */
export function encodeHtmlEntities(
  input: string,
  options: HtmlEntitiesOptions = {}
): HtmlEntitiesResult {
  const mode = options.mode || 'named'
  let count = 0

  let output = ''

  if (mode === 'named') {
    output = input.replace(/[&<>"'¢£¥€©®™§°±×÷µ·…–—“”‘’«»]/g, (char) => {
      count++
      return NAMED_ENTITIES_MAP[char] || `&#${char.codePointAt(0)};`
    })
  } else if (mode === 'decimal') {
    output = input.replace(/[\s\S]/g, (char) => {
      const code = char.codePointAt(0) || 0
      if (options.encodeNonAsciiOnly && code < 128 && !['&', '<', '>', '"', "'"].includes(char)) {
        return char
      }
      count++
      return `&#${code};`
    })
  } else if (mode === 'hex') {
    output = input.replace(/[\s\S]/g, (char) => {
      const code = char.codePointAt(0) || 0
      if (options.encodeNonAsciiOnly && code < 128 && !['&', '<', '>', '"', "'"].includes(char)) {
        return char
      }
      count++
      return `&#x${code.toString(16).toUpperCase()};`
    })
  }

  return {
    output,
    entitiesCount: count
  }
}

/**
 * Decodes HTML entities to plain text
 */
export function decodeHtmlEntities(input: string): HtmlEntitiesResult {
  let count = 0

  const output = input.replace(/&[a-zA-Z0-9#x]+;/g, (match) => {
    count++
    // Check known named entity
    if (REVERSE_NAMED_ENTITIES[match.toLowerCase()]) {
      return REVERSE_NAMED_ENTITIES[match.toLowerCase()]
    }

    // Hex numeric entity &#xHH;
    if (match.startsWith('&#x') || match.startsWith('&#X')) {
      const hex = match.slice(3, -1)
      const code = parseInt(hex, 16)
      if (!isNaN(code)) {
        return String.fromCodePoint(code)
      }
    }

    // Decimal numeric entity &#DD;
    if (match.startsWith('&#')) {
      const dec = match.slice(2, -1)
      const code = parseInt(dec, 10)
      if (!isNaN(code)) {
        return String.fromCodePoint(code)
      }
    }

    return match
  })

  return {
    output,
    entitiesCount: count
  }
}
