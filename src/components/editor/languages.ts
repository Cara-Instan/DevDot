import { Extension } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'

export type SupportedLanguage =
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'xml'
  | 'yaml'
  | 'markdown'
  | 'html'
  | 'css'
  | 'text'

export function getLanguageExtension(lang?: string): Extension[] {
  if (!lang) return []

  const normalized = lang.toLowerCase().trim()

  switch (normalized) {
    case 'json':
      return [json()]
    case 'javascript':
    case 'js':
      return [javascript({ jsx: true, typescript: false })]
    case 'typescript':
    case 'ts':
      return [javascript({ jsx: true, typescript: true })]
    case 'xml':
      return [xml()]
    case 'yaml':
    case 'yml':
      return [yaml()]
    case 'markdown':
    case 'md':
      return [markdown()]
    case 'html':
      return [html()]
    case 'css':
      return [css()]
    case 'text':
    case 'plain':
    default:
      return []
  }
}
