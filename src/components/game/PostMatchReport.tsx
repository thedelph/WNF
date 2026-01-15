/**
 * PostMatchReport Component
 *
 * Displays post-match analysis insights after a game is completed.
 * Includes trophy changes, streak milestones, and game records.
 * Also provides a WhatsApp-ready summary for copying.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Trophy, Flame, Target, MessageCircle, Sparkles, Users, Award, RefreshCw } from 'lucide-react';
import { usePostMatchAnalysis, groupInsightsByType, getInsightEmoji } from '../../hooks/usePostMatchAnalysis';

interface PostMatchReportProps {
  gameId: string;
  sequenceNumber?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const PostMatchReport: React.FC<PostMatchReportProps> = ({
  gameId,
  sequenceNumber,
  isOpen,
  onClose,
}) => {
  const { insights, whatsappSummary, loading, generating, error, generateOnDemand } = usePostMatchAnalysis(gameId);
  const [copied, setCopied] = useState(false);

  // Build game URL for sharing
  const getGameUrl = () => {
    if (!sequenceNumber) return '';
    const baseUrl = window.location.hostname === 'localhost'
      ? `http://localhost:${window.location.port}`
      : 'https://wnf.app';
    return `${baseUrl}/results/${sequenceNumber}`;
  };

  const handleCopyWhatsApp = async () => {
    try {
      const gameUrl = getGameUrl();
      const summaryWithLink = gameUrl
        ? `${whatsappSummary}\n\n🔗 Full report: ${gameUrl}`
        : whatsappSummary;
      await navigator.clipboard.writeText(summaryWithLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const groupedInsights = groupInsightsByType(insights);

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const lowerCategory = category.toLowerCase();
    // Trophy-related
    if (lowerCategory.includes('trophy') || lowerCategory.includes('champion')) {
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    }
    // Hot/winning streaks
    if (lowerCategory.includes('hot streak') || lowerCategory.includes('unbeaten')) {
      return <Flame className="w-5 h-5 text-orange-500" />;
    }
    // Cold/losing streaks
    if (lowerCategory.includes('cold') || lowerCategory.includes('struggling')) {
      return <Target className="w-5 h-5 text-blue-400" />;
    }
    // Bouncebacks and comebacks
    if (lowerCategory.includes('bounceback') || lowerCategory.includes('finally')) {
      return <Sparkles className="w-5 h-5 text-green-500" />;
    }
    // Streaks ended
    if (lowerCategory.includes('streak') && lowerCategory.includes('end')) {
      return <Target className="w-5 h-5 text-gray-500" />;
    }
    // Generic streaks
    if (lowerCategory.includes('streak')) {
      return <Flame className="w-5 h-5 text-orange-500" />;
    }
    // Chemistry duos
    if (lowerCategory.includes('chemistry') || lowerCategory.includes('kings') || lowerCategory.includes('cursed combo')) {
      return <Users className="w-5 h-5 text-purple-500" />;
    }
    // Dream teams / trios
    if (lowerCategory.includes('dream') || lowerCategory.includes('trio')) {
      return <Users className="w-5 h-5 text-indigo-500" />;
    }
    // Rivalry insights
    if (lowerCategory.includes('nemesis') || lowerCategory.includes('rivalry') || lowerCategory.includes('close rival')) {
      return <Target className="w-5 h-5 text-red-500" />;
    }
    // First wins, perfect records, dominant
    if (lowerCategory.includes('first') || lowerCategory.includes('perfect') || lowerCategory.includes('dominant')) {
      return <Target className="w-5 h-5 text-red-500" />;
    }
    // Partnerships
    if (lowerCategory.includes('partner') || lowerCategory.includes('pairing')) {
      return <Users className="w-5 h-5 text-blue-500" />;
    }
    // Cap milestones
    if (lowerCategory.includes('cap') || lowerCategory.includes('milestone')) {
      return <Award className="w-5 h-5 text-purple-500" />;
    }
    // Game records
    if (lowerCategory.includes('record')) {
      return <Sparkles className="w-5 h-5 text-green-500" />;
    }
    return <Target className="w-5 h-5" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-base-100 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-base-300">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Post-Match Report
              </h2>
              <div className="flex items-center gap-2">
                {insights.length > 0 && !loading && !generating && (
                  <button
                    onClick={generateOnDemand}
                    className="btn btn-ghost btn-sm gap-1"
                    title="Regenerate Report"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {loading || generating ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <span className="loading loading-spinner loading-lg"></span>
                  {generating && (
                    <p className="text-sm text-base-content/60">Generating insights...</p>
                  )}
                </div>
              ) : error ? (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              ) : insights.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-medium">No analysis generated yet</p>
                  <p className="text-sm mb-4">Generate a report to see interesting stats and milestones from this game.</p>
                  <button
                    onClick={generateOnDemand}
                    className="btn btn-primary gap-2"
                    disabled={generating}
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Report
                  </button>
                </div>
              ) : (
                <>
                  {/* Grouped insights */}
                  {Array.from(groupedInsights.entries()).map(([category, categoryInsights]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2 text-base-content/80">
                        {getCategoryIcon(category)}
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {categoryInsights.map((insight) => (
                          <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 rounded-lg ${
                              insight.priority <= 2
                                ? 'bg-yellow-500/20 border border-yellow-500/30'
                                : insight.priority <= 4
                                ? 'bg-blue-500/10 border border-blue-500/20'
                                : 'bg-base-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xl">{getInsightEmoji(insight.analysisType)}</span>
                              <span className="flex-1">{insight.headline}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer with WhatsApp copy */}
            {insights.length > 0 && (
              <div className="p-4 border-t border-base-300 bg-base-200/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Summary
                  </span>
                  <button
                    onClick={handleCopyWhatsApp}
                    className={`btn btn-sm ${copied ? 'btn-success' : 'btn-primary'}`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy for WhatsApp
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs bg-base-100 p-3 rounded-lg whitespace-pre-wrap font-mono overflow-x-auto">
                  {whatsappSummary}
                </pre>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PostMatchReport;
