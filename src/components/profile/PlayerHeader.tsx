import { motion } from 'framer-motion';
import { PlayerStats } from '../../types/player';
import { Tooltip } from '../ui/Tooltip';

interface PlayerHeaderProps {
  player: PlayerStats;
}

export const PlayerHeader = ({ player }: PlayerHeaderProps) => {
  // Calculate return bonus for tooltip
  const returnStreak = player.injury_return_streak ?? 0;
  const returnBonus = returnStreak <= 0 ? 0
    : returnStreak <= 10
      ? Math.round((returnStreak * 11 - (returnStreak * (returnStreak + 1)) / 2))
      : 55 + (returnStreak - 10);

  return (
    <motion.div
      initial={{ y: -20 }}
      animate={{ y: 0 }}
      className="bg-base-200 rounded-xl p-6 mb-8 shadow-lg"
    >
      <div className="flex items-center gap-6">
        <img
          src={player.avatar_svg || '/default-avatar.svg'}
          alt={player.friendly_name}
          className="w-24 h-24 rounded-full"
        />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{player.friendly_name}</h1>
            {player.injury_token_active && (
              <Tooltip content={`Injured during WNF. Will return with ${returnStreak}-game streak (+${returnBonus}% bonus)`}>
                <span className="badge badge-warning gap-1">
                  <span>🩹</span>
                  <span>Injured</span>
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
