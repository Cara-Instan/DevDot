import { AchievementDefinition } from '../types'

export const jsonSuiteAchievements: AchievementDefinition[] = [
  {
    id: 'json-chef',
    title: 'JSON Chef',
    description: 'Prettify or auto-repair a JSON payload',
    flavorText: 'Order restored to chaotic brackets.',
    tier: 'bronze',
    category: 'json',
    icon: 'FileJson',
    xpReward: 50,
    check: (event) => ({
      unlocked: event.type === 'json_format' && !event.isMinified
    })
  },
  {
    id: 'data-compactor',
    title: 'Data Compactor',
    description: 'Minify a JSON payload over 2,000 bytes',
    flavorText: 'Every byte shaved off saves carbon and bandwidth.',
    tier: 'bronze',
    category: 'json',
    icon: 'Minimize2',
    xpReward: 60,
    check: (event) => ({
      unlocked: event.type === 'json_format' && !!event.isMinified && (event.bytes || 0) >= 2000
    })
  },
  {
    id: 'type-crafter',
    title: 'Type Crafter',
    description: 'Generate TypeScript, Go, or Rust types from JSON',
    flavorText: 'Types are the seatbelts of modern programming.',
    tier: 'silver',
    category: 'json',
    icon: 'Code2',
    xpReward: 100,
    check: (event) => ({
      unlocked: event.type === 'json_types'
    })
  },
  {
    id: 'spot-diff',
    title: 'Spot the Difference',
    description: 'Run a visual diff between two JSON payloads',
    flavorText: 'Git blame won’t save you now.',
    tier: 'bronze',
    category: 'json',
    icon: 'GitCompare',
    xpReward: 50,
    check: (event) => ({
      unlocked: event.type === 'json_diff'
    })
  }
]
