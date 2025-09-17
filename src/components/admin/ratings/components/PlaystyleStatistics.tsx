import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PlaystyleStats } from '../../../../types/playstyle';

interface PlaystyleStatisticsProps {
  players: Array<{
    id: string;
    friendly_name: string;
    ratings?: Array<{
      playstyle?: {
        id: string;
        name: string;
        category: 'attacking' | 'midfield' | 'defensive';
      } | null;
    }>;
    ratings_given?: Array<{
      playstyle?: {
        id: string;
        name: string;
        category: 'attacking' | 'midfield' | 'defensive';
      } | null;
    }>;
  }>;
  className?: string;
}

export const PlaystyleStatistics: React.FC<PlaystyleStatisticsProps> = ({ 
  players, 
  className = '' 
}) => {
  // Calculate playstyle statistics
  const stats = useMemo(() => {
    const playstyleCounts = new Map<string, {
      name: string;
      count: number;
    }>();

    let totalRatingsWithPlaystyle = 0;

    players.forEach(player => {
      // Check both ratings and ratings_given properties
      const ratingsToCheck = player.ratings || player.ratings_given || [];

      ratingsToCheck.forEach(rating => {
        if (rating.playstyle) {
          totalRatingsWithPlaystyle++;
          const key = rating.playstyle.id;
          if (!playstyleCounts.has(key)) {
            playstyleCounts.set(key, {
              name: rating.playstyle.name,
              count: 0
            });
          }
          const stat = playstyleCounts.get(key)!;
          stat.count++;
        }
      });
    });

    // Convert to array and sort by count
    const sortedStats = Array.from(playstyleCounts.values())
      .sort((a, b) => b.count - a.count)
      .map(stat => ({
        ...stat,
        percentage: totalRatingsWithPlaystyle > 0
          ? (stat.count / totalRatingsWithPlaystyle * 100).toFixed(1)
          : '0'
      }));

    return {
      total: totalRatingsWithPlaystyle,
      topPlaystyles: sortedStats.slice(0, 10) // Show top 10 instead of 5
    };
  }, [players]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`card bg-base-200 ${className}`}
    >
      <div className="card-body">
        <h3 className="card-title text-lg mb-4">Playstyle Distribution</h3>
        
        {stats.total === 0 ? (
          <p className="text-base-content/60 text-center py-4">
            No playstyle ratings recorded yet
          </p>
        ) : (
          <div className="space-y-4">
            {/* Top Playstyles */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Most Common Playstyles</h4>
              <div className="space-y-2">
                {stats.topPlaystyles.map((style, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/60 text-xs w-6">
                        {index + 1}.
                      </span>
                      <span className="text-sm">{style.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-base-content/60">
                        {style.count} ({style.percentage}%)
                      </span>
                      <div className="w-20 bg-base-300 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${style.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Ratings */}
            <div className="text-center pt-2 border-t border-base-300">
              <span className="text-xs text-base-content/60">
                Total ratings with playstyles: {stats.total}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};