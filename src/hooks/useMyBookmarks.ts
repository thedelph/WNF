/**
 * Hook for fetching all of a user's bookmarked highlights with game data
 * Used for the profile bookmarks section
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { GameHighlight } from '../types/highlights';

export interface BookmarkedHighlight {
  id: string;
  highlight_id: string;
  created_at: string;
  highlight: GameHighlight & {
    game?: {
      id: string;
      sequence_number: number;
      date: string;
    };
  };
}

interface UseMyBookmarksReturn {
  bookmarks: BookmarkedHighlight[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export const useMyBookmarks = (playerId: string | null): UseMyBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<BookmarkedHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    if (!playerId) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('highlight_bookmarks')
        .select(`
          id,
          highlight_id,
          created_at,
          highlight:game_highlights!highlight_bookmarks_highlight_id_fkey (
            id,
            game_id,
            player_id,
            highlight_type,
            timestamp_seconds,
            description,
            scorer_player_id,
            scorer_team,
            created_at,
            updated_at,
            player:players!game_highlights_player_id_fkey (
              id,
              friendly_name,
              avatar_svg
            ),
            scorer:players!game_highlights_scorer_player_id_fkey (
              id,
              friendly_name
            ),
            game:games!game_highlights_game_id_fkey (
              id,
              sequence_number,
              date
            )
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks((data as unknown as BookmarkedHighlight[]) || []);
    } catch (err) {
      console.error('Error fetching my bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    loading,
    refetch: fetchBookmarks,
  };
};

export default useMyBookmarks;
