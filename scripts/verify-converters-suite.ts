import { transpileData } from '../src/modules/converters/services/transpiler-service'
import {
  parseCurlCommand,
  convertCurlCommand,
  tokenizeCommandLine
} from '../src/modules/converters/services/curl-parser-service'
import { getTaskHandler } from '../src/core/workers/task-registry'
import '../src/core/workers/task-router' // Load all task handlers

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

console.log('\n🚀 Starting DevDot Phase 3.3 Suite Verification (Transpiler & cURL Converter)...\n')

// ==========================================
// 1. Multi-Format Transpiler Tests
// ==========================================
console.log('--- 1. Testing Multi-Format Data Transpiler (JSON <-> YAML <-> TOML <-> CSV) ---')

// 1.1 JSON <-> YAML
const sampleObj = {
  appName: 'DevDot',
  version: '0.1.0',
  features: ['offline', 'worker-threads', 'material-3'],
  config: {
    maxMemoryMB: 512,
    enableTelemetry: false
  }
}
const sampleJson = JSON.stringify(sampleObj, null, 2)

const jsonToYamlRes = transpileData(sampleJson, 'json', 'yaml', { yamlIndent: 2 })
assert(jsonToYamlRes.output.includes('appName: DevDot'), 'JSON -> YAML contains string scalar')
assert(jsonToYamlRes.output.includes('maxMemoryMB: 512'), 'JSON -> YAML contains nested numbers')
assert(jsonToYamlRes.output.includes('- offline'), 'JSON -> YAML contains array items')

const yamlToJsonRes = transpileData(jsonToYamlRes.output, 'yaml', 'json', { jsonIndent: 2 })
const recoveredJsonObj = JSON.parse(yamlToJsonRes.output)
assert(recoveredJsonObj.appName === 'DevDot', 'YAML -> JSON preserves string scalar')
assert(recoveredJsonObj.config.maxMemoryMB === 512, 'YAML -> JSON preserves nested number')
assert(recoveredJsonObj.features.length === 3, 'YAML -> JSON preserves array items')

// 1.2 JSON <-> TOML
const jsonToTomlRes = transpileData(sampleJson, 'json', 'toml')
assert(jsonToTomlRes.output.includes('appName = "DevDot"'), 'JSON -> TOML contains string assignment')
assert(jsonToTomlRes.output.includes('[config]'), 'JSON -> TOML contains table header')
assert(jsonToTomlRes.output.includes('maxMemoryMB = 512'), 'JSON -> TOML contains integer value')

const tomlToJsonRes = transpileData(jsonToTomlRes.output, 'toml', 'json', { jsonIndent: 2 })
const recoveredTomlObj = JSON.parse(tomlToJsonRes.output)
assert(recoveredTomlObj.appName === 'DevDot', 'TOML -> JSON round-trip string property')
assert(recoveredTomlObj.config.enableTelemetry === false, 'TOML -> JSON round-trip boolean property')

// 1.3 JSON <-> CSV (Array of objects)
const usersList = [
  { id: 1, name: 'Ando', role: 'admin', active: true },
  { id: 2, name: 'Budi', role: 'user', active: false }
]
const usersJson = JSON.stringify(usersList)

const jsonToCsvRes = transpileData(usersJson, 'json', 'csv', { csvDelimiter: ',', csvHeader: true })
assert(jsonToCsvRes.output.includes('id,name,role,active'), 'JSON -> CSV includes header row')
assert(jsonToCsvRes.output.includes('1,Ando,admin,true'), 'JSON -> CSV includes first data row')
assert(jsonToCsvRes.output.includes('2,Budi,user,false'), 'JSON -> CSV includes second data row')

const csvToJsonRes = transpileData(jsonToCsvRes.output, 'csv', 'json', { csvDynamicTyping: true })
const recoveredUsers = JSON.parse(csvToJsonRes.output)
assert(recoveredUsers.length === 2, 'CSV -> JSON recovers array length')
assert(recoveredUsers[0].name === 'Ando', 'CSV -> JSON recovers text field')
assert(recoveredUsers[0].active === true, 'CSV -> JSON dynamically casts boolean')
assert(recoveredUsers[0].id === 1, 'CSV -> JSON dynamically casts number')

// 1.4 YAML <-> CSV & TOML <-> CSV
const yamlToCsvRes = transpileData(jsonToYamlRes.output, 'yaml', 'csv', { csvDelimiter: ';' })
assert(yamlToCsvRes.output.includes(';'), 'YAML -> CSV formats with custom semicolon delimiter')

const tomlToCsvRes = transpileData(jsonToTomlRes.output, 'toml', 'csv', { csvDelimiter: '\t' })
assert(tomlToCsvRes.output.includes('\t'), 'TOML -> CSV formats with custom tab delimiter')

// 1.5 Nested flattening & unflattening test
const nestedRecord = [
  {
    userId: 'usr_101',
    profile: {
      firstName: 'Herlandro',
      lastName: 'Ando'
    },
    metrics: {
      score: 98.5
    }
  }
]
const nestedCsv = transpileData(JSON.stringify(nestedRecord), 'json', 'csv', { flattenNested: true })
assert(nestedCsv.output.includes('profile.firstName'), 'JSON -> CSV flattens dot-notated keys')

const unflattenedJsonRes = transpileData(nestedCsv.output, 'csv', 'json')
const unflattened = JSON.parse(unflattenedJsonRes.output)
assert(unflattened[0].profile.firstName === 'Herlandro', 'CSV -> JSON unflattens dot-notated keys into nested objects')
assert(unflattened[0].metrics.score === 98.5, 'CSV -> JSON unflattens numbers correctly')

console.log('\n--- 2. Testing cURL Parser & Code Generator ---')

