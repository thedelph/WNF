/**
 * MatchSummary - Displays the match summary in a web-friendly format
 * Parses WhatsApp-style summary and renders with DaisyUI components
 * Highlights mentions of the logged-in user's name
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useUser } from '../../hooks/useUser';

interface MatchSummaryProps {
  summary: string;
}

// Parse the summary to extract structured data
const parseSummary = (summary: string) => {
  const lines = summary.split('\n').filter(line => line.trim());
  const highlights: { number: number; text: string }[] = [];

  lines.forEach((line) => {
    // Match numbered items like "1. Some text here"
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      highlights.push({
        number: parseInt(numberedMatch[1], 10),
        text: numberedMatch[2].trim(),
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
}) => {
  const { player: currentPlayer } = useUser();
  const { highlights } = useMemo(() => parseSummary(summary), [summary]);

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Match Summary
        <span className="badge badge-sm badge-primary">{highlights.length}</span>
      </h3>

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
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                mentionsCurrentPlayer
                  ? 'bg-primary/10 ring-1 ring-primary/30'
                  : 'bg-base-200/50 hover:bg-base-200'
              }`}
            >
              <span className="badge badge-sm badge-primary flex-shrink-0">
                {highlight.number}
              </span>
              <span className="text-sm leading-relaxed">
                {highlightPlayerName(highlight.text, currentPlayer?.friendly_name)}
              </span>
              {mentionsCurrentPlayer && (
                <span className="badge badge-xs badge-primary ml-auto flex-shrink-0">You</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MatchSummary;
