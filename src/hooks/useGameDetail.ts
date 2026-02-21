/**
 * Hook for fetching a single game's details by sequence number
 * Used by the GameDetail page for displaying match reports
 */

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export interface GameDetailPlayer {
  id: string;
  friendly_name: string;
  avatar_svg?: string;
  caps?: number;
}

export interface GameDetailRegistration {
  id: string;
  status: 'selected' | 'reserve' | 'registered' | 'dropped_out' | 'absent';
  team: 'blue' | 'orange' | null;
  selection_method?: string;
  player: GameDetailPlayer;
}

export interface GameDetail {
  id: string;
  date: string;
  sequence_number: number;
  score_blue: number | null;
  score_orange: number | null;
  outcome: 'blue_win' | 'orange_win' | 'draw' | null;
  status: string;
  youtube_url?: string;
  venue?: {
    id: string;
    name: string;
    address?: string;
    google_maps_url?: string;
  };
  game_registrations: GameDetailRegistration[];
}

interface UseGameDetailReturn {
  game: GameDetail | null;
  loading: boolean;
  error: string | null;
  blueTeam: GameDetailRegistration[];
  orangeTeam: GameDetailRegistration[];
  reserves: GameDetailRegistration[];
  refetch: () => Promise<void>;
}

export const useGameDetail = (sequenceNumber: string | undefined): UseGameDetailReturn => {
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = async () => {
    if (!sequenceNumber) {
      setLoading(false);
      setError('No game specified');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('games')
        .select(`
          id,
          date,
          sequence_number,
          score_blue,
          score_orange,
          outcome,
          status,
          youtube_url,
          venue:venue_id (
            id,
            name,
            address,
            google_maps_url
          ),
          game_registrations (
            id,
            status,
            team,
            selection_method,
            player:players!game_registrations_player_id_fkey (
              id,
              friendly_name,
              avatar_svg,
              caps
            )
          )
        `)
        .eq('sequence_number', parseInt(sequenceNumber, 10))
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError(`Game WNF #${sequenceNumber} not found`);
        } else {
          throw fetchError;
        }
        return;
      }

      // Transform the data to match our interface
      const transformedGame: GameDetail = {
        id: data.id,
        date: data.date,
        sequence_number: data.sequence_number,
        score_blue: data.score_blue,
        score_orange: data.score_orange,
        outcome: data.outcome,
        status: data.status,
        youtube_url: data.youtube_url,
        venue: data.venue as GameDetail['venue'],
        game_registrations: (data.game_registrations || [])
          .filter((reg: { player: unknown }) => reg.player)
          .map((reg: {
            id: string;
            status: string;
            team: string | null;
            selection_method?: string;
            player: GameDetailPlayer;
          }) => ({
            id: reg.id,
            status: reg.status as GameDetailRegistration['status'],
            team: reg.team as 'blue' | 'orange' | null,
            selection_method: reg.selection_method,
            player: reg.player,
          })),
      };

      setGame(transformedGame);
    } catch (err) {
      console.error('Error fetching game detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
  }, [sequenceNumber]);

  // Derived data for convenience
  const blueTeam = game?.game_registrations.filter(
    reg => reg.team === 'blue' && reg.status === 'selected'
  ) || [];

  const orangeTeam = game?.game_registrations.filter(
    reg => reg.team === 'orange' && reg.status === 'selected'
  ) || [];

  const reserves = game?.game_registrations.filter(
    reg => reg.status === 'reserve'
  ) || [];

  return {
    game,
    loading,
    error,
    blueTeam,
    orangeTeam,
    reserves,
    refetch: fetchGame,
  };
};

export default useGameDetail;
