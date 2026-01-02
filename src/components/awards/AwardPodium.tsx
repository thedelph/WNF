/**
 * AwardPodium component - displays top 3 winners in a clean list format
 * Design: Matches AwardCard.tsx pattern with emoji medals and white text
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Award, AwardCategoryConfig } from '../../types/awards';
import { toUrlFriendly } from '../../utils/urlHelpers';

interface AwardPodiumProps {
  awards: Award[];
  config: AwardCategoryConfig;
}

const medals = ['🥇', '🥈', '🥉'];

const getMedalForType = (type: 'gold' | 'silver' | 'bronze'): string => {
  switch (type) {
    case 'gold': return medals[0];
    case 'silver': return medals[1];
    case 'bronze': return medals[2];
  }
};

export const AwardPodium = ({ awards, config }: AwardPodiumProps) => {
  // Sort awards: gold first, then silver, then bronze
  const sortedAwards = [...awards].sort((a, b) => {
    const order = { gold: 0, silver: 1, bronze: 2 };
    return order[a.medalType] - order[b.medalType];
  });

  return (
    <div className="space-y-1">
      {sortedAwards.map((award, index) => {
        const playerUrl = `/player/${toUrlFriendly(award.playerName)}`;
        const medal = getMedalForType(award.medalType);

        return (
          <motion.div
            key={award.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex justify-between items-center gap-2">
              {/* Player name with medal - left side */}
              <div className="flex items-center gap-2 min-w-0 flex-shrink flex-grow overflow-hidden max-w-[60%]">
                <span className="w-6 h-6 flex-shrink-0 text-lg">{medal}</span>
                <Link
                  to={playerUrl}
                  className="drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] truncate block hover:underline"
                >
                  {award.playerName}
                  {config.isPairAward && award.partnerName && (
                    <span className="opacity-80"> & {award.partnerName}</span>
                  )}
                </Link>
              </div>
              {/* Value display - right side */}
              <div className="flex-shrink-0 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] text-right text-sm opacity-90">
                {config.valueFormatter(award.value)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AwardPodium;
