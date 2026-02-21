/**
 * Hook for managing goal disputes — create, vote, admin resolve
 * Fetches all disputes for a game with joined votes + player names
 * Auto-resolution happens server-side via trigger
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import {
  GoalDispute,
  CreateDisputeInput,
  VoteTally,
  DisputesByHighlight,
} from '../types/disputes';
import { containsBannedWords } from '../utils/moderation';

interface UseGoalDisputesReturn {
  disputesByHighlight: DisputesByHighlight;
  allDisputes: GoalDispute[];
  loading: boolean;
  createDispute: (input: CreateDisputeInput) => Promise<{ success: boolean; error?: string }>;
  castVote: (disputeId: string, vote: 'agree' | 'disagree') => Promise<{ success: boolean; error?: string }>;
  adminResolve: (disputeId: string, resolution: 'upheld' | 'rejected', adminPlayerId: string) => Promise<{ success: boolean; error?: string }>;
  getVoteTally: (disputeId: string) => VoteTally;
  getUserVote: (disputeId: string) => 'agree' | 'disagree' | null;
  refetch: () => Promise<void>;
}

export const useGoalDisputes = (
  gameId: string | undefined,
  playerId: string | null,
  onDisputeResolved?: () => void
): UseGoalDisputesReturn => {
  const [disputes, setDisputes] = useState<GoalDispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    if (!gameId) {
      setDisputes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('goal_disputes')
        .select(`
          *,
          disputer:players!goal_disputes_disputer_player_id_fkey (
            id,
            friendly_name
          ),
          proposed_scorer:players!goal_disputes_proposed_scorer_id_fkey (
            id,
            friendly_name
          ),
          resolved_by_player:players!goal_disputes_resolved_by_fkey (
            id,
            friendly_name
          ),
          votes:goal_dispute_votes (
            id,
            dispute_id,
            voter_player_id,
            vote,
            created_at,
            updated_at,
            voter:players!goal_dispute_votes_voter_player_id_fkey (
              id,
              friendly_name
            )
          )
        `)
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDisputes((data as GoalDispute[]) || []);
    } catch (err) {
      console.error('Error fetching disputes:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // Map open disputes by highlight_id for quick lookup
  const disputesByHighlight = useMemo(() => {
    const map: DisputesByHighlight = {};
    for (const dispute of disputes) {
      // Include open disputes for action UI, but also include resolved for display
      if (dispute.status === 'open') {
        map[dispute.highlight_id] = dispute;
      }
    }
    return map;
  }, [disputes]);

  const createDispute = useCallback(async (
    input: CreateDisputeInput
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerId) {
      return { success: false, error: 'You must be logged in' };
    }

    // Client-side validation
    if (input.reason) {
      const modResult = containsBannedWords(input.reason);
      if (modResult.hasBanned) {
        return { success: false, error: 'Please keep it clean!' };
      }
    }

    try {
      const { error } = await supabase
        .from('goal_disputes')
        .insert({
          highlight_id: input.highlight_id,
          game_id: input.game_id,
          disputer_player_id: playerId,
          dispute_type: input.dispute_type,
          proposed_scorer_id: input.proposed_scorer_id || null,
          proposed_scorer_team: input.proposed_scorer_team || null,
          reason: input.reason?.trim() || null,
        });

      if (error) throw error;

      await fetchDisputes();
      return { success: true };
    } catch (err) {
      console.error('Error creating dispute:', err);
      const message = err instanceof Error ? err.message : 'Failed to create dispute';
      if (message.includes('unique_active_dispute_per_highlight')) {
        return { success: false, error: 'This goal already has an open dispute' };
      }
      return { success: false, error: message };
    }
  }, [playerId, fetchDisputes]);

  const castVote = useCallback(async (
    disputeId: string,
    vote: 'agree' | 'disagree'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerId) {
      return { success: false, error: 'You must be logged in' };
    }

    try {
      const { error } = await supabase
        .from('goal_dispute_votes')
        .upsert(
          {
            dispute_id: disputeId,
            voter_player_id: playerId,
            vote,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'dispute_id,voter_player_id' }
        );

      if (error) throw error;

      await fetchDisputes();
      // Trigger may have resolved the dispute and modified highlights
      onDisputeResolved?.();
      return { success: true };
    } catch (err) {
      console.error('Error casting vote:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cast vote' };
    }
  }, [playerId, fetchDisputes, onDisputeResolved]);

  const adminResolve = useCallback(async (
    disputeId: string,
    resolution: 'upheld' | 'rejected',
    adminPlayerId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('admin_resolve_dispute', {
        p_dispute_id: disputeId,
        p_resolution: resolution,
        p_admin_player_id: adminPlayerId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        return { success: false, error: result.error || 'Failed to resolve dispute' };
      }

      await fetchDisputes();
      onDisputeResolved?.();
      return { success: true };
    } catch (err) {
      console.error('Error resolving dispute:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to resolve dispute' };
    }
  }, [fetchDisputes, onDisputeResolved]);

  const getVoteTally = useCallback((disputeId: string): VoteTally => {
    const dispute = disputes.find(d => d.id === disputeId);
    const votes = dispute?.votes || [];
    const agree = votes.filter(v => v.vote === 'agree').length;
    const disagree = votes.filter(v => v.vote === 'disagree').length;
    const total = agree + disagree;
    const agreePercent = total > 0 ? (agree / total) * 100 : 0;
    const disagreePercent = total > 0 ? (disagree / total) * 100 : 0;

    return {
      agree,
      disagree,
      total,
      agreePercent,
      disagreePercent,
      hasQuorum: total >= 3,
      isDecisive: agreePercent > 66 || disagreePercent > 66,
    };
  }, [disputes]);

  const getUserVote = useCallback((disputeId: string): 'agree' | 'disagree' | null => {
    if (!playerId) return null;
    const dispute = disputes.find(d => d.id === disputeId);
    const vote = dispute?.votes.find(v => v.voter_player_id === playerId);
    return vote?.vote || null;
  }, [disputes, playerId]);

  return {
    disputesByHighlight,
    allDisputes: disputes,
    loading,
    createDispute,
    castVote,
    adminResolve,
    getVoteTally,
    getUserVote,
    refetch: fetchDisputes,
  };
};

export default useGoalDisputes;
