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
          using_token,
          had_token,
          player:players!game_registrations_player_id_fkey (
            id,
            friendly_name,
            avatar_svg,
            whatsapp_group_member,
            player_xp (
              rank
            )
          ),
          player_stats!game_registrations_player_id_fkey (
            caps,
            xp,
            active_bonuses,
            active_penalties,
            current_streak,
            max_streak,
            win_rate
          )
        `)
        .eq('game_id', gameId);

      if (regError) throw regError;

      // Process registrations
      if (registrations) {
        const processedRegistrations = registrations.map((reg: any) => ({
          id: reg.player.id,
          friendly_name: reg.player.friendly_name,
          avatar_svg: reg.player.avatar_svg,
          whatsapp_group_member: reg.player.whatsapp_group_member,
          status: reg.status,
          selection_method: reg.selection_method,
          using_token: reg.using_token,
          had_token: reg.had_token,
          registration_id: reg.id,
          caps: reg.player_stats?.caps || 0,
          xp: reg.player_stats?.xp || 0,
          active_bonuses: reg.player_stats?.active_bonuses || 0,
          active_penalties: reg.player_stats?.active_penalties || 0,
          current_streak: reg.player_stats?.current_streak || 0,
          max_streak: reg.player_stats?.max_streak || 0,
          win_rate: reg.player_stats?.win_rate || 0,
          rank: reg.player.player_xp?.rank || undefined
        }));

        // Get all slot offers for this game (including declined and accepted ones)
        const { data: slotOffers, error: slotError } = await supabase
          .from('slot_offers')
          .select('*')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false });  // Get most recent first

        if (slotError) throw slotError;

        // Check if any slot has been accepted
        const hasAcceptedSlot = slotOffers?.some(offer => offer.status === 'accepted');

        // Get slot offer times for all reserve players (only if no slot has been accepted)
        const { data: offerTimes, error: offerTimesError } = !hasAcceptedSlot ? await supabase
          .rpc('calculate_slot_offer_times', {
            p_game_id: gameId,
            p_num_players: processedRegistrations.filter(r => r.status === 'reserve').length
          }) : { data: null, error: null };

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

        // Helper function to sort by slot offer priority
        const sortBySlotOfferPriority = (a: any, b: any) => {
          // First compare WhatsApp status
          const aIsWhatsApp = a.whatsapp_group_member === 'Yes' || a.whatsapp_group_member === 'Proxy';
          const bIsWhatsApp = b.whatsapp_group_member === 'Yes' || b.whatsapp_group_member === 'Proxy';
          
          if (aIsWhatsApp !== bIsWhatsApp) {
            return aIsWhatsApp ? -1 : 1;
          }
          
          // Then compare XP
          if ((b.xp || 0) !== (a.xp || 0)) {
            return (b.xp || 0) - (a.xp || 0);
          }
          
          // Then compare streak
          if ((b.current_streak || 0) !== (a.current_streak || 0)) {
            return (b.current_streak || 0) - (a.current_streak || 0);
          }
          
          // Then compare caps
          if ((b.caps || 0) !== (a.caps || 0)) {
            return (b.caps || 0) - (a.caps || 0);
          }

          // Finally compare registration time
          return new Date(a.registration_id).getTime() - new Date(b.registration_id).getTime();
        };

        // Transform players
        const transformedPlayers = processedRegistrations.map((reg, index) => {
          const playerSlotOffers = slotOffersByPlayer[reg.id] || [];
          const latestOffer = playerSlotOffers[0];
          const isReserve = reg.status === 'reserve';
          
          // For reserve players, get their rank based on proper slot offer priority
          const reserveRank = isReserve ? 
            processedRegistrations
              .filter(r => r.status === 'reserve')
              .sort(sortBySlotOfferPriority)
              .findIndex(r => r.id === reg.id) + 1 
            : null;

          // Get offer times based on their rank
          const offerTimes = reserveRank ? offerTimesByRank[reserveRank] : null;

          return {
            id: reg.id,
            friendly_name: reg.friendly_name,
            avatar_svg: reg.avatar_svg,
            whatsapp_group_member: reg.whatsapp_group_member,
            caps: reg.caps,
            xp: reg.xp,
            active_bonuses: reg.active_bonuses,
            active_penalties: reg.active_penalties,
            current_streak: reg.current_streak,
            max_streak: reg.max_streak,
            win_rate: reg.win_rate,
            status: reg.status,
            selection_method: reg.selection_method,
            using_token: reg.using_token,
            had_token: reg.had_token,
            isRandomlySelected: reg.selection_method === 'random',
            // Only set hasSlotOffer if there's an actual offer
            hasSlotOffer: !!latestOffer,
            slotOfferStatus: latestOffer?.status,
            slotOfferExpiresAt: latestOffer?.expires_at,
            slotOfferAvailableAt: latestOffer?.available_at,
            slotOffers: playerSlotOffers,
            // Store potential offer times separately
            potentialOfferTimes: isReserve ? offerTimes : null,
            rank: reg.rank
          };
        });

        // Sort players by XP
        const sortedPlayers = [...transformedPlayers].sort((a, b) => (b.xp || 0) - (a.xp || 0));

        // Get players by their current status in the database
        const selectedPlayers = sortedPlayers.filter(p => p.status === 'selected');
        const reservePlayers = sortedPlayers.filter(p => p.status === 'reserve');
        const droppedOutPlayers = sortedPlayers.filter(p => p.status === 'dropped_out');

        setSelectedPlayers(selectedPlayers);
        setReservePlayers(reservePlayers);
        setDroppedOutPlayers(droppedOutPlayers);
        setActiveSlotOffers(slotOffers || []);

      }
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
