import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import { motion } from 'framer-motion';
import { ShieldTokenBadge } from '../../components/player/ShieldTokenDisplay';

interface ShieldPlayerData {
  id: string;
  friendly_name: string;
  shield_tokens_available: number;
  games_played_since_shield_launch: number;
  shield_active: boolean;
  protected_streak_value: number | null;
  protected_streak_base: number | null;
  current_streak: number;
  games_toward_next_token: number;
  games_until_next_token: number;
}

const ShieldTokenManagement: React.FC = () => {
  const { isAdmin } = useAdmin();
  const [playerData, setPlayerData] = useState<ShieldPlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [issuing, setIssuing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removingToken, setRemovingToken] = useState<string | null>(null);
  const [resettingProgress, setResettingProgress] = useState<string | null>(null);

  // Fetch all players and their shield status
  const fetchShieldData = async () => {
    try {
      setLoading(true);

      const { data: players, error } = await supabase
        .from('players')
        .select(`
          id,
          friendly_name,
          shield_tokens_available,
          games_played_since_shield_launch,
          shield_active,
          protected_streak_value,
          protected_streak_base,
          current_streak
        `)
        .order('friendly_name');

      if (error) throw error;

      // Calculate progress for each player
      const enrichedData: ShieldPlayerData[] = (players || []).map(player => ({
        ...player,
        games_toward_next_token: player.games_played_since_shield_launch % 10,
        games_until_next_token: 10 - (player.games_played_since_shield_launch % 10)
      }));

      setPlayerData(enrichedData);
    } catch (error: any) {
      console.error('Error fetching shield data:', error);
      toast.error('Failed to load shield token data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchShieldData();
    }
  }, [isAdmin]);

  // Manual token issuance
  const handleIssueToken = async (playerId: string, playerName: string) => {
    try {
      setIssuing(playerId);

      // Get current user for admin tracking
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('issue_shield_token', {
        p_player_id: playerId,
        p_reason: 'Manually issued by admin',
        p_admin_id: user?.id || null
      });

      if (error) throw error;

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (result?.success) {
        toast.success(`Shield token issued to ${playerName}. They now have ${result.tokens_now} token${result.tokens_now !== 1 ? 's' : ''}.`);
        await fetchShieldData();
      } else {
        toast.error(result?.message || 'Failed to issue token');
      }
    } catch (error: any) {
      console.error('Error issuing token:', error);
      toast.error(error.message || 'Failed to issue shield token');
    } finally {
      setIssuing(null);
    }
  };

  // Remove active shield protection
  const handleRemoveShield = async (playerId: string, playerName: string) => {
    if (!confirm(`Remove active shield protection from ${playerName}? This will clear their frozen streak.`)) {
      return;
    }

    try {
      setRemoving(playerId);

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('remove_shield_protection', {
        p_player_id: playerId,
        p_reason: 'Manually removed by admin',
        p_admin_id: user?.id || null
      });

      if (error) throw error;

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (result?.success) {
        toast.success(`Shield protection removed from ${playerName}`);
        await fetchShieldData();
      } else {
        toast.error(result?.message || 'Failed to remove shield');
      }
    } catch (error: any) {
      console.error('Error removing shield:', error);
      toast.error(error.message || 'Failed to remove shield protection');
    } finally {
      setRemoving(null);
    }
  };

  // Remove shield tokens from player
  const handleRemoveToken = async (playerId: string, playerName: string, currentTokens: number) => {
    if (!confirm(`Remove 1 shield token from ${playerName}? They currently have ${currentTokens} token${currentTokens !== 1 ? 's' : ''}.`)) {
      return;
    }

    try {
      setRemovingToken(playerId);

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('remove_shield_tokens', {
        p_player_id: playerId,
        p_amount: 1,
        p_reason: 'Manually removed by admin',
        p_admin_id: user?.id || null
      });

      if (error) throw error;

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (result?.success) {
        toast.success(`${result.message}. ${playerName} now has ${result.tokens_now} token${result.tokens_now !== 1 ? 's' : ''}.`);
        await fetchShieldData();
      } else {
        toast.error(result?.message || 'Failed to remove token');
      }
    } catch (error: any) {
      console.error('Error removing token:', error);
      toast.error(error.message || 'Failed to remove shield token');
    } finally {
      setRemovingToken(null);
    }
  };

  // Reset shield progress tracking
  const handleResetProgress = async (playerId: string, playerName: string, currentGames: number) => {
    if (!confirm(`Reset shield progress for ${playerName}? This will reset their games played from ${currentGames} to 0. Their tokens will NOT be affected.`)) {
      return;
    }

    try {
      setResettingProgress(playerId);

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('reset_shield_progress', {
        p_player_id: playerId,
        p_reason: 'Manually reset by admin',
        p_admin_id: user?.id || null
      });

      if (error) throw error;

      const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (result?.success) {
        toast.success(`${result.message} for ${playerName}`);
        await fetchShieldData();
      } else {
        toast.error(result?.message || 'Failed to reset progress');
      }
    } catch (error: any) {
      console.error('Error resetting progress:', error);
      toast.error(error.message || 'Failed to reset shield progress');
    } finally {
      setResettingProgress(null);
    }
  };

  // Filter players based on search
  const filteredPlayers = playerData.filter(player =>
    player.friendly_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    totalPlayers: playerData.length,
    activeShields: playerData.filter(p => p.shield_active).length,
    totalTokens: playerData.reduce((sum, p) => sum + p.shield_tokens_available, 0),
    playersWithTokens: playerData.filter(p => p.shield_tokens_available > 0).length,
    avgTokens: playerData.length > 0
      ? (playerData.reduce((sum, p) => sum + p.shield_tokens_available, 0) / playerData.length).toFixed(2)
      : '0',
    maxTokenPlayers: playerData.filter(p => p.shield_tokens_available === 4).length
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>You need admin permissions to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🛡️</span>
          <h1 className="text-3xl font-bold">Shield Token Management</h1>
        </div>
        <button
          onClick={fetchShieldData}
          className="btn btn-primary btn-sm"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Total Players</div>
          <div className="stat-value text-2xl">{stats.totalPlayers}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Active Shields</div>
          <div className="stat-value text-2xl text-success">{stats.activeShields}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Total Tokens</div>
          <div className="stat-value text-2xl text-warning">{stats.totalTokens}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Players w/ Tokens</div>
          <div className="stat-value text-2xl">{stats.playersWithTokens}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Avg Tokens</div>
          <div className="stat-value text-2xl">{stats.avgTokens}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Max (4) Tokens</div>
          <div className="stat-value text-2xl text-info">{stats.maxTokenPlayers}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search players by name..."
          className="input input-bordered w-full max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Players Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Player</th>
                <th>Tokens</th>
                <th>Status</th>
                <th>Games Played</th>
                <th>Progress</th>
                <th>Current Streak</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <motion.tr
                  key={player.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover"
                >
                  {/* Player Name */}
                  <td>
                    <div className="font-semibold">{player.friendly_name}</div>
                  </td>

                  {/* Tokens */}
                  <td>
                    <div className="flex items-center gap-2">
                      <ShieldTokenBadge
                        tokensAvailable={player.shield_tokens_available}
                        shieldActive={player.shield_active}
                        size="sm"
                      />
                      {player.shield_tokens_available === 0 && !player.shield_active && (
                        <span className="text-base-content/50">None</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    {player.shield_active ? (
                      <div className="flex flex-col gap-1">
                        <div className="badge badge-success gap-1">
                          <span>🛡️</span>
                          <span>Active</span>
                        </div>
                        <div className="text-xs text-base-content/70">
                          {player.protected_streak_value} games protected
                        </div>
                      </div>
                    ) : (
                      <div className="badge badge-ghost">Inactive</div>
                    )}
                  </td>

                  {/* Games Played */}
                  <td>
                    <div className="text-sm">
                      {player.games_played_since_shield_launch} games
                    </div>
                  </td>

                  {/* Progress to Next Token */}
                  <td>
                    {player.shield_tokens_available < 4 ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-semibold">
                          {player.games_toward_next_token}/10
                        </div>
                        <progress
                          className="progress progress-warning w-20"
                          value={player.games_toward_next_token}
                          max="10"
                        ></progress>
                        <div className="text-xs text-base-content/60">
                          {player.games_until_next_token} to go
                        </div>
                      </div>
                    ) : (
                      <div className="badge badge-info badge-sm">Max Reached</div>
                    )}
                  </td>

                  {/* Current Streak */}
                  <td>
                    <div className="text-sm">
                      {player.current_streak} games
                      {player.current_streak > 0 && (
                        <div className="text-xs text-success">
                          +{player.current_streak * 10}% XP
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {/* Issue Token Button */}
                      <button
                        onClick={() => handleIssueToken(player.id, player.friendly_name)}
                        disabled={
                          player.shield_tokens_available >= 4 ||
                          issuing === player.id
                        }
                        className="btn btn-success btn-xs"
                        title={
                          player.shield_tokens_available >= 4
                            ? 'Already at max tokens'
                            : 'Issue shield token'
                        }
                      >
                        {issuing === player.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          '+Token'
                        )}
                      </button>

                      {/* Remove Token Button */}
                      {player.shield_tokens_available > 0 && (
                        <button
                          onClick={() => handleRemoveToken(player.id, player.friendly_name, player.shield_tokens_available)}
                          disabled={removingToken === player.id}
                          className="btn btn-error btn-xs"
                          title="Remove 1 shield token"
                        >
                          {removingToken === player.id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            '-Token'
                          )}
                        </button>
                      )}

                      {/* Remove Shield Button */}
                      {player.shield_active && (
                        <button
                          onClick={() => handleRemoveShield(player.id, player.friendly_name)}
                          disabled={removing === player.id}
                          className="btn btn-error btn-xs"
                          title="Remove active shield"
                        >
                          {removing === player.id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            'Remove Shield'
                          )}
                        </button>
                      )}

                      {/* Reset Progress Button */}
                      {player.games_played_since_shield_launch > 0 && (
                        <button
                          onClick={() => handleResetProgress(player.id, player.friendly_name, player.games_played_since_shield_launch)}
                          disabled={resettingProgress === player.id}
                          className="btn btn-warning btn-xs"
                          title="Reset games played progress"
                        >
                          {resettingProgress === player.id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            'Reset Progress'
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-base-content/60">
              No players found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="stroke-current shrink-0 w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <h3 className="font-bold">Shield Token System</h3>
          <div className="text-sm">
            Players earn 1 shield token per 10 games played (max 4). Shields protect streaks when
            players can't play. Active shields use gradual decay: the protected bonus decreases
            as the player rebuilds their natural streak, converging at the midpoint.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShieldTokenManagement;
