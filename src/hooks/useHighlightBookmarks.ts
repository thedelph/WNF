/**
 * Hook for managing bookmarks on game highlights
 * Fetches user's bookmarks for the current game, provides toggle with optimistic updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { HighlightBookmark } from '../types/highlights';

interface UseHighlightBookmarksReturn {
  bookmarkedIds: Set<string>;
  loading: boolean;
  toggleBookmark: (highlightId: string) => Promise<void>;
}

export const useHighlightBookmarks = (
  highlightIds: string[],
  playerId: string | null
): UseHighlightBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<HighlightBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    if (!playerId || highlightIds.length === 0) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('highlight_bookmarks')
        .select('*')
        .eq('player_id', playerId)
        .in('highlight_id', highlightIds);

      if (error) throw error;
      setBookmarks((data as HighlightBookmark[]) || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, [highlightIds.join(','), playerId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const bookmarkedIds = useMemo(
    () => new Set(bookmarks.map(b => b.highlight_id)),
    [bookmarks]
  );

  const toggleBookmark = useCallback(async (highlightId: string) => {
    if (!playerId) return;

    const isCurrentlyBookmarked = bookmarkedIds.has(highlightId);

    // Optimistic update
    setBookmarks(prev => {
      if (isCurrentlyBookmarked) {
        return prev.filter(b => b.highlight_id !== highlightId);
      }
      return [...prev, {
        id: `temp-${Date.now()}`,
        highlight_id: highlightId,
        player_id: playerId,
        created_at: new Date().toISOString(),
      }];
    });

    try {
      if (isCurrentlyBookmarked) {
        const { error } = await supabase
          .from('highlight_bookmarks')
          .delete()
          .eq('highlight_id', highlightId)
          .eq('player_id', playerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('highlight_bookmarks')
          .insert({
            highlight_id: highlightId,
            player_id: playerId,
          });
        if (error) throw error;
      }

      await fetchBookmarks();
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      await fetchBookmarks();
    }
  }, [playerId, bookmarkedIds, fetchBookmarks]);

  return {
    bookmarkedIds,
    loading,
    toggleBookmark,
  };
};

export default useHighlightBookmarks;
