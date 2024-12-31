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
  const [isLoading, setIsLoading] = useState(true);
  const [gameDate, setGameDate] = useState<Date | null>(null);
  const [firstDropoutTime, setFirstDropoutTime] = useState<Date | null>(null);
  const [gameData, setGameData] = useState<any>(null);
  const [activeSlotOffers, setActiveSlotOffers] = useState<any[]>([]);

  const fetchGamePlayers = async () => {
    try {
      setIsLoading(true);

      // Fetch game data first
      const { data: gameDataResult, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGameData(gameDataResult);
      const parsedGameDate = new Date(gameDataResult.date);
      setGameDate(parsedGameDate);

      // Get first dropout time
      const { data: dropoutData, error: dropoutError } = await supabase
        .from('game_registrations')
        .select('created_at')
        .eq('game_id', gameId)
        .eq('status', 'dropped_out')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!dropoutError && dropoutData) {
        setFirstDropoutTime(new Date(dropoutData.created_at));
      }

      // Fetch active slot offers and declined offers
      const { data: slotOffers, error: slotOffersError } = await supabase
        .from('slot_offers')
        .select('*')
        .eq('game_id', gameId)
        .in('status', ['pending', 'declined']);

      if (slotOffersError) throw slotOffersError;
      setActiveSlotOffers(slotOffers?.filter(offer => offer.status === 'pending') || []);

      // Fetch registrations and game sequences in parallel
      const [registrationsResponse, gameRegsResponse] = await Promise.all([
        supabase
          .from('game_registrations')
          .select(`
            player_id,
            status,
            created_at,
            selection_method,
            players!game_registrations_player_id_fkey (
              id,
              friendly_name,
              caps,
              active_bonuses,
              active_penalties,
              current_streak,
              max_streak,
              avatar_svg
            )
          `)
          .eq('game_id', gameId)
          .order('created_at', { ascending: true }),
        supabase
          .from('game_registrations')
          .select(`
            player_id,
            team,
            games (
              outcome
            )
          `)
      ]);

      if (registrationsResponse.error) throw registrationsResponse.error;
      if (gameRegsResponse.error) throw gameRegsResponse.error;

      const registrations = registrationsResponse.data;
      const gameRegs = gameRegsResponse.data;

      // Calculate win rates for each player
      const winRates = new Map();
      gameRegs.forEach(reg => {
        if (!reg.games?.outcome) return;
        
        const playerId = reg.player_id;
        if (!winRates.has(playerId)) {
          winRates.set(playerId, { wins: 0, total: 0 });
        }
        
        const stats = winRates.get(playerId);
        const team = reg.team?.toLowerCase();
        const isWin = (team === 'blue' && reg.games.outcome === 'blue_win') ||
                     (team === 'orange' && reg.games.outcome === 'orange_win');
        
        if (isWin) stats.wins++;
        stats.total++;
      });

      // Try to get game sequences, but don't fail if the function doesn't exist yet
      let gameSequences = [];
      try {
        const { data: sequences, error: seqError } = await supabase.rpc('get_player_game_sequences');
        if (!seqError) {
          gameSequences = sequences;
        } else {
          console.warn('Game sequences not available:', seqError);
        }
      } catch (err) {
        console.warn('Game sequences not available:', err);
      }

      const selected: ExtendedPlayerData[] = [];
      const reserves: ExtendedPlayerData[] = [];
      const droppedOut: ExtendedPlayerData[] = [];

      registrations?.forEach(reg => {
        const player = reg.players;
        if (!player) return;

        const playerSlotOffers = slotOffers?.filter(
          offer => offer.player_id === player.id
        ) || [];

        const playerSequences = gameSequences.find(
          seq => seq?.player_id === player.id
        )?.game_sequences || [];

        const playerStats = winRates.get(player.id) || { wins: 0, total: 0 };
        const winRate = playerStats.total > 0 
          ? Number(((playerStats.wins / playerStats.total) * 100).toFixed(1))
          : 0;

        const playerData: ExtendedPlayerData = {
          id: player.id,
          friendly_name: player.friendly_name,
          win_rate: winRate,
          max_streak: player.max_streak || 0,
          avatar_svg: player.avatar_svg || '',
          stats: {
            caps: player.caps || 0,
            activeBonuses: player.active_bonuses || 0,
            activePenalties: player.active_penalties || 0,
            currentStreak: player.current_streak || 0,
            gameSequences: playerSequences
          },
          isRandomlySelected: reg.selection_method === 'random',
          selectionMethod: reg.selection_method || '',
          slotOffers: playerSlotOffers,
          has_declined: playerSlotOffers.some(offer => offer.status === 'declined')
        };

        if (reg.status === 'selected') {
          selected.push(playerData);
        } else if (reg.status === 'reserve') {
          reserves.push(playerData);
        } else if (reg.status === 'dropped_out') {
          droppedOut.push(playerData);
        }
      });

      setSelectedPlayers(selected);
      setReservePlayers(reserves);
      setDroppedOutPlayers(droppedOut);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGamePlayers();

    // Set up real-time subscriptions for slot offers and game registrations
    const channels = [
      supabase
        .channel('slot-offers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'slot_offers',
            filter: `game_id=eq.${gameId}`
          },
          (payload) => {
            console.log('Slot offer change detected:', payload);
            fetchGamePlayers();
          }
        ),
      supabase
        .channel('game-registrations-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_registrations',
            filter: `game_id=eq.${gameId}`
          },
          (payload) => {
            console.log('Game registration change detected:', payload);
            fetchGamePlayers();
          }
        )
    ];

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [gameId]);

  return {
    selectedPlayers,
    reservePlayers,
    droppedOutPlayers,
    isLoading,
    gameDate,
    firstDropoutTime,
    refreshPlayers: fetchGamePlayers,
    gameData,
    activeSlotOffers
  };
};