// 2.1 Tokenizer tests
const multilineCurl = `curl -X POST https://api.example.com/v1/auth \\
  -H "Content-Type: application/json" \\
  -H 'Authorization: Bearer token_xyz123' \\
  -d '{"username": "ando", "stayLoggedIn": true}'`

const tokens = tokenizeCommandLine(multilineCurl)
assert(tokens.includes('-X'), 'Tokenizer handles -X flag')
assert(tokens.includes('POST'), 'Tokenizer handles POST method value')
assert(tokens.includes('https://api.example.com/v1/auth'), 'Tokenizer handles target URL')
assert(tokens.includes('Authorization: Bearer token_xyz123'), 'Tokenizer handles single-quoted headers')

// 2.2 Parsed cURL Object test
const parsed = parseCurlCommand(multilineCurl)
assert(parsed.method === 'POST', 'cURL Parser extracts POST method')
assert(parsed.url === 'https://api.example.com/v1/auth', 'cURL Parser extracts normalized URL')
assert(parsed.headers['Content-Type'] === 'application/json', 'cURL Parser extracts Content-Type header')
assert(parsed.headers['Authorization'] === 'Bearer token_xyz123', 'cURL Parser extracts Authorization header')
assert(parsed.auth?.type === 'bearer', 'cURL Parser identifies Bearer auth')
assert(parsed.auth?.token === 'token_xyz123', 'cURL Parser extracts Bearer token')
assert(parsed.isJsonBody === true, 'cURL Parser detects JSON body')
assert(parsed.dataJson.username === 'ando', 'cURL Parser parses JSON body into structured object')

// 2.3 Code Generators: Fetch, Axios, Python, Go
const fetchRes = convertCurlCommand(multilineCurl, { targetLanguage: 'fetch', includeComments: true, useAsyncAwait: true })
assert(fetchRes.code.includes("fetch('https://api.example.com/v1/auth'"), 'Fetch generator contains fetch call with URL')
assert(fetchRes.code.includes("method: 'POST'"), 'Fetch generator specifies POST method')
assert(fetchRes.code.includes("'Authorization': 'Bearer token_xyz123'"), 'Fetch generator includes headers')
assert(fetchRes.code.includes('body: JSON.stringify('), 'Fetch generator includes JSON body payload')

const axiosRes = convertCurlCommand(multilineCurl, { targetLanguage: 'axios', includeComments: true })
assert(axiosRes.code.includes("import axios from 'axios'"), 'Axios generator includes import')
assert(axiosRes.code.includes("url: 'https://api.example.com/v1/auth'"), 'Axios generator specifies URL')
assert(axiosRes.code.includes("method: 'post'"), 'Axios generator specifies method')

const pythonRes = convertCurlCommand(multilineCurl, { targetLanguage: 'python', includeComments: true, includeErrorHandling: true })
assert(pythonRes.code.includes('import requests'), 'Python generator imports requests')
assert(pythonRes.code.includes("requests.post("), 'Python generator invokes requests.post')
assert(pythonRes.code.includes('json=json_data'), 'Python generator passes json payload')
assert(pythonRes.code.includes("response.raise_for_status()"), 'Python generator includes raise_for_status')

const goRes = convertCurlCommand(multilineCurl, { targetLanguage: 'go', includeComments: true })
assert(goRes.code.includes('package main'), 'Go generator includes package main')
assert(goRes.code.includes('http.NewRequest("POST", url, payload)'), 'Go generator creates http.NewRequest')
assert(goRes.code.includes('req.Header.Set("Authorization"'), 'Go generator sets headers')
assert(goRes.code.includes('client.Do(req)'), 'Go generator executes client.Do')

// 2.4 Basic Auth & Query Params test
const basicAuthCurl = 'curl -u "admin:secret456" "https://service.local/api/search?q=devdot&limit=20" -b "session=abc"'
const basicParsed = parseCurlCommand(basicAuthCurl)
assert(basicParsed.auth?.type === 'basic', 'Basic auth parsed properly')
assert(basicParsed.auth?.username === 'admin' && basicParsed.auth?.password === 'secret456', 'Basic auth credentials extracted')
assert(basicParsed.queryParams.some(p => p.name === 'q' && p.value === 'devdot'), 'Query parameters parsed')
assert(basicParsed.cookies['session'] === 'abc', 'Cookies parsed from -b flag')

const basicGoRes = convertCurlCommand(basicAuthCurl, { targetLanguage: 'go' })
assert(basicGoRes.code.includes('req.SetBasicAuth("admin", "secret456")'), 'Go generator emits SetBasicAuth')

console.log('\n--- 3. Testing Worker Task Registry Handlers ---')

const transpileHandler = getTaskHandler('converters', 'transpile')
assert(!!transpileHandler, 'converters:transpile task handler is registered')

const curlConvertHandler = getTaskHandler('converters', 'curl-convert')
assert(!!curlConvertHandler, 'converters:curl-convert task handler is registered')

const curlParseHandler = getTaskHandler('converters', 'curl-parse')
assert(!!curlParseHandler, 'converters:curl-parse task handler is registered')

// Invoke handlers directly
const workerTranspileResult = await transpileHandler({
  input: 'name: TaskRunner\nstatus: active',
  sourceFormat: 'yaml',
  targetFormat: 'json'
})
assert(workerTranspileResult.output.includes('"name": "TaskRunner"'), 'Worker task handler successfully transpiled YAML to JSON')

const workerCurlResult = await curlConvertHandler({
  command: 'curl https://devdot.tools',
  options: { targetLanguage: 'fetch' }
})
assert(workerCurlResult.code.includes("https://devdot.tools"), 'Worker task handler successfully converted cURL to Fetch')

console.log('\n🎉 ALL Phase 3.3 Suite Tests PASSED Successfully!\n')
