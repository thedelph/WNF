import React from 'react';
import { motion } from 'framer-motion';
import { PlayerCard } from '../player-card/PlayerCard';
import { Registration } from '../../types/playerSelection';

interface RegisteredPlayerGridProps {
  registrations: Registration[];
  playerStats: Record<string, any>;
  stats: Record<string, any>;
}

/**
 * Grid component for displaying registered player cards
 * Handles layout and animation of player cards
 */
export const RegisteredPlayerGrid: React.FC<RegisteredPlayerGridProps> = ({
  registrations,
  playerStats,
  stats,
}) => {
  // Sort players: Priority Token users first (by XP), then remaining players by XP
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const aXp = playerStats[a.player.id]?.xp || 0;
    const bXp = playerStats[b.player.id]?.xp || 0;
    
    // If both players are using tokens or neither is, sort by XP
    if (a.using_token === b.using_token) {
      return bXp - aXp;
    }
    
    // If only one player is using a token, they come first
    return a.using_token ? -1 : 1;
  });

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 justify-items-center place-items-center">
        {sortedRegistrations.map((registration) => {
          const streakModifier = stats[registration.player.id].currentStreak * 0.1;
          const bonusModifier = stats[registration.player.id].activeBonuses * 0.1;
          const penaltyModifier = stats[registration.player.id].activePenalties * -0.1;
          // Use 0.025 (2.5%) for registration streak modifier
          const registrationModifier = stats[registration.player.id].registrationStreakApplies ? stats[registration.player.id].registrationStreak * 0.025 : 0;
          // Only apply unpaid games modifier if player hasn't dropped out
          const isDroppedOut = registration.status === 'dropped_out';
          const unpaidGamesModifier = isDroppedOut ? 0 : stats[registration.player.id].unpaidGamesModifier;

          return (
            <motion.div
              key={registration.player.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PlayerCard
                id={registration.player.id}
                friendlyName={registration.player.friendly_name}
                xp={playerStats[registration.player.id]?.xp || 0}
                caps={playerStats[registration.player.id]?.caps || 0}
                activeBonuses={stats[registration.player.id].activeBonuses}
                activePenalties={stats[registration.player.id].activePenalties}
                winRate={playerStats[registration.player.id]?.winRate || 0}
                currentStreak={playerStats[registration.player.id]?.currentStreak || 0}
                maxStreak={playerStats[registration.player.id]?.maxStreak || 0}
                benchWarmerStreak={playerStats[registration.player.id]?.benchWarmerStreak || 0}
                rarity={playerStats[registration.player.id]?.rarity || 'Amateur'}
                avatarSvg={registration.player.avatar_svg || ''}
                status={registration.status}
                wins={playerStats[registration.player.id]?.wins || 0}
                draws={playerStats[registration.player.id]?.draws || 0}
                losses={playerStats[registration.player.id]?.losses || 0}
                totalGames={playerStats[registration.player.id]?.totalGames || 0}
                // Only pass rank if player has XP > 0 (not Retired)
                rank={playerStats[registration.player.id]?.xp > 0 ? playerStats[registration.player.id]?.rank : undefined}
                unpaidGames={isDroppedOut ? 0 : playerStats[registration.player.id]?.unpaidGames || 0}
                unpaidGamesModifier={unpaidGamesModifier}
                registrationStreakBonus={stats[registration.player.id].registrationStreak}
                registrationStreakBonusApplies={stats[registration.player.id].registrationStreakApplies}
                whatsapp_group_member={registration.player.whatsapp_group_member}
                usingToken={registration.using_token}
                averagedPlaystyle={playerStats[registration.player.id]?.averagedPlaystyle}
                playstyleMatchDistance={playerStats[registration.player.id]?.playstyleMatchDistance}
                playstyleCategory={playerStats[registration.player.id]?.playstyleCategory}
                playstyleRatingsCount={playerStats[registration.player.id]?.playstyleRatingsCount}
                recentGames={playerStats[registration.player.id]?.recentGames || 0}
                gameParticipation={playerStats[registration.player.id]?.gameParticipation || new Array(40).fill(null)}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
