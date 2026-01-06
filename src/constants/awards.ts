/**
 * Award category configurations and constants
 * Updated to match AwardCard.tsx gradient styling
 */

import { AwardCategory, AwardCategoryConfig } from '../types/awards';

// Gradient colors matching AwardCard.tsx pattern
export type GradientColor = 'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'indigo' | 'teal' | 'red' | 'rose' | 'amber' | 'yellow' | 'slate';

export const gradientColors: Record<GradientColor, string> = {
  blue: 'from-blue-300 via-blue-500 to-blue-700',
  orange: 'from-orange-300 via-orange-500 to-orange-700',
  purple: 'from-purple-300 via-purple-600 to-fuchsia-600',
  green: 'from-emerald-300 via-emerald-500 to-emerald-700',
  pink: 'from-pink-300 via-pink-500 to-pink-700',
  indigo: 'from-indigo-300 via-indigo-500 to-indigo-700',
  teal: 'from-teal-300 via-teal-500 to-teal-700',
  red: 'from-red-400 via-red-600 to-red-800',
  rose: 'from-rose-400 via-rose-600 to-rose-800',
  amber: 'from-amber-400 via-amber-500 to-amber-700',
  yellow: 'from-yellow-400 via-yellow-500 to-yellow-700',
  slate: 'from-slate-400 via-slate-600 to-slate-800',
};

export const shadowColors: Record<GradientColor, string> = {
  blue: 'shadow-blue-500/50',
  orange: 'shadow-orange-500/50',
  purple: 'shadow-purple-500/50',
  green: 'shadow-emerald-500/50',
  pink: 'shadow-pink-500/50',
  indigo: 'shadow-indigo-500/50',
  teal: 'shadow-teal-500/50',
  red: 'shadow-red-600/50',
  rose: 'shadow-rose-600/50',
  amber: 'shadow-amber-500/50',
  yellow: 'shadow-yellow-500/50',
  slate: 'shadow-slate-600/50',
};

// Category to gradient color mapping
// Color philosophy: semantic colors that match award meaning
// - amber: champions/excellence (gold trophy energy)
// - green: victory/success (winning, positive outcomes)
// - purple: royalty/elite (prestige, "king" awards)
// - indigo: endurance/strength (steel, fortress, defensive)
// - rose: heat/intensity (fire, momentum, streaks)
// - pink: chemistry/connection (partnership warmth)
// - teal: friendship/support (loyalty, fresh energy)
// - red: danger/battle (rivalry, losing, conflict)
// - blue/orange: team semantic colors
export const categoryGradients: Record<AwardCategory, GradientColor> = {
  xp_champion: 'amber',      // 🏆 Gold = champions, #1 status
  win_rate_leader: 'green',  // ✅ Green = success, winning
  net_positive: 'orange',    // ⚽ Orange = goals, scoring
  iron_man: 'indigo',        // 🔩 Indigo = steel/iron, durability
  hot_streak: 'rose',        // 🔥 Rose = fire, heat, momentum
  the_wall: 'indigo',        // 🏰 Indigo = fortress, impenetrable
  appearance_king: 'purple', // 👑 Purple = royalty, nobility
  dynamic_duo: 'pink',       // 💕 Pink = chemistry, connection
  cursed_duos: 'rose',       // 💔 Rose = soured chemistry (inverted pink)
  best_buddies: 'teal',      // 🤝 Teal = friendship, loyalty
  fiercest_rivalry: 'red',   // ⚔️ Red = battle, fierce competition
  dream_team_trio: 'purple', // ✨ Purple = elite, prestige
  cursed_trio: 'slate',      // 👻 Slate = cursed, dark, unlucky
  blue_blood: 'blue',        // 🔵 Team semantic
  dutch_master: 'orange',    // 🟠 Dutch national color
  super_sub: 'teal',         // 🌱 Teal = fresh energy, support role
};

/**
 * Award category configurations with display info
 */
