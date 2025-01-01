import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { ExtendedPlayerData } from '../types/playerSelection';
import { calculatePlayerXP } from '../utils/xpCalculations';

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

      // Fetch all data in parallel
      const [
        gameDataResponse,
        dropoutResponse,
        slotOffersResponse,
        registrationsResponse,
        gameRegsResponse
      ] = await Promise.all([
        // Game data
        supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single(),
          
        // First dropout time  
        supabase
          .from('game_registrations')
          .select('created_at')
          .eq('game_id', gameId)
          .eq('status', 'dropped_out')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
          
        // Slot offers
        supabase
          .from('slot_offers')
          .select('*')
          .eq('game_id', gameId)
          .in('status', ['pending', 'declined']),
          
        // Player registrations
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
          
        // Game sequences
        supabase
          .from('game_registrations')
          .select(`
            player_id,
            team,
            games!inner (
              outcome,
              sequence_number
            )
          `)
          .order('games(sequence_number)', { ascending: false })
      ]);

      // Handle errors
      if (gameDataResponse.error) throw gameDataResponse.error;
      if (registrationsResponse.error) throw registrationsResponse.error;
      if (gameRegsResponse.error) throw gameRegsResponse.error;
      if (slotOffersResponse.error) throw slotOffersResponse.error;

      // Extract data
      const gameData = gameDataResponse.data;
      const registrations = registrationsResponse.data;
      const gameRegs = gameRegsResponse.data;
      const slotOffers = slotOffersResponse.data;

      // Set game data
      setGameData(gameData);
      setGameDate(new Date(gameData.date));

      // Set first dropout time if exists
      if (!dropoutResponse.error && dropoutResponse.data) {
        setFirstDropoutTime(new Date(dropoutResponse.data.created_at));
      }

      // Set active slot offers
      setActiveSlotOffers(slotOffers?.filter(offer => offer.status === 'pending') || []);

      if (!registrations || registrations.length === 0) {
        setIsLoading(false);
        return;
      }

      // Calculate win rates and group sequences by player
      const playerSequences = gameRegs.reduce((acc, reg) => {
        if (!reg.games?.sequence_number) return acc;
        
        const playerId = reg.player_id;
        if (!acc[playerId]) {
          acc[playerId] = {
            sequences: [],
            wins: 0,
            total: 0
          };
        }
        
        // Add sequence number if not already present
        const sequence = Number(reg.games.sequence_number);
        if (!acc[playerId].sequences.includes(sequence)) {
          acc[playerId].sequences.push(sequence);
        }
        
        // Calculate wins
        if (reg.games.outcome && reg.team) {
          const team = reg.team.toLowerCase();
          const isWin = (team === 'blue' && reg.games.outcome === 'blue_win') ||
                       (team === 'orange' && reg.games.outcome === 'orange_win');
          
          if (isWin) acc[playerId].wins++;
          acc[playerId].total++;
        }
        
        return acc;
      }, {} as Record<string, { sequences: number[], wins: number, total: number }>);

      // Process players
      const selected: ExtendedPlayerData[] = [];
      const reserves: ExtendedPlayerData[] = [];
      const droppedOut: ExtendedPlayerData[] = [];

      registrations?.forEach(reg => {
        const player = reg.players;
        if (!player) return;

        const playerSlotOffers = slotOffers?.filter(
          offer => offer.player_id === player.id
        ) || [];

        const playerData = playerSequences[player.id] || { sequences: [], wins: 0, total: 0 };
        const winRate = playerData.total > 0 
          ? Number(((playerData.wins / playerData.total) * 100).toFixed(1))
          : 0;

        const stats = {
          caps: player.caps || 0,
          activeBonuses: player.active_bonuses || 0,
          activePenalties: player.active_penalties || 0,
          currentStreak: player.current_streak || 0,
          gameSequences: playerData.sequences,
          latestSequence: gameData.sequence_number
        };

        const xp = calculatePlayerXP(stats);
        
        // Debug log for Daniel
        if (player.friendly_name === 'Daniel') {
          console.log('Daniel XP calculation in useGamePlayers:', {
            xp,
            stats,
            playerData,
            latestSequence: gameData.sequence_number
          });
        }

        const playerExtendedData: ExtendedPlayerData = {
          id: player.id,
          friendly_name: player.friendly_name,
          win_rate: winRate,
          max_streak: player.max_streak || 0,
          avatar_svg: player.avatar_svg || '',
          stats,
          xp,
          isRandomlySelected: reg.selection_method === 'random',
          selectionMethod: reg.selection_method || '',
          slotOffers: playerSlotOffers,
          has_declined: playerSlotOffers.some(offer => offer.status === 'declined')
        };

        if (reg.status === 'selected') {
          selected.push(playerExtendedData);
        } else if (reg.status === 'reserve') {
          reserves.push(playerExtendedData);
        } else if (reg.status === 'dropped_out') {
          droppedOut.push(playerExtendedData);
        }
      });

      // Set all state at once
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
