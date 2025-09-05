// Playstyle category types
export type PlaystyleCategory = 'attacking' | 'midfield' | 'defensive';

// Base playstyle interface matching database schema
export interface Playstyle {
  id: number;
  name: string;
  category: PlaystyleCategory;
  pace_weight: number;
  shooting_weight: number;
  passing_weight: number;
  dribbling_weight: number;
  defending_weight: number;
  physical_weight: number;
  description?: string;
}

// Derived attributes for a player
export interface DerivedAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

// Player rating with playstyle
export interface PlayerRatingWithPlaystyle {
  id: string;
  player_id: string;
  rater_id: string;
  attack_rating: number;
  defense_rating: number;
  game_iq_rating: number;
  playstyle_id?: number | null;
  created_at: string;
  updated_at?: string;
}

// Extended player interface with derived attributes
export interface PlayerWithAttributes {
  id: string;
  user_id?: string;
  friendly_name: string;
  caps: number;
  xp: number;
  attack?: number | null;
  defense?: number | null;
  game_iq?: number | null;
  average_attack_rating?: number | null;
  average_defense_rating?: number | null;
  average_game_iq_rating?: number | null;
  derived_attributes?: DerivedAttributes | null;
}

// Radar chart data point
export interface RadarChartDataPoint {
  attribute: string;
  value: number;
  fullMark: 10;
}

// Player comparison data for radar chart
export interface PlayerComparisonData {
  player_id: string;
  friendly_name: string;
  data: RadarChartDataPoint[];
}

// Playstyle statistics
export interface PlaystyleStats {
  playstyle_id: number;
  playstyle_name: string;
  category: PlaystyleCategory;
  count: number;
  percentage: number;
}

// Helper type for attribute keys
export type AttributeKey = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical';

// Attribute display configuration
export interface AttributeConfig {
  key: AttributeKey;
  label: string;
  color: string;
  description: string;
}

// Default attribute configurations for UI
export const ATTRIBUTE_CONFIGS: AttributeConfig[] = [
  {
    key: 'pace',
    label: 'Pace',
    color: '#10b981',
    description: 'Speed and acceleration'
  },
  {
    key: 'shooting',
    label: 'Shooting',
    color: '#ef4444',
    description: 'Finishing and shot power'
  },
  {
    key: 'passing',
    label: 'Passing',
    color: '#3b82f6',
    description: 'Vision and passing accuracy'
  },
  {
    key: 'dribbling',
    label: 'Dribbling',
    color: '#f59e0b',
    description: 'Ball control and agility'
  },
  {
    key: 'defending',
    label: 'Defending',
    color: '#8b5cf6',
    description: 'Tackling and positioning'
  },
  {
    key: 'physical',
    label: 'Physical',
    color: '#64748b',
    description: 'Strength and stamina'
  }
];

// Default baseline value for unrated attributes (0 = no playstyle rating)
export const DEFAULT_ATTRIBUTE_VALUE = 0;

// Utility function to normalize attribute values for display
export function normalizeAttributeValue(value: number): number {
  // Convert 0-1 range to 0-10 range for display
  return Math.round(value * 10);
}

// Utility function to format attribute value for display
export function formatAttributeValue(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'unrated';
  }
  return normalizeAttributeValue(value).toFixed(1);
}