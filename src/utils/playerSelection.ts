import { supabaseAdmin } from "../utils/supabase";
import { shuffleArray } from "./arrayUtils";

interface PlayerSelectionParams {
  gameId: string;
  xpSlots: number;
  randomSlots: number;
}

interface PlayerStats {
  id: string;
  friendly_name?: string;
  xp: number;
  status?: string;
  selection_method?: string;
  whatsapp_group_member?: string;
  current_streak?: number;
  caps?: number;
  registration_time?: string;
  bench_warmer_streak?: number;
}

interface PlayerSelectionResult {
  success: boolean;
  selectedPlayers: PlayerStats[];
  nonSelectedPlayerIds: string[];
  error?: string;
}

export const handlePlayerSelection = async ({
  gameId,
  xpSlots,
  randomSlots,
}: PlayerSelectionParams): Promise<PlayerSelectionResult> => {
  try {
    // Get all registered players
    const { data: registeredPlayers, error: fetchError } = await supabaseAdmin
      .from('game_registrations')
      .select(`
        player_id,
        status,
        selection_method,
        created_at
      `)
      .eq('game_id', gameId)
      .eq('status', 'registered');

    if (fetchError) throw fetchError;
    if (!registeredPlayers?.length) return { success: false, error: 'No registered players found', selectedPlayers: [], nonSelectedPlayerIds: [] };

    // Get player IDs
    const playerIds = registeredPlayers.map(reg => reg.player_id);

    // Get player details including bench_warmer_streak
    const { data: playerDetails, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, friendly_name, whatsapp_group_member, bench_warmer_streak')
      .in('id', playerIds);

    if (playerError) throw playerError;

    // Get player stats
    const { data: playerStats, error: statsError } = await supabaseAdmin
      .from('player_stats')
      .select('id, xp, current_streak, caps')
      .in('id', playerIds);

    if (statsError) throw statsError;

    console.log('Debug - Player Details:', playerDetails);
    console.log('Debug - Player Stats:', playerStats);

    // Transform the data to include only what we need
    const players: PlayerStats[] = registeredPlayers.map(reg => {
      const details = playerDetails?.find(p => p.id === reg.player_id);
      const stats = playerStats?.find(p => p.id === reg.player_id);
      return {
        id: reg.player_id,
        friendly_name: details?.friendly_name,
        xp: stats?.xp || 0,
        status: reg.status,
        selection_method: reg.selection_method,
        whatsapp_group_member: details?.whatsapp_group_member || 'No',
        current_streak: stats?.current_streak || 0,
        caps: stats?.caps || 0,
        registration_time: reg.created_at,
        bench_warmer_streak: details?.bench_warmer_streak || 0
      };
    });

    console.log('All players before sorting:', players.map(p => ({
      name: p.friendly_name,
      xp: p.xp,
      whatsapp: p.whatsapp_group_member
    })));

    // Sort players by XP and tiebreakers
    const sortedPlayers = [...players].sort((a, b) => {
      // First compare by XP
      if (b.xp !== a.xp) {
        return b.xp - a.xp;
      }

      // If XP is equal, then check WhatsApp status
      const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
      const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
      
      if (aIsWhatsApp !== bIsWhatsApp) {
        return aIsWhatsApp ? -1 : 1;
      }

      // Both have same XP and WhatsApp status - check streak
      if (b.current_streak !== a.current_streak) {
        return (b.current_streak || 0) - (a.current_streak || 0);
      }

      // Same streak - check caps
      if (b.caps !== a.caps) {
        return (b.caps || 0) - (a.caps || 0);
      }

      // Same caps - check registration time
      return (a.registration_time || '').localeCompare(b.registration_time || '');
    });

    console.log('Players after sorting:', sortedPlayers.map(p => ({
      name: p.friendly_name,
      xp: p.xp,
      whatsapp: p.whatsapp_group_member
    })));

    // Select players by XP for XP slots
    const xpSelectedPlayers = sortedPlayers.slice(0, xpSlots);
    
    // The remaining players should be everyone NOT selected by XP
    const remainingPlayers = sortedPlayers.filter(player => 
      !xpSelectedPlayers.some(xpPlayer => xpPlayer.id === player.id)
    );

    console.log('XP Selected Players:', xpSelectedPlayers.map(p => ({
      name: p.friendly_name,
      xp: p.xp,
      method: 'merit'
    })));

    console.log('Remaining Players:', remainingPlayers.map(p => ({
      name: p.friendly_name,
      xp: p.xp
    })));

    // Handle random selection with WhatsApp priority and weighted probabilities
    const whatsappMembers = remainingPlayers.filter(
      p => p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy'
    );
    
    let randomSelectedPlayers: PlayerStats[] = [];
    
    // Helper function to select players using weighted probabilities
    const selectWithWeights = (candidates: PlayerStats[], numSlots: number): PlayerStats[] => {
      const selected: PlayerStats[] = [];
      const remainingCandidates = [...candidates];
      
      for (let i = 0; i < numSlots && remainingCandidates.length > 0; i++) {
        // Calculate weights for remaining candidates
        const weights = remainingCandidates.map(p => 1 + (p.bench_warmer_streak || 0));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        // Create cumulative ranges
        const ranges = weights.map((weight, index) => {
          const start = index === 0 ? 0 : 
            weights.slice(0, index).reduce((sum, w) => sum + w, 0);
          return {
            player: remainingCandidates[index],
            start,
            end: start + weight
          };
        });
        
        // Select a player
        const roll = Math.random() * totalWeight;
        const selectedRange = ranges.find(r => roll >= r.start && roll < r.end);
        
        if (selectedRange) {
          selected.push(selectedRange.player);
          // Remove selected player from remaining candidates
          const selectedIndex = remainingCandidates.findIndex(p => p.id === selectedRange.player.id);
          if (selectedIndex !== -1) {
            remainingCandidates.splice(selectedIndex, 1);
          }
        }
      }
      
      return selected;
    };
    
    if (whatsappMembers.length >= randomSlots) {
      // If we have enough WhatsApp members, select only from them using weights
      randomSelectedPlayers = selectWithWeights(whatsappMembers, randomSlots);
    } else {
      // Fill with all WhatsApp members first
      randomSelectedPlayers = [...whatsappMembers];
      
      // Fill remaining slots from non-WhatsApp members using weights
      const nonWhatsappMembers = remainingPlayers.filter(
        p => p.whatsapp_group_member === 'No' || p.whatsapp_group_member === null
      );
      const remainingSlots = randomSlots - whatsappMembers.length;
      const additionalPlayers = selectWithWeights(nonWhatsappMembers, remainingSlots);
      randomSelectedPlayers = [...randomSelectedPlayers, ...additionalPlayers];
    }

    // Combine selected players
    const selectedPlayers = [
      ...xpSelectedPlayers.map(player => ({
        ...player,
        selection_method: 'merit'
      })),
      ...randomSelectedPlayers.map(player => ({
        ...player,
        selection_method: 'random'
      }))
    ];

    try {
      // First update all selected players
      for (const player of selectedPlayers) {
        const { error: updateError } = await supabaseAdmin
          .from('game_registrations')
          .update({
            status: 'selected',
            selection_method: player.selection_method
          })
          .eq('game_id', gameId)
          .eq('player_id', player.id);

        if (updateError) {
          throw new Error(`Failed to update selected player ${player.id}: ${updateError.message}`);
        }
      }

      // Then update non-selected players
      const nonSelectedPlayerIds = players
        .filter(p => !selectedPlayers.find(sp => sp.id === p.id))
        .map(p => p.id);

      if (nonSelectedPlayerIds.length > 0) {
        const { error: reserveError } = await supabaseAdmin
          .from('game_registrations')
          .update({
            status: 'reserve',
            selection_method: 'none'
          })
          .eq('game_id', gameId)
          .in('player_id', nonSelectedPlayerIds);

        if (reserveError) {
          throw new Error(`Failed to update reserve players: ${reserveError.message}`);
        }
      }

      return {
        success: true,
        selectedPlayers,
        nonSelectedPlayerIds
      };
    } catch (error) {
      console.error('Error updating player selection:', error);
      return {
        error: error instanceof Error ? error.message : 'An error occurred during player selection update'
      };
    }
  } catch (error) {
    console.error('Error in handlePlayerSelection:', error);
    return {
      error: error instanceof Error ? error.message : 'An error occurred during player selection'
    };
  }
};
