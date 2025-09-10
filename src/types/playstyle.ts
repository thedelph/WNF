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

// Attribute combination for new checkbox-based system
export interface AttributeCombination {
  has_pace: boolean;
  has_shooting: boolean;
  has_passing: boolean;
  has_dribbling: boolean;
  has_defending: boolean;
  has_physical: boolean;
}

// Player rating with attribute combination (new system)
export interface PlayerRatingWithAttributes extends Omit<PlayerRatingWithPlaystyle, 'playstyle_id'> {
  has_pace: boolean;
  has_shooting: boolean;
  has_passing: boolean;
  has_dribbling: boolean;
  has_defending: boolean;
  has_physical: boolean;
  generated_playstyle_name?: string;
  generated_playstyle_compact?: string;
}

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

// Predefined playstyle names (keep the existing 24)
const PREDEFINED_PLAYSTYLES: Record<string, string> = {
  // Complete players (all 6 attributes)
  '111111': 'Complete Player',
  
  // Attacking styles
  '110000': 'Hunter',         // Pace + Shooting
  '110001': 'Hawk',           // Pace + Shooting + Physical
  '010101': 'Marksman',       // Shooting + Dribbling + Physical
  '010001': 'Finisher',       // Shooting + Physical
  '010100': 'Sniper',         // Shooting + Dribbling
  '011000': 'Deadeye',        // Shooting + Passing
  '100100': 'Speedster',      // Pace + Dribbling
  
  // Midfield styles
  '101100': 'Engine',         // Pace + Passing + Dribbling
  '001100': 'Artist',         // Passing + Dribbling
  '001001': 'Architect',      // Passing + Physical
  '001010': 'Powerhouse',     // Passing + Defending
  '011100': 'Maestro',        // Shooting + Passing + Dribbling
  '101000': 'Catalyst',       // Pace + Passing
  '100001': 'Locomotive',     // Pace + Physical
  '000101': 'Enforcer',       // Dribbling + Physical
  
  // Defensive styles
  '100010': 'Shadow',         // Pace + Defending
  '100011': 'Anchor',         // Pace + Defending + Physical
  '010010': 'Gladiator',      // Shooting + Defending
  '000110': 'Guardian',       // Dribbling + Defending
  '000011': 'Sentinel',       // Defending + Physical
  '001011': 'Backbone',       // Passing + Defending + Physical
};

// Helper to convert attribute combination to binary key
function attributesToKey(attributes: AttributeCombination): string {
  return [
    attributes.has_pace ? '1' : '0',
    attributes.has_shooting ? '1' : '0',
    attributes.has_passing ? '1' : '0',
    attributes.has_dribbling ? '1' : '0',
    attributes.has_defending ? '1' : '0',
    attributes.has_physical ? '1' : '0',
  ].join('');
}

// Generate playstyle name from attribute combination
export function generatePlaystyleName(attributes: AttributeCombination): string {
  const key = attributesToKey(attributes);
  
  // Check for predefined name first
  if (PREDEFINED_PLAYSTYLES[key]) {
    return PREDEFINED_PLAYSTYLES[key];
  }
  
  // Generate dynamic name for missing combinations
  const selectedAttributes: string[] = [];
  
  if (attributes.has_pace) selectedAttributes.push('Pace');
  if (attributes.has_shooting) selectedAttributes.push('Shooting');
  if (attributes.has_passing) selectedAttributes.push('Passing');
  if (attributes.has_dribbling) selectedAttributes.push('Dribbling');
  if (attributes.has_defending) selectedAttributes.push('Defending');
  if (attributes.has_physical) selectedAttributes.push('Physical');
  
  const count = selectedAttributes.length;
  
  if (count === 0) return 'No Style Selected';
  if (count === 1) return `${selectedAttributes[0]} Specialist`;
  
  // For 2-5 attributes without predefined names, join with ' & '
  return selectedAttributes.join(' & ');
}