export const AWARD_CATEGORIES: Record<AwardCategory, AwardCategoryConfig> = {
  xp_champion: {
    id: 'xp_champion',
    title: 'XP Champion',
    description: 'Highest XP earned',
    icon: 'Crown',
    color: 'amber',
    valueFormatter: (value) => `${Math.round(value)} XP`,
    isPairAward: false,
  },
  win_rate_leader: {
    id: 'win_rate_leader',
    title: 'Win Rate Leader',
    description: 'Points: W=3, D=1, L=0 (min 10 even-team games)',
    icon: 'Target',
    color: 'green',
    valueFormatter: (value) => `${value.toFixed(1)}%`,
    isPairAward: false,
  },
  net_positive: {
    id: 'net_positive',
    title: 'Net Positive',
    description: 'Best team goal differential',
    icon: 'Zap',
    color: 'orange',
    valueFormatter: (value) => `+${Math.round(value)}`,
    isPairAward: false,
  },
  iron_man: {
    id: 'iron_man',
    title: 'Iron Man',
    description: 'Longest attendance streak',
    icon: 'Shield',
    color: 'indigo',
    valueFormatter: (value) => `${Math.round(value)} games`,
    isPairAward: false,
  },
  hot_streak: {
    id: 'hot_streak',
    title: 'Hot Streak',
    description: 'Longest win streak',
    icon: 'Flame',
    color: 'rose',
    valueFormatter: (value) => `${Math.round(value)} wins`,
    isPairAward: false,
  },
  the_wall: {
    id: 'the_wall',
    title: 'The Wall',
    description: 'Longest unbeaten streak',
    icon: 'Lock',
    color: 'indigo',
    valueFormatter: (value) => `${Math.round(value)} games`,
    isPairAward: false,
  },
  appearance_king: {
    id: 'appearance_king',
    title: 'Appearance King',
    description: 'Most games played',
    icon: 'Trophy',
    color: 'purple',
    valueFormatter: (value) => `${Math.round(value)} caps`,
    isPairAward: false,
  },
  dynamic_duo: {
    id: 'dynamic_duo',
    title: 'Dynamic Duo',
    description: 'Best chemistry pair (win rate × games played)',
    icon: 'Users',
    color: 'pink',
    valueFormatter: (value) => `${value.toFixed(1)} chemistry`,
    isPairAward: true,
  },
  cursed_duos: {
    id: 'cursed_duos',
    title: 'Cursed Duos',
    description: 'Worst chemistry pair (loss rate × games played)',
    icon: 'Users',
    color: 'rose',
    valueFormatter: (value) => `${value.toFixed(1)} curse`,
    isPairAward: true,
  },
  best_buddies: {
    id: 'best_buddies',
    title: 'Best Buddies',
    description: 'Most games played together',
    icon: 'Heart',
    color: 'teal',
    valueFormatter: (value) => `${Math.round(value)} games`,
    isPairAward: true,
  },
  fiercest_rivalry: {
    id: 'fiercest_rivalry',
    title: 'Fiercest Rivalry',
    description: 'Most lopsided head-to-head (dominance × games played)',
    icon: 'Swords',
    color: 'red',
    valueFormatter: (value) => `${value.toFixed(1)} rivalry`,
    isPairAward: true,
  },
  dream_team_trio: {
    id: 'dream_team_trio',
    title: 'Dream Team Trio',
    description: 'Best 3-player chemistry (win rate × games played)',
    icon: 'Users',
    color: 'purple',
    valueFormatter: (value) => `${value.toFixed(1)} chemistry`,
    isPairAward: false,
    isTrioAward: true,
  },
  cursed_trio: {
    id: 'cursed_trio',
    title: 'Cursed Trio',
    description: 'Worst 3-player chemistry (loss rate × games played)',
    icon: 'Users',
    color: 'slate',
    valueFormatter: (value) => `${value.toFixed(1)} curse`,
    isPairAward: false,
    isTrioAward: true,
  },
  blue_blood: {
    id: 'blue_blood',
    title: 'Blue Blood',
    description: 'Highest % on blue team',
    icon: 'Droplet',
    color: 'blue',
    valueFormatter: (value) => `${value.toFixed(1)}%`,
    isPairAward: false,
  },
  dutch_master: {
    id: 'dutch_master',
    title: 'Dutch Master',
    description: 'Highest % on orange team',
    icon: 'Droplet',
    color: 'orange',
    valueFormatter: (value) => `${value.toFixed(1)}%`,
    isPairAward: false,
  },
  super_sub: {
    id: 'super_sub',
    title: 'Super Sub',
    description: 'Most reserve appearances',
    icon: 'Clock',
    color: 'teal',
    valueFormatter: (value) => `${Math.round(value)} games`,
    isPairAward: false,
  },
};

/**
 * Medal colors for styling
 */
export const MEDAL_COLORS = {
  gold: {
    bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600',
    border: 'border-yellow-500',
    text: 'text-yellow-900',
    glow: 'shadow-[0_0_20px_rgba(255,215,0,0.4)]',
    emoji: '🥇',
  },
  silver: {
    bg: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500',
    border: 'border-gray-400',
    text: 'text-gray-900',
    glow: 'shadow-[0_0_20px_rgba(192,192,192,0.4)]',
    emoji: '🥈',
  },
  bronze: {
    bg: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700',
    border: 'border-orange-600',
    text: 'text-orange-900',
    glow: 'shadow-[0_0_20px_rgba(205,127,50,0.4)]',
    emoji: '🥉',
  },
};

/**
 * Order of award categories for display
 */
export const AWARD_CATEGORY_ORDER: AwardCategory[] = [
  'xp_champion',
  'win_rate_leader',
  'net_positive',
  'iron_man',
  'hot_streak',
  'the_wall',
  'appearance_king',
  'dynamic_duo',
  'cursed_duos',
  'best_buddies',
  'fiercest_rivalry',
  'dream_team_trio',
  'cursed_trio',
  'blue_blood',
  'dutch_master',
  'super_sub',
];

/**
 * Get award category config by ID
 */
export const getAwardConfig = (category: AwardCategory): AwardCategoryConfig => {
  return AWARD_CATEGORIES[category];
};

/**
 * Format a value for display based on category
 */
export const formatAwardValue = (category: AwardCategory, value: number): string => {
  return AWARD_CATEGORIES[category].valueFormatter(value);
};

/**
 * Get gradient classes for a category
 */
export const getCategoryGradient = (category: AwardCategory): string => {
  const colorKey = categoryGradients[category];
  return gradientColors[colorKey];
};

/**
 * Get shadow class for a category
 */
export const getCategoryShadow = (category: AwardCategory): string => {
  const colorKey = categoryGradients[category];
  return shadowColors[colorKey];
};
