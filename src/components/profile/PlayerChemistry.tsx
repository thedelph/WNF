import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, Trophy, TrendingUp } from 'lucide-react';
import { ChemistryStats, ChemistryPartner, CHEMISTRY_MIN_GAMES } from '../../types/chemistry';
import { toUrlFriendly } from '../../utils/urlHelpers';
import { Tooltip } from '../ui/Tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// Chemistry messages organized by performance tier (adjusted for realistic WNF data)
// Distribution: 80%+ (0.6%), 70-80% (6%), 60-70% (17%), 50-60% (28%), 40-50% (30%), 30-40% (14%), <30% (4%)
const chemistryMessages = {
  legendary: [ // 80%+ (only 1 pair ever achieved this!)
    "Xavi & Iniesta vibes! You two are basically telepathic.",
    "The stuff of legend! Someone call Sky Sports.",
    "Better chemistry than Messi & Suarez. Don't @ us.",
    "When you two play together, the opposition just vibes.",
    "Scientists are studying your connection as we speak.",
    "You could win the World Cup together. Probably.",
    "This is the best partnership in WNF history. Literally.",
  ],
  elite: [ // 70-80% (top ~7% of pairs)
    "Rio & Vidic energy - an absolute brick wall together!",
    "Peak Drogba & Lampard partnership vibes.",
    "Like Salah & TAA - the connection is unreal.",
    "Manager's dream duo. The scouting team is watching.",
    "You two move like you share a brain cell. In a good way.",
    "Opposition managers are drawing up plans just for you two.",
    "You two link up like prime Thierry & Bergkamp!",
    "Proper Keane & Scholes midfield dominance.",
  ],
  excellent: [ // 60-70% (top ~23% of pairs)
    "The Terry & Lampard special - leaders on the pitch.",
    "Winning is just what you do together. Simple as.",
    "Like a fine wine, this partnership just works.",
    "You'd walk into most Sunday league teams. Together.",
    "A partnership that just clicks. Keep it going!",
    "The manager puts you two together for a reason.",
  ],
  good: [ // 50-60% (middle of the pack)
    "Solid partnership - like Carrick & Fletcher. Underrated but effective.",
    "A dependable duo. Like Henderson & Milner, gets the job done.",
    "Not flashy, but you're quietly racking up the wins.",
    "The manager knows they can count on you two.",
    "Consistent partnership. Contract extension incoming.",
    "You won't make the highlight reel, but you'll make the points.",
    "A bread and butter partnership. Nothing wrong with that.",
  ],
  average: [ // 40-50% (most common tier)
    "Work in progress... even Gerrard & Lampard needed time.",
    "Some teething problems but the potential is there.",
    "Like England at tournaments - promising but needs work.",
    "The chemistry lab is still cooking. Give it time.",
    "Not quite clicking yet, but Rome wasn't built in a day.",
    "Early days. Even the Class of 92 had to start somewhere.",
    "Perfectly balanced, as all things should be. Literally 50/50.",
    "The definition of 'could go either way'.",
  ],
  belowAverage: [ // 30-40%
    "Drawing specialists! At least you're not losing... much.",
    "Specialists in the art of the stalemate.",
    "You've mastered the 'take a point and move on' strategy.",
    "Greece Euro 2004 vibes - ugly but sometimes effective?",
    "The beautiful game? More like the beige game.",
    "Mourinho would be proud of these defensive results.",
    "Results not great, but you're still in the game!",
  ],
  poor: [ // 20-30%
    "Giving Mustafi & Luiz a run for their money here.",
    "Like Balotelli at Liverpool - it's just not happening.",
    "The vibes are off. Very off.",
    "Have you tried communicating? Maybe in any language?",
    "This partnership is giving 'last minute January loan' energy.",
    "Even Ted Lasso couldn't fix this chemistry.",
    "Maybe stick to playing on opposite teams?",
  ],
  terrible: [ // <20% (only 3 pairs this bad!)
    "Like oil and water. Definitely try opposite teams.",
    "Plot twist: you're secretly working for the other team.",
    "Genuinely impressive how bad this is. A reverse masterclass.",
    "The opposition sends thank you cards when you two play together.",
    "This partnership is sponsored by the other team's goal difference.",
    "Historic levels of incompatibility. Scientists are baffled.",
  ],
};

// Get color class based on performance rate
const getColorClass = (rate: number): string => {
  if (rate >= 60) return 'text-success';
  if (rate >= 40) return 'text-info';
  if (rate >= 30) return 'text-warning';
  return 'text-error';
};

// Get tier based on performance rate (adjusted for realistic WNF data)
const getTier = (rate: number): keyof typeof chemistryMessages => {
  if (rate >= 80) return 'legendary';
  if (rate >= 70) return 'elite';
  if (rate >= 60) return 'excellent';
  if (rate >= 50) return 'good';
  if (rate >= 40) return 'average';
  if (rate >= 30) return 'belowAverage';
  if (rate >= 20) return 'poor';
  return 'terrible';
};

