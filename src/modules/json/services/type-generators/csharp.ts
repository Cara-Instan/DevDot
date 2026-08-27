import type { CSharpOptions } from '../../types'

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'Class'
}

const CSHARP_KEYWORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'record', 'ref', 'return', 'sbyte',
  'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong',
  'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while'
])

function sanitizeCSharpPropName(name: string): string {
  const pascal = toPascalCase(name)
  if (CSHARP_KEYWORDS.has(pascal) || /^\d/.test(pascal)) {
    return `@${pascal}`
  }
  return pascal
}

export function generateCSharp(
  data: any,
  options: Partial<CSharpOptions> = {}
): { code: string; typeCount: number } {
  const {
    rootName = 'Root',
    useSystemTextJson = true,
    useRecords = false,
    namespace
  } = options

  const typesMap = new Map<string, string>()

  function inferCSharpType(value: any, keyHint: string): string {
    if (value === null || value === undefined) {
      return 'object?'
    }

    const type = typeof value

    if (type === 'string') {
      // Check if ISO date string
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'DateTimeOffset'
      }
      return 'string'
    }
    if (type === 'boolean') return 'bool'
    if (type === 'number') {
      if (Number.isInteger(value)) {
        return value > 2147483647 || value < -2147483648 ? 'long' : 'int'
      }
      return 'double'
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'List<object>'
      }

      const sampleObjects: any[] = []
      let primitiveType = ''

      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          sampleObjects.push(item)
        } else {
          primitiveType = inferCSharpType(item, `${keyHint}Item`)
        }
      }

      if (sampleObjects.length > 0) {
        const mergedObj: Record<string, any> = {}
        for (const obj of sampleObjects) {
          for (const k of Object.keys(obj)) {
            mergedObj[k] = obj[k]
          }
        }
        const itemTypeName = toPascalCase(keyHint.endsWith('s') ? keyHint.slice(0, -1) : `${keyHint}Item`)
        generateCSharpType(mergedObj, itemTypeName)
        return `List<${itemTypeName}>`
      }

      return `List<${primitiveType || 'object'}>`
    }

    if (type === 'object') {
      const typeName = toPascalCase(keyHint)
      generateCSharpType(value, typeName)
      return typeName
    }

    return 'object'
  }

  function generateCSharpType(obj: Record<string, any>, typeName: string): void {
    if (typesMap.has(typeName)) return

    const props: { rawKey: string; propName: string; csType: string }[] = []

    for (const [key, val] of Object.entries(obj)) {
      const propName = sanitizeCSharpPropName(key)
      const csType = inferCSharpType(val, key)
      props.push({ rawKey: key, propName, csType })
    }

    const lines: string[] = []

    if (useRecords) {
      lines.push(`public record ${typeName}(`)
      const paramLines = props.map((p, i) => {
        const isLast = i === props.length - 1
        const comma = isLast ? '' : ','
        const jsonAttr = useSystemTextJson ? `[property: JsonPropertyName("${p.rawKey}")] ` : ''
        return `    ${jsonAttr}${p.csType} ${p.propName}${comma}`
      })
      lines.push(paramLines.join('\n'))
      lines.push(`);`)
    } else {
      lines.push(`public class ${typeName}`)
      lines.push(`{`)
      for (const p of props) {
        if (useSystemTextJson) {
          lines.push(`    [JsonPropertyName("${p.rawKey}")]`)
        }
        lines.push(`    public ${p.csType} ${p.propName} { get; set; } = default!;`)
        lines.push('')
      }
      lines.push(`}`)
    }

    typesMap.set(typeName, lines.join('\n'))
  }

  const rootTypeName = toPascalCase(rootName)
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    generateCSharpType(data, rootTypeName)
  } else if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      generateCSharpType(data[0], rootTypeName)
    }
  }

  const imports: string[] = [
    'using System;',
    'using System.Collections.Generic;'
  ]
  if (useSystemTextJson) {
    imports.push('using System.Text.Json.Serialization;')
  }

  const codeBlocks: string[] = [imports.join('\n'), '']

  if (namespace?.trim()) {
    codeBlocks.push(`namespace ${namespace.trim()}`)
    codeBlocks.push(`{`)
    for (const block of typesMap.values()) {
      const indented = block.split('\n').map((l) => (l ? `    ${l}` : '')).join('\n')
      codeBlocks.push(indented)
      codeBlocks.push('')
    }
    codeBlocks.push(`}`)
  } else {
    for (const block of typesMap.values()) {
      codeBlocks.push(block)
      codeBlocks.push('')
    }
  }

  return {
    code: codeBlocks.join('\n').trim(),
    typeCount: typesMap.size
  }
}
