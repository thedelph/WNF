/**
 * Hook for managing comments on game highlights
 * Batch-fetches all comments for a game's highlights, provides CRUD + admin delete
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { HighlightComment, CreateCommentInput, UpdateCommentInput } from '../types/highlights';
import { containsBannedWords } from '../utils/moderation';
import { extractMentionedPlayerIds } from '../utils/mentions';

interface UseHighlightCommentsReturn {
  commentsByHighlight: Record<string, HighlightComment[]>;
  commentCounts: Record<string, number>;
  loading: boolean;
  addComment: (input: CreateCommentInput) => Promise<{ success: boolean; error?: string }>;
  editComment: (commentId: string, input: UpdateCommentInput) => Promise<{ success: boolean; error?: string }>;
  deleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  adminDeleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
}

export const useHighlightComments = (
  highlightIds: string[],
  playerId: string | null
): UseHighlightCommentsReturn => {
  const [comments, setComments] = useState<HighlightComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const fetchComments = useCallback(async () => {
    if (highlightIds.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('highlight_comments')
        .select(`
          *,
          player:players!highlight_comments_player_id_fkey (
            id,
            friendly_name,
            avatar_svg
          )
        `)
        .in('highlight_id', highlightIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as HighlightComment[]) || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [highlightIds.join(',')]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Group comments by highlight_id
  const commentsByHighlight = useMemo(() => {
    const map: Record<string, HighlightComment[]> = {};
    for (const hId of highlightIds) {
      map[hId] = comments.filter(c => c.highlight_id === hId);
    }
    return map;
  }, [comments, highlightIds.join(',')]);

  // Comment counts per highlight
  const commentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const hId of highlightIds) {
      counts[hId] = (commentsByHighlight[hId] || []).length;
    }
    return counts;
  }, [commentsByHighlight, highlightIds.join(',')]);

  const addComment = useCallback(async (
    input: CreateCommentInput
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerId) return { success: false, error: 'You must be logged in' };

    // Rate limit: 3-second debounce
    const now = Date.now();
    if (now - lastSubmitTime < 3000) {
      return { success: false, error: 'Please wait a moment before commenting again' };
    }

    const content = input.content.trim();
    if (content.length === 0 || content.length > 300) {
      return { success: false, error: 'Comment must be between 1 and 300 characters' };
    }

    const modResult = containsBannedWords(content);
    if (modResult.hasBanned) {
      return { success: false, error: 'Please keep it clean!' };
    }

    const mentionedIds = extractMentionedPlayerIds(content);

    try {
      setLastSubmitTime(now);

      const { error } = await supabase
        .from('highlight_comments')
        .insert({
          highlight_id: input.highlight_id,
          player_id: playerId,
          content,
          mentioned_player_ids: mentionedIds,
        });

      if (error) throw error;

      await fetchComments();
      return { success: true };
    } catch (err) {
      console.error('Error adding comment:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add comment' };
    }
  }, [playerId, lastSubmitTime, fetchComments]);

  const editComment = useCallback(async (
    commentId: string,
    input: UpdateCommentInput
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerId) return { success: false, error: 'You must be logged in' };

    const content = input.content.trim();
    if (content.length === 0 || content.length > 300) {
      return { success: false, error: 'Comment must be between 1 and 300 characters' };
    }

    const modResult = containsBannedWords(content);
    if (modResult.hasBanned) {
      return { success: false, error: 'Please keep it clean!' };
    }

    const mentionedIds = extractMentionedPlayerIds(content);

    try {
      const { error } = await supabase
        .from('highlight_comments')
        .update({
          content,
          mentioned_player_ids: mentionedIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) {
        if (error.message?.includes('row-level security') || error.code === '42501') {
          return { success: false, error: 'Edit window has expired' };
        }
        throw error;
      }

      await fetchComments();
      return { success: true };
    } catch (err) {
      console.error('Error editing comment:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to edit comment' };
    }
  }, [playerId, fetchComments]);

  const deleteComment = useCallback(async (
    commentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerId) return { success: false, error: 'You must be logged in' };

    try {
      // Optimistic removal
      setComments(prev => prev.filter(c => c.id !== commentId));

      const { error } = await supabase
        .from('highlight_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        await fetchComments();
        throw error;
      }

      return { success: true };
    } catch (err) {
      console.error('Error deleting comment:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete comment' };
    }
  }, [playerId, fetchComments]);

  const adminDeleteComment = useCallback(async (
    commentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Optimistic removal
      setComments(prev => prev.filter(c => c.id !== commentId));

      const { data, error } = await supabase.rpc('admin_delete_highlight_comment', {
        p_comment_id: commentId,
      });

      if (error) {
        await fetchComments();
        throw error;
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        await fetchComments();
        return { success: false, error: result.error || 'Failed to delete comment' };
      }

      return { success: true };
    } catch (err) {
      console.error('Error admin-deleting comment:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete comment' };
    }
  }, [fetchComments]);

  return {
    commentsByHighlight,
    commentCounts,
    loading,
    addComment,
    editComment,
    deleteComment,
    adminDeleteComment,
  };
};

export default useHighlightComments;
