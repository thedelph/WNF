import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../../types/player';
import { ViewToggle } from '../games/views/ViewToggle';
import { PlayerCard } from '../player-card/PlayerCard';
import { useGlobalXP } from '../../hooks/useGlobalXP';
import { useGameRegistrationStats } from '../../hooks/useGameRegistrationStats';

interface ShieldTokenUser {
  player: Player;
  used_at: string;
  protected_streak_value: number;
  protected_streak_base: number;
  // Legacy aliases for backwards compatibility
  frozen_streak_value?: number;
  frozen_streak_modifier?: number;
}

interface ShieldTokenPlayersProps {
  shieldTokenUsers: ShieldTokenUser[];
}

/**
 * Component for displaying players using shield tokens for a game
 * Shows players who have protected their streak for this week
 * Supports both grid and list views
 * Uses same player card display as RegisteredPlayers
 *
 * @component
 * @param {Object} props
 * @param {ShieldTokenUser[]} props.shieldTokenUsers - Array of shield token users for the game
 */
export const ShieldTokenPlayers: React.FC<ShieldTokenPlayersProps> = ({
  shieldTokenUsers
}) => {
  const [view, setView] = useState<'list' | 'card'>('card');

  // Convert shield token users to registration format for stats hook
  // Memoize to prevent recreating on every render
  const registrations = useMemo(() =>
    shieldTokenUsers.map(su => ({
      player: su.player,
      status: 'shield_protected' as const,
      using_token: false,
      created_at: su.used_at
    })),
    [shieldTokenUsers]
  );

  // Fetch global XP values and registration stats
  const { xpValues: globalXpValues, loading: globalXpLoading } = useGlobalXP();
  const { loading, playerStats, stats } = useGameRegistrationStats(registrations);

  // Early return if no shield token users
  if (shieldTokenUsers.length === 0) {
    return null;
  }

  // Show loading spinner while data is being fetched
  if (loading || globalXpLoading) {
    return (
      <div className="container mx-auto space-y-4 mt-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛡️</span>
            <h2 className="text-2xl font-bold">Streak Protection Active</h2>
          </div>
        </div>
        <div className="flex justify-center items-center h-32">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-4 mt-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <h2 className="text-2xl font-bold">
            Streak Protection Active
          </h2>
        </div>
        <p className="text-sm text-base-content/70 text-center max-w-2xl">
          {shieldTokenUsers.length} {shieldTokenUsers.length === 1 ? 'player has' : 'players have'} used shield tokens to protect their streaks this week
        </p>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Grid View */}
      {view === 'card' && (
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 justify-items-center place-items-center">
            {shieldTokenUsers.map((shieldUser) => {
              const streakModifier = stats[shieldUser.player.id].currentStreak * 0.1;
              const bonusModifier = stats[shieldUser.player.id].activeBonuses * 0.1;
              const penaltyModifier = stats[shieldUser.player.id].activePenalties * -0.1;
              const unpaidGamesModifier = stats[shieldUser.player.id].unpaidGamesModifier;

              return (
                <motion.div
                  key={shieldUser.player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlayerCard
                    id={shieldUser.player.id}
                    friendlyName={shieldUser.player.friendly_name}
                    xp={playerStats[shieldUser.player.id]?.xp || 0}
                    caps={playerStats[shieldUser.player.id]?.caps || 0}
                    activeBonuses={stats[shieldUser.player.id].activeBonuses}
                    activePenalties={stats[shieldUser.player.id].activePenalties}
                    winRate={playerStats[shieldUser.player.id]?.winRate || 0}
                    currentStreak={playerStats[shieldUser.player.id]?.currentStreak || 0}
                    maxStreak={playerStats[shieldUser.player.id]?.maxStreak || 0}
                    benchWarmerStreak={playerStats[shieldUser.player.id]?.benchWarmerStreak || 0}
                    rarity={playerStats[shieldUser.player.id]?.rarity || 'Amateur'}
                    avatarSvg={shieldUser.player.avatar_svg || ''}
                    status="shield_protected"
                    wins={playerStats[shieldUser.player.id]?.wins || 0}
                    draws={playerStats[shieldUser.player.id]?.draws || 0}
                    losses={playerStats[shieldUser.player.id]?.losses || 0}
                    totalGames={playerStats[shieldUser.player.id]?.totalGames || 0}
                    rank={playerStats[shieldUser.player.id]?.xp > 0 ? playerStats[shieldUser.player.id]?.rank : undefined}
                    unpaidGames={playerStats[shieldUser.player.id]?.unpaidGames || 0}
                    unpaidGamesModifier={unpaidGamesModifier}
                    whatsapp_group_member={shieldUser.player.whatsapp_group_member}
                    shieldActive={true}
                    protectedStreakValue={shieldUser.protected_streak_value ?? shieldUser.frozen_streak_value}
                    averagedPlaystyle={playerStats[shieldUser.player.id]?.averagedPlaystyle}
                    playstyleMatchDistance={playerStats[shieldUser.player.id]?.playstyleMatchDistance}
                    playstyleCategory={playerStats[shieldUser.player.id]?.playstyleCategory}
                    playstyleRatingsCount={playerStats[shieldUser.player.id]?.playstyleRatingsCount}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Player</th>
                <th>Natural Streak</th>
                <th>Protected Streak</th>
                <th>Total XP Bonus</th>
                <th>Used At</th>
              </tr>
            </thead>
            <tbody>
              {shieldTokenUsers.map((shieldUser) => {
                const protectedValue = shieldUser.protected_streak_value ?? shieldUser.frozen_streak_value ?? 0;
                const currentStreak = playerStats[shieldUser.player.id]?.currentStreak || 0;
                const decayingBonus = Math.max(0, protectedValue - currentStreak);
                const effectiveStreak = Math.max(currentStreak, decayingBonus);

                return (
                  <tr key={shieldUser.player.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🛡️</span>
                        <span className="font-semibold">{shieldUser.player.friendly_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-ghost">
                        {currentStreak} {currentStreak === 1 ? 'game' : 'games'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-warning">
                        {protectedValue} {protectedValue === 1 ? 'game' : 'games'}
                      </span>
                    </td>
                    <td>
                      <span className="text-success font-semibold">
                        +{effectiveStreak * 10}%
                      </span>
                    </td>
                    <td className="text-sm text-base-content/60">
                      {new Date(shieldUser.used_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
