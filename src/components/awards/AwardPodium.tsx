/**
 * AwardPodium component - displays top 3 winners in a clean list format
 * Design: Matches AwardCard.tsx pattern with emoji medals and white text
 *
 * For live "All Time" awards, shows W/D/L breakdown when available
 */

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Award, AwardCategoryConfig, LiveAward } from '../../types/awards';
import { toUrlFriendly } from '../../utils/urlHelpers';

// Type guard to check if award has extended stats
const hasExtendedStats = (award: Award): award is LiveAward => {
  return 'wins' in award || 'gamesTogether' in award || 'gamesAgainst' in award || 'achievedDate' in award;
};

// Date formatter
const formatDate = (dateStr: string) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(dateStr));
};

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

        // Determine if this is a multi-player award (pair or trio)
        const isMultiPlayer = config.isPairAward || config.isTrioAward;

        return (
          <motion.div
            key={award.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="py-1"
          >
            {/* Responsive layout: stack on mobile for multi-player awards, horizontal on desktop */}
            <div className={`flex ${isMultiPlayer ? 'flex-col sm:flex-row sm:justify-between sm:items-center' : 'justify-between items-center'} gap-1 sm:gap-2`}>
              {/* Player name with medal */}
              <div className={`flex items-start sm:items-center gap-2 min-w-0 ${isMultiPlayer ? 'w-full sm:max-w-[65%]' : 'flex-1 max-w-[60%]'}`}>
                <span className="w-6 h-6 flex-shrink-0 text-lg">{medal}</span>
                <span className={`drop-shadow-[0_0_1px_rgba(0,0,0,0.5)] leading-tight ${isMultiPlayer ? 'break-words' : 'truncate block'}`}>
                  <Link to={playerUrl} className="hover:underline font-medium">
                    {award.playerName}
                  </Link>
                  {config.isPairAward && award.partnerName && (
                    <span className="opacity-90">
                      {/* Use "vs" for rivalries, "&" for partnerships */}
                      {config.id === 'fiercest_rivalry' ? ' vs ' : ' & '}
                      <Link
                        to={`/player/${toUrlFriendly(award.partnerName)}`}
                        className="hover:underline"
                      >
                        {award.partnerName}
                      </Link>
                    </span>
                  )}
                  {config.isTrioAward && award.partnerName && award.partner2Name && (
                    <span className="opacity-90">
                      {', '}
                      <Link
                        to={`/player/${toUrlFriendly(award.partnerName)}`}
                        className="hover:underline"
                      >
                        {award.partnerName}
                      </Link>
                      {' & '}
                      <Link
                        to={`/player/${toUrlFriendly(award.partner2Name)}`}
                        className="hover:underline"
                      >
                        {award.partner2Name}
                      </Link>
                    </span>
                  )}
                </span>
              </div>
              {/* Value display - indented on mobile for multi-player, right-aligned on desktop */}
              <div className={`flex flex-col ${isMultiPlayer ? 'items-start pl-8 sm:pl-0 sm:items-end' : 'items-end'} text-right flex-shrink-0 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]`}>
                <span className="text-sm opacity-90 font-medium">
                  {config.valueFormatter(award.value)}
                </span>
                {/* Show W/D/L details for live awards */}
                {hasExtendedStats(award) && (
                  <>
                    {/* Chemistry/Trio awards (best & cursed): W D L · games · win% */}
                    {(config.id === 'dynamic_duo' || config.id === 'dream_team_trio' ||
                      config.id === 'cursed_duos' || config.id === 'cursed_trio') &&
                      award.wins !== undefined && (
                        <div className="text-xs opacity-70">
                          {award.wins}W {award.draws}D {award.losses}L · {award.gamesTogether} games · {award.winPercentage?.toFixed(0)}%
                        </div>
                      )}
                    {/* Rivalry awards: W D L · games · win% */}
                    {config.id === 'fiercest_rivalry' &&
                      award.wins !== undefined && (
                        <div className="text-xs opacity-70">
                          {award.wins}W {award.draws}D {award.losses}L · {award.gamesAgainst} games · {award.winPercentage?.toFixed(0)}%
                        </div>
                      )}
                    {/* Win rate awards: W D L · games */}
                    {config.id === 'win_rate_leader' &&
                      award.wins !== undefined && (
                        <div className="text-xs opacity-70">
                          {award.wins}W {award.draws}D {award.losses}L · {award.gamesTogether} games
                        </div>
                      )}
                    {/* XP Champion: show achieved date */}
                    {config.id === 'xp_champion' && award.achievedDate && (
                      <div className="text-xs opacity-70">
                        {formatDate(award.achievedDate)}
                      </div>
                    )}
                    {/* Best buddies: just games count (already in value) */}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AwardPodium;
