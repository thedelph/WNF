/**
 * MatchSummary - Displays the match summary in a web-friendly format
 * Parses WhatsApp-style summary and renders with DaisyUI components
 * Highlights mentions of the logged-in user's name
 * Collapsible section matching other game detail components
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../../hooks/useUser';

interface MatchSummaryProps {
  summary: string;
  defaultExpanded?: boolean;
}

// Get contextual emoji based on highlight content
const getHighlightEmoji = (text: string): string => {
  const lowerText = text.toLowerCase();

  // Trophy/medal keywords
  if (lowerText.includes('gold') || lowerText.includes('takes gold')) return '🥇';
  if (lowerText.includes('silver') || lowerText.includes('takes silver')) return '🥈';
  if (lowerText.includes('bronze') || lowerText.includes('takes bronze')) return '🥉';
  if (lowerText.includes('trophy') || lowerText.includes('champion')) return '🏆';

  // Streak keywords
  if (lowerText.includes('streak ended') || lowerText.includes('run broken')) return '💔';
  if (lowerText.includes('on fire') || lowerText.includes('in a row') || lowerText.includes('wins straight')) return '🔥';
  if (lowerText.includes('unbeaten')) return '🛡️';
  if (lowerText.includes('finally') || lowerText.includes('ends') && lowerText.includes('losing')) return '🎉';
  if (lowerText.includes('drought') || lowerText.includes('winless')) return '🏜️';

  // Chemistry/partnership keywords
  if (lowerText.includes('chemistry') || lowerText.includes('together')) return '🤝';
  if (lowerText.includes('cursed') || lowerText.includes('curse')) return '💀';
  if (lowerText.includes('dream team') || lowerText.includes('trio')) return '👑';

  // Rivalry keywords
  if (lowerText.includes('nemesis') || lowerText.includes('dominates')) return '😈';
  if (lowerText.includes('rivalry') || lowerText.includes('vs')) return '⚔️';
  if (lowerText.includes('revenge') || lowerText.includes('first time ever') || lowerText.includes('historic')) return '🎯';
  if (lowerText.includes('never beaten') || lowerText.includes('can they ever')) return '😰';

  // Game record keywords
  if (lowerText.includes('goal fest') || lowerText.includes('goals')) return '⚽';
  if (lowerText.includes('nail-biter') || lowerText.includes('single goal')) return '😬';
  if (lowerText.includes('blowout') || lowerText.includes('demolish')) return '💥';
  if (lowerText.includes('clean sheet') || lowerText.includes('scoreless')) return '🧤';
  if (lowerText.includes('defensive battle') || lowerText.includes('low scoring')) return '🧱';

  // Appearance keywords
  if (lowerText.includes('debut') || lowerText.includes('first game')) return '⭐';
  if (lowerText.includes('welcome back') || lowerText.includes('returns after')) return '👋';
  if (lowerText.includes('comeback') || lowerText.includes('triumphant return')) return '💪';
  if (lowerText.includes('iron man') || lowerText.includes('consecutive games')) return '🏃';

  // Team color keywords
  if (lowerText.includes('blue dominance') || lowerText.includes('true blue')) return '💙';
  if (lowerText.includes('orange dominance') || lowerText.includes('true orange')) return '🧡';
  if (lowerText.includes('color curse')) return '🎭';

  // Milestone keywords
  if (lowerText.includes('milestone') || lowerText.includes('reaches') || lowerText.includes('caps')) return '🎖️';
  if (lowerText.includes('century') || lowerText.includes('100')) return '💯';

  // Default
  return '📊';
};

// Parse the summary to extract structured data
const parseSummary = (summary: string) => {
  const lines = summary.split('\n').filter(line => line.trim());
  const highlights: { number: number; text: string; emoji: string }[] = [];

  lines.forEach((line) => {
    // Match numbered items like "1. Some text here"
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const text = numberedMatch[2].trim();
      highlights.push({
        number: parseInt(numberedMatch[1], 10),
        text,
        emoji: getHighlightEmoji(text),
      });
    }
  });

  return { highlights };
};

// Highlight player name in text and return JSX
const highlightPlayerName = (text: string, playerName: string | undefined): React.ReactNode => {
  if (!playerName) return text;

  // Create a regex to match the player name (case-insensitive, whole word)
  const regex = new RegExp(`\\b(${playerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.toLowerCase() === playerName.toLowerCase()) {
      return (
        <span key={i} className="font-semibold text-primary">
          {part}
        </span>
      );
    }
    return part;
  });
};

export const MatchSummary: React.FC<MatchSummaryProps> = ({
  summary,
  defaultExpanded = true,
}) => {
  const { player: currentPlayer } = useUser();
  const { highlights } = useMemo(() => parseSummary(summary), [summary]);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Check if a highlight mentions the current player
  const highlightMentionsPlayer = (text: string): boolean => {
    if (!currentPlayer?.friendly_name) return false;
    const regex = new RegExp(`\\b${currentPlayer.friendly_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  };

  // Don't render if no highlights to show
  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Match Summary
          <span className="badge badge-sm badge-primary">{highlights.length}</span>
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-base-content/50" />
        ) : (
          <ChevronDown className="w-5 h-5 text-base-content/50" />
        )}
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Highlights Section */}
            <div className="grid gap-2">
              {highlights.map((highlight, index) => {
                const mentionsCurrentPlayer = highlightMentionsPlayer(highlight.text);

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      mentionsCurrentPlayer
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'bg-base-200/50 hover:bg-base-200'
                    }`}
                  >
                    {/* Number badge - circle style */}
                    <div className="badge badge-primary badge-sm w-6 h-6 flex-shrink-0 p-0 flex items-center justify-center">
                      {highlight.number}
                    </div>
                    {/* Emoji icon */}
                    <span className="text-xl flex-shrink-0">
                      {highlight.emoji}
                    </span>
                    {/* Text content */}
                    <span className="text-sm leading-relaxed flex-1">
                      {highlightPlayerName(highlight.text, currentPlayer?.friendly_name)}
                    </span>
                    {mentionsCurrentPlayer && (
                      <span className="badge badge-xs badge-primary text-primary-content flex-shrink-0">You</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchSummary;
