import { motion } from 'framer-motion';
import { PlayerStats } from '../../types/player';

interface PlayerHeaderProps {
  player: PlayerStats;
}

export const PlayerHeader = ({ player }: PlayerHeaderProps) => {
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
          <h1 className="text-3xl font-bold">{player.friendly_name}</h1>
        </div>
      </div>
    </motion.div>
  );
};
