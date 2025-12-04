/**
 * FIFA/EA Sports Theme Constants
 * Color palette, rarity definitions, and animation variants
 */

export const FIFA_COLORS = {
  // Base Theme
  background: {
    primary: '#0a0a0f',      // Deep dark blue-black
    secondary: '#12121a',    // Slightly lighter
    card: '#1a1a25',         // Card backgrounds
    elevated: '#222230',     // Hover states
  },

  // Neon Accents
  accent: {
    electric: '#00d4ff',     // Primary electric blue
    gold: '#ffd700',         // Gold highlights
    pink: '#ff2d92',         // Hot pink
    green: '#00ff88',        // Success/wins
    purple: '#9d4edd',       // Special effects
    orange: '#ff6b35',       // Warnings/icons
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#a0a0b0',
    muted: '#606070',
  },

  // Rarity System
  rarity: {
    bronze: {
      primary: '#cd7f32',
      glow: 'rgba(205, 127, 50, 0.4)',
      gradient: 'linear-gradient(135deg, #8B4513 0%, #cd7f32 50%, #daa520 100%)',
    },
    silver: {
      primary: '#c0c0c0',
      glow: 'rgba(192, 192, 192, 0.4)',
      gradient: 'linear-gradient(135deg, #808080 0%, #c0c0c0 50%, #e8e8e8 100%)',
    },
    gold: {
      primary: '#ffd700',
      glow: 'rgba(255, 215, 0, 0.5)',
      gradient: 'linear-gradient(135deg, #b8860b 0%, #ffd700 50%, #ffed4a 100%)',
    },
    totw: {
      primary: '#1e90ff',    // Team of the Week blue
      glow: 'rgba(30, 144, 255, 0.5)',
      gradient: 'linear-gradient(135deg, #0066cc 0%, #1e90ff 50%, #4da6ff 100%)',
    },
    icon: {
      primary: '#ff6b35',    // Icons/Legends orange
      glow: 'rgba(255, 107, 53, 0.5)',
      gradient: 'linear-gradient(135deg, #cc4400 0%, #ff6b35 50%, #ff9966 100%)',
    },
  },

  // Status Colors
  status: {
    win: '#00ff88',
    loss: '#ff4444',
    draw: '#ffaa00',
  },
} as const;

// Rarity thresholds based on XP
export const RARITY_THRESHOLDS = {
  icon: 500,    // Top XP players - Icons/Legends
  totw: 300,    // High performers - Team of the Week
  gold: 150,    // Good players
  silver: 50,   // Regular players
  bronze: 0,    // New players
} as const;

// Get rarity based on XP value
export const getRarityFromXP = (xp: number): keyof typeof FIFA_COLORS.rarity => {
  if (xp >= RARITY_THRESHOLDS.icon) return 'icon';
  if (xp >= RARITY_THRESHOLDS.totw) return 'totw';
  if (xp >= RARITY_THRESHOLDS.gold) return 'gold';
  if (xp >= RARITY_THRESHOLDS.silver) return 'silver';
  return 'bronze';
};

// Rarity CSS classes
export const RARITY_CLASSES = {
  bronze: 'rarity-bronze',
  silver: 'rarity-silver',
  gold: 'rarity-gold',
  totw: 'rarity-totw',
  icon: 'rarity-icon',
} as const;

// Animation variants for Framer Motion
export const fifaAnimations = {
  // Page entrance
  pageEntrance: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  },

  // Card entrance
  cardEntrance: {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  },

  // Leaderboard row entrance
  rowEntrance: {
    hidden: { opacity: 0, x: -30 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.4 }
    })
  },

  // Hover glow effect
  hoverGlow: {
    rest: { boxShadow: '0 0 0 rgba(0, 212, 255, 0)' },
    hover: {
      boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)',
      transition: { duration: 0.3 }
    }
  },

  // Tab switch
  tabSwitch: {
    inactive: { scale: 1, opacity: 0.6 },
    active: {
      scale: 1.02,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300 }
    }
  },

  // Stat counter
  statCounter: {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 200 }
    }
  },

  // Fade in up
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  },
} as const;

// Particle configuration
export const PARTICLE_CONFIG = {
  desktop: {
    count: 30,
    colors: [
      FIFA_COLORS.accent.electric,
      FIFA_COLORS.accent.gold,
      FIFA_COLORS.accent.pink,
      FIFA_COLORS.accent.purple,
    ],
  },
  mobile: {
    count: 10,
    colors: [
      FIFA_COLORS.accent.electric,
      FIFA_COLORS.accent.gold,
    ],
  },
} as const;

// Medal emoji mapping
export const MEDALS = ['🥇', '🥈', '🥉'] as const;

// Tab configuration
export const FIFA_TABS = [
  { id: 'attendance', label: 'ATTENDANCE', icon: 'User' },
  { id: 'performance', label: 'PERFORMANCE', icon: 'Award' },
  { id: 'other', label: 'OTHER', icon: 'Zap' },
  { id: 'allstats', label: 'ALL STATS', icon: 'Database' },
] as const;
