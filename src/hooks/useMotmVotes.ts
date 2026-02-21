/**
 * Hook for managing Man of the Match votes for a game
 * Follows useGoalDisputes upsert pattern + useHighlightReactions optimistic update pattern
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { MotmVote, MotmWinner, MotmVoteCounts } from '../types/motm';

interface UseMotmVotesReturn {
  votes: MotmVote[];
  winner: MotmWinner | null;
  voteCounts: MotmVoteCounts;
  userVote: string | null;
  totalVotes: number;
  isVotingOpen: boolean;
  castVote: (votedForPlayerId: string) => Promise<{ success: boolean; error?: string }>;
  removeVote: () => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

export const useMotmVotes = (
  gameId: string | undefined,
  gameDate: string | undefined,
  playerId: string | null
): UseMotmVotesReturn => {
  const [votes, setVotes] = useState<MotmVote[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if voting window is still open (7 days from game date)
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
        .from('motm_votes')
        .select(`
          *,
          voter:players!motm_votes_voter_player_id_fkey (
            id,
            friendly_name
          ),
          voted_for:players!motm_votes_voted_for_player_id_fkey (
            id,
            friendly_name,
            avatar_svg
          )
        `)
        .eq('game_id', gameId);

      if (error) throw error;
      setVotes((data as MotmVote[]) || []);
    } catch (err) {
      console.error('Error fetching MOTM votes:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  // Compute vote counts per player
  const voteCounts = useMemo(() => {
    const counts: MotmVoteCounts = {};
    for (const vote of votes) {
      counts[vote.voted_for_player_id] = (counts[vote.voted_for_player_id] || 0) + 1;
    }
    return counts;
  }, [votes]);

  // Determine winner (null if tie or no votes)
  const winner = useMemo((): MotmWinner | null => {
    if (votes.length === 0) return null;

    const entries = Object.entries(voteCounts);
    if (entries.length === 0) return null;

    entries.sort((a, b) => b[1] - a[1]);
    const [topPlayerId, topCount] = entries[0];

    // Check for tie
    const tiedPlayers = entries.filter(([, count]) => count === topCount);
    if (tiedPlayers.length > 1) return null;

    const topVote = votes.find(v => v.voted_for_player_id === topPlayerId);
    return {
      playerId: topPlayerId,
      playerName: topVote?.voted_for?.friendly_name || 'Unknown',
      avatarSvg: topVote?.voted_for?.avatar_svg,
      voteCount: topCount,
    };
  }, [votes, voteCounts]);

  // Current user's vote
  const userVote = useMemo(() => {
    if (!playerId) return null;
    const vote = votes.find(v => v.voter_player_id === playerId);
    return vote?.voted_for_player_id || null;
  }, [votes, playerId]);

  const totalVotes = votes.length;

  // Cast or switch vote (upsert)
  const castVote = useCallback(async (
    votedForPlayerId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerId || !gameId) {
      return { success: false, error: 'You must be logged in' };
    }

    if (votedForPlayerId === playerId) {
      return { success: false, error: 'You cannot vote for yourself' };
    }

    // Optimistic update
    setVotes(prev => {
      const without = prev.filter(v => v.voter_player_id !== playerId);
      return [...without, {
        id: `temp-${Date.now()}`,
        game_id: gameId,
        voter_player_id: playerId,
        voted_for_player_id: votedForPlayerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as MotmVote];
    });

    try {
      const { error } = await supabase
        .from('motm_votes')
        .upsert(
          {
            game_id: gameId,
            voter_player_id: playerId,
            voted_for_player_id: votedForPlayerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'game_id,voter_player_id' }
        );

      if (error) throw error;

      // Refetch for accurate data
      await fetchVotes();
      return { success: true };
    } catch (err) {
      console.error('Error casting MOTM vote:', err);
      await fetchVotes(); // Revert
      const message = err instanceof Error ? err.message : 'Failed to cast vote';
      if (message.includes('7 days') || message.includes('policy')) {
        return { success: false, error: 'Voting has closed for this game' };
      }
      return { success: false, error: message };
    }
  }, [playerId, gameId, fetchVotes]);

  // Remove vote
  const removeVote = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!playerId || !gameId) {
      return { success: false, error: 'You must be logged in' };
    }

    // Optimistic update
    setVotes(prev => prev.filter(v => v.voter_player_id !== playerId));

    try {
      const { error } = await supabase
        .from('motm_votes')
        .delete()
        .eq('game_id', gameId)
        .eq('voter_player_id', playerId);

      if (error) throw error;

      await fetchVotes();
      return { success: true };
    } catch (err) {
      console.error('Error removing MOTM vote:', err);
      await fetchVotes();
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove vote' };
    }
  }, [playerId, gameId, fetchVotes]);

  return {
    votes,
    winner,
    voteCounts,
    userVote,
    totalVotes,
    isVotingOpen,
    castVote,
    removeVote,
    loading,
  };
};

export default useMotmVotes;
