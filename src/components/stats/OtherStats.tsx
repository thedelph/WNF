import { motion } from 'framer-motion';
import { ShirtIcon, Heart, Star } from 'lucide-react';
import { AwardCard } from './AwardCard';
import { StatsCard } from './StatsCard';
import { Stats, TeamColorStats, BestBuddies } from '../../hooks/useStats';

// Props interface for the OtherStats component
interface OtherStatsProps {
  stats: Stats;
}

/**
 * OtherStats component - Displays miscellaneous statistics
 * 
 * Includes:
 * - Lucky Bib Colour
 * - Best Buddies
 * - Blue Team Specialists
 * - Orange Team Specialists
 * 
 * @param stats - The stats object from useStats hook
 */
export const OtherStats = ({ stats }: OtherStatsProps) => {
  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {/* Lucky Bib Colour */}
      <StatsCard
        title="Lucky Bib Colour"
        value={stats.luckyBibColor.color.toUpperCase()}
        description={`${stats.luckyBibColor.winRate.toFixed(1)}% Win Rate`}
        color={stats.luckyBibColor.color as 'blue' | 'orange'}
        icon={<ShirtIcon className="w-6 h-6" />}
      />

      {/* Best Buddies */}
      <AwardCard
        title="Best Buddies"
        winners={stats.bestBuddies.map((buddy: BestBuddies) => ({
          id: `${buddy.id}-${buddy.buddyId}`,
          name: `${buddy.friendlyName} & ${buddy.buddyFriendlyName}`,
          value: `${buddy.gamesTogether} games`
        }))}
        icon={<Heart className="w-6 h-6" />}
        color="pink"
        description="Players who have been on the same team most often"
      />

      {/* Team Color Frequency - Blue */}
      <AwardCard
        title="Blue Team Specialists"
        winners={stats.teamColorFrequency.blue.map((player: TeamColorStats) => ({
          name: player.friendlyName,
          value: `${(player.teamFrequency * 100).toFixed(1)}%`,
          id: player.id
        }))}
        description="Players with 10+ caps who play most often on blue team"
        icon={<Star className="w-6 h-6" />}
        color="blue"
      />

      {/* Team Color Frequency - Orange */}
      <AwardCard
        title="Orange Team Specialists"
        winners={stats.teamColorFrequency.orange.map((player: TeamColorStats) => ({
          name: player.friendlyName,
          value: `${(player.teamFrequency * 100).toFixed(1)}%`,
          id: player.id
        }))}
        description="Players with 10+ caps who play most often on orange team"
        icon={<Star className="w-6 h-6" />}
        color="orange"
      />
    </motion.div>
  );
};
