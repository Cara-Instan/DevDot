import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Base typography and general editor styles
const baseEditorTheme = EditorView.theme({
  '&': {
    fontSize: '13.5px',
    fontFamily: 'var(--md-sys-typescale-font-family-mono, monospace)',
    height: '100%',
    outline: 'none'
  },
  '.cm-content': {
    fontFamily: 'var(--md-sys-typescale-font-family-mono, monospace)',
    padding: '8px 0',
    caretColor: 'var(--md-sys-color-primary)'
  },
  '.cm-line': {
    padding: '0 12px',
    lineHeight: '1.6'
  },
  '.cm-scroller': {
    fontFamily: 'var(--md-sys-typescale-font-family-mono, monospace)',
    lineHeight: '1.6',
    overflow: 'auto'
  },
  '.cm-gutters': {
    borderRight: '1px solid var(--md-sys-color-outline-variant)',
    userSelect: 'none'
  },
  '.cm-gutterElement': {
    padding: '0 10px 0 6px',
    minWidth: '32px',
    textAlign: 'right'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-primary)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: '4px',
    padding: '0 4px',
    margin: '0 2px'
  },
  // CodeMirror Search Panel
  '.cm-panels': {
    backgroundColor: 'var(--md-sys-color-surface-container)',
    color: 'var(--md-sys-color-on-surface)',
    zIndex: '15'
  },
  '.cm-panels-top': {
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  '.cm-panels-bottom': {
    borderTop: '1px solid var(--md-sys-color-outline-variant)'
  },
  '.cm-panel.cm-search': {
    padding: '6px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px 10px',
    fontFamily: 'var(--md-sys-typescale-font-family)',
    fontSize: '12px'
  },
  '.cm-panel.cm-search .cm-textfield': {
    fontFamily: 'var(--md-sys-typescale-font-family-mono, monospace)',
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
    color: 'var(--md-sys-color-on-surface)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
  },
  '.cm-panel.cm-search .cm-textfield:focus': {
    borderColor: 'var(--md-sys-color-primary)',
    boxShadow: '0 0 0 1px var(--md-sys-color-primary)'
  },
  '.cm-panel.cm-search .cm-button': {
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    color: 'var(--md-sys-color-on-surface)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    backgroundImage: 'none',
    transition: 'all 0.15s ease'
  },
  '.cm-panel.cm-search .cm-button:hover': {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    borderColor: 'var(--md-sys-color-outline)'
  },
  '.cm-panel.cm-search .cm-button[name="close"]': {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '14px',
    lineHeight: '1',
    marginLeft: 'auto'
  },
  '.cm-panel.cm-search label': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface-variant)',
    cursor: 'pointer',
    userSelect: 'none'
  },
  '.cm-panel.cm-search input[type="checkbox"]': {
    accentColor: 'var(--md-sys-color-primary)',
    cursor: 'pointer'
  }
})

// Material Design 3 Light Theme
export const md3LightTheme = EditorView.theme({
  '&': {
    color: 'var(--md-sys-color-on-surface, #191c1e)',
    backgroundColor: 'var(--md-sys-color-surface-container-lowest, #ffffff)'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--md-sys-color-surface-container-low, #f5f6f8)',
    color: 'var(--md-sys-color-outline, #70787d)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--md-sys-color-surface-container-high, #e9ebed)',
    color: 'var(--md-sys-color-on-surface, #191c1e)',
    fontWeight: '600'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 102, 139, 0.04)'
  },
  '&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(0, 102, 139, 0.18) !important'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--md-sys-color-primary, #00668b)',
    borderLeftWidth: '2px'
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(250, 204, 21, 0.45)',
    borderRadius: '2px'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(245, 158, 11, 0.75)',
    outline: '1px solid var(--md-sys-color-primary)'
  }
}, { dark: false })

export const md3LightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#a81c1c', fontWeight: 'bold' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#191c1e' },
  { tag: [t.propertyName], color: '#005fb8', fontWeight: '600' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#0d7d38' },
  { tag: [t.number], color: '#b45309' },
  { tag: [t.bool, t.null], color: '#7c3aed', fontWeight: '600' },
  { tag: [t.function(t.variableName), t.labelName], color: '#0284c7' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#c2410c' },
  { tag: [t.definition(t.name), t.separator], color: '#334155' },
  { tag: [t.typeName, t.className, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#0369a1' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#0284c7' },
  { tag: [t.meta, t.comment], color: '#64748b', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#0284c7', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#0f172a' },
  { tag: [t.atom, t.special(t.variableName)], color: '#9333ea' },
  { tag: [t.punctuation, t.bracket], color: '#475569' }
])

// Material Design 3 Dark Theme
export const md3DarkTheme = EditorView.theme({
  '&': {
    color: 'var(--md-sys-color-on-surface, #e1e2e5)',
    backgroundColor: 'var(--md-sys-color-surface-container-lowest, #0c0f11)'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--md-sys-color-surface-container-low, #191c1e)',
    color: 'var(--md-sys-color-outline, #8a9297)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--md-sys-color-surface-container-high, #272a2d)',
    color: 'var(--md-sys-color-primary, #7dd0ff)',
    fontWeight: '600'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)'
  },
  '&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'rgba(125, 208, 255, 0.25) !important'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--md-sys-color-primary, #7dd0ff)',
    borderLeftWidth: '2px'
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(250, 204, 21, 0.35)',
    borderRadius: '2px'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'rgba(245, 158, 11, 0.75)',
    outline: '1px solid var(--md-sys-color-primary)'
  }
}, { dark: true })

export const md3DarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#ff7b72', fontWeight: 'bold' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#e1e2e5' },
  { tag: [t.propertyName], color: '#7dd0ff', fontWeight: '600' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#7ee787' },
  { tag: [t.number], color: '#ffa657' },
  { tag: [t.bool, t.null], color: '#d2a8ff', fontWeight: '600' },
  { tag: [t.function(t.variableName), t.labelName], color: '#58a6ff' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#79c0ff' },
  { tag: [t.definition(t.name), t.separator], color: '#c9d1d9' },
  { tag: [t.typeName, t.className, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#38bdf8' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#79c0ff' },
  { tag: [t.meta, t.comment], color: '#8b949e', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#58a6ff', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#f0f6fc' },
  { tag: [t.atom, t.special(t.variableName)], color: '#d2a8ff' },
  { tag: [t.punctuation, t.bracket], color: '#8b949e' }
])

export function getEditorTheme(isDark: boolean): Extension[] {
  return [
    baseEditorTheme,
    isDark ? md3DarkTheme : md3LightTheme,
    syntaxHighlighting(isDark ? md3DarkHighlight : md3LightHighlight)
  ]
}
