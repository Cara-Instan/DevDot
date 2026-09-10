import { AchievementDefinition } from '../types'

export const securitySuiteAchievements: AchievementDefinition[] = [
  {
    id: 'secret-agent',
    title: 'Secret Agent (007)',
    description: 'Redact sensitive keys, emails, or credentials with PII Redactor',
    flavorText: 'Your secrets stay strictly on your machine.',
    tier: 'silver',
    category: 'security',
    icon: 'EyeOff',
    xpReward: 90,
    check: (event) => ({
      unlocked: event.type === 'pii_redact' && (event.count || 0) >= 1
    })
  },
  {
    id: 'clean-slate',
    title: 'Clean Slate',
    description: 'Trigger the Emergency Panic Button or wipe all local storage',
    flavorText: 'Mission compromised! Erasing all operational traces.',
    tier: 'silver',
    category: 'security',
    icon: 'Flame',
    xpReward: 100,
    check: (_event, stats) => ({
      unlocked: stats.panicWipes >= 1
    })
  },
  {
    id: 'time-capsule',
    title: 'Time Capsule',
    description: 'Export an encrypted or local .toolkit session snapshot',
    flavorText: 'Future-proofing your workspace state against catastrophic crashes.',
    tier: 'bronze',
    category: 'security',
    icon: 'FolderArchive',
    xpReward: 70,
    check: (_event, stats) => ({
      unlocked: stats.snapshotsExported >= 1
    })
  }
]
