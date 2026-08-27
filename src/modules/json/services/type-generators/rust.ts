import type { RustOptions } from '../../types'

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'field'
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'Struct'
}

const RUST_KEYWORDS = new Set([
  'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern',
  'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
  'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct',
  'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
  'async', 'await', 'dyn', 'abstract', 'become', 'box', 'do', 'final',
  'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield', 'try'
])

export function generateRust(
  data: any,
  options: Partial<RustOptions> = {}
): { code: string; typeCount: number } {
  const {
    rootName = 'Root',
    deriveMacros = ['Default', 'Debug', 'Clone', 'PartialEq', 'Serialize', 'Deserialize'],
    useOptionForNullable = true
  } = options

  const structs: Map<string, string> = new Map()

  function inferRustType(value: any, keyHint: string): string {
    if (value === null) {
      return useOptionForNullable ? 'Option<serde_json::Value>' : 'serde_json::Value'
    }

    const type = typeof value

    if (type === 'string') return 'String'
    if (type === 'boolean') return 'bool'
    if (type === 'number') {
      return Number.isInteger(value) ? 'i64' : 'f64'
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'Vec<serde_json::Value>'
      }

      // Check array items
      const sampleObjects: any[] = []
      let itemPrimitiveType = ''

      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          sampleObjects.push(item)
        } else {
          itemPrimitiveType = inferRustType(item, `${keyHint}Item`)
        }
      }

      if (sampleObjects.length > 0) {
        const mergedObj: Record<string, any> = {}
        for (const obj of sampleObjects) {
          for (const k of Object.keys(obj)) {
            mergedObj[k] = obj[k]
          }
        }
        const structName = toPascalCase(keyHint.endsWith('s') ? keyHint.slice(0, -1) : `${keyHint}Item`)
        generateRustStruct(mergedObj, structName)
        return `Vec<${structName}>`
      }

      return `Vec<${itemPrimitiveType || 'serde_json::Value'}>`
    }

    if (type === 'object') {
      const structName = toPascalCase(keyHint)
      generateRustStruct(value, structName)
      return structName
    }

    return 'serde_json::Value'
  }

  function generateRustStruct(obj: Record<string, any>, name: string): void {
    if (structs.has(name)) {
      return
    }

    const lines: string[] = []
    if (deriveMacros.length > 0) {
      lines.push(`#[derive(${deriveMacros.join(', ')})]`)
    }
    lines.push(`pub struct ${name} {`)

    const keys = Object.keys(obj)
    for (const key of keys) {
      const val = obj[key]
      let rustFieldName = toSnakeCase(key)

      // Handle keywords by prefixing with r#
      if (RUST_KEYWORDS.has(rustFieldName)) {
        rustFieldName = `r#${rustFieldName}`
      }

      let rustType = inferRustType(val, key)
      if (val === null && useOptionForNullable) {
        rustType = 'Option<serde_json::Value>'
      }

      // Add serde rename if original key is different from rustFieldName
      if (key !== rustFieldName) {
        lines.push(`    #[serde(rename = "${key}")]`)
      }

      lines.push(`    pub ${rustFieldName}: ${rustType},`)
    }

    lines.push('}')
    structs.set(name, lines.join('\n'))
  }

  const rootPascal = toPascalCase(rootName)

  const header = [
    'use serde::{Serialize, Deserialize};',
    ''
  ].join('\n')

  if (Array.isArray(data)) {
    const itemType = inferRustType(data, rootPascal)
    const code = `${header}pub type ${rootPascal} = ${itemType};`
    return { code, typeCount: 1 }
  } else if (data !== null && typeof data === 'object') {
    generateRustStruct(data, rootPascal)
    const allStructs = Array.from(structs.values()).join('\n\n')
    return { code: `${header}${allStructs}`, typeCount: structs.size }
  } else {
    const primitiveType = inferRustType(data, rootPascal)
    const code = `${header}pub type ${rootPascal} = ${primitiveType};`
    return { code, typeCount: 1 }
  }
}
