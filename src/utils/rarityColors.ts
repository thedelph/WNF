/**
 * Utility functions for rarity-based color schemes
 */

export type Rarity = 'Amateur' | 'Semi Pro' | 'Professional' | 'World Class' | 'Legendary' | 'Retired' | 'Academy';

/**
 * Get the primary color for a rarity tier
 * Returns a color that represents the middle of the gradient
 */
export const getRarityColor = (rarity: Rarity | undefined): string => {
  if (!rarity) return '#94a3b8'; // slate-400 (Amateur default)

  switch (rarity) {
    case 'Legendary':
      return '#f59e0b'; // amber-500 (middle of yellow-300 to amber-600)
    case 'World Class':
      return '#a855f7'; // purple-500 (middle of purple-300 to fuchsia-600)
    case 'Professional':
      return '#3b82f6'; // blue-500 (middle of blue-300 to cyan-600)
    case 'Semi Pro':
      return '#10b981'; // emerald-500 (middle of green-300 to emerald-600)
    case 'Amateur':
      return '#94a3b8'; // slate-400 (middle of slate-300 to zinc-600)
    case 'Academy':
      return '#0d9488'; // teal-600 (from teal-600 to cyan-800)
    case 'Retired':
      return '#6b7280'; // gray-500 (muted for retired)
    default:
      return '#94a3b8'; // slate-400 default
  }
};

/**
 * Get a lighter version of the rarity color for inactive segments
 */
export const getRarityColorInactive = (): string => {
  return 'rgba(255, 255, 255, 0.1)';
};
