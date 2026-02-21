/**
 * BookmarkedHighlights - Profile section listing all bookmarked highlights
 * Grouped by game with navigation links to the game detail page
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Film, Clock } from 'lucide-react';
import { useMyBookmarks, BookmarkedHighlight } from '../../hooks/useMyBookmarks';
import { HIGHLIGHT_TYPES } from '../../types/highlights';
import { formatTimestamp } from '../../utils/youtube';

interface BookmarkedHighlightsProps {
  playerId: string;
}

export const BookmarkedHighlights: React.FC<BookmarkedHighlightsProps> = ({ playerId }) => {
  const { bookmarks, loading } = useMyBookmarks(playerId);

  // Group bookmarks by game sequence_number
  const grouped = useMemo(() => {
    const map: Record<number, { sequenceNumber: number; date: string; items: BookmarkedHighlight[] }> = {};

    for (const bm of bookmarks) {
      const game = bm.highlight?.game;
      if (!game) continue;
      const seq = game.sequence_number;
      if (!map[seq]) {
        map[seq] = { sequenceNumber: seq, date: game.date, items: [] };
      }
      map[seq].items.push(bm);
    }

    // Sort by sequence number descending (newest first)
    return Object.values(map).sort((a, b) => b.sequenceNumber - a.sequenceNumber);
  }, [bookmarks]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/50">
        <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>No bookmarked highlights yet</p>
        <p className="text-xs mt-1">Bookmark highlights from match pages to save them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Bookmark className="w-5 h-5 text-primary" />
        Bookmarked Highlights
        <span className="badge badge-sm badge-primary">{bookmarks.length}</span>
      </h3>

      {grouped.map(group => (
        <div key={group.sequenceNumber} className="space-y-2">
          <Link
            to={`/results/${group.sequenceNumber}`}
            className="text-sm font-medium link link-hover text-primary"
          >
            WNF #{group.sequenceNumber}
          </Link>

          <div className="space-y-1.5">
            {group.items.map(bm => {
              const h = bm.highlight;
              if (!h) return null;
              const typeInfo = HIGHLIGHT_TYPES.find(t => t.value === h.highlight_type);

              return (
                <Link
                  key={bm.id}
                  to={`/results/${group.sequenceNumber}?highlight=${h.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
                >
                  <span className="text-sm">{typeInfo?.emoji}</span>
                  <span className="flex-1 text-sm truncate">{h.description}</span>
                  <span className="flex items-center gap-1 text-xs text-base-content/40 font-mono flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(h.timestamp_seconds)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookmarkedHighlights;
