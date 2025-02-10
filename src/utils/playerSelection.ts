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
  using_token?: boolean;
  used_token_last_game?: boolean;
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
        created_at,
        using_token
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

    // Transform the data to include only what we need
    const players: PlayerStats[] = registeredPlayers.map(reg => {
      const details = playerDetails?.find(p => p.id === reg.player_id);
      const stats = playerStats?.find(p => p.id === reg.player_id);
      const usedTokenLastGame = previousGameTokenUsers?.some(u => u.player_id === reg.player_id) ?? false;
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
        bench_warmer_streak: details?.bench_warmer_streak || 0,
        using_token: reg.using_token || false,
        used_token_last_game: usedTokenLastGame
      };
    });

    // First, get the previous game's token usage
    const { data: previousGameTokenUsers, error: tokenError } = await supabaseAdmin.rpc(
      'check_previous_game_token_usage',
      { current_game_id: gameId }
    );

    if (tokenError) {
      console.error('Error fetching previous game token usage:', tokenError);
      throw tokenError;
    }

    // First, select players using tokens - they get guaranteed slots
    const tokenSelectedPlayers = players.filter(player => player.using_token);
    const remainingXpSlots = Math.max(0, xpSlots - tokenSelectedPlayers.length);

    // Sort remaining players by XP and tiebreakers (excluding token users)
    const remainingPlayers = players.filter(player => !player.using_token);
    const sortedPlayers = [...remainingPlayers].sort((a, b) => {
      // First check if either player used a token in the previous game
      const aUsedTokenPreviously = previousGameTokenUsers?.some(u => u.player_id === a.id) ?? false;
      const bUsedTokenPreviously = previousGameTokenUsers?.some(u => u.player_id === b.id) ?? false;

      // If either used a token in the previous game, they go to the bottom
      if (aUsedTokenPreviously !== bUsedTokenPreviously) {
        return aUsedTokenPreviously ? 1 : -1;
      }

      // If both used tokens in previous game, or neither did, use normal sorting
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

    // Now check which token users would still get in by merit AFTER considering token effects
    const allPlayersWithTokenEffects = [...players].sort((a, b) => {
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

    // Get who would get in by merit after token effects
    const remainingMeritSlots = allPlayersWithTokenEffects
      .filter(player => !player.using_token) // Exclude token users since they already have slots
      .slice(0, remainingXpSlots); // Take only the remaining merit slots

    // Now check which token users would still get in by merit
    const tokenUsersSelectedByMerit = tokenSelectedPlayers.filter(tokenPlayer => {
      // Find their position in the merit-based list (including token effects)
      const meritPosition = allPlayersWithTokenEffects.findIndex(p => p.id === tokenPlayer.id);
      // They would get in by merit if their position is within the original xpSlots
      return meritPosition < xpSlots;
    });

    // Select players by XP for remaining XP slots
    const xpSelectedPlayers = sortedPlayers.slice(0, remainingXpSlots);
    
    // The remaining players should be everyone NOT selected by XP or token
    const playersForRandomSelection = sortedPlayers.filter(player => 
      !xpSelectedPlayers.some(xpPlayer => xpPlayer.id === player.id)
    );

    // Handle random selection with WhatsApp priority and weighted probabilities
    const whatsappMembers = playersForRandomSelection.filter(
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
      const nonWhatsappMembers = playersForRandomSelection.filter(
        p => p.whatsapp_group_member === 'No' || p.whatsapp_group_member === null
      );
      const remainingSlots = randomSlots - whatsappMembers.length;
      const additionalPlayers = selectWithWeights(nonWhatsappMembers, remainingSlots);
      randomSelectedPlayers = [...randomSelectedPlayers, ...additionalPlayers];
    }

    // Combine all selected players
    const selectedPlayers = [
      ...tokenSelectedPlayers.map(player => {
        const wouldGetInByMerit = tokenUsersSelectedByMerit.some(p => p.id === player.id);
        return {
          ...player,
          selection_method: wouldGetInByMerit ? 'merit' : 'token',
          using_token: !wouldGetInByMerit // Only consume token if they wouldn't get in by merit
        };
      }),
      ...xpSelectedPlayers.map(player => ({
        ...player,
        selection_method: 'merit'
      })),
      ...randomSelectedPlayers.map(player => ({
        ...player,
        selection_method: 'random'
      }))
    ];

    // Helper function to update player status with retry
    const updatePlayerStatus = async (
      playerId: string,
      status: 'selected' | 'reserve',
      selectionMethod: 'token' | 'merit' | 'random' | 'none'
    ) => {
      try {
        console.log(`Updating player ${playerId} to status: ${status}, method: ${selectionMethod}`);
        
        // First check if the player is already in the desired state
        const { data: current } = await supabaseAdmin
          .from('game_registrations')
          .select('status, selection_method')
          .eq('game_id', gameId)
          .eq('player_id', playerId)
          .single();

        if (current?.status === status && current?.selection_method === selectionMethod) {
          console.log(`Player ${playerId} already in desired state`);
          return current;
        }

        // Try direct update first
        const { error: directError } = await supabaseAdmin
          .from('game_registrations')
          .update({
            status,
            selection_method: selectionMethod
          })
          .eq('game_id', gameId)
          .eq('player_id', playerId);

        if (!directError) {
          console.log(`Successfully updated player ${playerId} directly`);
          return { status, selection_method: selectionMethod };
        }

        console.log(`Direct update failed for ${playerId}, trying RPC...`, directError);

        // If direct update fails, try the RPC
        const { data, error } = await supabaseAdmin.rpc('update_game_registration', {
          p_game_id: gameId,
          p_player_id: playerId,
          p_status: status,
          p_selection_method: selectionMethod
        });

        if (error) {
          console.error(`Error updating player ${playerId}:`, {
            error,
            details: error.details,
            hint: error.hint,
            message: error.message
          });
          throw error;
        }

        console.log(`Successfully updated player ${playerId} via RPC`, data);
        return data;
      } catch (error) {
        console.error(`Failed to update player ${playerId}:`, {
          error,
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    };

    try {
      console.log('Starting player selection process...');
      console.log('Token players:', tokenSelectedPlayers.length);
      console.log('XP players:', xpSelectedPlayers.length);
      console.log('Random players:', randomSelectedPlayers.length);

      // Update token players first
      for (const player of tokenSelectedPlayers) {
        const wouldGetInByMerit = tokenUsersSelectedByMerit.some(p => p.id === player.id);
        await updatePlayerStatus(
          player.id, 
          'selected', 
          wouldGetInByMerit ? 'merit' : 'token'
        );
      }

      // Update merit-based selections
      for (const player of xpSelectedPlayers) {
        await updatePlayerStatus(player.id, 'selected', 'merit');
      }

      // Update random selections
      for (const player of randomSelectedPlayers) {
        await updatePlayerStatus(player.id, 'selected', 'random');
      }

      // Update non-selected players to reserve
      const nonSelectedPlayerIds = players
        .filter(p => !selectedPlayers.find(sp => sp.id === p.id))
        .map(p => p.id);

      console.log('Non-selected players:', nonSelectedPlayerIds.length);

      for (const playerId of nonSelectedPlayerIds) {
        await updatePlayerStatus(playerId, 'reserve', 'none');
      }

      return {
        success: true,
        selectedPlayers,
        nonSelectedPlayerIds
      };
    } catch (error) {
      console.error('Error in player selection:', {
        error,
        message: error.message,
        stack: error.stack,
        context: {
          tokenPlayers: tokenSelectedPlayers.length,
          xpPlayers: xpSelectedPlayers.length,
          randomPlayers: randomSelectedPlayers.length
        }
      });
      return {
        success: false,
        error: `Failed to update player statuses: ${error.message}`,
        selectedPlayers: [],
        nonSelectedPlayerIds: []
      };
    }
  } catch (error) {
    return {
      success: false,
      selectedPlayers: [],
      nonSelectedPlayerIds: [],
      error: error instanceof Error ? error.message : 'An error occurred during player selection'
    };
  }
};
