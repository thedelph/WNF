/**
 * Hook for fetching post-match analysis data for a completed game
 *
 * This hook fetches curated insights generated after a game is completed,
 * including trophy changes, streak milestones, and game records.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export interface PostMatchInsight {
  id: string;
  analysisType: string;
  priority: number;
  headline: string;
  details: Record<string, unknown>;
  playerIds: string[];
  createdAt: string;
}

export interface PostMatchAnalysisResult {
  insights: PostMatchInsight[];
  whatsappSummary: string;
  loading: boolean;
  generating: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  generateOnDemand: () => Promise<void>;
}

/**
 * Fetch post-match analysis for a specific game
 */
export const usePostMatchAnalysis = (gameId: string | null): PostMatchAnalysisResult => {
  const [insights, setInsights] = useState<PostMatchInsight[]>([]);
  const [whatsappSummary, setWhatsappSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!gameId) {
      setInsights([]);
      setWhatsappSummary('');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch insights
      const { data: insightsData, error: insightsError } = await supabase
        .rpc('get_post_match_analysis', { p_game_id: gameId });

      if (insightsError) throw insightsError;

      const transformedInsights: PostMatchInsight[] = (insightsData || []).map((row: {
        id: string;
        analysis_type: string;
        priority: number;
        headline: string;
        details: Record<string, unknown>;
        player_ids: string[];
        created_at: string;
      }) => ({
        id: row.id,
        analysisType: row.analysis_type,
        priority: row.priority,
        headline: row.headline,
        details: row.details || {},
        playerIds: row.player_ids || [],
        createdAt: row.created_at,
      }));

      setInsights(transformedInsights);

      // Fetch WhatsApp summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_whatsapp_summary', { p_game_id: gameId });

      if (summaryError) throw summaryError;

      setWhatsappSummary(summaryData || '');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch post-match analysis';
      console.error('Error fetching post-match analysis:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const generateOnDemand = useCallback(async () => {
    if (!gameId) return;

    setGenerating(true);
    setError(null);

    try {
      // Call the on-demand generation function
      const { error: genError } = await supabase
        .rpc('generate_game_insights_on_demand', { p_game_id: gameId });

      if (genError) throw genError;

      // Refetch the analysis after generation
      await fetchAnalysis();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate analysis';
      console.error('Error generating post-match analysis:', err);
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  }, [gameId, fetchAnalysis]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return {
    insights,
    whatsappSummary,
    loading,
    generating,
    error,
    refetch: fetchAnalysis,
    generateOnDemand,
  };
};

/**
 * Group insights by type for display
 */
export const groupInsightsByType = (insights: PostMatchInsight[]): Map<string, PostMatchInsight[]> => {
  const grouped = new Map<string, PostMatchInsight[]>();

  const typeLabels: Record<string, string> = {
    // Trophy insights
    'trophy_change': 'Trophy Changes',
    'trophy_new': 'New Champions',
    'trophy_extended': 'Extended Leads',
    'trophy_defended': 'Trophy Defended',
    // Rivalry insights
    'rivalry_first_win': 'First Wins',
    'rivalry_perfect': 'Perfect Records',
    'rivalry_dominant': 'Dominant Matchups',
    'rivalry_nemesis': 'Nemesis Matchups',
    'rivalry_close': 'Close Rivalries',
    // Partnership insights
    'partnership_first': 'First Pairings',
    'partnership_milestone': 'Partnership Milestones',
    // Chemistry insights
    'chemistry_kings': 'Chemistry Kings',
    'chemistry_curse': 'Cursed Combos',
    'chemistry_milestone': 'Chemistry Milestones',
    // Trio insights
    'trio_dream_team': 'Dream Teams',
    'trio_cursed': 'Cursed Trios',
    // Streak insights
    'win_streak': 'Hot Streaks',
    'win_streak_ended': 'Streaks Ended',
    'losing_streak': 'Cold Spells',
    'losing_streak_ended': 'Bouncebacks',
    'unbeaten_streak': 'Unbeaten Runs',
    'unbeaten_streak_ended': 'Runs Ended',
    'winless_streak': 'Winless Runs',
    'winless_streak_ended': 'Drought Over',
    'streak_milestone': 'Streak Milestones',
    'streak_broken': 'Streaks Ended',
    'team_streak': 'Team Streaks',
    // Other insights
    'cap_milestone': 'Cap Milestones',
    'personal_best': 'Personal Bests',
    'game_record': 'Game Records',
  };

  // Group by type
  for (const insight of insights) {
    const label = typeLabels[insight.analysisType] || insight.analysisType;
    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(insight);
  }

  return grouped;
};

/**
 * Get emoji for analysis type
 */
export const getInsightEmoji = (analysisType: string): string => {
  const emojis: Record<string, string> = {
    // Trophy insights
    'trophy_change': '👑',
    'trophy_new': '🏆',
    'trophy_extended': '📈',
    // Rivalry insights
    'rivalry_first_win': '🎯',
    'rivalry_perfect': '💯',
    'rivalry_dominant': '💪',
    'rivalry_nemesis': '😈',
    'rivalry_close': '⚔️',
    // Partnership insights
    'partnership_first': '🤝',
    'partnership_milestone': '👯',
    // Chemistry insights
    'chemistry_kings': '🔗',
    'chemistry_curse': '💀',
    'chemistry_milestone': '🎊',
    // Trio insights
    'trio_dream_team': '👑',
    'trio_cursed': '☠️',
    // Individual streak insights
    'win_streak': '🔥',
    'win_streak_ended': '💔',
    'losing_streak': '❄️',
    'losing_streak_ended': '🎉',
    'unbeaten_streak': '🛡️',
    'unbeaten_streak_ended': '💔',
    'winless_streak': '🏜️',
    'winless_streak_ended': '💧',
    // Team streak insights
    'streak_milestone': '🔥',
    'streak_broken': '💔',
    'team_streak': '📊',
    // Other insights
    'cap_milestone': '🎖️',
    'personal_best': '⭐',
    'game_record': '⚽',
  };
  return emojis[analysisType] || '📊';
};

export default usePostMatchAnalysis;
