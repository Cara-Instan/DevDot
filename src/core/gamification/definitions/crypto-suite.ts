import { AchievementDefinition } from '../types'

export const cryptoSuiteAchievements: AchievementDefinition[] = [
  {
    id: 'cipher-punk',
    title: 'Cipher Punk',
    description: 'Hash a string with SHA-256 or SHA-512',
    flavorText: 'In math and cryptographic primitives we trust.',
    tier: 'bronze',
    category: 'crypto',
    icon: 'Fingerprint',
    xpReward: 50,
    check: (event) => ({
      unlocked: event.type === 'hash_generate' && ['SHA-256', 'SHA-512'].includes(event.algo || '')
    })
  },
  {
    id: 'paranoid-dev',
    title: 'Paranoid Android',
    description: 'Generate MD5, SHA-256, and Bcrypt hashes',
    flavorText: 'Trust no one, not even localhost.',
    tier: 'silver',
    category: 'crypto',
    icon: 'ShieldAlert',
    xpReward: 120,
    check: (_event, stats) => {
      const hashes = stats.hashesGenerated || {}
      const hasMd5 = (hashes['MD5'] || 0) > 0
      const hasSha = (hashes['SHA-256'] || 0) > 0
      const hasBcrypt = (hashes['BCRYPT'] || 0) > 0
      return {
        unlocked: hasMd5 && hasSha && hasBcrypt
      }
    }
  },
  {
    id: 'token-whisperer',
    title: 'Token Whisperer',
    description: 'Inspect and decode an offline JWT token',
    flavorText: 'I can see right into your claims and payload.',
    tier: 'bronze',
    category: 'crypto',
    icon: 'KeyRound',
    xpReward: 60,
    check: (event) => ({
      unlocked: event.type === 'jwt_decode'
    })
  },
  {
    id: 'base64-ninja',
    title: 'Base64 Ninja',
    description: 'Encode or decode Base64 data',
    flavorText: 'Padding with == like a true artisan.',
    tier: 'bronze',
    category: 'crypto',
    icon: 'Binary',
    xpReward: 50,
    check: (event) => ({
      unlocked: event.type === 'encoder_action' && event.algo === 'base64'
    })
  }
]
