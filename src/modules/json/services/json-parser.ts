import type { JsonRepairResult } from '../types'

/**
 * Calculates line and column number from string index
 */
export function getLineAndColumn(text: string, index: number): { line: number; column: number } {
  const safeIndex = Math.max(0, Math.min(index, text.length))
  const lines = text.slice(0, safeIndex).split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
}

/**
 * Extracts accurate error location from JSON.parse error message if available
 */
export function parseJsonError(error: Error, text: string): { message: string; line: number; column: number } {
  let line = 1
  let column = 1
  const message = error.message

  // V8 message: "Unexpected token X in JSON at position 123" or "Unexpected token 'X', ... is not valid JSON" or "at line 2 column 5"
  const posMatch = message.match(/at position (\d+)/i)
  if (posMatch && posMatch[1]) {
    const pos = parseInt(posMatch[1], 10)
    const loc = getLineAndColumn(text, pos)
    line = loc.line
    column = loc.column
  } else {
    const lineColMatch = message.match(/line (\d+) column (\d+)/i)
    if (lineColMatch && lineColMatch[1] && lineColMatch[2]) {
      line = parseInt(lineColMatch[1], 10)
      column = parseInt(lineColMatch[2], 10)
    }
  }

  return { message, line, column }
}

/**
 * Intelligent JSON Auto-Repair Engine
 * Converts malformed JSON (JSONC comments, single quotes, unquoted keys, trailing commas, Python literals) into valid standard JSON.
 */
