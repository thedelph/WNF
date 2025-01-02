import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { ExtendedPlayerData } from '../types/playerSelection';

/**
 * Custom hook to manage game players data and state
 * Handles fetching and organizing player data for a specific game
 */
export const useGamePlayers = (gameId: string) => {
  const [selectedPlayers, setSelectedPlayers] = useState<ExtendedPlayerData[]>([]);
  const [reservePlayers, setReservePlayers] = useState<ExtendedPlayerData[]>([]);
  const [droppedOutPlayers, setDroppedOutPlayers] = useState<ExtendedPlayerData[]>([]);
  const [activeSlotOffers, setActiveSlotOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [firstDropoutTime, setFirstDropoutTime] = useState<Date | null>(null);
  const [gameDate, setGameDate] = useState<Date | null>(null);

  const fetchGamePlayers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get game data first to check status
      const { data: gameDataResponse, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGameData(gameDataResponse);
      setGameDate(gameDataResponse?.date ? new Date(gameDataResponse.date) : null);

      // Get all registrations for this game with player stats
      const { data: registrations, error: regError } = await supabase
        .from('game_registrations')
        .select(`
          id,
          status,
          selection_method,
          game_id,
          player:players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            avatar_svg
          ),
          player_stats!game_registrations_player_id_fkey (
            caps,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            win_rate,
            xp
          )
        `)
        .eq('game_id', gameId);

      if (regError) throw regError;

      // Get all slot offers for this game (including declined ones)
      const { data: slotOffers, error: slotError } = await supabase
        .from('slot_offers')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });  // Get most recent first

      if (slotError) throw slotError;

      // Get slot offer times for all reserve players
      const { data: offerTimes, error: offerTimesError } = await supabase
        .rpc('calculate_slot_offer_times', {
          p_game_id: gameId,
          p_num_players: registrations.filter(r => r.status === 'reserve').length
        });

      if (offerTimesError) throw offerTimesError;

      // Create a map of slot offers by player ID
      const slotOffersByPlayer = slotOffers?.reduce((acc, offer) => {
        if (!acc[offer.player_id]) {
          acc[offer.player_id] = [];
        }
        acc[offer.player_id].push(offer);
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Create a map of offer times by rank
      const offerTimesByRank = offerTimes?.reduce((acc, time) => {
        acc[time.player_rank] = time;
        return acc;
      }, {} as Record<number, any>) || {};

      // Transform players
      const transformedPlayers = registrations.map((reg, index) => {
        const playerSlotOffers = slotOffersByPlayer[reg.player.id] || [];
        const latestOffer = playerSlotOffers[0];
        const isReserve = reg.status === 'reserve';
        
        // For reserve players, get their rank based on XP
        const reserveRank = isReserve ? 
          registrations
            .filter(r => r.status === 'reserve')
            .sort((a, b) => (b.player_stats.xp || 0) - (a.player_stats.xp || 0))
            .findIndex(r => r.player.id === reg.player.id) + 1 
          : null;

        // Get offer times based on their rank
        const offerTimes = reserveRank ? offerTimesByRank[reserveRank] : null;

        return {
          id: reg.player.id,
          friendly_name: reg.player.friendly_name,
          avatar_svg: reg.player.avatar_svg,
          caps: reg.player_stats.caps,
          active_bonuses: reg.player_stats.active_bonuses,
          active_penalties: reg.player_stats.active_penalties,
          current_streak: reg.player_stats.current_streak,
          max_streak: reg.player_stats.max_streak,
          win_rate: reg.player_stats.win_rate,
          xp: reg.player_stats.xp,
          status: reg.status,
          selection_method: reg.selection_method,
          isRandomlySelected: reg.selection_method === 'random',
          // Only set hasSlotOffer if there's an actual offer
          hasSlotOffer: !!latestOffer,
          slotOfferStatus: latestOffer?.status,
          slotOfferExpiresAt: latestOffer?.expires_at,
          slotOfferAvailableAt: latestOffer?.available_at,
          slotOffers: playerSlotOffers,
          // Store potential offer times separately
          potentialOfferTimes: isReserve ? offerTimes : null
        };
      });

      // Sort players by XP
      const sortedPlayers = [...transformedPlayers].sort((a, b) => (b.xp || 0) - (a.xp || 0));

      // Get players by their current status in the database
      const selectedPlayers = sortedPlayers.filter(p => p.status === 'selected');
      const reservePlayers = sortedPlayers.filter(p => p.status === 'reserve');
      const droppedOutPlayers = sortedPlayers.filter(p => p.status === 'dropped_out');

      // Update game_selections
      const { error: updateError } = await supabase
        .from('game_selections')
        .upsert({
          game_id: gameId,
          selected_players: selectedPlayers.map(p => p.id),
          reserve_players: reservePlayers.map(p => p.id),
          selection_metadata: {
            timestamp: new Date().toISOString()
          }
        });

      if (updateError) {
        console.error('Failed to update game_selections:', updateError);
      }

      setSelectedPlayers(selectedPlayers);
      setReservePlayers(reservePlayers);
      setDroppedOutPlayers(droppedOutPlayers);
      setActiveSlotOffers(slotOffers || []);

    } catch (err) {
      console.error('Error fetching game players:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch game players'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gameId) {
      fetchGamePlayers();
    }
  }, [gameId]);

  return {
    selectedPlayers,
    reservePlayers,
    droppedOutPlayers,
    activeSlotOffers,
    isLoading,
    error,
    gameData,
    gameDate,
    firstDropoutTime,
    refreshPlayers: fetchGamePlayers
  };
};
