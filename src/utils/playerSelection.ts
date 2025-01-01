import { supabaseAdmin } from '../utils/supabase';
import { calculatePlayerXP } from './xpCalculations';
import { shuffleArray } from './arrayUtils';

export interface PlayerSelectionParams {
  gameId: string;
  maxPlayers: number;
  randomSlots: number;
}

interface PlayerWithXP {
  id: string;
  player_id: string;
  friendly_name: string;
  xp: number;
  stats: {
    caps: number;
    activeBonuses: number;
    activePenalties: number;
    currentStreak: number;
    gameSequences: number[];
  };
}

export interface PlayerSelectionResult {
  selectedPlayers: Array<{
    id: string;
    player_id: string;
    friendly_name: string;
    isRandomlySelected: boolean;
    xp: number;
    stats: {
      caps: number;
      activeBonuses: number;
      activePenalties: number;
      currentStreak: number;
      gameSequences: number[];
    };
  }>;
  reservePlayers: Array<{
    id: string;
    player_id: string;
    friendly_name: string;
    xp: number;
    stats: {
      caps: number;
      activeBonuses: number;
      activePenalties: number;
      currentStreak: number;
      gameSequences: number[];
    };
  }>;
  debug: SelectionDebugInfo;
}

interface SelectionDebugInfo {
  startTime: string;
  endTime: string;
  totalRegistrations: number;
  meritSlots: number;
  randomSlots: number;
  adjustedRandomSlots: number;
  selectionNotes: string[];
  xpDistribution: Record<number, number>;
}

