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
  };
}

export interface PlayerSelectionResult {
  selectedPlayers: Array<{
    id: string;
    friendly_name: string;
    isRandomlySelected: boolean;
    xp: number;
    stats: {
      caps: number;
      activeBonuses: number;
      activePenalties: number;
      currentStreak: number;
    };
  }>;
  reservePlayers: Array<{
    id: string;
    friendly_name: string;
    xp: number;
    stats: {
      caps: number;
      activeBonuses: number;
      activePenalties: number;
      currentStreak: number;
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
  console.log('Starting player selection with params:', { gameId, maxPlayers, randomSlots });

  try {
    // Fetch all registrations
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
      console.error('Player selection fetch error:', fetchError);
      throw fetchError;
    }

    console.log('Fetched registrations:', registrations);

    // Calculate XP for each player
    const playersWithXP: PlayerWithXP[] = registrations.map(reg => {
      const stats = {
        caps: reg.player.caps,
        activeBonuses: reg.player.active_bonuses,
        activePenalties: reg.player.active_penalties,
        currentStreak: reg.player.current_streak
      };
      
      // Calculate XP using the same formula as the display
      const calculatedXP = calculatePlayerXP(stats);
      
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
    
    console.log('Merit-based selections:', meritPlayers.map(p => ({
      name: p.friendly_name,
      xp: p.xp
    })));

    // Remove merit players from the pool for random selection
    const remainingPlayers = sortedPlayers.filter(
      p => !meritPlayers.some(mp => mp.id === p.id)
    );
    
    // Always select enough random players to reach maxPlayers
    const neededRandomPlayers = maxPlayers - meritPlayers.length;
    const shuffledRemaining = shuffleArray([...remainingPlayers]);
    const randomlySelected = shuffledRemaining.slice(0, neededRandomPlayers);

    console.log('Random selections:', randomlySelected.map(p => ({
      name: p.friendly_name,
      xp: p.xp
    })));

    // Combine selected players and mark the rest as reserves
    const allSelectedPlayers = [...meritPlayers, ...randomlySelected];
    console.log('Total selected players:', allSelectedPlayers.length, 'Expected:', maxPlayers);

    if (allSelectedPlayers.length !== maxPlayers) {
      console.error('Selection error: Wrong number of players selected', {
        total: allSelectedPlayers.length,
        expected: maxPlayers,
        merit: meritPlayers.length,
        random: randomlySelected.length
      });
    }

    // Sort reserves by XP for fairness in display
    const reservePlayers = sortedPlayers
      .filter(p => !allSelectedPlayers.some(s => s.id === p.id))
      .sort((a, b) => b.xp - a.xp);

    // Format the selected players with their selection method
    const formattedSelectedPlayers = allSelectedPlayers.map(p => ({
      id: p.player_id,  
      friendly_name: p.friendly_name,
      xp: p.xp,
      stats: p.stats,
      isRandomlySelected: randomlySelected.some(r => r.id === p.id)
    }));

    // Format reserve players (sorted by XP)
    const formattedReservePlayers = reservePlayers.map(p => ({
      id: p.player_id,  
      friendly_name: p.friendly_name,
      xp: p.xp,
      stats: p.stats
    }));

    // Update registration statuses using registration IDs
    const selectedIds = allSelectedPlayers.map(p => p.id);  
    const reserveIds = reservePlayers.map(p => p.id);  

    // Update selected players
    if (selectedIds.length > 0) {
      const { error: selectedError } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          status: 'selected',
          randomly_selected: false
        })
        .eq('game_id', gameId)
        .in('id', selectedIds);

      if (selectedError) throw selectedError;
    }

    // Update randomly selected players
    const randomlySelectedIds = formattedSelectedPlayers
      .filter(p => p.isRandomlySelected)
      .map(p => p.id);

    if (randomlySelectedIds.length > 0) {
      const { error: randomError } = await supabaseAdmin
        .from('game_registrations')
        .update({ randomly_selected: true })
        .eq('game_id', gameId)
        .in('id', randomlySelectedIds);

      if (randomError) throw randomError;
    }

    // Update reserve players
    if (reserveIds.length > 0) {
      const { error: reserveError } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          status: 'reserve',
          randomly_selected: false
        })
        .eq('game_id', gameId)
        .in('id', reserveIds);

      if (reserveError) throw reserveError;
    }

    console.log('Selection results:', {
      selectedPlayers: formattedSelectedPlayers,
      reservePlayers: formattedReservePlayers
    });

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
    console.log('Saving selection data:', JSON.stringify(selectionData, null, 2));

    const { data: savedData, error: saveError } = await supabaseAdmin
      .from('game_selections')
      .upsert(selectionData)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving selection data:', saveError);
      throw saveError;
    }

    console.log('Saved selection data:', savedData);

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
    console.error('Error in player selection:', error);
    throw error;
  }
};

function calculateXPDistribution(players: PlayerWithXP[]): Record<number, number> {
  return players.reduce((acc, p) => {
    acc[p.xp] = (acc[p.xp] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
}