export function repairJson(rawInput: string): JsonRepairResult {
  const repairs: string[] = []
  let text = rawInput.trim()

  if (!text) {
    return {
      repairedText: '{}',
      wasRepaired: true,
      repairs: ['Provided empty input, defaulted to empty object'],
      parsedData: {}
    }
  }

  // 1. Strip comments (JSONC: single line // and multi-line /* */)
  const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm
  if (commentRegex.test(text)) {
    text = text.replace(commentRegex, (match, prefix) => {
      if (match.startsWith('/*')) return ''
      return prefix || ''
    })
    repairs.push('Removed JavaScript/JSONC comments')
  }

  // 2. Normalize non-standard literals (Python/Go True/False/None/nil/undefined) outside quotes
  const literalNormalized = text.replace(
    /\b(True|False|None|nil|undefined|NaN|Infinity|-Infinity)\b/g,
    (match) => {
      switch (match) {
        case 'True': return 'true'
        case 'False': return 'false'
        case 'None':
        case 'nil':
        case 'undefined': return 'null'
        case 'NaN': return '"NaN"'
        case 'Infinity': return '"Infinity"'
        case '-Infinity': return '"-Infinity"'
        default: return match
      }
    }
  )
  if (literalNormalized !== text) {
    text = literalNormalized
    repairs.push('Normalized boolean/null/numeric literals (True/False/None)')
  }

  // 3. Convert Hexadecimal numbers (e.g. 0x1A -> 26) outside quotes
  const hexNormalized = text.replace(/\b0x([0-9a-fA-F]+)\b/g, (_, hex) => {
    return parseInt(hex, 16).toString()
  })
  if (hexNormalized !== text) {
    text = hexNormalized
    repairs.push('Converted hexadecimal numbers to decimal')
  }

  // 4. Tokenizer & State Machine Parser for Strings & Keys
  // This accurately handles unquoted keys, single quoted strings, escaped characters, and trailing commas
  let output = ''
  let i = 0
  const len = text.length

  let hasConvertedSingleQuotes = false
  let hasQuotedKeys = false

  while (i < len) {
    const char = text[i]

    // Handle Double Quoted String (preserve exact content, handle escape sequences)
    if (char === '"') {
      output += '"'
      i++
      while (i < len) {
        const c = text[i]
        output += c
        if (c === '\\' && i + 1 < len) {
          i++
          output += text[i]
        } else if (c === '"') {
          break
        }
        i++
      }
      i++
      continue
    }

    // Handle Single Quoted String (convert to double quote, escape internal unescaped double quotes)
    if (char === "'") {
      hasConvertedSingleQuotes = true
      output += '"'
      i++
      while (i < len) {
        const c = text[i]
        if (c === '\\' && i + 1 < len) {
          const next = text[i + 1]
          if (next === "'") {
            output += "'" // unescape single quote
            i += 2
            continue
          } else {
            output += c + next
            i += 2
            continue
          }
        } else if (c === '"') {
          output += '\\"' // escape double quotes inside single-quoted string
        } else if (c === "'") {
          output += '"'
          break
        } else {
          output += c
        }
        i++
      }
      i++
      continue
    }

    // Handle Unquoted Identifier Keys (e.g. { foo: 123, bar_baz: true, $ref: "test" })
    // If we are at the start of an identifier followed by optional whitespace and ':'
    if (/[a-zA-Z_$]/.test(char)) {
      // Check if this identifier is an object key or just a bare string
      let idEnd = i
      while (idEnd < len && /[a-zA-Z0-9_$-]/.test(text[idEnd])) {
        idEnd++
      }
      const identifier = text.slice(i, idEnd)

      // Look ahead for ':'
      let lookAhead = idEnd
      while (lookAhead < len && /\s/.test(text[lookAhead])) {
        lookAhead++
      }

      if (lookAhead < len && text[lookAhead] === ':') {
        // This is definitely an unquoted object key
        hasQuotedKeys = true
        output += `"${identifier}"`
        i = idEnd
        continue
      } else if (identifier === 'true' || identifier === 'false' || identifier === 'null') {
        output += identifier
        i = idEnd
        continue
      }
    }

    output += char
    i++
  }

  if (hasConvertedSingleQuotes) repairs.push('Converted single quotes to double quotes')
  if (hasQuotedKeys) repairs.push('Added double quotes to unquoted object keys')

  // 5. Remove Trailing Commas in Objects & Arrays:
  // e.g. `{ "a": 1, }` -> `{ "a": 1 }` or `[ 1, 2, , ]` -> `[ 1, 2 ]`
  const trailingCommaRegex = /,(\s*[}\]])/g
  if (trailingCommaRegex.test(output)) {
    output = output.replace(trailingCommaRegex, '$1')
    repairs.push('Removed trailing commas in objects and arrays')
  }

  // 6. Clean trailing semicolons or unneeded wrapping
  output = output.replace(/;+\s*$/, '')

  // 7. Test parsing
  try {
    const parsedData = JSON.parse(output)
    return {
      repairedText: output,
      wasRepaired: repairs.length > 0,
      repairs,
      parsedData
    }
  } catch (firstErr: any) {
    // If standard parsing still fails, attempt secondary lenient fixes (missing commas between lines)
    const lineFix = output.replace(/(["\dtruefalsenull\]}])\s*\n\s*(["{[])/g, '$1,\n$2')
    try {
      const parsedData = JSON.parse(lineFix)
      repairs.push('Added missing commas between consecutive lines')
      return {
        repairedText: lineFix,
        wasRepaired: true,
        repairs,
        parsedData
      }
    } catch {
      // Return the best effort repaired text and throw with original parsed error
      throw firstErr
    }
  }
}

/**
 * Safe JSON Parse with auto-repair capability
 */
export function safeParseJson<T = any>(
  rawText: string,
  options: { autoRepair?: boolean } = {}
): { data: T; wasRepaired: boolean; repairs: string[]; rawRepairedText?: string } {
  const { autoRepair = true } = options

  // Attempt fast standard parse first
  try {
    const data = JSON.parse(rawText)
    return {
      data,
      wasRepaired: false,
      repairs: []
    }
  } catch (initialError: any) {
    if (!autoRepair) {
      throw initialError
    }

    // Try auto-repair
    try {
      const repairResult = repairJson(rawText)
      return {
        data: repairResult.parsedData as T,
        wasRepaired: repairResult.wasRepaired,
        repairs: repairResult.repairs,
        rawRepairedText: repairResult.repairedText
      }
    } catch {
      // Re-throw initial error for accurate reporting
      throw initialError
    }
  }
}
