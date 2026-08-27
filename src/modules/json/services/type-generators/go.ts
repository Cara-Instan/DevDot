import type { GoOptions } from '../../types'

const COMMON_INITIALISMS = new Set([
  'API', 'ASCII', 'CPU', 'CSS', 'DNS', 'EOF', 'GUID', 'HTML', 'HTTP',
  'HTTPS', 'ID', 'IP', 'JSON', 'LHS', 'QPS', 'RAM', 'RHS', 'RPC',
  'SLA', 'SMTP', 'SQL', 'SSH', 'TCP', 'TLS', 'TTL', 'UDP', 'UI',
  'UID', 'UUID', 'URI', 'URL', 'UTF8', 'VM', 'XML', 'XMP', 'XSRF', 'XSS'
])

function toGoFieldName(str: string): string {
  // Split on delimiters or casing changes
  const words = str
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)

  const result = words.map((w) => {
    const upper = w.toUpperCase()
    if (COMMON_INITIALISMS.has(upper)) {
      return upper
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  }).join('')

  return result || 'Field'
}

function toGoStructName(str: string): string {
  const name = toGoFieldName(str)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function generateGo(
  data: any,
  options: Partial<GoOptions> = {}
): { code: string; typeCount: number } {
  const {
    rootName = 'Root',
    includeJsonTags = true,
    includeYamlTags = false,
    includeXmlTags = false,
    omitempty = false,
    usePointersForNullable = false
  } = options

  const structs: Map<string, string> = new Map()

  function inferGoType(value: any, keyHint: string): string {
    if (value === null) {
      return usePointersForNullable ? '*string' : 'any'
    }

    const type = typeof value

    if (type === 'string') return 'string'
    if (type === 'boolean') return 'bool'
    if (type === 'number') {
      return Number.isInteger(value) ? 'int64' : 'float64'
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]any'
      }

      // Check array items
      const sampleObjects: any[] = []
      let itemPrimitiveType = ''

      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          sampleObjects.push(item)
        } else {
          itemPrimitiveType = inferGoType(item, `${keyHint}Item`)
        }
      }

      if (sampleObjects.length > 0) {
        const mergedObj: Record<string, any> = {}
        for (const obj of sampleObjects) {
          for (const k of Object.keys(obj)) {
            mergedObj[k] = obj[k]
          }
        }
        const structName = toGoStructName(keyHint.endsWith('s') ? keyHint.slice(0, -1) : `${keyHint}Item`)
        generateGoStruct(mergedObj, structName)
        return `[]${structName}`
      }

      return `[]${itemPrimitiveType || 'any'}`
    }

    if (type === 'object') {
      const structName = toGoStructName(keyHint)
      generateGoStruct(value, structName)
      return structName
    }

    return 'any'
  }

  function generateGoStruct(obj: Record<string, any>, name: string): void {
    if (structs.has(name)) {
      return
    }

    const lines: string[] = []
    lines.push(`type ${name} struct {`)

    const keys = Object.keys(obj)
    for (const key of keys) {
      const val = obj[key]
      const fieldName = toGoFieldName(key)
      let fieldType = inferGoType(val, key)

      if (val === null && usePointersForNullable) {
        fieldType = '*string'
      }

      const tags: string[] = []
      const omitSuffix = omitempty ? ',omitempty' : ''

      if (includeJsonTags) {
        tags.push(`json:"${key}${omitSuffix}"`)
      }
      if (includeYamlTags) {
        tags.push(`yaml:"${key}${omitSuffix}"`)
      }
      if (includeXmlTags) {
        tags.push(`xml:"${key}${omitSuffix}"`)
      }

      const tagString = tags.length > 0 ? ` \`${tags.join(' ')}\`` : ''
      lines.push(`\t${fieldName}\t${fieldType}${tagString}`)
    }

    lines.push('}')
    structs.set(name, lines.join('\n'))
  }

  const rootStruct = toGoStructName(rootName)

  if (Array.isArray(data)) {
    const itemType = inferGoType(data, rootStruct)
    const code = `type ${rootStruct} ${itemType}`
    return { code, typeCount: 1 }
  } else if (data !== null && typeof data === 'object') {
    generateGoStruct(data, rootStruct)
    const allCode = Array.from(structs.values()).join('\n\n')
    return { code: allCode, typeCount: structs.size }
  } else {
    const primitiveType = inferGoType(data, rootStruct)
    const code = `type ${rootStruct} ${primitiveType}`
    return { code, typeCount: 1 }
  }
}
