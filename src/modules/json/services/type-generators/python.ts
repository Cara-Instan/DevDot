import type { PythonOptions } from '../../types'

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
    .replace(/[^a-zA-Z0-9]/g, '') || 'Model'
}

const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  'type', 'match', 'case'
])

function sanitizePythonFieldName(name: string, useSnake: boolean): string {
  const formatted = useSnake ? toSnakeCase(name) : name
  if (PYTHON_KEYWORDS.has(formatted) || /^\d/.test(formatted)) {
    return `${formatted}_`
  }
  return formatted
}

export function generatePython(
  data: any,
  options: Partial<PythonOptions> = {}
): { code: string; typeCount: number } {
  const {
    rootName = 'RootModel',
    style = 'pydantic',
    useSnakeCase = true
  } = options

  const modelsMap = new Map<string, string>()

  function inferPythonType(value: any, keyHint: string): string {
    if (value === null || value === undefined) {
      return 'Any'
    }

    const type = typeof value

    if (type === 'string') return 'str'
    if (type === 'boolean') return 'bool'
    if (type === 'number') {
      return Number.isInteger(value) ? 'int' : 'float'
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'list[Any]'
      }

      const sampleObjects: any[] = []
      let primitiveType = ''

      for (const item of value) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          sampleObjects.push(item)
        } else {
          primitiveType = inferPythonType(item, `${keyHint}Item`)
        }
      }

      if (sampleObjects.length > 0) {
        const mergedObj: Record<string, any> = {}
        for (const obj of sampleObjects) {
          for (const k of Object.keys(obj)) {
            mergedObj[k] = obj[k]
          }
        }
        const itemModelName = toPascalCase(keyHint.endsWith('s') ? keyHint.slice(0, -1) : `${keyHint}Item`)
        generatePythonModel(mergedObj, itemModelName)
        return `list[${itemModelName}]`
      }

      return `list[${primitiveType || 'Any'}]`
    }

    if (type === 'object') {
      const modelName = toPascalCase(keyHint)
      generatePythonModel(value, modelName)
      return modelName
    }

    return 'Any'
  }

  function generatePythonModel(obj: Record<string, any>, modelName: string): void {
    if (modelsMap.has(modelName)) return

    const fields: { rawKey: string; fieldName: string; pyType: string }[] = []

    for (const [key, val] of Object.entries(obj)) {
      const fieldName = sanitizePythonFieldName(key, useSnakeCase)
      const pyType = inferPythonType(val, key)
      fields.push({ rawKey: key, fieldName, pyType })
    }

    const lines: string[] = []

    if (style === 'pydantic') {
      lines.push(`class ${modelName}(BaseModel):`)
      for (const f of fields) {
        if (f.rawKey !== f.fieldName) {
          lines.push(`    ${f.fieldName}: ${f.pyType} = Field(alias="${f.rawKey}")`)
        } else {
          lines.push(`    ${f.fieldName}: ${f.pyType}`)
        }
      }
    } else if (style === 'dataclass') {
      lines.push(`@dataclass`)
      lines.push(`class ${modelName}:`)
      for (const f of fields) {
        lines.push(`    ${f.fieldName}: ${f.pyType}`)
      }
    } else {
      // TypedDict
      lines.push(`class ${modelName}(TypedDict):`)
      for (const f of fields) {
        lines.push(`    ${f.rawKey}: ${f.pyType}`)
      }
    }

    modelsMap.set(modelName, lines.join('\n'))
  }

  const rootModelName = toPascalCase(rootName)
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    generatePythonModel(data, rootModelName)
  } else if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      generatePythonModel(data[0], rootModelName)
    }
  }

  const headerLines: string[] = ['from __future__ import annotations', 'from typing import Any']

  if (style === 'pydantic') {
    headerLines.push('from pydantic import BaseModel, Field')
  } else if (style === 'dataclass') {
    headerLines.push('from dataclasses import dataclass')
  } else {
    headerLines.push('from typing import TypedDict')
  }

  const codeBlocks: string[] = [headerLines.join('\n'), '']

  for (const block of modelsMap.values()) {
    codeBlocks.push(block)
    codeBlocks.push('')
  }

  return {
    code: codeBlocks.join('\n').trim(),
    typeCount: modelsMap.size
  }
}
