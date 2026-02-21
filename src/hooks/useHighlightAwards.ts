/**
 * Hook for managing highlight award votes (Best Goal, Play of the Match)
 * Follows useHighlightReactions optimistic update pattern
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { HighlightAwardType, HighlightAwardVote, HighlightAwardWinner } from '../types/highlights';

interface UseHighlightAwardsReturn {
  bestGoalWinner: HighlightAwardWinner | null;
  playOfMatchWinner: HighlightAwardWinner | null;
  voteCounts: Record<HighlightAwardType, Record<string, number>>;
  userVotes: Record<HighlightAwardType, string | null>;
  isVotingOpen: boolean;
  castVote: (highlightId: string, awardType: HighlightAwardType) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

export const useHighlightAwards = (
  gameId: string | undefined,
  gameDate: string | undefined,
  highlightIds: string[],
  playerId: string | null
): UseHighlightAwardsReturn => {
  const [votes, setVotes] = useState<HighlightAwardVote[]>([]);
  const [loading, setLoading] = useState(true);

  const isVotingOpen = useMemo(() => {
    if (!gameDate) return false;
    const gameDateObj = new Date(gameDate);
    const now = new Date();
    const diffMs = now.getTime() - gameDateObj.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }, [gameDate]);

  const fetchVotes = useCallback(async () => {
    if (!gameId) {
      setVotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('highlight_award_votes')
        .select('*')
        .eq('game_id', gameId);

      if (error) throw error;
      setVotes((data as HighlightAwardVote[]) || []);
    } catch (err) {
      console.error('Error fetching highlight award votes:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  // Vote counts: awardType → highlightId → count
  const voteCounts = useMemo(() => {
    const counts: Record<HighlightAwardType, Record<string, number>> = {
      best_goal: {},
      play_of_the_match: {},
    };

    for (const vote of votes) {
      const awardCounts = counts[vote.award_type as HighlightAwardType];
      if (awardCounts) {
        awardCounts[vote.highlight_id] = (awardCounts[vote.highlight_id] || 0) + 1;
      }
    }

    return counts;
  }, [votes]);

  // User's votes per award type
  const userVotes = useMemo((): Record<HighlightAwardType, string | null> => {
    const result: Record<HighlightAwardType, string | null> = {
      best_goal: null,
      play_of_the_match: null,
    };

    if (!playerId) return result;

    for (const vote of votes) {
      if (vote.voter_player_id === playerId) {
        result[vote.award_type as HighlightAwardType] = vote.highlight_id;
      }
    }

    return result;
  }, [votes, playerId]);

  // Compute winner for an award type
  const getWinner = useCallback((awardType: HighlightAwardType): HighlightAwardWinner | null => {
    const counts = voteCounts[awardType];
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;

    entries.sort((a, b) => b[1] - a[1]);
    const [topHighlightId, topCount] = entries[0];

    // Check for tie
    const tied = entries.filter(([, count]) => count === topCount);
    if (tied.length > 1) return null;

    return {
      highlightId: topHighlightId,
      awardType,
      voteCount: topCount,
    };
  }, [voteCounts]);

  const bestGoalWinner = useMemo(() => getWinner('best_goal'), [getWinner]);
  const playOfMatchWinner = useMemo(() => getWinner('play_of_the_match'), [getWinner]);

  // Cast vote (or un-vote if clicking same highlight)
  const castVote = useCallback(async (
    highlightId: string,
    awardType: HighlightAwardType
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerId || !gameId) {
      return { success: false, error: 'You must be logged in' };
    }

    const currentVote = userVotes[awardType];
    const isUnvote = currentVote === highlightId;

    // Optimistic update
    setVotes(prev => {
      const without = prev.filter(
        v => !(v.voter_player_id === playerId && v.award_type === awardType)
      );
      if (isUnvote) return without;
      return [...without, {
        id: `temp-${Date.now()}`,
        game_id: gameId,
        voter_player_id: playerId,
        highlight_id: highlightId,
        award_type: awardType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as HighlightAwardVote];
    });

    try {
      if (isUnvote) {
        const { error } = await supabase
          .from('highlight_award_votes')
          .delete()
          .eq('game_id', gameId)
          .eq('voter_player_id', playerId)
          .eq('award_type', awardType);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('highlight_award_votes')
          .upsert(
            {
              game_id: gameId,
              voter_player_id: playerId,
              highlight_id: highlightId,
              award_type: awardType,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'game_id,voter_player_id,award_type' }
          );

        if (error) throw error;
      }

      await fetchVotes();
      return { success: true };
    } catch (err) {
      console.error('Error casting highlight award vote:', err);
      await fetchVotes();
      const message = err instanceof Error ? err.message : 'Failed to cast vote';
      if (message.includes('policy')) {
        return { success: false, error: 'Voting has closed for this game' };
      }
      return { success: false, error: message };
    }
  }, [playerId, gameId, userVotes, fetchVotes]);

  return {
    bestGoalWinner,
    playOfMatchWinner,
    voteCounts,
    userVotes,
    isVotingOpen,
    castVote,
    loading,
  };
};

export default useHighlightAwards;
