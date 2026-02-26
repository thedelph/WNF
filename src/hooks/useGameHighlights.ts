/**
 * Hook for fetching, adding, editing, and deleting game highlights
 * Handles goal count validation against actual game scores
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useUser } from './useUser';
import { GameHighlight, CreateHighlightInput, UpdateHighlightInput } from '../types/highlights';

interface UseGameHighlightsReturn {
  highlights: GameHighlight[];
  loading: boolean;
  error: string | null;
  addHighlight: (input: CreateHighlightInput) => Promise<{ success: boolean; error?: string }>;
  editHighlight: (id: string, updates: UpdateHighlightInput) => Promise<{ success: boolean; error?: string }>;
  deleteHighlight: (id: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => Promise<void>;
  goalCounts: { blue: number; orange: number };
}

export const useGameHighlights = (
  gameId: string | undefined,
  scoreBlue?: number | null,
  scoreOrange?: number | null
): UseGameHighlightsReturn => {
  const { player } = useUser();
  const [highlights, setHighlights] = useState<GameHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHighlights = useCallback(async () => {
    if (!gameId) {
      setHighlights([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('game_highlights')
        .select(`
          *,
          player:players!game_highlights_player_id_fkey (
            id,
            friendly_name,
            avatar_svg
          ),
          scorer:players!game_highlights_scorer_player_id_fkey (
            id,
            friendly_name
          ),
          assister:players!game_highlights_assister_player_id_fkey (
            id,
            friendly_name
          )
        `)
        .eq('game_id', gameId)
        .order('timestamp_seconds', { ascending: true });

      if (fetchError) throw fetchError;

      setHighlights((data as GameHighlight[]) || []);
    } catch (err) {
      console.error('Error fetching highlights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load highlights');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  // Count goal highlights per team
  const goalCounts = {
    blue: highlights.filter(h => h.highlight_type === 'goal' && h.scorer_team === 'blue').length,
    orange: highlights.filter(h => h.highlight_type === 'goal' && h.scorer_team === 'orange').length,
  };

  const addHighlight = useCallback(async (input: CreateHighlightInput): Promise<{ success: boolean; error?: string }> => {
    if (!player?.id) {
      return { success: false, error: 'You must be logged in to add highlights' };
    }

    // Goal count validation
    if (input.highlight_type === 'goal' && input.scorer_team) {
      const maxGoals = input.scorer_team === 'blue' ? (scoreBlue ?? 0) : (scoreOrange ?? 0);
      const currentGoals = input.scorer_team === 'blue' ? goalCounts.blue : goalCounts.orange;
      if (currentGoals >= maxGoals) {
        const teamName = input.scorer_team === 'blue' ? 'Blue' : 'Orange';
        return {
          success: false,
          error: `All ${maxGoals} goal${maxGoals !== 1 ? 's' : ''} for ${teamName} team have been claimed`,
        };
      }
    }

    try {
      const { error: insertError } = await supabase
        .from('game_highlights')
        .insert({
          game_id: input.game_id,
          player_id: player.id,
          highlight_type: input.highlight_type,
          timestamp_seconds: input.timestamp_seconds,
          description: input.description,
          scorer_player_id: input.scorer_player_id || null,
          scorer_team: input.scorer_team || null,
          assister_player_id: input.assister_player_id || null,
          is_own_goal: input.is_own_goal ?? false,
          is_penalty: input.is_penalty ?? false,
        });

      if (insertError) throw insertError;

      await fetchHighlights();
      return { success: true };
    } catch (err) {
      console.error('Error adding highlight:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add highlight' };
    }
  }, [player?.id, scoreBlue, scoreOrange, goalCounts.blue, goalCounts.orange, fetchHighlights]);

  const editHighlight = useCallback(async (id: string, updates: UpdateHighlightInput): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('game_highlights')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchHighlights();
      return { success: true };
    } catch (err) {
      console.error('Error editing highlight:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to edit highlight' };
    }
  }, [fetchHighlights]);

  const deleteHighlight = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Optimistic removal
      setHighlights(prev => prev.filter(h => h.id !== id));

      const { error: deleteError } = await supabase
        .from('game_highlights')
        .delete()
        .eq('id', id);

      if (deleteError) {
        // Revert on error
        await fetchHighlights();
        throw deleteError;
      }

      return { success: true };
    } catch (err) {
      console.error('Error deleting highlight:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete highlight' };
    }
  }, [fetchHighlights]);

  return {
    highlights,
    loading,
    error,
    addHighlight,
    editHighlight,
    deleteHighlight,
    refetch: fetchHighlights,
    goalCounts,
  };
};

export default useGameHighlights;
