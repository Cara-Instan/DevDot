export interface ToolkitTabSession {
  id: string
  toolId: string
  title: string
  state: Record<string, any>
}

export interface ToolkitSessionSnapshot {
  $schema?: string
  app: 'dev-toolkit'
  schemaVersion: '1.0.0'
  createdAt: string
  metadata?: {
    title?: string
    description?: string
  }
  activeTabId: string
  tabs: ToolkitTabSession[]
}
