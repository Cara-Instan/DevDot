import {
  AchievementDefinition,
  AchievementCategory,
  GamificationEvent,
  GamificationStats
} from './types'
import { ALL_ACHIEVEMENTS } from './definitions'

export class AchievementRegistry {
  private static definitions: Map<string, AchievementDefinition> = new Map()

  static {
    this.registerAll(ALL_ACHIEVEMENTS)
  }

  /**
   * Register a single achievement definition (plug-and-play)
   */
  static register(definition: AchievementDefinition): void {
    this.definitions.set(definition.id, definition)
  }

  /**
   * Register multiple definitions
   */
  static registerAll(definitions: AchievementDefinition[]): void {
    for (const def of definitions) {
      this.register(def)
    }
  }

  /**
   * Get all registered achievements
   */
  static getAll(): AchievementDefinition[] {
    return Array.from(this.definitions.values())
  }

  /**
   * Get an achievement by its ID
   */
  static get(id: string): AchievementDefinition | undefined {
    return this.definitions.get(id)
  }

  /**
   * Get achievements by category
   */
  static getByCategory(category: AchievementCategory): AchievementDefinition[] {
    return this.getAll().filter((def) => def.category === category)
  }

  /**
   * Evaluate all registered achievements against an incoming event and current stats.
   * Returns newly unlocked achievements and updated progress values.
   */
  static evaluate(
    event: GamificationEvent,
    stats: Readonly<GamificationStats>,
    currentProgressMap: Record<string, number>,
    unlockedIds: Set<string>
  ): {
    newlyUnlocked: AchievementDefinition[]
    updatedProgress: Record<string, number>
  } {
    const newlyUnlocked: AchievementDefinition[] = []
    const updatedProgress: Record<string, number> = {}

    for (const def of this.definitions.values()) {
      // If already unlocked, skip evaluation
      if (unlockedIds.has(def.id)) {
        continue
      }

      const currentProg = currentProgressMap[def.id] || 0
      const result = def.check(event, stats, currentProg)

      if (result.progress !== undefined && result.progress !== currentProg) {
        updatedProgress[def.id] = result.progress
      }

      if (result.unlocked) {
        newlyUnlocked.push(def)
        if (def.maxProgress) {
          updatedProgress[def.id] = def.maxProgress
        }
      }
    }

    return { newlyUnlocked, updatedProgress }
  }
}
