import type {
  ParsedCurlRequest,
  ParsedCurlQueryParam,
  CurlConvertOptions,
  CurlConvertResult
} from '../types'

/**
 * Tokenize a command line string respecting single & double quotes and escaped characters
 */
export function tokenizeCommandLine(cmd: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  // Normalize newlines and continuation slashes (unix \ or windows ^)
  const sanitized = cmd
    .replace(/\\\r?\n/g, ' ')
    .replace(/\^\r?\n/g, ' ')
    .trim()

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i]

    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\' && !inSingleQuote) {
      escaped = true
      continue
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

/**
 * Parse raw cURL command into structured ParsedCurlRequest object
 */
export function parseCurlCommand(rawCommand: string): ParsedCurlRequest {
  const warnings: string[] = []
  const tokens = tokenizeCommandLine(rawCommand)

  let method = ''
  let rawUrl = ''
  const headers: Record<string, string> = {}
  const cookies: Record<string, string> = {}
  let authInfo: ParsedCurlRequest['auth']
  let dataPayload = ''
  let isJsonBody = false
  let isFormUrlEncoded = false
  let compressed = false
  let insecure = false
  let followRedirects = false

  let i = 0
  // Skip leading 'curl' if present
  if (tokens.length > 0 && tokens[0].toLowerCase() === 'curl') {
    i = 1
  }

  while (i < tokens.length) {
    const token = tokens[i]

    if (token === '-X' || token === '--request') {
      method = (tokens[i + 1] || '').toUpperCase()
      i += 2
    } else if (token === '-H' || token === '--header') {
      const headerLine = tokens[i + 1] || ''
      const colonIdx = headerLine.indexOf(':')
      if (colonIdx > 0) {
        const key = headerLine.substring(0, colonIdx).trim()
        const val = headerLine.substring(colonIdx + 1).trim()
        headers[key] = val
      }
      i += 2
    } else if (token === '-u' || token === '--user') {
      const userPass = tokens[i + 1] || ''
      const colonIdx = userPass.indexOf(':')
      if (colonIdx >= 0) {
        authInfo = {
          type: 'basic',
          username: userPass.substring(0, colonIdx),
          password: userPass.substring(colonIdx + 1)
        }
      } else {
        authInfo = {
          type: 'basic',
          username: userPass,
          password: ''
        }
      }
      i += 2
    } else if (token === '-b' || token === '--cookie') {
      const cookieStr = tokens[i + 1] || ''
      cookieStr.split(';').forEach((part) => {
        const eqIdx = part.indexOf('=')
        if (eqIdx > 0) {
          const k = part.substring(0, eqIdx).trim()
          const v = part.substring(eqIdx + 1).trim()
          cookies[k] = v
        }
      })
      i += 2
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii' ||
      token === '--data-urlencode'
    ) {
      const val = tokens[i + 1] || ''
      dataPayload = dataPayload ? `${dataPayload}&${val}` : val
      i += 2
    } else if (token === '--json') {
      dataPayload = tokens[i + 1] || ''
      headers['Content-Type'] = 'application/json'
      headers['Accept'] = 'application/json'
      isJsonBody = true
      i += 2
    } else if (token === '-k' || token === '--insecure') {
      insecure = true
      i++
    } else if (token === '-L' || token === '--location') {
      followRedirects = true
      i++
    } else if (token === '--compressed') {
      compressed = true
      i++
    } else if (token.startsWith('-')) {
      // Unhandled flag
      i++
    } else {
      // Positional argument, assume it's URL if not set
      if (!rawUrl) {
        rawUrl = token
      }
      i++
    }
  }

  // Ensure URL is clean
  if (!rawUrl) {
    rawUrl = 'https://example.com/api'
    warnings.push('No target URL was detected in cURL; defaulted to https://example.com/api')
  }

  // Add protocol if omitted (e.g. 'localhost:3000/api' or 'api.example.com')
  let normalizedUrl = rawUrl
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  // Extract query params and base path
  const queryParams: ParsedCurlQueryParam[] = []
  let baseUrl = ''
  let path = '/'

  try {
    const urlObj = new URL(normalizedUrl)
    baseUrl = `${urlObj.protocol}//${urlObj.host}`
    path = urlObj.pathname
    urlObj.searchParams.forEach((val, key) => {
      queryParams.push({ name: key, value: val })
    })
  } catch {
    baseUrl = normalizedUrl
  }

  // Detect Authorization header
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'authorization') {
      if (v.startsWith('Bearer ')) {
        authInfo = {
          type: 'bearer',
          token: v.substring(7).trim()
        }
      } else if (v.startsWith('Basic ') && !authInfo) {
        authInfo = {
          type: 'basic',
          token: v.substring(6).trim()
        }
      }
    }
    if (k.toLowerCase() === 'content-type') {
      if (v.toLowerCase().includes('application/json')) {
        isJsonBody = true
      } else if (v.toLowerCase().includes('application/x-www-form-urlencoded')) {
        isFormUrlEncoded = true
      }
    }
  }

  // Check if data payload is valid JSON
  let dataJson: any = undefined
  if (dataPayload) {
    try {
      dataJson = JSON.parse(dataPayload)
      isJsonBody = true
    } catch {
      // not JSON
      if (!isJsonBody && dataPayload.includes('=') && !dataPayload.startsWith('{')) {
        isFormUrlEncoded = true
      }
    }
  }

  // Default Method: If method is not explicitly provided, use POST if data is present, else GET
  if (!method) {
    method = dataPayload ? 'POST' : 'GET'
  }

  return {
    rawCommand,
    method,
    url: normalizedUrl,
    baseUrl,
    path,
    queryParams,
    headers,
    cookies,
    auth: authInfo,
    data: dataPayload || undefined,
    dataJson,
    isJsonBody,
    isFormUrlEncoded,
    compressed,
    insecure,
    followRedirects,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * Generate JavaScript Fetch code
 */
export function generateJsFetch(parsed: ParsedCurlRequest, options: CurlConvertOptions): string {
  const lines: string[] = []
  const hasHeaders = Object.keys(parsed.headers).length > 0
  const hasBody = !!parsed.data

  if (options.includeComments) {
    lines.push('// Generated by DevDot cURL Converter (JavaScript Fetch)')
  }

  const optionsObj: string[] = []
  if (parsed.method !== 'GET') {
    optionsObj.push(`  method: '${parsed.method}'`)
  }

  if (hasHeaders) {
    const headerLines = Object.entries(parsed.headers).map(
      ([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}'`
    )
    optionsObj.push(`  headers: {\n${headerLines.join(',\n')}\n  }`)
  }

  if (hasBody) {
    if (parsed.isJsonBody && parsed.dataJson !== undefined) {
      const formattedJson = JSON.stringify(parsed.dataJson, null, 2)
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')
        .trimStart()
      optionsObj.push(`  body: JSON.stringify(${formattedJson})`)
    } else {
      optionsObj.push(`  body: '${parsed.data?.replace(/'/g, "\\'")}'`)
    }
  }

  const optionsStr = optionsObj.length > 0 ? `, {\n${optionsObj.join(',\n')}\n}` : ''

  if (options.useAsyncAwait !== false) {
    lines.push('async function sendRequest() {')
    if (options.includeErrorHandling) {
      lines.push('  try {')
      lines.push(`    const response = await fetch('${parsed.url}'${optionsStr.split('\n').map(l => '  ' + l).join('\n').trimStart()});`)
      lines.push('    if (!response.ok) {')
      lines.push('      throw new Error(`HTTP error! Status: ${response.status}`);')
      lines.push('    }')
      lines.push('    const data = await response.json();')
      lines.push('    console.log(data);')
      lines.push('    return data;')
      lines.push('  } catch (error) {')
      lines.push('    console.error("Request failed:", error);')
      lines.push('  }')
      lines.push('}')
      lines.push('')
      lines.push('sendRequest();')
    } else {
      lines.push(`  const response = await fetch('${parsed.url}'${optionsStr});`)
      lines.push('  const data = await response.json();')
      lines.push('  console.log(data);')
      lines.push('  return data;')
      lines.push('}')
      lines.push('')
      lines.push('sendRequest();')
    }
  } else {
    lines.push(`fetch('${parsed.url}'${optionsStr})`)
    lines.push('  .then(response => response.json())')
    lines.push('  .then(data => console.log(data))')
    lines.push('  .catch(error => console.error("Error:", error));')
  }

  return lines.join('\n')
}

/**
 * Generate JavaScript / TypeScript Axios code
 */
export function generateAxios(parsed: ParsedCurlRequest, options: CurlConvertOptions): string {
  const lines: string[] = []
  const hasHeaders = Object.keys(parsed.headers).length > 0
  const hasBody = !!parsed.data

  if (options.includeComments) {
    lines.push('// Generated by DevDot cURL Converter (Axios)')
  }
  lines.push("import axios from 'axios';\n")

  const configObj: string[] = [
    `  method: '${parsed.method.toLowerCase()}'`,
    `  url: '${parsed.url}'`
  ]

  if (hasHeaders) {
    const headerLines = Object.entries(parsed.headers).map(
      ([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}'`
    )
    configObj.push(`  headers: {\n${headerLines.join(',\n')}\n  }`)
  }

  if (hasBody) {
    if (parsed.isJsonBody && parsed.dataJson !== undefined) {
      const formattedJson = JSON.stringify(parsed.dataJson, null, 2)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')
        .trimStart()
      configObj.push(`  data: ${formattedJson}`)
    } else {
      configObj.push(`  data: '${parsed.data?.replace(/'/g, "\\'")}'`)
    }
  }

  if (options.timeoutMs) {
    configObj.push(`  timeout: ${options.timeoutMs}`)
  }

  lines.push('async function makeRequest() {')
  if (options.includeErrorHandling) {
    lines.push('  try {')
    lines.push(`    const response = await axios({\n${configObj.map(l => '  ' + l).join(',\n')}\n    });`)
    lines.push('    console.log(response.status, response.data);')
    lines.push('    return response.data;')
    lines.push('  } catch (error) {')
    lines.push('    if (axios.isAxiosError(error)) {')
    lines.push('      console.error("Axios error:", error.response?.data || error.message);')
    lines.push('    } else {')
    lines.push('      console.error("Unexpected error:", error);')
    lines.push('    }')
    lines.push('  }')
    lines.push('}')
    lines.push('')
    lines.push('makeRequest();')
  } else {
    lines.push(`  const response = await axios({\n${configObj.join(',\n')}\n  });`)
    lines.push('  console.log(response.data);')
    lines.push('  return response.data;')
    lines.push('}')
    lines.push('')
    lines.push('makeRequest();')
  }

  return lines.join('\n')
}

/**
 * Generate Python `requests` code
 */
export function generatePythonRequests(parsed: ParsedCurlRequest, options: CurlConvertOptions): string {
  const lines: string[] = []
  if (options.includeComments) {
    lines.push('# Generated by DevDot cURL Converter (Python requests)')
  }
  lines.push('import requests')
  lines.push('import json\n')

  // Auth / Headers
  const hasHeaders = Object.keys(parsed.headers).length > 0
  if (hasHeaders) {
    lines.push('headers = {')
    for (const [k, v] of Object.entries(parsed.headers)) {
      lines.push(`    '${k}': '${v.replace(/'/g, "\\'")}',`)
    }
    lines.push('}\n')
  }

  // Cookies
  const hasCookies = Object.keys(parsed.cookies).length > 0
  if (hasCookies) {
    lines.push('cookies = {')
    for (const [k, v] of Object.entries(parsed.cookies)) {
      lines.push(`    '${k}': '${v.replace(/'/g, "\\'")}',`)
    }
    lines.push('}\n')
  }

  // Body Data
  const hasBody = !!parsed.data
  let bodyParam = ''

  if (hasBody) {
    if (parsed.isJsonBody && parsed.dataJson !== undefined) {
      lines.push(`json_data = ${JSON.stringify(parsed.dataJson, null, 4).replace(/true/g, 'True').replace(/false/g, 'False').replace(/null/g, 'None')}\n`)
      bodyParam = 'json=json_data'
    } else {
      lines.push(`data = '''${parsed.data}'''\n`)
      bodyParam = 'data=data'
    }
  }

  // Build requests call
  const callArgs: string[] = [`'${parsed.url}'`]
  if (hasHeaders) callArgs.push('headers=headers')
  if (hasCookies) callArgs.push('cookies=cookies')
  if (bodyParam) callArgs.push(bodyParam)

  if (parsed.auth && parsed.auth.type === 'basic') {
    callArgs.push(`auth=('${parsed.auth.username || ''}', '${parsed.auth.password || ''}')`)
  }

  if (parsed.insecure) {
    callArgs.push('verify=False')
  }

  const methodLower = parsed.method.toLowerCase()
  if (options.includeErrorHandling) {
    lines.push('try:')
    lines.push(`    response = requests.${methodLower}(`)
    callArgs.forEach((arg) => {
      lines.push(`        ${arg},`)
    })
    lines.push('    )')
    lines.push('    response.raise_for_status()')
    lines.push('    print("Status Code:", response.status_code)')
    lines.push('    print("Response Body:", response.json() if "application/json" in response.headers.get("Content-Type", "") else response.text)')
    lines.push('except requests.exceptions.RequestException as e:')
    lines.push('    print(f"Request failed: {e}")')
  } else {
    lines.push(`response = requests.${methodLower}(`)
    callArgs.forEach((arg) => {
      lines.push(`    ${arg},`)
    })
    lines.push(')')
    lines.push('print("Status:", response.status_code)')
    lines.push('print("Body:", response.text)')
  }

  return lines.join('\n')
}

/**
 * Generate Go `net/http` code
 */
export function generateGoHttp(parsed: ParsedCurlRequest, options: CurlConvertOptions): string {
  const lines: string[] = []
  const hasBody = !!parsed.data
  const imports = ['fmt', 'io', 'net/http']
  if (hasBody) {
    imports.push('strings')
  }

  if (options.includeComments) {
    lines.push('// Generated by DevDot cURL Converter (Go net/http)')
  }
  lines.push('package main\n')
  lines.push('import (')
  imports.sort().forEach((imp) => {
    lines.push(`\t"${imp}"`)
  })
  lines.push(')\n')

  lines.push('func main() {')
  lines.push(`\turl := "${parsed.url}"`)

  if (hasBody) {
    const sanitizedBody = parsed.data?.replace(/`/g, '` + "`" + `') || ''
    lines.push(`\tpayload := strings.NewReader(\`${sanitizedBody}\`)`)
    lines.push(`\treq, err := http.NewRequest("${parsed.method}", url, payload)`)
  } else {
    lines.push(`\treq, err := http.NewRequest("${parsed.method}", url, nil)`)
  }

  lines.push('\tif err != nil {')
  lines.push('\t\tpanic(err)')
  lines.push('\t}\n')

  // Set Headers
  for (const [k, v] of Object.entries(parsed.headers)) {
    lines.push(`\treq.Header.Set("${k}", "${v.replace(/"/g, '\\"')}")`)
  }

  // Set Basic Auth
  if (parsed.auth && parsed.auth.type === 'basic') {
    lines.push(`\treq.SetBasicAuth("${parsed.auth.username || ''}", "${parsed.auth.password || ''}")`)
  }

  lines.push('\n\tclient := &http.Client{}')
  lines.push('\tresp, err := client.Do(req)')
  lines.push('\tif err != nil {')
  lines.push('\t\tpanic(err)')
  lines.push('\t}')
  lines.push('\tdefer resp.Body.Close()\n')

  lines.push('\tbody, err := io.ReadAll(resp.Body)')
  lines.push('\tif err != nil {')
  lines.push('\t\tpanic(err)')
  lines.push('\t}\n')

  lines.push('\tfmt.Println("Status Code:", resp.StatusCode)')
  lines.push('\tfmt.Println("Response Body:", string(body))')
  lines.push('}')

  return lines.join('\n')
}

/**
 * Convert cURL command into target programming language code
 */
export function convertCurlCommand(
  rawCommand: string,
  options: CurlConvertOptions
): CurlConvertResult {
  const startTime = performance.now()
  const parsed = parseCurlCommand(rawCommand)
  let code = ''

  switch (options.targetLanguage) {
    case 'fetch':
      code = generateJsFetch(parsed, options)
      break
    case 'axios':
      code = generateAxios(parsed, options)
      break
    case 'python':
      code = generatePythonRequests(parsed, options)
      break
    case 'go':
      code = generateGoHttp(parsed, options)
      break
    default:
      throw new Error(`Unsupported target language: ${options.targetLanguage}`)
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100

  return {
    code,
    targetLanguage: options.targetLanguage,
    parsed,
    executionTimeMs
  }
}
