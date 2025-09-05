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
      category: string; 
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
              category: rating.playstyle.category,
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
    
    // Group by category
    const byCategory = {
      attacking: sortedStats.filter(s => s.category === 'attacking'),
      midfield: sortedStats.filter(s => s.category === 'midfield'),
      defensive: sortedStats.filter(s => s.category === 'defensive')
    };
    
    return {
      total: totalRatingsWithPlaystyle,
      topPlaystyles: sortedStats.slice(0, 5),
      byCategory,
      categories: {
        attacking: byCategory.attacking.reduce((sum, s) => sum + s.count, 0),
        midfield: byCategory.midfield.reduce((sum, s) => sum + s.count, 0),
        defensive: byCategory.defensive.reduce((sum, s) => sum + s.count, 0)
      }
    };
  }, [players]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'attacking': return 'badge-error';
      case 'midfield': return 'badge-warning';
      case 'defensive': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

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
            {/* Category Overview */}
            <div>
              <h4 className="font-semibold text-sm mb-2">By Category</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-base-300 rounded">
                  <div className="text-2xl font-bold text-error">
                    {stats.categories.attacking}
                  </div>
                  <div className="text-xs">Attacking</div>
                </div>
                <div className="text-center p-2 bg-base-300 rounded">
                  <div className="text-2xl font-bold text-warning">
                    {stats.categories.midfield}
                  </div>
                  <div className="text-xs">Midfield</div>
                </div>
                <div className="text-center p-2 bg-base-300 rounded">
                  <div className="text-2xl font-bold text-info">
                    {stats.categories.defensive}
                  </div>
                  <div className="text-xs">Defensive</div>
                </div>
              </div>
            </div>

            {/* Top 5 Playstyles */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Most Common Playstyles</h4>
              <div className="space-y-2">
                {stats.topPlaystyles.map((style, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/60 text-xs w-4">
                        {index + 1}.
                      </span>
                      <span className="text-sm">{style.name}</span>
                      <span className={`badge badge-xs ${getCategoryColor(style.category)}`}>
                        {style.category}
                      </span>
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