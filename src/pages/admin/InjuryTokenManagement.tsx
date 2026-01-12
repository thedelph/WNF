import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import { motion } from 'framer-motion';
import { Modal } from '../../components/common/modals/Modal';
import { useInjuryToken, useInjuryTokenStats, useInjuryTokenClaims, useEligibleInjuryGames } from '../../hooks/useInjuryTokenStatus';
import { InjuryTokenClaim, EligibleInjuryGame } from '../../types/tokens';

interface PlayerOption {
  id: string;
  friendly_name: string;
  current_streak: number;
  shield_active: boolean;
  protected_streak_value: number | null;
}

// Helper to format date
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, string> = {
    active: 'badge-warning',
    returned: 'badge-success',
    denied: 'badge-error',
    expired: 'badge-ghost'
  };

  return (
    <div className={`badge ${variants[status] || 'badge-ghost'} gap-1`}>
      {status === 'active' && <span>🩹</span>}
      {status === 'returned' && <span>✅</span>}
      {status === 'denied' && <span>❌</span>}
      <span className="capitalize">{status}</span>
    </div>
  );
};

const InjuryTokenManagement: React.FC = () => {
  const { isAdmin } = useAdmin();
  const { stats, loading: statsLoading, refreshStats } = useInjuryTokenStats();
  const [statusFilter, setStatusFilter] = useState('all');
  const { claims, loading: claimsLoading, refreshClaims } = useInjuryTokenClaims(statusFilter === 'all' ? undefined : statusFilter);

  // Activate modal state
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(null);
  const [selectedGame, setSelectedGame] = useState<EligibleInjuryGame | null>(null);
  const [activateNotes, setActivateNotes] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Deny modal state
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [claimToDeny, setClaimToDeny] = useState<InjuryTokenClaim | null>(null);
  const [denyReason, setDenyReason] = useState('');

  // Eligible games for selected player
  const { games: eligibleGames, loading: loadingGames, refreshGames } = useEligibleInjuryGames(selectedPlayer?.id);

  const { adminActivateInjuryToken, denyInjuryToken, isProcessing } = useInjuryToken();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch players for activate modal
  const fetchPlayers = useCallback(async () => {
    try {
      setLoadingPlayers(true);
      const { data, error } = await supabase
        .from('players')
        .select('id, friendly_name, current_streak, shield_active, protected_streak_value')
        .order('friendly_name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error: any) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  // Open activate modal
  const handleOpenActivateModal = () => {
    setShowActivateModal(true);
    fetchPlayers();
  };

  // Handle player selection change
  const handlePlayerChange = (playerId: string) => {
    const player = players.find(p => p.id === playerId) || null;
    setSelectedPlayer(player);
    setSelectedGame(null);
  };

  // Calculate effective streak (considering active shield)
  const getEffectiveStreak = (player: PlayerOption | null): number => {
    if (!player) return 0;
    if (player.shield_active && player.protected_streak_value != null) {
      return Math.max(player.current_streak, player.protected_streak_value - player.current_streak);
    }
    return player.current_streak;
  };

  // Calculate return streak
  const getReturnStreak = (player: PlayerOption | null): number => {
    const effective = getEffectiveStreak(player);
    return Math.ceil(effective / 2);
  };

  // Handle activate
  const handleActivate = async () => {
    if (!selectedPlayer || !selectedGame) {
      toast.error('Please select a player and game');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Admin session not found');
        return;
      }

      await adminActivateInjuryToken(
        selectedPlayer.id,
        selectedGame.gameId,
        user.id,
        activateNotes || undefined
      );

      toast.success(`Injury token activated for ${selectedPlayer.friendly_name}. Return streak: ${getReturnStreak(selectedPlayer)} games.`);

      setShowActivateModal(false);
      setSelectedPlayer(null);
      setSelectedGame(null);
      setActivateNotes('');

      refreshClaims();
      refreshStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate injury token');
    }
  };

  // Open deny modal
  const handleOpenDenyModal = (claim: InjuryTokenClaim) => {
    setClaimToDeny(claim);
    setDenyReason('');
    setShowDenyModal(true);
  };

  // Handle deny
  const handleDeny = async () => {
    if (!claimToDeny || !denyReason.trim()) {
      toast.error('Please provide a reason for denial');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Admin session not found');
        return;
      }

      await denyInjuryToken(
        claimToDeny.playerId,
        claimToDeny.injuryGameId,
        user.id,
        denyReason
      );

      toast.success(`Injury claim denied for ${claimToDeny.playerName}`);

      setShowDenyModal(false);
      setClaimToDeny(null);
      setDenyReason('');

      refreshClaims();
      refreshStats();
    } catch (error: any) {
      toast.error(error.message || 'Failed to deny injury token');
    }
  };

  // Filter claims by search
  const filteredClaims = claims.filter(claim =>
    claim.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Refresh eligible games when player changes
  useEffect(() => {
    if (selectedPlayer) {
      refreshGames();
    }
  }, [selectedPlayer, refreshGames]);

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
          <span className="text-4xl">🩹</span>
          <h1 className="text-3xl font-bold text-amber-400">Injury Token Management</h1>
        </div>
        <button
          onClick={handleOpenActivateModal}
          className="btn btn-warning gap-2"
        >
          <span>+</span>
          <span>Activate for Player</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-figure text-warning">
            <span className="text-3xl">🩹</span>
          </div>
          <div className="stat-title">Active Reserves</div>
          <div className="stat-value text-warning text-2xl">
            {statsLoading ? <span className="loading loading-spinner loading-sm"></span> : stats?.activeCount ?? 0}
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">This Month</div>
          <div className="stat-value text-2xl">
            {statsLoading ? <span className="loading loading-spinner loading-sm"></span> : stats?.thisMonthCount ?? 0}
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Total Returned</div>
          <div className="stat-value text-success text-2xl">
            {statsLoading ? <span className="loading loading-spinner loading-sm"></span> : stats?.totalReturned ?? 0}
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Total Denied</div>
          <div className="stat-value text-error text-2xl">
            {statsLoading ? <span className="loading loading-spinner loading-sm"></span> : stats?.totalDenied ?? 0}
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-4">
          <div className="stat-title">Avg Recovery</div>
          <div className="stat-value text-2xl">
            {statsLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>{stats?.avgRecoveryDays ?? 0} days</>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search players..."
          className="input input-bordered w-full max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="select select-bordered"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="denied">Denied</option>
          <option value="expired">Expired</option>
        </select>
        <button
          onClick={() => { refreshClaims(); refreshStats(); }}
          className="btn btn-primary btn-sm"
          disabled={claimsLoading}
        >
          {claimsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Claims Table */}
      {claimsLoading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Player</th>
                <th>Injury Game</th>
                <th>Original → Return</th>
                <th>Status</th>
                <th>Days on Reserve</th>
                <th>Activated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <motion.tr
                  key={claim.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover"
                >
                  <td>
                    <div className="font-semibold">{claim.playerName}</div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium">Game #{claim.injuryGameNumber}</span>
                      <span className="text-xs text-base-content/60">{formatDate(claim.injuryGameDate)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{claim.originalStreak}</span>
                      <span className="text-base-content/50">→</span>
                      <span className="font-mono text-warning font-bold">{claim.returnStreak}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={claim.status} />
                  </td>
                  <td>
                    {claim.status === 'active' ? (
                      <span>{claim.daysOnReserve} {claim.daysOnReserve === 1 ? 'day' : 'days'}</span>
                    ) : (
                      <span className="text-base-content/50">-</span>
                    )}
                  </td>
                  <td>
                    <span className="text-sm">{formatDate(claim.activatedAt)}</span>
                  </td>
                  <td>
                    {claim.status === 'active' && (
                      <button
                        onClick={() => handleOpenDenyModal(claim)}
                        className="btn btn-error btn-xs"
                      >
                        Deny
                      </button>
                    )}
                    {claim.status !== 'active' && (
                      <span className="text-base-content/50 text-xs">-</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredClaims.length === 0 && (
            <div className="text-center py-8 text-base-content/60">
              {searchTerm ? `No claims found matching "${searchTerm}"` : 'No injury token claims found'}
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
          <h3 className="font-bold">Injury Token System</h3>
          <div className="text-sm">
            Players injured during WNF games can claim an injury token to protect their streak.
            When they return, their streak is set to 50% of the original value. Unlike shield tokens,
            injury tokens are free and don't require earning. Fair-use policy applies - admins can
            deny invalid claims.
          </div>
        </div>
      </div>

      {/* Activate Modal */}
      <Modal
        isOpen={showActivateModal}
        onClose={() => setShowActivateModal(false)}
        title="🩹 Activate Injury Token"
        maxWidth="xl"
      >
        <div className="space-y-6">
          {/* Player Selection */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Player</legend>
            {loadingPlayers ? (
              <div className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                <span>Loading players...</span>
              </div>
            ) : (
              <select
                className="select select-bordered w-full"
                value={selectedPlayer?.id || ''}
                onChange={(e) => handlePlayerChange(e.target.value)}
              >
                <option value="">Select player...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.friendly_name}</option>
                ))}
              </select>
            )}
          </fieldset>

          {/* Game Selection */}
          {selectedPlayer && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Injury Game</legend>
              {loadingGames ? (
                <div className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Loading eligible games...</span>
                </div>
              ) : eligibleGames.length === 0 ? (
                <div className="alert alert-warning py-2">
                  <span>No eligible games found for this player. They must have been selected for a recent game.</span>
                </div>
              ) : (
                <select
                  className="select select-bordered w-full"
                  value={selectedGame?.gameId || ''}
                  onChange={(e) => {
                    const game = eligibleGames.find(g => g.gameId === e.target.value) || null;
                    setSelectedGame(game);
                  }}
                >
                  <option value="">Select game where injury occurred...</option>
                  {eligibleGames.map(g => (
                    <option
                      key={g.gameId}
                      value={g.gameId}
                      disabled={!g.eligible}
                    >
                      Game #{g.sequenceNumber} - {formatDate(g.gameDate)}
                      {!g.eligible ? ` (${g.reason})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </fieldset>
          )}

          {/* Preview */}
          {selectedPlayer && selectedGame && (
            <div className="stats bg-base-200 w-full">
              <div className="stat">
                <div className="stat-title">Original Streak</div>
                <div className="stat-value text-xl">{getEffectiveStreak(selectedPlayer)}</div>
                {selectedPlayer.shield_active && (
                  <div className="stat-desc text-purple-400">Includes shield protection</div>
                )}
              </div>
              <div className="stat">
                <div className="stat-title">Return Streak</div>
                <div className="stat-value text-xl text-warning">{getReturnStreak(selectedPlayer)}</div>
              </div>
            </div>
          )}

          {/* Notes */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Notes (optional)</legend>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="e.g., Player contacted via WhatsApp"
              value={activateNotes}
              onChange={(e) => setActivateNotes(e.target.value)}
              rows={2}
            />
          </fieldset>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowActivateModal(false)}
              className="btn btn-ghost"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleActivate}
              className="btn btn-warning"
              disabled={!selectedPlayer || !selectedGame || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <span>🩹</span>
                  <span>Activate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deny Modal */}
      <Modal
        isOpen={showDenyModal}
        onClose={() => setShowDenyModal(false)}
        title="❌ Deny Injury Claim"
        maxWidth="md"
      >
        <div className="space-y-6">
          {claimToDeny && (
            <>
              <div className="alert alert-warning">
                <span>
                  You are about to deny the injury claim for <strong>{claimToDeny.playerName}</strong> from Game #{claimToDeny.injuryGameNumber}.
                </span>
              </div>

              <div className="card bg-base-200 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="opacity-75">Original Streak:</span>
                    <span className="font-bold ml-2">{claimToDeny.originalStreak} games</span>
                  </div>
                  <div>
                    <span className="opacity-75">Return Streak:</span>
                    <span className="font-bold ml-2 text-warning">{claimToDeny.returnStreak} games</span>
                  </div>
                  <div>
                    <span className="opacity-75">Days on Reserve:</span>
                    <span className="font-bold ml-2">{claimToDeny.daysOnReserve}</span>
                  </div>
                  <div>
                    <span className="opacity-75">Activated:</span>
                    <span className="font-bold ml-2">{formatDate(claimToDeny.activatedAt)}</span>
                  </div>
                </div>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Reason for Denial (required)</legend>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="e.g., Injury did not occur during WNF game"
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  rows={3}
                  required
                />
              </fieldset>

              <div className="alert alert-error py-2 text-sm">
                <span>
                  This will remove the player from injury reserve. Their streak will <strong>NOT</strong> be affected - they'll just lose the claim protection.
                </span>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDenyModal(false)}
              className="btn btn-ghost"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleDeny}
              className="btn btn-error"
              disabled={!denyReason.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span>Denying...</span>
                </>
              ) : (
                <>
                  <span>❌</span>
                  <span>Deny Claim</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InjuryTokenManagement;
