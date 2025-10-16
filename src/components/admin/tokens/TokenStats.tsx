import React, { useState, useEffect } from 'react';
import { TokenData } from '../../../types/tokens';
import { supabaseAdmin } from '../../../utils/supabase';
import { PiCoinDuotone, PiFireBold, PiClockBold, PiCheckCircleBold } from 'react-icons/pi';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenStatsProps {
  tokens: TokenData[];
}

interface RecentTokenUsage {
  player_name: string;
  game_sequence: number;
  used_at: string;
  was_forgiven: boolean;
}

interface PlayerOnCooldown {
  player_id: string;
  player_name: string;
  used_in_game: number;
}

export const TokenStats: React.FC<TokenStatsProps> = ({ tokens }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [recentUsage, setRecentUsage] = useState<RecentTokenUsage[]>([]);
  const [playersOnCooldown, setPlayersOnCooldown] = useState<PlayerOnCooldown[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Count active tokens - must be unused and not expired
  const activeTokens = tokens.filter(token => {
    const hasToken = token.issued_at != null;
    const isUnused = !token.used_at;
    const notExpired = !token.expires_at || new Date(token.expires_at) > new Date();
    return hasToken && isUnused && notExpired;
  }).length;

  // Count used tokens
  const usedTokens = tokens.filter(token => token.used_at != null).length;

  // Count eligible players
  const eligiblePlayers = tokens.filter(token => token.is_eligible).length;

  // Count ineligible players
  const ineligiblePlayers = tokens.filter(token => !token.is_eligible).length;

  // Load recent token usage and cooldown data
  useEffect(() => {
    if (showDetails) {
      loadTokenDetails();
    }
  }, [showDetails]);

  const loadTokenDetails = async () => {
    setLoadingDetails(true);
    try {
      // Get recent token usage (last 5 games with token usage)
      const { data: recentGames, error: gamesError } = await supabaseAdmin
        .from('games')
        .select('id, sequence_number')
        .eq('completed', true)
        .order('sequence_number', { ascending: false })
        .limit(10);

      if (gamesError) throw gamesError;

      if (recentGames && recentGames.length > 0) {
        // Get token usage for these games
        const { data: tokenUsageData, error: usageError } = await supabaseAdmin
          .rpc('get_game_token_usage', { p_game_id: recentGames[0].id });

        if (!usageError && tokenUsageData) {
          const recentUsageFormatted: RecentTokenUsage[] = tokenUsageData.map((usage: any) => ({
            player_name: usage.player_name,
            game_sequence: recentGames[0].sequence_number,
            used_at: new Date().toISOString(),
            was_forgiven: usage.was_forgiven
          }));
          setRecentUsage(recentUsageFormatted);
        }

        // Get players on cooldown (used token in most recent game)
        const { data: registrations, error: regError } = await supabaseAdmin
          .from('game_registrations')
          .select(`
            player_id,
            using_token,
            players:player_id (
              friendly_name
            )
          `)
          .eq('game_id', recentGames[0].id)
          .eq('using_token', true)
          .eq('status', 'selected');

        if (!regError && registrations) {
          const cooldownPlayers: PlayerOnCooldown[] = registrations.map((reg: any) => ({
            player_id: reg.player_id,
            player_name: reg.players.friendly_name,
            used_in_game: recentGames[0].sequence_number
          }));
          setPlayersOnCooldown(cooldownPlayers);
        }
      }
    } catch (error) {
      console.error('Error loading token details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <PiCoinDuotone size={32} />
          </div>
          <div className="stat-title">Active Tokens</div>
          <div className="stat-value text-primary">{activeTokens}</div>
          <div className="stat-desc">Unused and not expired</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <PiCheckCircleBold size={32} />
          </div>
          <div className="stat-title">Used Tokens</div>
          <div className="stat-value text-secondary">{usedTokens}</div>
          <div className="stat-desc">Already consumed in games</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-success">
            <PiCheckCircleBold size={32} />
          </div>
          <div className="stat-title">Eligible Players</div>
          <div className="stat-value text-success">{eligiblePlayers}</div>
          <div className="stat-desc">Can receive tokens</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-error">
            <PiClockBold size={32} />
          </div>
          <div className="stat-title">Ineligible Players</div>
          <div className="stat-value">{ineligiblePlayers}</div>
          <div className="stat-desc">Don't meet criteria</div>
        </div>
      </div>

      {/* Toggle Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="btn btn-outline btn-sm w-full"
      >
        {showDetails ? 'Hide' : 'Show'} Token Usage Details
      </button>

      {/* Detailed Stats */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {loadingDetails ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                {/* Players on Cooldown */}
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="card-title flex items-center gap-2">
                      <PiFireBold className="text-error" size={24} />
                      Players on Cooldown ({playersOnCooldown.length})
                    </h3>
                    <p className="text-sm opacity-70">
                      These players used tokens in the most recent game and will be deprioritized in the next game
                    </p>
                    {playersOnCooldown.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {playersOnCooldown.map((player) => (
                          <div
                            key={player.player_id}
                            className="flex items-center justify-between p-3 bg-base-100 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <PiCoinDuotone className="text-warning" size={20} />
                              <span className="font-medium">{player.player_name}</span>
                            </div>
                            <div className="badge badge-error gap-1">
                              <PiFireBold size={14} />
                              Cooldown
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm opacity-50 py-2">No players currently on cooldown</p>
                    )}
                  </div>
                </div>

                {/* Recent Token Usage */}
                <div className="card bg-base-200">
                  <div className="card-body">
                    <h3 className="card-title flex items-center gap-2">
                      <PiClockBold className="text-info" size={24} />
                      Recent Token Usage
                    </h3>
                    <p className="text-sm opacity-70">
                      Token usage from the most recent completed game
                    </p>
                    {recentUsage.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {recentUsage.map((usage, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-base-100 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <PiCoinDuotone className="text-warning" size={20} />
                              <span className="font-medium">{usage.player_name}</span>
                              <span className="text-sm opacity-70">
                                Game #{usage.game_sequence}
                              </span>
                            </div>
                            <div className={`badge ${usage.was_forgiven ? 'badge-success' : 'badge-warning'} gap-1`}>
                              {usage.was_forgiven ? (
                                <>
                                  <PiCheckCircleBold size={14} />
                                  Forgiven
                                </>
                              ) : (
                                <>
                                  <PiCoinDuotone size={14} />
                                  Consumed
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm opacity-50 py-2">No token usage in recent games</p>
                    )}
                  </div>
                </div>

                {/* Token System Info */}
                <div className="alert alert-info">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold">Token Cooldown Effect</h4>
                    <p className="text-sm">
                      When a player uses a priority token, they are automatically placed at the bottom
                      of the merit selection list in the <strong>next sequential game only</strong>.
                      This prevents token usage from snowballing into long streaks.
                    </p>
                    <p className="text-sm mt-2">
                      <strong>Token Forgiveness:</strong> If a player would have been selected by XP anyway,
                      their token is automatically returned (forgiven) to prevent unnecessary consumption.
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
