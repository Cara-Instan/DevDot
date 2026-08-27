import { Extension } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { javascript } from '@codemirror/lang-javascript'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { go } from '@codemirror/lang-go'
import { rust } from '@codemirror/lang-rust'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'
import { cpp } from '@codemirror/lang-cpp'

export type SupportedLanguage =
  | 'json'
  | 'javascript'
  | 'typescript'
  | 'xml'
  | 'yaml'
  | 'markdown'
  | 'html'
  | 'css'
  | 'go'
  | 'rust'
  | 'java'
  | 'python'
  | 'csharp'
  | 'cpp'
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
    case 'go':
    case 'golang':
      return [go()]
    case 'rust':
    case 'rs':
      return [rust()]
    case 'java':
      return [java()]
    case 'python':
    case 'py':
      return [python()]
    case 'cpp':
    case 'c++':
    case 'c':
    case 'csharp':
    case 'cs':
    case 'c#':
    case 'kotlin':
    case 'kt':
      return [cpp()]
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

