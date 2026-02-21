/**
 * Hook for fetching game results with pagination and filters
 * Used by the public Results page
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export interface GameResultsFilters {
  year: number | 'all';
  // 'my_win' and 'my_loss' are user-centric filters (only apply when participation='played')
  outcome: '' | 'blue_win' | 'orange_win' | 'draw' | 'my_win' | 'my_loss';
  participation: 'all' | 'played' | 'reserve';
}

export interface GameResultItem {
  id: string;
  sequence_number: number;
  date: string;
  score_blue: number | null;
  score_orange: number | null;
  outcome: 'blue_win' | 'orange_win' | 'draw' | null;
  youtube_url?: string;
  venue?: { name: string };
  user_team?: 'blue' | 'orange' | null;
  user_status?: 'selected' | 'reserve' | null;
  motm_winner?: { player_id: string; friendly_name: string; vote_count: number };
}

interface UseGameResultsReturn {
  games: GameResultItem[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  hasMore: boolean;
  loadMore: () => void;
}

const PAGE_SIZE = 20;

export const useGameResults = (
  filters: GameResultsFilters,
  playerId: string | null
): UseGameResultsReturn => {
  const [games, setGames] = useState<GameResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setGames([]);
  }, [filters.year, filters.outcome, filters.participation]);

  const fetchGames = useCallback(async (page: number, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      // Build the base query
      let query = supabase
        .from('games')
        .select(`
          id,
          date,
          sequence_number,
          score_blue,
          score_orange,
          outcome,
          youtube_url,
          venue:venue_id (
            name
          ),
          game_registrations (
            player_id,
            status,
            team
          )
        `, { count: 'exact' })
        .eq('completed', true)
        .order('sequence_number', { ascending: false });

      // Apply year filter
      if (filters.year !== 'all') {
        const yearStart = new Date(filters.year, 0, 1).toISOString();
        const yearEnd = new Date(filters.year, 11, 31, 23, 59, 59).toISOString();
        query = query.gte('date', yearStart).lte('date', yearEnd);
      }

      // Apply outcome filter (only for non-user-centric filters)
      // my_win and my_loss are handled client-side after checking user's team
      if (filters.outcome && filters.outcome !== 'my_win' && filters.outcome !== 'my_loss') {
        query = query.eq('outcome', filters.outcome);
      }

      // Apply pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      // Transform data and add user participation info
      let transformedGames: GameResultItem[] = (data || []).map(game => {
        // Find user's registration for this game - only count 'selected' or 'reserve' status
        const userReg = playerId
          ? game.game_registrations?.find(
              (reg: { player_id: string; status: string; team: string }) =>
                reg.player_id === playerId &&
                (reg.status === 'selected' || reg.status === 'reserve')
            )
          : null;

        return {
          id: game.id,
          sequence_number: game.sequence_number,
          date: game.date,
          score_blue: game.score_blue,
          score_orange: game.score_orange,
          outcome: game.outcome,
          youtube_url: game.youtube_url,
          venue: game.venue as { name: string } | undefined,
          user_team: userReg?.team as 'blue' | 'orange' | null || null,
          user_status: userReg?.status as 'selected' | 'reserve' | null || null,
        };
      });

      // Client-side filter for participation (only when logged in)
      if (playerId && filters.participation !== 'all') {
        transformedGames = transformedGames.filter(game => {
          if (filters.participation === 'played') {
            return game.user_status === 'selected';
          }
          if (filters.participation === 'reserve') {
            return game.user_status === 'reserve';
          }
          return true;
        });
      }

      // Client-side filter for user-centric outcomes (my_win, my_loss)
      if (playerId && (filters.outcome === 'my_win' || filters.outcome === 'my_loss')) {
        transformedGames = transformedGames.filter(game => {
          if (!game.user_team || !game.outcome) return false;

          const userWon =
            (game.user_team === 'blue' && game.outcome === 'blue_win') ||
            (game.user_team === 'orange' && game.outcome === 'orange_win');
          const userLost =
            (game.user_team === 'blue' && game.outcome === 'orange_win') ||
            (game.user_team === 'orange' && game.outcome === 'blue_win');

          if (filters.outcome === 'my_win') return userWon;
          if (filters.outcome === 'my_loss') return userLost;
          return true;
        });
      }

      // Batch-fetch MOTM winners for all games
      if (transformedGames.length > 0) {
        try {
          const gameIds = transformedGames.map(g => g.id);
          const { data: motmData } = await supabase.rpc('get_motm_winners_batch', {
            p_game_ids: gameIds,
          });

          if (motmData && motmData.length > 0) {
            const motmMap = new Map<string, { player_id: string; friendly_name: string; vote_count: number }>();
            for (const row of motmData as { game_id: string; player_id: string; friendly_name: string; vote_count: number }[]) {
              motmMap.set(row.game_id, {
                player_id: row.player_id,
                friendly_name: row.friendly_name,
                vote_count: Number(row.vote_count),
              });
            }

            transformedGames = transformedGames.map(game => ({
              ...game,
              motm_winner: motmMap.get(game.id),
            }));
          }
        } catch (motmErr) {
          console.error('Error fetching MOTM winners:', motmErr);
          // Non-critical, continue without MOTM data
        }
      }

      if (append) {
        setGames(prev => [...prev, ...transformedGames]);
      } else {
        setGames(transformedGames);
      }

      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching game results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [filters, playerId]);

  // Fetch when filters or page changes
  useEffect(() => {
    fetchGames(currentPage);
  }, [currentPage, fetchGames]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasMore = currentPage < totalPages;

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchGames(nextPage, true);
    }
  };

  return {
    games,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    totalPages,
    hasMore,
    loadMore,
  };
};

export default useGameResults;