export const handlePlayerSelection = async ({
  gameId,
  maxPlayers,
  randomSlots
}: PlayerSelectionParams): Promise<PlayerSelectionResult> => {
  const startTime = new Date().toISOString();
  const selectionNotes: string[] = [];

  try {
    // Get game sequences for all players
    const { data: gameRegsData, error: gameRegsError } = await supabaseAdmin
      .from('game_registrations')
      .select(`
        player_id,
        games!inner (
          outcome,
          sequence_number
        )
      `)
      .order('games(sequence_number)', { ascending: false });

    if (gameRegsError) {
      throw gameRegsError;
    }

    // Group game sequences by player
    const playerSequences: { [key: string]: number[] } = {};
    gameRegsData.forEach(reg => {
      if (!reg.games?.sequence_number) return;
      
      if (!playerSequences[reg.player_id]) {
        playerSequences[reg.player_id] = [];
      }
      playerSequences[reg.player_id].push(Number(reg.games.sequence_number));
    });

    // Fetch all registrations with player stats
    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from('game_registrations')
      .select(`
        id,
        player_id,
        player:players!game_registrations_player_id_fkey (
          id,
          friendly_name,
          caps,
          active_bonuses,
          active_penalties,
          current_streak
        )
      `)
      .eq('game_id', gameId);

    if (fetchError) {
      throw fetchError;
    }

    // Get latest game sequence
    const { data: latestGameData, error: latestGameError } = await supabaseAdmin
      .from('games')
      .select('sequence_number')
      .order('sequence_number', { ascending: false })
      .limit(1);

    if (latestGameError) {
      throw latestGameError;
    }

    const latestSequence = latestGameData?.[0]?.sequence_number || 0;

    // Calculate XP for each player
    const playersWithXP: PlayerWithXP[] = registrations.map(reg => {
      const stats = {
        caps: reg.player.caps,
        activeBonuses: reg.player.active_bonuses,
        activePenalties: reg.player.active_penalties,
        currentStreak: reg.player.current_streak,
        gameSequences: playerSequences[reg.player_id] || []
      };
      
      // Calculate XP using the complete formula
      const calculatedXP = calculatePlayerXP({
        ...stats,
        latestSequence
      });
      
      return {
        id: reg.id,
        player_id: reg.player_id,
        friendly_name: reg.player.friendly_name,
        xp: calculatedXP,
        stats
      };
    });

    // Sort players by XP (highest to lowest) with tiebreakers
    const sortedPlayers = [...playersWithXP].sort((a, b) => {
      // Primary sort by XP
      if (b.xp !== a.xp) return b.xp - a.xp;
      
      // Secondary sort by current streak
      if (b.stats.currentStreak !== a.stats.currentStreak) return b.stats.currentStreak - a.stats.currentStreak;
      
      // Tertiary sort by caps
      if (b.stats.caps !== a.stats.caps) return b.stats.caps - a.stats.caps;
      
      // Final tiebreaker by name for consistency
      return a.friendly_name.localeCompare(b.friendly_name);
    });

    // Calculate merit and random slots
    let meritSlots = maxPlayers - randomSlots;
    let adjustedRandomSlots = randomSlots;
    
    // Select merit-based players
    const meritPlayers = sortedPlayers.slice(0, meritSlots);
    
    // Remove merit players from the pool for random selection
    const remainingPlayers = sortedPlayers.filter(
      p => !meritPlayers.some(mp => mp.id === p.id)
    );
    
    // Select random players based on randomSlots parameter
    const shuffledRemaining = shuffleArray([...remainingPlayers]);
    const randomlySelected = shuffledRemaining.slice(0, adjustedRandomSlots);

    // Combine selected players and mark the rest as reserves
    const allSelectedPlayers = [...meritPlayers, ...randomlySelected];

    // Sort reserves by XP for fairness in display
    const reservePlayers = sortedPlayers
      .filter(p => !allSelectedPlayers.some(s => s.id === p.id))
      .sort((a, b) => b.xp - a.xp);

    // Format the selected players with their selection method
    const formattedSelectedPlayers = allSelectedPlayers.map(p => ({
      id: p.id,
      player_id: p.player_id,
      friendly_name: p.friendly_name,
      xp: p.xp,
      stats: p.stats,
      isRandomlySelected: randomlySelected.some(r => r.id === p.id)
    }));

    // Format reserve players (sorted by XP)
    const formattedReservePlayers = reservePlayers.map(p => ({
      id: p.id,
      player_id: p.player_id,
      friendly_name: p.friendly_name,
      xp: p.xp,
      stats: p.stats
    }));

    // Update registration statuses using registration IDs
    const selectedRegistrationIds = allSelectedPlayers.map(p => p.id);  
    const reserveRegistrationIds = reservePlayers.map(p => p.id);  

    // Update selected players
    if (selectedRegistrationIds.length > 0) {
      const selectedUpdates = selectedRegistrationIds.map(registrationId => ({
        id: registrationId,
        status: 'selected',
        selection_method: randomlySelected.some(r => r.id === registrationId) ? 'random' : 'merit'
      }));

      const { error: selectedError } = await supabaseAdmin
        .from('game_registrations')
        .upsert(selectedUpdates);

      if (selectedError) {
        throw selectedError;
      }
    }

    // Update reserve players
    if (reserveRegistrationIds.length > 0) {
      const reserveUpdates = reserveRegistrationIds.map(registrationId => ({
        id: registrationId,
        status: 'reserve',
        selection_method: 'none'
      }));

      const { error: reserveError } = await supabaseAdmin
        .from('game_registrations')
        .upsert(reserveUpdates);

      if (reserveError) throw reserveError;
    }

    // Save selection results to database
    const selectionData = {
      game_id: gameId,
      selected_players: formattedSelectedPlayers,
      reserve_players: formattedReservePlayers,
      selection_metadata: {
        startTime,
        endTime: new Date().toISOString(),
        totalRegistrations: registrations.length,
        meritSlots,
        randomSlots,
        adjustedRandomSlots,
        selectionNotes,
        xpDistribution: calculateXPDistribution(playersWithXP)
      }
    };

    const { data: savedData, error: saveError } = await supabaseAdmin
      .from('game_selections')
      .upsert(selectionData)
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    return {
      selectedPlayers: formattedSelectedPlayers,
      reservePlayers: formattedReservePlayers,
      debug: {
        startTime,
        endTime: new Date().toISOString(),
        totalRegistrations: registrations.length,
        meritSlots,
        randomSlots,
        adjustedRandomSlots,
        selectionNotes,
        xpDistribution: calculateXPDistribution(playersWithXP)
      }
    };
  } catch (error) {
    throw error;
  }
};

function calculateXPDistribution(players: PlayerWithXP[]): Record<number, number> {
  return players.reduce((acc, p) => {
    acc[p.xp] = (acc[p.xp] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
}