// Component to display chemistry message
const ChemistryMessage: React.FC<{ performanceRate: number }> = ({ performanceRate }) => {
  const message = useMemo(() => {
    const tier = getTier(performanceRate);
    const messages = chemistryMessages[tier];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [performanceRate]);

  const colorClass = getColorClass(performanceRate);

  return <span className={colorClass}>{message}</span>;
};

interface PairChemistryCardProps {
  /** Chemistry stats between two players */
  chemistry: ChemistryStats | null;
  /** Name of the other player */
  playerName: string;
  /** Games until chemistry threshold is met */
  gamesUntilChemistry: number;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Card showing chemistry between the current user and viewed player
 */
export const PairChemistryCard: React.FC<PairChemistryCardProps> = ({
  chemistry,
  playerName,
  gamesUntilChemistry,
  loading = false,
}) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="card-title text-lg">Your Chemistry with {playerName}</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Not enough games together
  if (!chemistry || chemistry.gamesTogether < CHEMISTRY_MIN_GAMES) {
    const gamesPlayed = chemistry?.gamesTogether ?? 0;
    const gamesNeeded = gamesUntilChemistry > 0 ? gamesUntilChemistry : CHEMISTRY_MIN_GAMES - gamesPlayed;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="card-title text-lg">Your Chemistry with {playerName}</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-base-content/70 mb-2">
              {gamesPlayed > 0 ? (
                <>Played <strong>{gamesPlayed}</strong> game{gamesPlayed !== 1 ? 's' : ''} together on the same team</>
              ) : (
                <>You haven&apos;t played together on the same team yet</>
              )}
            </p>
            <p className="text-sm text-base-content/50">
              Play <strong>{gamesNeeded}</strong> more game{gamesNeeded !== 1 ? 's' : ''} together to unlock chemistry stats
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show chemistry stats
  const { winsTogether, drawsTogether, lossesTogether, gamesTogether, performanceRate, chemistryScore } = chemistry;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="card-title text-lg">Your Chemistry with {playerName}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Record */}
          <div className="text-center">
            <div className="text-sm text-base-content/70 mb-1">Record</div>
            <div className="font-bold text-lg">
              <span className="text-success">{winsTogether}W</span>
              {' '}
              <span className="text-warning">{drawsTogether}D</span>
              {' '}
              <span className="text-error">{lossesTogether}L</span>
            </div>
            <div className="text-xs text-base-content/50">({gamesTogether} games)</div>
          </div>

          {/* Performance Rate */}
          <TooltipPrimitive.Provider>
            <Tooltip content={`Performance rate: Points earned as % of maximum possible (W=3pts, D=1pt, L=0pts)`}>
              <div className="text-center cursor-help">
                <div className="text-sm text-base-content/70 mb-1">Performance</div>
                <div className="font-bold text-lg text-primary">{performanceRate.toFixed(1)}%</div>
                <div className="text-xs text-base-content/50">Chemistry: {chemistryScore.toFixed(1)}</div>
              </div>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>

        {/* Performance message */}
        <div className="mt-4 text-center text-sm">
          <ChemistryMessage performanceRate={performanceRate} />
        </div>
      </div>
    </motion.div>
  );
};

interface TopChemistryPartnersProps {
  /** Top chemistry partners */
  partners: ChemistryPartner[];
  /** Whether data is loading */
  loading?: boolean;
  /** Title for the section */
  title?: string;
}

/**
 * Card showing top chemistry partners for a player
 */
export const TopChemistryPartners: React.FC<TopChemistryPartnersProps> = ({
  partners,
  loading = false,
  title = 'Top Chemistry Partners',
}) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="card-title text-lg">{title}</h3>
          </div>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (partners.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="card-title text-lg">{title}</h3>
          </div>
          <p className="text-center text-base-content/70 py-4">
            No chemistry partners yet. Play at least {CHEMISTRY_MIN_GAMES} games with someone to see chemistry stats.
          </p>
        </div>
      </motion.div>
    );
  }

  const medals = ['text-yellow-500', 'text-base-content/60', 'text-amber-600'];
  const medalIcons = ['1st', '2nd', '3rd'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-100 shadow-xl"
    >
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="card-title text-lg">{title}</h3>
        </div>

        {/* Column headers */}
        <div className="flex items-center justify-between p-3 text-xs text-base-content/60 border-b border-base-300 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-8"></div>
            <span>Player</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:block">Record</span>
            <span className="font-bold">Perf | Score</span>
          </div>
        </div>

        <div className="space-y-3">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.partnerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <div className={`font-bold text-sm w-8 ${medals[index] || 'text-base-content/50'}`}>
                  {medalIcons[index] || `${index + 1}th`}
                </div>

                {/* Partner name */}
                <Link
                  to={`/player/${toUrlFriendly(partner.partnerName)}`}
                  className="font-medium hover:text-primary transition-colors"
                >
                  {partner.partnerName}
                </Link>
              </div>

              <div className="flex items-center gap-4 text-sm">
                {/* W/D/L Record with games count */}
                <div className="hidden sm:block">
                  <span className="text-success">{partner.winsTogether}W</span>
                  {' '}
                  <span className="text-warning">{partner.drawsTogether}D</span>
                  {' '}
                  <span className="text-error">{partner.lossesTogether}L</span>
                  {' '}
                  <span className="text-base-content/50">({partner.gamesTogether})</span>
                </div>

                {/* Performance rate and chemistry score */}
                <div className="font-bold text-primary">
                  {partner.performanceRate.toFixed(1)}% | {partner.chemistryScore.toFixed(1)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-xs text-base-content/50 text-center">
          <TooltipPrimitive.Provider>
            <Tooltip content="Chemistry score factors in both win rate and sample size. Larger samples carry more weight.">
              <span className="cursor-help flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Ranked by chemistry score (min. {CHEMISTRY_MIN_GAMES} games)
              </span>
            </Tooltip>
          </TooltipPrimitive.Provider>
        </div>
      </div>
    </motion.div>
  );
};

export default TopChemistryPartners;
