export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'legendary'

export type AchievementCategory =
  | 'json'
  | 'crypto'
  | 'converters'
  | 'security'
  | 'easter-egg'
  | 'general'

export interface GamificationEvent {
  type: string
  toolId?: string
  bytes?: number
  isMinified?: boolean
  algo?: string
  from?: string
  to?: string
  count?: number
  meta?: Record<string, any>
  // Anti-abuse flags
  isSample?: boolean
  isTemplate?: boolean
  isAutomatic?: boolean
  isMount?: boolean
  isOptionChange?: boolean
  payloadHash?: string
}

export interface GamificationStats {
  totalBytesFormatted: number
  totalOperations: number
  jsonOperations: number
  cryptoOperations: number
  converterOperations: number
  securityOperations: number
  snapshotsExported: number
  panicWipes: number
  petInteractions: number
  nightOwlCount: number
  fridayDeploys: number
  themeToggles: number
  escapeSpamCount: number
  hashesGenerated: Record<string, number>
}

export interface AchievementEvaluationResult {
  unlocked: boolean
  progress?: number
}

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  flavorText: string
  tier: AchievementTier
  category: AchievementCategory
  icon: string // Lucide icon name
  secret?: boolean
  maxProgress?: number
  xpReward: number
  check: (
    event: GamificationEvent,
    stats: Readonly<GamificationStats>,
    currentProgress: number
  ) => AchievementEvaluationResult
}

export type PetMood = 'idle' | 'eating' | 'celebrating' | 'dizzy' | 'sleeping' | 'petted'

export type PetSkin = 'classic' | 'cyber-visor' | 'wizard-hat' | 'coffee-cup'

export interface PetState {
  name: string
  level: number
  xp: number
  xpToNextLevel: number
  mood: PetMood
  skin: PetSkin
  enabled: boolean
  isDocked: boolean
  soundEnabled: boolean
  soundVolume: number
  totalFedBytes: number
}

export interface UnlockedAchievementInfo {
  id: string
  unlockedAt: string // ISO timestamp
}
