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
  whatsapp_group_member?: string;
  current_streak?: number;
  caps?: number;
  registration_time?: string;
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
        selection_method,
        created_at
      `)
      .eq('game_id', gameId)
      .eq('status', 'registered');

    if (fetchError) throw fetchError;
    if (!registeredPlayers?.length) return { success: false, error: 'No registered players found', selectedPlayers: [], nonSelectedPlayerIds: [] };

    // Get XP for all registered players
    const playerIds = registeredPlayers.map(reg => reg.player_id);
    const { data: playerStats } = await supabaseAdmin
      .from('player_stats')
      .select('id, xp, current_streak, caps')
      .in('id', playerIds);

    // Get WhatsApp group membership status
    const { data: whatsappStatus } = await supabaseAdmin
      .from('players')
      .select('id, whatsapp_group_member')
      .in('id', playerIds);

    // Transform the data to include only what we need
    const players: PlayerStats[] = registeredPlayers.map(reg => {
      const stats = playerStats?.find(p => p.id === reg.player_id);
      const whatsapp = whatsappStatus?.find(p => p.id === reg.player_id);
      return {
        id: reg.player_id,
        xp: stats?.xp || 0,
        status: reg.status,
        selection_method: reg.selection_method,
        whatsapp_group_member: whatsapp?.whatsapp_group_member || 'No',
        current_streak: stats?.current_streak || 0,
        caps: stats?.caps || 0,
        registration_time: reg.created_at
      };
    });

    // Sort players by XP and tiebreakers
    const sortedPlayers = [...players].sort((a, b) => {
      // First check WhatsApp status
      const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
      const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
      
      if (aIsWhatsApp !== bIsWhatsApp) {
        return aIsWhatsApp ? -1 : 1;
      }

      // Both have same WhatsApp status - compare by XP
      if (b.xp !== a.xp) {
        return b.xp - a.xp;
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

    // Select players by XP for XP slots
    const xpSelectedPlayers = sortedPlayers.slice(0, xpSlots);
    const remainingPlayers = sortedPlayers.slice(xpSlots);

    // Handle random selection with WhatsApp priority
    const whatsappMembers = remainingPlayers.filter(
      p => p.whatsapp_group_member === 'Yes' || p.whatsapp_group_member === 'Proxy'
    );
    
    let randomSelectedPlayers: PlayerStats[] = [];
    
    if (whatsappMembers.length >= randomSlots) {
      // If we have enough WhatsApp members, select only from them
      randomSelectedPlayers = shuffleArray([...whatsappMembers]).slice(0, randomSlots);
    } else {
      // Fill with all WhatsApp members first
      randomSelectedPlayers = [...whatsappMembers];
      
      // Fill remaining slots from non-WhatsApp members
      const nonWhatsappMembers = remainingPlayers.filter(
        p => p.whatsapp_group_member === 'No' || p.whatsapp_group_member === null
      );
      const remainingSlots = randomSlots - whatsappMembers.length;
      const additionalPlayers = shuffleArray([...nonWhatsappMembers]).slice(0, remainingSlots);
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
