import { supabase } from '../lib/supabaseClient';
import { Player } from '../types/Player';

interface PlayerWithStats {
  id: string;
  player_id: string;
  caps: number;
  active_bonuses: number;
  active_penalties: number;
  current_streak: number;
  attack_rating?: number;
  defense_rating?: number;
}

interface SelectionResult {
  selectedPlayerIds: string[];
  reservePlayerIds: string[];
}

interface TeamAssignment {
  team: 'blue' | 'orange';
  player_id: string;
  friendly_name: string;
  attack_rating: number;
  defense_rating: number;
  experience_factor: number;
}

interface TeamRatingStats {
  attack: number;
  defense: number;
  experience: number;
}

interface TeamStats {
  attack_differential: number;
  defense_differential: number;
  total_differential: number;
  experience_differential: number;
  blue_stats: TeamRatingStats;
  orange_stats: TeamRatingStats;
}

interface BalancedTeams {
  teams: TeamAssignment[];
  stats: TeamStats;
}

export const selectTeamMembers = (
  registrations: PlayerWithStats[],
  maxPlayers: number,
  randomSlots: number
): SelectionResult => {
  if (!Array.isArray(registrations)) {
    console.error('Invalid registrations data:', registrations);
    throw new Error('Registrations must be an array');
  }

  try {
    // Calculate number of merit-based slots
    const meritSlots = maxPlayers - randomSlots;

    // Sort players by XP in descending order
    const sortedPlayers = [...registrations].sort((a, b) => {
      const xpA = calculatePlayerXP(a);
      const xpB = calculatePlayerXP(b);
      return xpB - xpA;
    });

    // Select merit-based players
    const meritBasedPlayers = sortedPlayers.slice(0, meritSlots);

    // Get remaining players for random selection
    const remainingPlayers = sortedPlayers.filter(
      p => !meritBasedPlayers.find(m => m.player_id === p.player_id)
    );

    // Randomly select players for random slots
    const randomlySelected = shuffleArray(remainingPlayers)
      .slice(0, randomSlots);

    // Combine selected players
    const selectedPlayerIds = [...meritBasedPlayers.map(p => p.player_id), ...randomlySelected.map(p => p.player_id)];

    // Determine reserve players (everyone else)
    const reservePlayerIds = remainingPlayers.filter(
      p => !selectedPlayerIds.includes(p.player_id)
    ).map(p => p.player_id);

    return {
      selectedPlayerIds,
      reservePlayerIds
    };
  } catch (error) {
    console.error('Error selecting team members:', error);
    throw error;
  }
};

// Helper function to calculate player XP
const calculatePlayerXP = (player: PlayerWithStats): number => {
  const baseXP = player.caps;
  const bonusModifier = player.active_bonuses * 0.1;
  const penaltyModifier = player.active_penalties * -0.1;
  const streakModifier = player.current_streak * 0.1;
  
  return baseXP * (1 + bonusModifier + penaltyModifier + streakModifier);
};

// Helper function to shuffle array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Store team selection results in Supabase
export const storeTeamSelections = async (
  gameId: string,
  selectedPlayers: PlayerWithStats[],
  reservePlayers: PlayerWithStats[],
): Promise<void> => {
  try {
    // First, clear any existing selections for this game
    const { error: deleteError } = await supabase
      .from('game_selections')
      .delete()
      .eq('game_id', gameId);

    if (deleteError) throw deleteError;

    // Prepare team assignments
    const blueTeam = selectedPlayers.slice(0, selectedPlayers.length / 2);
    const orangeTeam = selectedPlayers.slice(selectedPlayers.length / 2);

    // Create selection data
    const selectionData = {
      game_id: gameId,
      selected_players: {
        blue: blueTeam.map(player => ({
          player_id: player.player_id,
          team: 'blue'
        })),
        orange: orangeTeam.map(player => ({
          player_id: player.player_id,
          team: 'orange'
        }))
      },
      reserve_players: reservePlayers.map(player => ({
        player_id: player.player_id
      })),
      selection_metadata: {
        timestamp: new Date().toISOString(),
        method: 'balanced'
      }
    };

    const { error: insertError } = await supabase
      .from('game_selections')
      .insert([selectionData]);

    if (insertError) {
      throw insertError;
    }

    console.log('Team selections stored successfully');
  } catch (error) {
    console.error('Error storing team selections:', error);
    throw error;
  }
};

export async function getBalancedTeams(game_id: string): Promise<BalancedTeams> {
  try {
    const { data, error } = await supabase
      .rpc('get_balanced_teams', { game_id })
      .single();

    if (error) {
      console.error('Error getting balanced teams:', error.message);
      throw new Error(`Failed to get balanced teams: ${error.message}`);
    }

    if (!data) {
      throw new Error('No team data returned from the server');
    }

    return data as BalancedTeams;
  } catch (err) {
    console.error('Unexpected error in getBalancedTeams:', err);
    throw err;
  }
};

export const getTeamPlayers = (teams: TeamAssignment[], team: 'blue' | 'orange'): TeamAssignment[] => {
  return teams.filter(player => player.team === team)
    .sort((a, b) => (b.attack_rating + b.defense_rating) - (a.attack_rating + a.defense_rating));
};

export const calculateTeamRating = (players: TeamAssignment[]): TeamRatingStats => {
  const totalAttack = players.reduce((sum, p) => sum + p.attack_rating, 0);
  const totalDefense = players.reduce((sum, p) => sum + p.defense_rating, 0);
  const totalExperience = players.reduce((sum, p) => sum + p.experience_factor, 0);
  
  return {
    attack: totalAttack,
    defense: totalDefense,
    experience: totalExperience
  };
};

export const formatTeamDifferential = (differential: number): string => {
  return differential.toFixed(1);
};
