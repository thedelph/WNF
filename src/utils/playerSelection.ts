import { supabaseAdmin } from "../utils/supabase";
import { shuffleArray } from "./arrayUtils";

interface PlayerSelectionParams {
  gameId: string;
  xpSlots: number;
  randomSlots: number;
}

interface PlayerStats {
  id: string;
  xp: number;
  status?: string;
  selection_method?: string;
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
    // Get all registered players with their XP from player_stats view
    const { data: registeredPlayers, error: fetchError } = await supabaseAdmin
      .from('game_registrations')
      .select(`
        player_id,
        status,
        selection_method
      `)
      .eq('game_id', gameId)
      .eq('status', 'registered');

    if (fetchError) throw fetchError;
    if (!registeredPlayers?.length) return { error: 'No registered players found' };

    // Get XP for all registered players
    const playerIds = registeredPlayers.map(reg => reg.player_id);
    const { data: playerStats } = await supabaseAdmin
      .from('player_stats')
      .select('id, xp')
      .in('id', playerIds);

    // Transform the data to include only what we need
    const players: PlayerStats[] = registeredPlayers.map(reg => {
      const stats = playerStats?.find(p => p.id === reg.player_id);
      return {
        id: reg.player_id,
        xp: stats?.xp || 0,
        status: reg.status,
        selection_method: reg.selection_method
      };
    });

    // Sort players by XP in descending order
    const sortedPlayers = [...players].sort((a, b) => b.xp - a.xp);

    // Select players by XP for XP slots
    const xpSelectedPlayers = sortedPlayers.slice(0, xpSlots);
    const remainingPlayers = sortedPlayers.slice(xpSlots);

    // Randomly select players for random slots
    const shuffledRemaining = shuffleArray([...remainingPlayers]);
    const randomSelectedPlayers = shuffledRemaining.slice(0, randomSlots);

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

    // Update game_registrations for selected players
    const updatePromises = selectedPlayers.map(player => 
      supabaseAdmin
        .from('game_registrations')
        .update({
          status: 'selected',
          selection_method: player.selection_method
        })
        .eq('game_id', gameId)
        .eq('player_id', player.id)
    );

    // Update game_registrations for non-selected players
    const nonSelectedPlayerIds = players
      .filter(p => !selectedPlayers.find(sp => sp.id === p.id))
      .map(p => p.id);

    if (nonSelectedPlayerIds.length > 0) {
      updatePromises.push(
        supabaseAdmin
          .from('game_registrations')
          .update({
            status: 'reserve',
            selection_method: 'none'
          })
          .eq('game_id', gameId)
          .in('player_id', nonSelectedPlayerIds)
      );
    }

    // Execute all updates
    await Promise.all(updatePromises);

    return {
      success: true,
      selectedPlayers,
      nonSelectedPlayerIds
    };
  } catch (error) {
    console.error('Error in handlePlayerSelection:', error);
    return {
      error: error instanceof Error ? error.message : 'An error occurred during player selection'
    };
  }
};
