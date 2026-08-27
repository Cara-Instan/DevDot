import type { JsonSchemaOptions } from '../../types'

export function generateJsonSchema(
  data: any,
  options: Partial<JsonSchemaOptions> = {}
): { code: string; typeCount: number } {
  const {
    schemaDraft = 'draft-07',
    title = 'GeneratedSchema',
    includeRequired = true,
    includeExamples = false
  } = options

  const schemaUri =
    schemaDraft === '2020-12'
      ? 'https://json-schema.org/draft/2020-12/schema'
      : 'http://json-schema.org/draft-07/schema#'

  let entityCount = 0

  function inferSchema(value: any): Record<string, any> {
    entityCount++

    if (value === null) {
      return { type: 'null' }
    }

    const type = typeof value

    if (type === 'string') {
      const s: Record<string, any> = { type: 'string' }
      if (includeExamples && value) s.examples = [value]
      return s
    }

    if (type === 'boolean') {
      return { type: 'boolean' }
    }

    if (type === 'number') {
      return { type: Number.isInteger(value) ? 'integer' : 'number' }
    }

    if (Array.isArray(value)) {
      const arraySchema: Record<string, any> = {
        type: 'array'
      }

      if (value.length === 0) {
        arraySchema.items = {}
      } else {
        // Collect all items
        const sampleObjects: any[] = []
        const primitiveTypes = new Set<string>()

        for (const item of value) {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            sampleObjects.push(item)
          } else {
            primitiveTypes.add(typeof item)
          }
        }

        if (sampleObjects.length > 0) {
          const mergedObj: Record<string, any> = {}
          for (const obj of sampleObjects) {
            for (const k of Object.keys(obj)) {
              mergedObj[k] = obj[k]
            }
          }
          arraySchema.items = inferSchema(mergedObj)
        } else if (primitiveTypes.size === 1) {
          arraySchema.items = inferSchema(value[0])
        } else {
          arraySchema.items = {}
        }
      }

      return arraySchema
    }

    if (type === 'object') {
      const objSchema: Record<string, any> = {
        type: 'object',
        properties: {}
      }

      const keys = Object.keys(value)
      const required: string[] = []

      for (const key of keys) {
        objSchema.properties[key] = inferSchema(value[key])
        if (includeRequired) {
          required.push(key)
        }
      }

      if (includeRequired && required.length > 0) {
        objSchema.required = required
      }

      return objSchema
    }

    return {}
  }

  const rootSchema = inferSchema(data)
  const fullSchema = {
    $schema: schemaUri,
    title,
    ...rootSchema
  }

  return {
    code: JSON.stringify(fullSchema, null, 2),
    typeCount: entityCount
  }
}
