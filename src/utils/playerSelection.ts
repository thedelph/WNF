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
      .from('player_stats')
      .select(`
        id,
        xp,
        game_registrations!game_registrations_player_id_fkey (
          id,
          game_id,
          status,
          selection_method
        )
      `)
      .eq('game_registrations.game_id', gameId)
      .eq('game_registrations.status', 'registered');

    if (fetchError) throw fetchError;
    if (!registeredPlayers?.length) return { error: 'No registered players found' };

    // Transform the data to include only what we need
    const players: PlayerStats[] = registeredPlayers.map(player => ({
      id: player.id,
      xp: player.xp || 0,
      status: player.game_registrations[0]?.status,
      selection_method: player.game_registrations[0]?.selection_method
    }));

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
