import { AchievementDefinition } from '../types'

export const easterEggAchievements: AchievementDefinition[] = [
  {
    id: 'night-owl',
    title: 'Production is Burning',
    description: 'Use DevDot in the dead of night between 1:00 AM and 4:30 AM',
    flavorText: 'Who approved that midnight Friday deploy?',
    tier: 'gold',
    category: 'easter-egg',
    icon: 'Moon',
    secret: true,
    xpReward: 150,
    check: (_event, stats) => ({
      unlocked: stats.nightOwlCount >= 1
    })
  },
  {
    id: 'friday-deploy',
    title: 'Friday Deploy Survivor',
    description: 'Execute any utility tool on a Friday after 4:00 PM',
    flavorText: 'Braver than most developers, wiser than none.',
    tier: 'silver',
    category: 'easter-egg',
    icon: 'AlertTriangle',
    secret: true,
    xpReward: 100,
    check: (_event, stats) => ({
      unlocked: stats.fridayDeploys >= 1
    })
  },
  {
    id: 'vim-refugee',
    title: 'Vim Refugee',
    description: 'Rapidly hit Escape 5 times in DevDot',
    flavorText: 'You are safe now. DevDot lets you exit anytime.',
    tier: 'silver',
    category: 'easter-egg',
    icon: 'DoorOpen',
    secret: true,
    maxProgress: 5,
    xpReward: 100,
    check: (_event, stats) => {
      const progress = stats.escapeSpamCount || 0
      return {
        progress: Math.min(progress, 5),
        unlocked: progress >= 5
      }
    }
  },
  {
    id: 'duck-whisperer',
    title: 'Duck Whisperer',
    description: 'Pet your companion Byte 15 times',
    flavorText: 'Quack! Byte now considers you a certified 10x developer.',
    tier: 'bronze',
    category: 'easter-egg',
    icon: 'Heart',
    maxProgress: 15,
    xpReward: 75,
    check: (_event, stats) => {
      const progress = stats.petInteractions || 0
      return {
        progress: Math.min(progress, 15),
        unlocked: progress >= 15
      }
    }
  },
  {
    id: 'byte-glutton',
    title: 'Byte Glutton',
    description: 'Feed Byte more than 50,000 bytes of raw code and payloads',
    flavorText: 'Nom nom nom! Delicious unformatted syntax.',
    tier: 'silver',
    category: 'easter-egg',
    icon: 'Utensils',
    maxProgress: 50000,
    xpReward: 120,
    check: (_event, stats) => {
      const bytes = stats.totalBytesFormatted || 0
      return {
        progress: Math.min(bytes, 50000),
        unlocked: bytes >= 50000
      }
    }
  },
  {
    id: 'pet-master',
    title: 'Familiar Bond',
    description: 'Level up your companion Byte to Level 5',
    flavorText: 'You two have seen some truly horrifying legacy codebases.',
    tier: 'gold',
    category: 'easter-egg',
    icon: 'Sparkles',
    xpReward: 200,
    check: (event) => ({
      unlocked: event.type === 'pet_level_up' && (event.meta?.level || 0) >= 5
    })
  },
  {
    id: 'konami-coder',
    title: 'Retro Gamer',
    description: 'Input the Konami Code (↑ ↑ ↓ ↓ ← → ← → B A)',
    flavorText: '30 extra lives granted for resolving merge conflicts.',
    tier: 'legendary',
    category: 'easter-egg',
    icon: 'Gamepad2',
    secret: true,
    xpReward: 300,
    check: (event) => ({
      unlocked: event.type === 'konami_code'
    })
  },
  {
    id: 'dark-matter',
    title: 'Dark Matter',
    description: 'Switch between theme modes or high contrast 5 times',
    flavorText: 'Searching for the absolute highest dynamic contrast ratio.',
    tier: 'bronze',
    category: 'easter-egg',
    icon: 'Contrast',
    maxProgress: 5,
    xpReward: 60,
    check: (_event, stats) => {
      const progress = stats.themeToggles || 0
      return {
        progress: Math.min(progress, 5),
        unlocked: progress >= 5
      }
    }
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Execute 25 total operations across DevDot utilities',
    flavorText: 'Moving faster than a compiler on maximum optimization flag -O3.',
    tier: 'gold',
    category: 'easter-egg',
    icon: 'Zap',
    maxProgress: 25,
    xpReward: 150,
    check: (_event, stats) => {
      const ops = stats.totalOperations || 0
      return {
        progress: Math.min(ops, 25),
        unlocked: ops >= 25
      }
    }
  }
]
