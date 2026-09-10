import { AchievementDefinition } from '../types'
import { jsonSuiteAchievements } from './json-suite'
import { cryptoSuiteAchievements } from './crypto-suite'
import { converterSuiteAchievements } from './converter-suite'
import { securitySuiteAchievements } from './security-suite'
import { easterEggAchievements } from './easter-eggs'

/**
 * All puzzle-piece achievement definitions bundled together.
 * To add a new achievement, simply add it to the corresponding definition file
 * or create a new file and spread it into ALL_ACHIEVEMENTS here.
 */
export const ALL_ACHIEVEMENTS: AchievementDefinition[] = [
  ...jsonSuiteAchievements,
  ...cryptoSuiteAchievements,
  ...converterSuiteAchievements,
  ...securitySuiteAchievements,
  ...easterEggAchievements
]

export * from './json-suite'
export * from './crypto-suite'
export * from './converter-suite'
export * from './security-suite'
export * from './easter-eggs'
