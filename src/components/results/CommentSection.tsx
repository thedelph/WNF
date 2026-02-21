/**
 * CommentSection - Toggleable comment list for a highlight card
 * Shows chronological comments with avatar, name, time-ago, content with rendered mentions
 * Edit/delete for own comments, admin delete for any, input row for new comments
 */

import React, { useState } from 'react';
import { Pencil, Trash2, Send, LogIn } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { HighlightComment, CreateCommentInput, UpdateCommentInput } from '../../types/highlights';
import { GameDetailRegistration } from '../../hooks/useGameDetail';
import { MentionText } from './MentionText';
import { MentionTextarea } from './MentionTextarea';

interface CommentSectionProps {
  highlightId: string;
  comments: HighlightComment[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  playerId: string | null;
  registrations: GameDetailRegistration[];
  onAddComment: (input: CreateCommentInput) => Promise<{ success: boolean; error?: string }>;
  onEditComment: (commentId: string, input: UpdateCommentInput) => Promise<{ success: boolean; error?: string }>;
  onDeleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  onAdminDeleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

function isWithinEditWindow(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < 60 * 60 * 1000; // 60 minutes
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  highlightId,
  comments,
  isLoggedIn,
  isAdmin,
  playerId,
  registrations,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAdminDeleteComment,
}) => {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const result = await onAddComment({
      highlight_id: highlightId,
      content: newComment,
    });

    if (result.success) {
      setNewComment('');
    } else {
      toast.error(result.error || 'Failed to add comment');
    }
    setSubmitting(false);
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    const result = await onEditComment(commentId, {
      content: editContent,
    });

    if (result.success) {
      setEditingCommentId(null);
      setEditContent('');
      toast.success('Comment updated');
    } else {
      toast.error(result.error || 'Failed to edit comment');
    }
  };

  const handleDelete = async (commentId: string, isAdminAction: boolean) => {
    const result = isAdminAction
      ? await onAdminDeleteComment(commentId)
      : await onDeleteComment(commentId);

    if (result.success) {
      toast.success('Comment deleted');
    } else {
      toast.error(result.error || 'Failed to delete comment');
    }
  };

  const startEdit = (comment: HighlightComment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  return (
    <div className="mt-3 pt-3 border-t border-base-300 space-y-3">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2.5">
          {comments.map(comment => {
            const isOwn = playerId === comment.player_id;
            const canEdit = isOwn && isWithinEditWindow(comment.created_at);
            const canDelete = isOwn;
            const canAdminDelete = isAdmin && !isOwn;
            const isEditing = editingCommentId === comment.id;

            return (
              <div key={comment.id} className="flex gap-2">
                {/* Tiny avatar */}
                {comment.player?.avatar_svg ? (
                  <img
                    src={comment.player.avatar_svg}
                    alt={comment.player.friendly_name}
                    className="w-6 h-6 rounded-full bg-base-300 flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-base-300 flex-shrink-0 flex items-center justify-center text-xs font-bold text-base-content/50">
                    {(comment.player?.friendly_name?.[0] ?? '?').toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">
                      {comment.player?.friendly_name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-base-content/40">
                      {timeAgo(comment.created_at)}
                    </span>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-base-content/30">(edited)</span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-1 space-y-1">
                      <MentionTextarea
                        value={editContent}
                        onChange={setEditContent}
                        registrations={registrations}
                        maxLength={300}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(comment.id)}
                          disabled={!editContent.trim()}
                          className="btn btn-primary btn-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="btn btn-ghost btn-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">
                      <MentionText text={comment.content} />
                    </p>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => startEdit(comment)}
                        className="btn btn-ghost btn-xs btn-circle"
                        title="Edit (within 60 min)"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {(canDelete || canAdminDelete) && (
                      <button
                        onClick={() => handleDelete(comment.id, !!canAdminDelete)}
                        className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
                        title={canAdminDelete ? 'Admin delete' : 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New comment input */}
      {isLoggedIn ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              registrations={registrations}
              placeholder="Add a comment... (use @ to mention)"
              maxLength={300}
              disabled={submitting}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="btn btn-primary btn-sm btn-circle flex-shrink-0"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-center py-2">
          <span className="text-xs text-base-content/50 flex items-center justify-center gap-1">
            <LogIn className="w-3 h-3" />
            Log in to comment
          </span>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
