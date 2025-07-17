import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';

interface TierDistributionVisualProps {
  data: ParsedDebugData;
}

// Separate component for each tier to isolate animations
const TierItem: React.FC<{
  tier: any;
  index: number;
  color: string;
  widthPercentage: number;
  maxCount: number;
  forceExpanded?: boolean;
  forceCollapsed?: boolean;
  onExpandChange?: (tierNumber: number, expanded: boolean) => void;
}> = React.memo(({ tier, index, color, widthPercentage, forceExpanded, forceCollapsed, onExpandChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (forceExpanded !== undefined && forceExpanded !== isExpanded) {
      setIsExpanded(forceExpanded);
    }
    if (forceCollapsed !== undefined && !forceCollapsed && isExpanded) {
      setIsExpanded(false);
    }
  }, [forceExpanded, forceCollapsed]);

  return (
    <div className="flex flex-col items-center w-full">
      <motion.div
        className="relative cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onExpandChange?.(tier.tier, !isExpanded);
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className={`
            h-16 flex items-center justify-center rounded-lg shadow-lg transition-all duration-300
            ${isExpanded ? 'ring-4 ring-opacity-50' : ''}
          `}
          style={{
            backgroundColor: color,
            width: `${Math.max(widthPercentage, 30)}%`,
            minWidth: '200px',
            maxWidth: '600px',
            ringColor: color
          }}
        >
          <div className="text-white font-bold text-lg">
            Tier {tier.tier}
          </div>
          <div className="absolute right-4 text-white text-sm">
            {tier.count} players
          </div>
        </div>
        
        {/* Rating range */}
        <div className="text-center mt-1 text-sm text-gray-500">
          {tier.minRating.toFixed(1)} - {tier.maxRating.toFixed(1)}
        </div>
      </motion.div>
      
      {/* Player details for this specific tier */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl mt-4 overflow-hidden"
          >
            <div className="p-4 bg-base-200 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {tier.players.map((player: any) => (
                  <div
                    key={player.name}
                    className="bg-base-100 p-2 rounded text-sm"
                  >
                    <div className="font-medium">{player.name}</div>
                    <div className="text-xs text-gray-500">Rating: {player.rating.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const TierDistributionVisual: React.FC<TierDistributionVisualProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'pyramid' | 'distribution' | 'skills'>('pyramid');
  const [expandAllState, setExpandAllState] = useState<'none' | 'expand' | 'collapse'>('none');

  // Prepare tier data for visualizations
  const tierStats = useMemo(() => {
    return data.tierData.map(tier => ({
      tier: tier.tierNumber,
      count: tier.players.length,
      minRating: tier.skillRange.min,
      maxRating: tier.skillRange.max,
      avgRating: tier.players.reduce((sum, p) => sum + p.rating, 0) / tier.players.length,
      players: tier.players
    }));
  }, [data]);

  // Colors for tiers
  const tierColors = ['#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'];

  // Pyramid visualization
  const PyramidView = () => {
    const maxCount = Math.max(...tierStats.map(t => t.count));
    
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="flex gap-2 mb-4">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setExpandAllState('expand')}
          >
            Expand All
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setExpandAllState('collapse')}
          >
            Collapse All
          </button>
        </div>
        {tierStats.map((tier, index) => {
          const widthPercentage = (tier.count / maxCount) * 100;
          
          return (
            <TierItem
              key={tier.tier}
              tier={tier}
              index={index}
              color={tierColors[index]}
              widthPercentage={widthPercentage}
              maxCount={maxCount}
              forceExpanded={expandAllState === 'expand' ? true : undefined}
              forceCollapsed={expandAllState === 'collapse' ? true : undefined}
              onExpandChange={() => setExpandAllState('none')}
            />
          );
        })}
        
        <div className="text-center mt-4 text-sm text-gray-500">
          <p>Click on a tier to see player details</p>
        </div>
      </div>
    );
  };

  // Distribution chart
  const DistributionView = () => {
    const distributionData = tierStats.map(tier => ({
      name: `Tier ${tier.tier}`,
      players: tier.count,
      avgRating: tier.avgRating
    }));

    return (
      <div className="space-y-6">
        {/* Bar chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="players" name="Players">
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={tierColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart for team composition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2 text-center">Player Distribution</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    dataKey="players"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({value}) => `${value}`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={tierColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-center">Average Ratings by Tier</h4>
            <div className="space-y-2 px-4">
              {tierStats.map((tier, index) => (
                <div key={tier.tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: tierColors[index] }}
                    />
                    <span>Tier {tier.tier}</span>
                  </div>
                  <span className="font-medium">{tier.avgRating.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Skills range visualization
  const SkillsRangeView = () => {
    return (
      <div className="space-y-4">
        {tierStats.map((tier, index) => (
          <div key={tier.tier} className="bg-base-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: tierColors[index] }}
                />
                Tier {tier.tier}
              </h4>
              <span className="text-sm text-gray-500">
                {tier.count} players • {tier.minRating.toFixed(1)} - {tier.maxRating.toFixed(1)}
              </span>
            </div>

            {/* Player list with ratings */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {tier.players.map((player, playerIndex) => (
                <motion.div
                  key={player.name}
                  className="bg-base-100 p-2 rounded text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: playerIndex * 0.02 }}
                >
                  <div className="font-medium truncate">{player.name}</div>
                  <div className="text-xs text-gray-500">{player.rating.toFixed(2)}</div>
                </motion.div>
              ))}
            </div>

            {/* Visual range bar */}
            <div className="mt-3 relative h-2 bg-base-300 rounded-full overflow-hidden">
              <motion.div
                className="absolute h-full rounded-full"
                style={{ backgroundColor: tierColors[index] }}
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((tier.maxRating - tier.minRating) / 5) * 100}%`,
                  left: `${((tier.minRating - 4) / 5) * 100}%`
                }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-100 rounded-lg shadow-lg p-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold mb-4 md:mb-0">Tier Distribution</h2>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${viewMode === 'pyramid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('pyramid')}
          >
            Pyramid
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'distribution' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('distribution')}
          >
            Charts
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'skills' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('skills')}
          >
            Details
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'pyramid' && (
          <motion.div
            key="pyramid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PyramidView />
          </motion.div>
        )}

        {viewMode === 'distribution' && (
          <motion.div
            key="distribution"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DistributionView />
          </motion.div>
        )}

        {viewMode === 'skills' && (
          <motion.div
            key="skills"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SkillsRangeView />
          </motion.div>
        )}
      </AnimatePresence>


      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">Total Tiers</div>
          <div className="stat-value text-xl">{data.executiveSummary.tierCount}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">Tier Sizes</div>
          <div className="stat-value text-xl">{data.executiveSummary.tierSizes}</div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">Largest Tier</div>
          <div className="stat-value text-xl">
            Tier {tierStats.reduce((max, t) => t.count > max.count ? t : max).tier}
          </div>
        </div>
        <div className="stat bg-base-200 rounded-lg p-3">
          <div className="stat-title text-xs">Rating Span</div>
          <div className="stat-value text-xl">
            {Math.min(...tierStats.map(t => t.minRating)).toFixed(1)} - {Math.max(...tierStats.map(t => t.maxRating)).toFixed(1)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};