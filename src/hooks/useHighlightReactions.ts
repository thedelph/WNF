/**
 * Hook for managing emoji reactions on game highlights
 * Batch-fetches all reactions for a game's highlights, provides toggle with optimistic updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { HighlightReaction, ReactionType, ReactionSummary } from '../types/highlights';

interface UseHighlightReactionsReturn {
  reactionsByHighlight: Record<string, ReactionSummary>;
  loading: boolean;
  toggleReaction: (highlightId: string, reactionType: ReactionType) => Promise<void>;
}

export const useHighlightReactions = (
  highlightIds: string[],
  playerId: string | null
): UseHighlightReactionsReturn => {
  const [reactions, setReactions] = useState<HighlightReaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReactions = useCallback(async () => {
    if (highlightIds.length === 0) {
      setReactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('highlight_reactions')
        .select(`
          *,
          player:players!highlight_reactions_player_id_fkey (
            id,
            friendly_name
          )
        `)
        .in('highlight_id', highlightIds);

      if (error) throw error;
      setReactions((data as (HighlightReaction & { player?: { id: string; friendly_name: string } })[]) || []);
    } catch (err) {
      console.error('Error fetching reactions:', err);
    } finally {
      setLoading(false);
    }
  }, [highlightIds.join(',')]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Build per-highlight summaries
  const reactionsByHighlight = useMemo(() => {
    const map: Record<string, ReactionSummary> = {};

    for (const hId of highlightIds) {
      const hlReactions = reactions.filter(r => r.highlight_id === hId);
      const counts: Record<ReactionType, number> = {
        fire: 0, laugh: 0, clap: 0, mindblown: 0, skull: 0,
      };
      const reactorNames: Record<ReactionType, string[]> = {
        fire: [], laugh: [], clap: [], mindblown: [], skull: [],
      };

      let userReaction: ReactionType | null = null;

      for (const r of hlReactions) {
        const rt = r.reaction_type as ReactionType;
        counts[rt] = (counts[rt] || 0) + 1;
        const name = (r as HighlightReaction & { player?: { friendly_name: string } }).player?.friendly_name;
        if (name) reactorNames[rt].push(name);
        if (playerId && r.player_id === playerId) {
          userReaction = rt;
        }
      }

      map[hId] = { counts, reactorNames, userReaction };
    }

    return map;
  }, [reactions, highlightIds.join(','), playerId]);

  const toggleReaction = useCallback(async (highlightId: string, reactionType: ReactionType) => {
    if (!playerId) return;

    const current = reactionsByHighlight[highlightId]?.userReaction ?? null;

    // Optimistic update
    setReactions(prev => {
      const without = prev.filter(r => !(r.highlight_id === highlightId && r.player_id === playerId));
      if (current === reactionType) {
        // Un-react (remove)
        return without;
      }
      // Add or switch
      return [...without, {
        id: `temp-${Date.now()}`,
        highlight_id: highlightId,
        player_id: playerId,
        reaction_type: reactionType,
        created_at: new Date().toISOString(),
        player: undefined,
      } as HighlightReaction];
    });

    try {
      if (current === reactionType) {
        // DELETE
        const { error } = await supabase
          .from('highlight_reactions')
          .delete()
          .eq('highlight_id', highlightId)
          .eq('player_id', playerId);
        if (error) throw error;
      } else {
        // UPSERT (insert or update reaction type)
        const { error } = await supabase
          .from('highlight_reactions')
          .upsert(
            {
              highlight_id: highlightId,
              player_id: playerId,
              reaction_type: reactionType,
            },
            { onConflict: 'highlight_id,player_id' }
          );
        if (error) throw error;
      }

      // Refetch to get accurate data (names, etc.)
      await fetchReactions();
    } catch (err) {
      console.error('Error toggling reaction:', err);
      // Revert on error
      await fetchReactions();
    }
  }, [playerId, reactionsByHighlight, fetchReactions]);

  return {
    reactionsByHighlight,
    loading,
    toggleReaction,
  };
};

export default useHighlightReactions;
