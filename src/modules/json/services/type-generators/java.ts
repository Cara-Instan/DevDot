import type { JavaOptions } from '../../types'

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'field'
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1) || 'Class'
}

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'record', 'sealed', 'permits',
  'non-sealed', 'yield', 'var'
])

function sanitizeJavaFieldName(name: string): string {
  const camel = toCamelCase(name)
  if (JAVA_KEYWORDS.has(camel) || /^\d/.test(camel)) {
    return `_${camel}`
  }
  return camel
}

export function generateJava(
  data: any,
  options: Partial<JavaOptions> = {}
): { code: string; typeCount: number } {
  const {
    rootName = 'Root',
    style = 'record',
    useJacksonAnnotations = true,
    packageName
  } = options

  const typesMap = new Map<string, string>()

  function inferJavaType(value: any, keyHint: string): string {
    if (value === null || value === undefined) {
      return 'Object'
    }

    const type = typeof value

    if (type === 'string') return 'String'
    if (type === 'boolean') return 'Boolean'
    if (type === 'number') {
      if (Number.isInteger(value)) {
        return value > 2147483647 || value < -2147483648 ? 'Long' : 'Integer'
      }
      return 'Double'
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'List<Object>'
      }

      const sampleObjects: any[] = []
      let primitiveType = ''

      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          sampleObjects.push(item)
        } else {
          primitiveType = inferJavaType(item, `${keyHint}Item`)
        }
      }

      if (sampleObjects.length > 0) {
        const mergedObj: Record<string, any> = {}
        for (const obj of sampleObjects) {
          for (const k of Object.keys(obj)) {
            mergedObj[k] = obj[k]
          }
        }
        const itemClassName = toPascalCase(keyHint.endsWith('s') ? keyHint.slice(0, -1) : `${keyHint}Item`)
        generateJavaDefinition(mergedObj, itemClassName)
        return `List<${itemClassName}>`
      }

      return `List<${primitiveType || 'Object'}>`
    }

    if (type === 'object') {
      const className = toPascalCase(keyHint)
      generateJavaDefinition(value, className)
      return className
    }

    return 'Object'
  }

  function generateJavaDefinition(obj: Record<string, any>, className: string): void {
    if (typesMap.has(className)) return

    const fields: { rawKey: string; fieldName: string; javaType: string }[] = []

    for (const [key, val] of Object.entries(obj)) {
      const fieldName = sanitizeJavaFieldName(key)
      const javaType = inferJavaType(val, key)
      fields.push({ rawKey: key, fieldName, javaType })
    }

    const lines: string[] = []

    if (style === 'record') {
      lines.push(`public record ${className}(`)
      const paramLines = fields.map((f, i) => {
        const isLast = i === fields.length - 1
        const comma = isLast ? '' : ','
        const jackson = useJacksonAnnotations && f.rawKey !== f.fieldName ? `@JsonProperty("${f.rawKey}") ` : ''
        return `    ${jackson}${f.javaType} ${f.fieldName}${comma}`
      })
      lines.push(paramLines.join('\n'))
      lines.push(`) {}`)
    } else if (style === 'lombok') {
      lines.push(`@Data`)
      lines.push(`@Builder`)
      lines.push(`@NoArgsConstructor`)
      lines.push(`@AllArgsConstructor`)
      lines.push(`public class ${className} {`)
      for (const f of fields) {
        if (useJacksonAnnotations && f.rawKey !== f.fieldName) {
          lines.push(`    @JsonProperty("${f.rawKey}")`)
        }
        lines.push(`    private ${f.javaType} ${f.fieldName};`)
      }
      lines.push(`}`)
    } else {
      // Standard POJO with getters & setters
      lines.push(`public class ${className} {`)
      for (const f of fields) {
        if (useJacksonAnnotations && f.rawKey !== f.fieldName) {
          lines.push(`    @JsonProperty("${f.rawKey}")`)
        }
        lines.push(`    private ${f.javaType} ${f.fieldName};`)
      }
      lines.push('')
      lines.push(`    public ${className}() {}`)
      lines.push('')
      for (const f of fields) {
        const getterName = `get${f.fieldName.charAt(0).toUpperCase() + f.fieldName.slice(1)}`
        const setterName = `set${f.fieldName.charAt(0).toUpperCase() + f.fieldName.slice(1)}`
        lines.push(`    public ${f.javaType} ${getterName}() {`)
        lines.push(`        return this.${f.fieldName};`)
        lines.push(`    }`)
        lines.push('')
        lines.push(`    public void ${setterName}(${f.javaType} ${f.fieldName}) {`)
        lines.push(`        this.${f.fieldName} = ${f.fieldName};`)
        lines.push(`    }`)
        lines.push('')
      }
      lines.push(`}`)
    }

    typesMap.set(className, lines.join('\n'))
  }

  const rootClassName = toPascalCase(rootName)
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    generateJavaDefinition(data, rootClassName)
  } else if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      generateJavaDefinition(data[0], rootClassName)
    }
  }

  const imports: string[] = ['import java.util.List;']
  if (useJacksonAnnotations) {
    imports.push('import com.fasterxml.jackson.annotation.JsonProperty;')
  }
  if (style === 'lombok') {
    imports.push('import lombok.Data;')
    imports.push('import lombok.Builder;')
    imports.push('import lombok.NoArgsConstructor;')
    imports.push('import lombok.AllArgsConstructor;')
  }

  const codeBlocks: string[] = []
  if (packageName?.trim()) {
    codeBlocks.push(`package ${packageName.trim()};\n`)
  }
  codeBlocks.push(imports.join('\n'))
  codeBlocks.push('')

  for (const block of typesMap.values()) {
    codeBlocks.push(block)
    codeBlocks.push('')
  }

  return {
    code: codeBlocks.join('\n').trim(),
    typeCount: typesMap.size
  }
}
