import type { TypeGeneratorPayload, TypeGeneratorResult } from '../../types'
import { safeParseJson } from '../json-parser'
import { generateTypeScript } from './typescript'
import { generateGo } from './go'
import { generateRust } from './rust'
import { generateJsonSchema } from './json-schema'

export * from './typescript'
export * from './go'
export * from './rust'
export * from './json-schema'

/**
 * Universal JSON to Type Generator Dispatcher
 */
export function generateTypesFromJson(payload: TypeGeneratorPayload): TypeGeneratorResult {
  const { input, target, tsOptions, goOptions, rustOptions, schemaOptions } = payload

  const { data } = safeParseJson(input, { autoRepair: true })

  let code = ''
  let typeCount = 0
  let rootName = 'Root'

  switch (target) {
    case 'typescript': {
      rootName = tsOptions?.rootName || 'RootObject'
      const result = generateTypeScript(data, tsOptions)
      code = result.code
      typeCount = result.typeCount
      break
    }
    case 'go': {
      rootName = goOptions?.rootName || 'Root'
      const result = generateGo(data, goOptions)
      code = result.code
      typeCount = result.typeCount
      break
    }
    case 'rust': {
      rootName = rustOptions?.rootName || 'Root'
      const result = generateRust(data, rustOptions)
      code = result.code
      typeCount = result.typeCount
      break
    }
    case 'json-schema': {
      rootName = schemaOptions?.title || 'GeneratedSchema'
      const result = generateJsonSchema(data, schemaOptions)
      code = result.code
      typeCount = result.typeCount
      break
    }
    default:
      throw new Error(`Unsupported target language: ${target}`)
  }

  const linesCount = code.split('\n').length
  const characterCount = code.length

  return {
    code,
    targetLanguage: target,
    rootName,
    stats: {
      typesGenerated: typeCount,
      linesCount,
      characterCount
    }
  }
}
