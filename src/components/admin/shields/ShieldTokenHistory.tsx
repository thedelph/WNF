import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface ShieldHistoryRecord {
  id: string;
  player_id: string;
  player_name?: string;
  action_type: 'issued' | 'used' | 'removed' | 'returned' | 'admin_override';
  game_id: string | null;
  game_sequence?: number | null;
  tokens_before: number;
  tokens_after: number;
  frozen_streak_value: number | null;
  frozen_streak_modifier: number | null;
  notes: string | null;
  initiated_by: string;
  created_at: string;
}

interface ShieldTokenHistoryProps {
  playerId?: string;
  gameId?: string;
  limit?: number;
  showPlayerName?: boolean;
}

/**
 * ShieldTokenHistory component
 * Displays audit log of shield token operations
 * Can be filtered by player, game, or show all
 * @param playerId - Optional: filter by specific player
 * @param gameId - Optional: filter by specific game
 * @param limit - Optional: limit number of records (default 50)
 * @param showPlayerName - Optional: show player names in table (default true)
 */
export const ShieldTokenHistory: React.FC<ShieldTokenHistoryProps> = ({
  playerId,
  gameId,
  limit = 50,
  showPlayerName = true
}) => {
  const [history, setHistory] = useState<ShieldHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchHistory();
  }, [playerId, gameId, limit]);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('shield_token_history')
        .select(`
          *,
          players!shield_token_history_player_id_fkey(friendly_name),
          games(sequence_number)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (playerId) {
        query = query.eq('player_id', playerId);
      }

      if (gameId) {
        query = query.eq('game_id', gameId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformedData: ShieldHistoryRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        player_id: record.player_id,
        player_name: record.players?.friendly_name,
        action_type: record.action_type,
        game_id: record.game_id,
        game_sequence: record.games?.sequence_number,
        tokens_before: record.tokens_before,
        tokens_after: record.tokens_after,
        frozen_streak_value: record.frozen_streak_value,
        frozen_streak_modifier: record.frozen_streak_modifier,
        notes: record.notes,
        initiated_by: record.initiated_by,
        created_at: record.created_at
      }));

      setHistory(transformedData);
    } catch (error: any) {
      console.error('Error fetching shield history:', error);
      toast.error('Failed to load shield token history');
    } finally {
      setLoading(false);
    }
  };

  // Filter history by action type
  const filteredHistory = filter === 'all'
    ? history
    : history.filter(record => record.action_type === filter);

  // Action type badge styling
  const getActionBadge = (actionType: string) => {
    const badges: Record<string, { color: string; label: string; icon: string }> = {
      issued: { color: 'badge-success', label: 'Issued', icon: '➕' },
      used: { color: 'badge-warning', label: 'Used', icon: '🛡️' },
      removed: { color: 'badge-error', label: 'Removed', icon: '❌' },
      returned: { color: 'badge-info', label: 'Returned', icon: '↩️' },
      admin_override: { color: 'badge-secondary', label: 'Admin', icon: '⚙️' }
    };

    const badge = badges[actionType] || badges.issued;

    return (
      <div className={`badge ${badge.color} gap-1`}>
        <span>{badge.icon}</span>
        <span>{badge.label}</span>
      </div>
    );
  };

  // Token change indicator
  const getTokenChange = (before: number, after: number) => {
    const diff = after - before;
    if (diff === 0) return <span className="text-base-content/50">No change</span>;

    return (
      <span className={diff > 0 ? 'text-success' : 'text-error'}>
        {diff > 0 ? '+' : ''}{diff}
        <span className="text-xs ml-1">
          ({before} → {after})
        </span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
        >
          All ({history.length})
        </button>
        <button
          onClick={() => setFilter('issued')}
          className={`btn btn-sm ${filter === 'issued' ? 'btn-success' : 'btn-ghost'}`}
        >
          Issued ({history.filter(h => h.action_type === 'issued').length})
        </button>
        <button
          onClick={() => setFilter('used')}
          className={`btn btn-sm ${filter === 'used' ? 'btn-warning' : 'btn-ghost'}`}
        >
          Used ({history.filter(h => h.action_type === 'used').length})
        </button>
        <button
          onClick={() => setFilter('removed')}
          className={`btn btn-sm ${filter === 'removed' ? 'btn-error' : 'btn-ghost'}`}
        >
          Removed ({history.filter(h => h.action_type === 'removed').length})
        </button>
        <button
          onClick={() => setFilter('returned')}
          className={`btn btn-sm ${filter === 'returned' ? 'btn-info' : 'btn-ghost'}`}
        >
          Returned ({history.filter(h => h.action_type === 'returned').length})
        </button>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              {showPlayerName && <th>Player</th>}
              <th>Action</th>
              <th>Game</th>
              <th>Token Change</th>
              <th>Frozen Streak</th>
              <th>Notes</th>
              <th>Initiated By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((record) => (
              <motion.tr
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover"
              >
                {/* Player Name */}
                {showPlayerName && (
                  <td className="font-semibold">{record.player_name}</td>
                )}

                {/* Action Type */}
                <td>{getActionBadge(record.action_type)}</td>

                {/* Game */}
                <td>
                  {record.game_sequence ? (
                    <span className="badge badge-ghost">
                      WNF #{record.game_sequence.toString().padStart(3, '0')}
                    </span>
                  ) : (
                    <span className="text-base-content/50">N/A</span>
                  )}
                </td>

                {/* Token Change */}
                <td>{getTokenChange(record.tokens_before, record.tokens_after)}</td>

                {/* Frozen Streak */}
                <td>
                  {record.frozen_streak_value ? (
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {record.frozen_streak_value} games
                      </span>
                      <span className="text-xs text-success">
                        +{(record.frozen_streak_modifier || 0) * 100}% XP
                      </span>
                    </div>
                  ) : (
                    <span className="text-base-content/50">-</span>
                  )}
                </td>

                {/* Notes */}
                <td>
                  <div className="max-w-xs truncate text-sm" title={record.notes || undefined}>
                    {record.notes || '-'}
                  </div>
                </td>

                {/* Initiated By */}
                <td>
                  <span className="badge badge-sm">
                    {record.initiated_by === 'system'
                      ? '🤖 System'
                      : record.initiated_by === 'player'
                      ? '👤 Player'
                      : '👨‍💼 Admin'}
                  </span>
                </td>

                {/* Date */}
                <td className="text-sm">
                  {format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredHistory.length === 0 && (
          <div className="text-center py-8 text-base-content/60">
            No shield token history found
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button onClick={fetchHistory} className="btn btn-sm btn-ghost">
          Refresh History
        </button>
      </div>
    </div>
  );
};

export default ShieldTokenHistory;
