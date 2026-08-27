import { formatJson, calculateJsonStats, sortObjectKeys } from '../src/modules/json/services/json-formatter'
import { repairJson, safeParseJson } from '../src/modules/json/services/json-parser'
import {
  generateTypeScript,
  generateGo,
  generateRust,
  generateJava,
  generatePython,
  generateCSharp,
  generateJsonSchema
} from '../src/modules/json/services/type-generators'

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${testName}`)
    failed++
  }
}

console.log('=== RUNNING DEVTOOLS-DOT SUB-PHASE 2.1 VERIFICATION ===\n')

// 1. JSON Auto-Repair Tests
console.log('1. Testing JSON Auto-Repair Engine...')
const malformedInput = `
// Comment line
{
  name: 'DevDot',
  version: "0.1.0",
  /* Multi-line
     comment */
  'active': True,
  nullValue: None,
  hexVal: 0xFF,
  tags: ['tauri', 'vue', 'offline',],
  nested: {
    unquotedKey: 42,
  },
}
`

const repairResult = repairJson(malformedInput)
assert(repairResult.wasRepaired, 'Detects and flags repaired JSON')
assert(repairResult.repairs.length >= 4, `Performed multiple repairs (${repairResult.repairs.join(', ')})`)
assert(repairResult.parsedData.name === 'DevDot', 'Repairs unquoted key and single quotes')
assert(repairResult.parsedData.active === true, 'Normalizes Python True to true')
assert(repairResult.parsedData.nullValue === null, 'Normalizes Python None to null')
assert(repairResult.parsedData.hexVal === 255, 'Normalizes Hex 0xFF to 255')
assert(repairResult.parsedData.tags.length === 3, 'Removes trailing commas in array')
assert(repairResult.parsedData.nested.unquotedKey === 42, 'Repairs nested unquoted keys and trailing comma')

// 2. JSON Formatter & Minifier Tests
console.log('\n2. Testing JSON Formatter & Minifier...')
const sampleObj = { z: 1, a: { y: 2, b: 3 }, m: [1, 2, 3] }
const rawJson = JSON.stringify(sampleObj)

const format2Spaces = formatJson(rawJson, { indentType: '2-spaces' })
assert(format2Spaces.isValid, 'Formats 2-spaces JSON validly')
assert(format2Spaces.formatted.includes('  "z": 1'), 'Applies 2-spaces indentation')

const format4Spaces = formatJson(rawJson, { indentType: '4-spaces' })
assert(format4Spaces.formatted.includes('    "z": 1'), 'Applies 4-spaces indentation')

const formatTab = formatJson(rawJson, { indentType: 'tab' })
assert(formatTab.formatted.includes('\t"z": 1'), 'Applies Tab indentation')

const minified = formatJson(format2Spaces.formatted, { minify: true })
assert(minified.isValid && !minified.formatted.includes('\n'), 'Minifies JSON to single-line zero-whitespace')
assert(minified.stats.byteSavingsPercent > 0, `Minification reports byte savings (${minified.stats.byteSavingsPercent}%)`)

const sortedAsc = formatJson(rawJson, { sortKeys: 'asc', indentType: '2-spaces' })
const sortedKeys = Object.keys(JSON.parse(sortedAsc.formatted))
assert(sortedKeys[0] === 'a' && sortedKeys[1] === 'm' && sortedKeys[2] === 'z', 'Sorts keys alphabetically (A-Z)')

// 3. TypeScript Type Generator
console.log('\n3. Testing TypeScript Generator...')
const complexData = {
  id: 'uuid-123',
  count: 42,
  is_verified: true,
  author: {
    first_name: 'John',
    last_name: 'Doe'
  },
  roles: ['admin', 'user'],
  projects: [
    { title: 'Project A', budget: 1000 },
    { title: 'Project B', budget: 2000 }
  ]
}

const tsResult = generateTypeScript(complexData, { rootName: 'UserProfile', useInterface: true, exportTypes: true })
assert(tsResult.code.includes('export interface UserProfile'), 'Generates root TypeScript interface')
assert(tsResult.code.includes('author: Author'), 'Generates nested Author interface')
assert(tsResult.code.includes('projects: Project[]') || tsResult.code.includes('projects: ProjectsItem[]'), 'Generates array of typed objects')
assert(tsResult.typeCount >= 3, `Generated ${tsResult.typeCount} TypeScript types`)

// 4. Go Struct Generator
console.log('\n4. Testing Go Struct Generator...')
const goResult = generateGo(complexData, { rootName: 'UserProfile', includeJsonTags: true, omitempty: true })
assert(goResult.code.includes('type UserProfile struct'), 'Generates root Go struct')
assert(goResult.code.includes('ID\tstring `json:"id,omitempty"`'), 'Generates proper Go initialism and struct tag')
assert(goResult.code.includes('Author\tAuthor `json:"author,omitempty"`'), 'Generates nested Go struct')
assert(goResult.typeCount >= 3, `Generated ${goResult.typeCount} Go structs`)

// 5. Rust Struct Generator
console.log('\n5. Testing Rust Struct Generator...')
const rustResult = generateRust(complexData, { rootName: 'UserProfile' })
assert(rustResult.code.includes('pub struct UserProfile'), 'Generates root Rust struct')
assert(rustResult.code.includes('#[derive('), 'Generates Rust derive macros')
assert(rustResult.code.includes('#[serde(rename = "first_name")]') || rustResult.code.includes('pub first_name: String,'), 'Generates serde field naming')
assert(rustResult.typeCount >= 3, `Generated ${rustResult.typeCount} Rust structs`)

// 6. Java Generator
console.log('\n6. Testing Java Generator...')
const javaResult = generateJava(complexData, { rootName: 'UserProfile', style: 'record' })
assert(javaResult.code.includes('public record UserProfile('), 'Generates Java Record')
assert(javaResult.code.includes('Author author'), 'Generates nested Author record reference')
assert(javaResult.code.includes('@JsonProperty("is_verified")'), 'Generates Jackson @JsonProperty annotation')
assert(javaResult.typeCount >= 3, `Generated ${javaResult.typeCount} Java types`)

// 7. Python Generator
console.log('\n7. Testing Python Generator...')
const pythonResult = generatePython({ ...complexData, contactEmail: 'john@example.com' }, { rootName: 'UserProfile', style: 'pydantic' })
assert(pythonResult.code.includes('class UserProfile(BaseModel):'), 'Generates Pydantic BaseModel')
assert(pythonResult.code.includes('author: Author'), 'Generates nested Author model reference')
assert(pythonResult.code.includes('contact_email: str = Field(alias="contactEmail")'), 'Generates Pydantic Field alias')
assert(pythonResult.typeCount >= 3, `Generated ${pythonResult.typeCount} Python models`)

// 8. C# Generator
console.log('\n8. Testing C# Generator...')
const csResult = generateCSharp(complexData, { rootName: 'UserProfile', useSystemTextJson: true })
assert(csResult.code.includes('public class UserProfile'), 'Generates C# Class')
assert(csResult.code.includes('[JsonPropertyName("is_verified")]'), 'Generates System.Text.Json JsonPropertyName')
assert(csResult.typeCount >= 3, `Generated ${csResult.typeCount} C# types`)

// 9. JSON Schema Generator
console.log('\n9. Testing JSON Schema Generator...')
const schemaResult = generateJsonSchema(complexData, { title: 'UserProfileSchema', schemaDraft: 'draft-07', includeRequired: true })
const parsedSchema = JSON.parse(schemaResult.code)
assert(parsedSchema.$schema.includes('draft-07'), 'Generates draft-07 schema URI')
assert(parsedSchema.type === 'object', 'Generates object root type')
assert(parsedSchema.properties.id.type === 'string', 'Infers string property')
assert(parsedSchema.properties.count.type === 'integer', 'Infers integer property')
assert(parsedSchema.required.includes('id'), 'Generates required fields array')

console.log(`\n=============================================`)
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log(`=============================================\n`)

if (failed > 0) {
  process.exit(1)
}

