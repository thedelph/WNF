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

export interface ConfidenceThreshold {
  insightCategory: string;
  lowThreshold: number;
  highThreshold: number;
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
    'rivalry_revenge': 'Revenge Wins',
    'rivalry_ongoing_drought': 'Rivalry Droughts',
    'never_beaten_rivalry': 'Never Beaten',
    'first_ever_win_nemesis': 'Historic First Wins',
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
    // Attendance streaks
    'attendance_streak': 'Attendance Streaks',
    'attendance_streak_ended': 'Attendance Streak Ended',
    // Other insights
    'cap_milestone': 'Cap Milestones',
    'personal_best': 'Personal Bests',
    'personal_best_streak': 'Personal Best Streaks',
    'game_record': 'Game Records',
    // New v2 insights
    'debut_appearance': 'Debuts',
    'return_after_absence': 'Welcome Back',
    'first_game_back_win': 'Comeback Wins',
    'bench_warmer_promoted': 'Off the Bench',
    'team_color_loyalty': 'Team Loyalty',
    'team_color_switch': 'Team Switch',
    'blowout_game': 'Blowouts',
    'shutout_game': 'Clean Sheets',
    // Phase 3 insights - Year-over-year awards
    'award_defending_champion': 'Defending Champions',
    // Phase 3 insights - Goal scoring patterns
    'low_scoring_game': 'Low Scoring',
    'team_best_score': 'Best Scores',
    // Phase 3 insights - Team color trends
    'team_color_dominance': 'Team Dominance',
    'team_color_streak_broken': 'Streaks Broken',
    'player_color_curse': 'Color Curse',
    // Phase 3 insights - Injury token stats
    'injury_token_used': 'Injury Protection',
    'injury_token_return': 'Injury Returns',
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
    'rivalry_revenge': '🔥',
    'rivalry_ongoing_drought': '🏜️',
    'never_beaten_rivalry': '😰',
    'first_ever_win_nemesis': '🎉',
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
    // Attendance streak insights
    'attendance_streak': '🏃',
    'attendance_streak_ended': '😢',
    // Other insights
    'cap_milestone': '🎖️',
    'personal_best': '⭐',
    'personal_best_streak': '📈',
    'game_record': '⚽',
    // New v2 insights
    'debut_appearance': '⭐',
    'return_after_absence': '👋',
    'first_game_back_win': '💪',
    'bench_warmer_promoted': '📣',
    'team_color_loyalty': '💙',
    'team_color_switch': '🔄',
    'blowout_game': '💥',
    'shutout_game': '🧤',
    // Phase 3 insights - Year-over-year awards
    'award_defending_champion': '🏆',
    // Phase 3 insights - Goal scoring patterns
    'low_scoring_game': '🧱',
    'team_best_score': '📈',
    // Phase 3 insights - Team color trends
    'team_color_dominance': '💪',
    'team_color_streak_broken': '⛔',
    'player_color_curse': '🎭',
    // Phase 3 insights - Injury token stats
    'injury_token_used': '🏥',
    'injury_token_return': '💉',
  };
  return emojis[analysisType] || '📊';
};

/**
 * Hook for fetching dynamic confidence thresholds
 * Thresholds are calculated from actual data distribution (33rd/67th percentiles)
 */
export const useConfidenceThresholds = () => {
  const [thresholds, setThresholds] = useState<Record<string, ConfidenceThreshold>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const { data, error } = await supabase.rpc('get_confidence_thresholds');

        if (error) throw error;

        const thresholdMap: Record<string, ConfidenceThreshold> = {};
        (data || []).forEach((row: { insight_category: string; low_threshold: number; high_threshold: number }) => {
          thresholdMap[row.insight_category] = {
            insightCategory: row.insight_category,
            lowThreshold: row.low_threshold,
            highThreshold: row.high_threshold,
          };
        });

        setThresholds(thresholdMap);
      } catch (err) {
        console.error('Error fetching confidence thresholds:', err);
        // Use defaults if fetch fails
        setThresholds({
          trio: { insightCategory: 'trio', lowThreshold: 6, highThreshold: 9 },
          chemistry: { insightCategory: 'chemistry', lowThreshold: 14, highThreshold: 19 },
          rivalry: { insightCategory: 'rivalry', lowThreshold: 17, highThreshold: 24 },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchThresholds();
  }, []);

  return { thresholds, loading };
};

export default usePostMatchAnalysis;
