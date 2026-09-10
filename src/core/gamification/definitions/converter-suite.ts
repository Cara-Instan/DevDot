import { AchievementDefinition } from '../types'

export const converterSuiteAchievements: AchievementDefinition[] = [
  {
    id: 'polyglot',
    title: 'Polyglot Transpiler',
    description: 'Transpile between JSON, YAML, TOML, or CSV',
    flavorText: 'Why speak one data format when you can speak them all?',
    tier: 'bronze',
    category: 'converters',
    icon: 'Repeat',
    xpReward: 60,
    check: (event) => ({
      unlocked: event.type === 'transpile'
    })
  },
  {
    id: 'curl-tamer',
    title: 'cURL Tamer',
    description: 'Convert raw cURL into JavaScript, Python, or Go code',
    flavorText: 'Copy-pasting from Chrome DevTools Network Tab like a pro.',
    tier: 'bronze',
    category: 'converters',
    icon: 'Terminal',
    xpReward: 60,
    check: (event) => ({
      unlocked: event.type === 'curl_convert'
    })
  },
  {
    id: 'data-alchemy',
    title: 'Data Alchemist',
    description: 'Perform 10 data conversions across DevDot',
    flavorText: 'Turning lead strings into golden structures.',
    tier: 'silver',
    category: 'converters',
    icon: 'Sparkles',
    maxProgress: 10,
    xpReward: 120,
    check: (_event, stats) => {
      const progress = stats.converterOperations || 0
      return {
        progress: Math.min(progress, 10),
        unlocked: progress >= 10
      }
    }
  }
]