// Generate compact playstyle display
export function generatePlaystyleCompact(attributes: AttributeCombination): string {
  const key = attributesToKey(attributes);
  
  // Use abbreviated predefined names when available
  const COMPACT_NAMES: Record<string, string> = {
    '111111': 'Complete',
    '110000': 'Hunter',
    '110001': 'Hawk',
    '010101': 'Marksman',
    '010001': 'Finisher',
    '010100': 'Sniper',
    '011000': 'Deadeye',
    '100100': 'Speedster',
    '101100': 'Engine',
    '001100': 'Artist',
    '001001': 'Architect',
    '001010': 'Powerhouse',
    '011100': 'Maestro',
    '101000': 'Catalyst',
    '100001': 'Locomotive',
    '000101': 'Enforcer',
    '100010': 'Shadow',
    '100011': 'Anchor',
    '010010': 'Gladiator',
    '000110': 'Guardian',
    '000011': 'Sentinel',
    '001011': 'Backbone',
  };
  
  if (COMPACT_NAMES[key]) {
    return COMPACT_NAMES[key];
  }
  
  // Generate compact form for dynamic names
  const selectedAttributes: string[] = [];
  
  if (attributes.has_pace) selectedAttributes.push('PAC');
  if (attributes.has_shooting) selectedAttributes.push('SHO');
  if (attributes.has_passing) selectedAttributes.push('PAS');
  if (attributes.has_dribbling) selectedAttributes.push('DRI');
  if (attributes.has_defending) selectedAttributes.push('DEF');
  if (attributes.has_physical) selectedAttributes.push('PHY');
  
  const count = selectedAttributes.length;
  
  if (count === 0) return 'None';
  
  return selectedAttributes.join('+');
}

// Get attribute combination from selected keys
export function getAttributeCombination(selectedKeys: AttributeKey[]): AttributeCombination {
  return {
    has_pace: selectedKeys.includes('pace'),
    has_shooting: selectedKeys.includes('shooting'),
    has_passing: selectedKeys.includes('passing'),
    has_dribbling: selectedKeys.includes('dribbling'),
    has_defending: selectedKeys.includes('defending'),
    has_physical: selectedKeys.includes('physical'),
  };
}

// Get selected attribute keys from combination
export function getSelectedAttributeKeys(attributes: AttributeCombination): AttributeKey[] {
  const keys: AttributeKey[] = [];
  
  if (attributes.has_pace) keys.push('pace');
  if (attributes.has_shooting) keys.push('shooting');
  if (attributes.has_passing) keys.push('passing');
  if (attributes.has_dribbling) keys.push('dribbling');
  if (attributes.has_defending) keys.push('defending');
  if (attributes.has_physical) keys.push('physical');
  
  return keys;
}

// Get all available playstyle options
export function getAllPlaystyleOptions(): { attributes: AttributeCombination; name: string; isPredefined: boolean }[] {
  const options: { attributes: AttributeCombination; name: string; isPredefined: boolean }[] = [];
  
  // Generate all 63 possible combinations (excluding no attributes)
  for (let i = 1; i < 64; i++) {
    const binary = i.toString(2).padStart(6, '0');
    const attributes: AttributeCombination = {
      has_pace: binary[0] === '1',
      has_shooting: binary[1] === '1',
      has_passing: binary[2] === '1',
      has_dribbling: binary[3] === '1',
      has_defending: binary[4] === '1',
      has_physical: binary[5] === '1',
    };
    
    const name = generatePlaystyleName(attributes);
    const isPredefined = PREDEFINED_PLAYSTYLES[binary] !== undefined;
    
    options.push({ attributes, name, isPredefined });
  }
  
  return options;
}

// Check if a playstyle name is predefined
export function isPredefinedPlaystyle(attributes: AttributeCombination): boolean {
  const key = attributesToKey(attributes);
  return PREDEFINED_PLAYSTYLES[key] !== undefined;
}