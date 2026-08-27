import type { TypeScriptOptions } from '../../types'

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'Type'
}

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)
}

function formatKey(key: string): string {
  if (isValidIdentifier(key)) return key
  return JSON.stringify(key)
}

export function generateTypeScript(
  data: any,
  options: Partial<TypeScriptOptions> = {}
): { code: string; typeCount: number } {
  const {
    rootName = 'RootObject',
    useInterface = true,
    exportTypes = true,
    optionalFields = false,
    readonlyProperties = false,
    allOptional = false
  } = options

  const interfaces: Map<string, string> = new Map()
  let typeCounter = 0

  function inferType(value: any, keyHint: string): string {
    if (value === null) {
      return 'null'
    }
    if (value === undefined) {
      return 'undefined'
    }

    const type = typeof value

    if (type === 'string') return 'string'
    if (type === 'number') return 'number'
    if (type === 'boolean') return 'boolean'

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'any[]'
      }

      // Collect item types
      const itemTypes = new Set<string>()
      const sampleObjects: any[] = []

      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          sampleObjects.push(item)
        } else {
          itemTypes.add(inferType(item, `${keyHint}Item`))
        }
      }

      if (sampleObjects.length > 0) {
        // Merge objects into unified type
        const mergedObj: Record<string, any> = {}
        for (const obj of sampleObjects) {
          for (const k of Object.keys(obj)) {
            mergedObj[k] = obj[k]
          }
        }
        const objTypeName = toPascalCase(keyHint.endsWith('s') ? keyHint.slice(0, -1) : `${keyHint}Item`)
        generateObjectType(mergedObj, objTypeName)
        itemTypes.add(objTypeName)
      }

      const typesArray = Array.from(itemTypes)
      if (typesArray.length === 1) {
        return `${typesArray[0]}[]`
      }
      return `(${typesArray.join(' | ')})[]`
    }

    if (type === 'object') {
      const typeName = toPascalCase(keyHint)
      generateObjectType(value, typeName)
      return typeName
    }

    return 'any'
  }

  function generateObjectType(obj: Record<string, any>, name: string): void {
    if (interfaces.has(name)) {
      return
    }

    typeCounter++
    const lines: string[] = []
    const prefix = exportTypes ? 'export ' : ''
    const optMarker = optionalFields || allOptional ? '?' : ''
    const roMarker = readonlyProperties ? 'readonly ' : ''

    if (useInterface) {
      lines.push(`${prefix}interface ${name} {`)
    } else {
      lines.push(`${prefix}type ${name} = {`)
    }

    const keys = Object.keys(obj)
    if (keys.length === 0) {
      if (useInterface) {
        interfaces.set(name, `${prefix}interface ${name} {}`)
      } else {
        interfaces.set(name, `${prefix}type ${name} = Record<string, any>`)
      }
      return
    }

    for (const key of keys) {
      const val = obj[key]
      const propType = inferType(val, key)
      const formattedKey = formatKey(key)
      lines.push(`  ${roMarker}${formattedKey}${optMarker}: ${propType}`)
    }

    lines.push('}')
    interfaces.set(name, lines.join('\n'))
  }

  const rootPascal = toPascalCase(rootName)
  if (Array.isArray(data)) {
    const itemType = inferType(data, rootPascal)
    const exportPrefix = exportTypes ? 'export ' : ''
    const code = `${exportPrefix}type ${rootPascal} = ${itemType}`
    return { code, typeCount: 1 }
  } else if (data !== null && typeof data === 'object') {
    generateObjectType(data, rootPascal)
    const allCode = Array.from(interfaces.values()).join('\n\n')
    return { code: allCode, typeCount: interfaces.size }
  } else {
    const exportPrefix = exportTypes ? 'export ' : ''
    const primitiveType = typeof data
    const code = `${exportPrefix}type ${rootPascal} = ${primitiveType}`
    return { code, typeCount: 1 }
  }
}
