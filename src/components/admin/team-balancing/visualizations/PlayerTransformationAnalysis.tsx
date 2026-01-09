import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label
} from 'recharts';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';
import { formatRating } from '../../../../utils/ratingFormatters';

interface PlayerTransformationAnalysisProps {
  data: ParsedDebugData;
}

interface PlayerTransformation {
  name: string;
  baseSkill: number;
  threeLayerRating: number;
  change: number;
  performanceCategory: string;
  momentum: 'hot' | 'cold' | 'steady';
  overallPerformance?: number;
  recentPerformance?: number;
  momentumScore?: number;
  overallWinRate?: number;
  recentWinRate?: number;
  overallGoalDiff?: number;
  recentGoalDiff?: number;
  playstyle?: string;
  topAttributes?: Array<{ name: string; value: number }>;
}

export const PlayerTransformationAnalysis: React.FC<PlayerTransformationAnalysisProps> = ({ data }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'scatter' | 'heatmap' | 'categories'>('scatter');
  


  // Extract transformation data from teams if not in playerTransformations
  const transformations: PlayerTransformation[] = useMemo(() => {
    // Always use team data since it has the full player objects with performance scores
    const allPlayers = [...(data.blueTeam || []), ...(data.orangeTeam || [])];


    // If we have playerTransformations, merge with team data to get performance scores
    if (data.playerTransformations && data.playerTransformations.length > 0) {
      return data.playerTransformations.map((transformedPlayer): PlayerTransformation => {
        // Find the corresponding player in team data to get performance scores
        const fullPlayer = allPlayers.find(p => p.friendly_name === transformedPlayer.name);

        if (fullPlayer) {
          const hasPerformanceData = fullPlayer.overallPerformanceScore !== undefined &&
                                    fullPlayer.recentFormScore !== undefined;

          // Get playstyle info if available
          let playstyle: string | undefined = undefined;
          let topAttributes: Array<{ name: string; value: number }> | undefined = undefined;

          if (fullPlayer.derived_attributes?.mostCommonPlaystyleId) {
            // We'll need to fetch this or pass it in
            playstyle = 'Playstyle'; // Placeholder - will be fetched
          }

          if (fullPlayer.derived_attributes) {
            const attrs = fullPlayer.derived_attributes;
            const attrArray = [
              { name: 'Pace', value: attrs.pace },
              { name: 'Shooting', value: attrs.shooting },
              { name: 'Passing', value: attrs.passing },
              { name: 'Dribbling', value: attrs.dribbling },
              { name: 'Defending', value: attrs.defending },
              { name: 'Physical', value: attrs.physical }
            ].sort((a, b) => b.value - a.value).slice(0, 2);
            topAttributes = attrArray;
          }

          return {
            ...transformedPlayer,
            // Add performance scores from full player data
            overallPerformance: hasPerformanceData ? fullPlayer.overallPerformanceScore : undefined,
            recentPerformance: hasPerformanceData ? fullPlayer.recentFormScore : undefined,
            momentumScore: hasPerformanceData ? fullPlayer.momentumScore : undefined,
            // Add raw stats if available
            overallWinRate: fullPlayer.overall_win_rate ?? undefined,
            recentWinRate: fullPlayer.win_rate ?? undefined,
            overallGoalDiff: fullPlayer.overall_goal_differential ?? undefined,
            recentGoalDiff: fullPlayer.goal_differential ?? undefined,
            // Add playstyle info
            playstyle,
            topAttributes
          };
        }

        // Return base transformation without full player data
        return {
          ...transformedPlayer,
          overallPerformance: undefined,
          recentPerformance: undefined,
          momentumScore: undefined,
          overallWinRate: undefined,
          recentWinRate: undefined,
          overallGoalDiff: undefined,
          recentGoalDiff: undefined,
          playstyle: undefined,
          topAttributes: undefined
        };
      });
    }
    
    // Fallback: create transformations from team data
    return allPlayers.map((player): PlayerTransformation => {
      // Use performance scores from tier-based algorithm
      const hasPerformanceData = player.overallPerformanceScore !== undefined &&
                                player.recentFormScore !== undefined;

      // Get playstyle info if available
      let playstyle: string | undefined = undefined;
      let topAttributes: Array<{ name: string; value: number }> | undefined = undefined;

      if (player.derived_attributes?.mostCommonPlaystyleId) {
        playstyle = 'Playstyle'; // Placeholder - will be fetched
      }

      if (player.derived_attributes) {
        const attrs = player.derived_attributes;
        const attrArray = [
          { name: 'Pace', value: attrs.pace },
          { name: 'Shooting', value: attrs.shooting },
          { name: 'Passing', value: attrs.passing },
          { name: 'Dribbling', value: attrs.dribbling },
          { name: 'Defending', value: attrs.defending },
          { name: 'Physical', value: attrs.physical }
        ].sort((a, b) => b.value - a.value).slice(0, 2);
        topAttributes = attrArray;
      }

      return {
        name: player.friendly_name,
        baseSkill: player.baseSkillRating || 0,
        threeLayerRating: player.threeLayerRating || 0,
        change: (player.threeLayerRating || 0) - (player.baseSkillRating || 0),
        performanceCategory: '',
        momentum: (player.momentumCategory as 'hot' | 'cold' | 'steady') || 'steady',
        // Store performance scores for heatmap
        overallPerformance: hasPerformanceData ? player.overallPerformanceScore : undefined,
        recentPerformance: hasPerformanceData ? player.recentFormScore : undefined,
        momentumScore: hasPerformanceData ? player.momentumScore : undefined,
        // Keep original values for display if available
        overallWinRate: player.overall_win_rate ?? undefined,
        recentWinRate: player.win_rate ?? undefined,
        overallGoalDiff: player.overall_goal_differential ?? undefined,
        recentGoalDiff: player.goal_differential ?? undefined,
        // Add playstyle info
        playstyle,
        topAttributes
      };
    });
  }, [data]);

  // Prepare scatter plot data
  const scatterData = useMemo(() => {
    const allPlayers = [...(data.blueTeam || []), ...(data.orangeTeam || [])];
    return transformations.map(player => {
      // Get GK rating from full player data
      const fullPlayer = allPlayers.find(p => p.friendly_name === player.name);
      return {
        name: player.name,
        baseSkill: player.baseSkill,
        finalRating: player.threeLayerRating,
        change: player.change,
        momentum: player.momentum,
        overallWinRate: player.overallWinRate,
        recentWinRate: player.recentWinRate,
        overallGoalDiff: player.overallGoalDiff,
        recentGoalDiff: player.recentGoalDiff,
        playstyle: player.playstyle,
        topAttributes: player.topAttributes,
        gkRating: fullPlayer?.gk_rating,
        isPermanentGK: fullPlayer?.isPermanentGK
      };
    });
  }, [transformations, data.blueTeam, data.orangeTeam]);

  // Get color for momentum
  const getMomentumColor = (momentum: 'hot' | 'cold' | 'steady') => {
    switch (momentum) {
      case 'hot': return '#ef4444'; // red
      case 'cold': return '#3b82f6'; // blue
      case 'steady': return '#eab308'; // yellow
    }
  };

  // Performance categories for pie chart
  const performanceCategories = useMemo(() => {
    const categories = {
      'Major Boost': transformations.filter(p => p.change > 0.5).length,
      'Minor Boost': transformations.filter(p => p.change > 0 && p.change <= 0.5).length,
      'Steady': transformations.filter(p => Math.abs(p.change) < 0.01).length,
      'Minor Drop': transformations.filter(p => p.change < 0 && p.change >= -0.5).length,
      'Major Drop': transformations.filter(p => p.change < -0.5).length
    };
    return Object.entries(categories).filter(([_, count]) => count > 0);
  }, [transformations]);

  // Custom tooltip for scatter plot
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-base-100 p-4 rounded-lg shadow-lg border">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-bold text-lg">{data.name}</p>
            {data.isPermanentGK && <span className="badge badge-xs badge-warning">🥅 GK</span>}
          </div>
          <div className="space-y-1 text-sm">
            <p>Base Skill: {formatRating(data.baseSkill)}</p>
            <p>Final Rating: {formatRating(data.finalRating)}</p>
            {data.gkRating !== undefined && data.gkRating !== null && (
              <p>GK Rating: {formatRating(data.gkRating)}</p>
            )}
            <p className={`font-medium ${data.change > 0 ? 'text-success' : data.change < 0 ? 'text-error' : ''}`}>
              Change: {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}
            </p>
            <div className="divider my-1"></div>
            <p>Overall: {data.overallWinRate !== undefined ? `${(data.overallWinRate <= 1 ? data.overallWinRate * 100 : data.overallWinRate).toFixed(1)}%` : 'N/A'} WR, {data.overallGoalDiff !== undefined ? `${data.overallGoalDiff > 0 ? '+' : ''}${data.overallGoalDiff}` : 'N/A'} GD</p>
            <p>Recent: {data.recentWinRate !== undefined ? `${(data.recentWinRate <= 1 ? data.recentWinRate * 100 : data.recentWinRate).toFixed(1)}%` : 'N/A'} WR, {data.recentGoalDiff !== undefined ? `${data.recentGoalDiff > 0 ? '+' : ''}${data.recentGoalDiff}` : 'N/A'} GD</p>
            <p className="flex items-center gap-1">
              Momentum: <span className="font-medium">{data.momentum}</span>
              {data.momentum === 'hot' && '🔥'}
              {data.momentum === 'cold' && '❄️'}
              {data.momentum === 'steady' && '●'}
            </p>
            {data.topAttributes && data.topAttributes.length > 0 && (
              <>
                <div className="divider my-1"></div>
                <p className="text-purple-600 font-medium">
                  Top Attributes: {data.topAttributes.map(a => `${a.name} ${(a.value * 10).toFixed(0)}`).join(', ')}
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Generate performance interpretation text
  const getPerformanceInterpretation = (overallPerf: number | null, recentForm: number | null, momentum: string): string => {
    if (overallPerf === null || recentForm === null) {
      return "New player - building stats";
    }
    
    const diff = recentForm - overallPerf;
    const absDiff = Math.abs(diff);
    
    // Perfect or near-perfect records
    if (recentForm >= 0.9) {
      return "Absolutely crushing it! 🏆";
    }
    if (overallPerf >= 0.8 && absDiff < 0.1) {
      return "Elite player stays elite 👑";
    }
    
    // Terrible records
    if (recentForm <= 0.1) {
      return "Can't buy a win right now 😓";
    }
    if (overallPerf <= 0.2 && absDiff < 0.1) {
      return "The struggle is real 💔";
    }
    
    // Check for consistency with more variety
    if (absDiff < 0.05) {
      if (overallPerf >= 0.7) return "Mr/Ms Reliable strikes again!";
      if (overallPerf >= 0.6) return "Steady Eddie delivers";
      if (overallPerf >= 0.5) return "Perfectly balanced, as all things should be";
      if (overallPerf >= 0.4) return "Consistently in the wars";
      return "Same old story every week";
    }
    
    // Major improvements (diff > 0.2)
    if (diff > 0.25) {
      if (recentForm >= 0.7) return "What a comeback story! 🚀";
      return "From zero to hero! 💪";
    }
    if (diff > 0.2) {
      return "Turned it around big time!";
    }
    
    // Moderate improvements
    if (diff > 0.15) {
      if (recentForm >= 0.65) return "Found the magic touch! ✨";
      return "Fortune favors the brave! 🍀";
    }
    if (diff > 0.1) {
      if (recentForm >= 0.6) return "On fire lately! 🔥";
      return "Things are looking up!";
    }
    if (diff > 0.05) {
      return "Starting to click into gear";
    }
    
    // Major declines (diff < -0.2)
    if (diff < -0.25) {
      if (recentForm <= 0.3) return "Wheels have fallen off 😭";
      return "From hero to zero 📉";
    }
    if (diff < -0.2) {
      return "Where did it all go wrong?";
    }
    
    // Moderate declines
    if (diff < -0.15) {
      if (recentForm <= 0.35) return "In the doldrums right now ⛈️";
      return "Hit a rough patch ❄️";
    }
    if (diff < -0.1) {
      if (recentForm <= 0.4) return "Not quite themselves lately";
      return "Lost that winning feeling";
    }
    if (diff < -0.05) {
      return "Drifting the wrong way";
    }
    
    // Special combinations
    if (overallPerf >= 0.65 && recentForm >= 0.7) {
      return "Champagne football continues! 🍾";
    }
    if (overallPerf >= 0.6 && recentForm <= 0.4) {
      return "Even the mighty fall sometimes";
    }
    if (overallPerf <= 0.4 && recentForm >= 0.6) {
      return "Phoenix rising from the ashes! 🔥";
    }
    if (overallPerf <= 0.35 && recentForm <= 0.3) {
      return "Need a miracle here 🙏";
    }
    
    // Average cases with variety
    if (overallPerf >= 0.45 && overallPerf <= 0.55) {
      if (recentForm >= 0.45 && recentForm <= 0.55) return "Mr 50/50 strikes again";
      if (recentForm > 0.55) return "Sneaking above the line";
      return "Stuck in no man's land";
    }
    
    return "Just another day at the office";
  };
  
  // Heatmap view
  const HeatmapView = () => {
    const metrics = ['Base Skill', 'Final Rating', 'Change', 'GK Rating', 'Overall Perf', 'Recent Form'];
    const allPlayers = [...(data.blueTeam || []), ...(data.orangeTeam || [])];

    interface HeatmapRow {
      name: string;
      values: number[];
      overallPerf: number | null;
      recentForm: number | null;
      momentum: string;
      interpretation: string;
    }

    const heatmapData: HeatmapRow[] = transformations.map(player => {
      // Use performance scores from the algorithm
      const hasPerformanceData = player.overallPerformance !== undefined &&
                                player.recentPerformance !== undefined;

      const overallPerf = hasPerformanceData ? player.overallPerformance : null;
      const recentForm = hasPerformanceData ? player.recentPerformance : null;

      // Get GK rating from full player data
      const fullPlayer = allPlayers.find(p => p.friendly_name === player.name);
      const gkRating = fullPlayer?.gk_rating || 0;

      return {
        name: player.name,
        values: [
          player.baseSkill,
          player.threeLayerRating,
          player.change,
          gkRating, // GK rating
          hasPerformanceData ? (player.overallPerformance - 0.5) * 2 : 0, // Center around 0
          hasPerformanceData ? (player.recentPerformance - 0.5) * 2 : 0  // Center around 0
        ],
        // Store original values for display
        overallPerf,
        recentForm,
        momentum: player.momentum,
        interpretation: getPerformanceInterpretation(overallPerf, recentForm, player.momentum)
      };
    });

    // Normalize values for color intensity
    const getColorIntensity = (value: number, index: number) => {
      const values = heatmapData.map(d => d.values[index]);
      const min = Math.min(...values);
      const max = Math.max(...values);

      if (index === 2 || index === 4 || index === 5) { // Change metrics (not GK rating at index 3)
        if (value > 0) {
          // For positive values, normalize from 0 to max
          const positiveMax = Math.max(...values.filter(v => v > 0), 0);
          const normalizedPositive = positiveMax > 0 ? value / positiveMax : 0;
          return `rgba(34, 197, 94, ${normalizedPositive})`;
        }
        if (value < 0) {
          // For negative values, normalize from min to 0
          // More negative = darker red
          const negativeMin = Math.min(...values.filter(v => v < 0), 0);
          const normalizedNegative = negativeMin < 0 ? Math.abs(value / negativeMin) : 0;
          return `rgba(239, 68, 68, ${normalizedNegative})`;
        }
        return 'rgba(156, 163, 175, 0.3)';
      }
      // For non-change metrics, keep original normalization
      const normalized = (max - min) > 0 ? (value - min) / (max - min) : 0;
      return `rgba(59, 130, 246, ${normalized})`;
    };

    return (
      <div className="overflow-x-auto">
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Player</th>
              {metrics.map(metric => (
                <th key={metric} className="text-center">{metric}</th>
              ))}
              <th>Status</th>
              <th>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((player) => (
              <tr key={player.name} className="hover">
                <td className="font-medium">{player.name}</td>
                {player.values.map((value, index) => (
                  <td
                    key={index}
                    className="text-center"
                    style={{ backgroundColor: getColorIntensity(value, index) }}
                  >
                    {index === 4 ? (
                      player.overallPerf !== null
                        ? player.overallPerf.toFixed(3)
                        : 'N/A'
                    ) :
                     index === 5 ? (
                      player.recentForm !== null
                        ? player.recentForm.toFixed(3)
                        : 'N/A'
                    ) :
                     formatRating(value)}
                  </td>
                ))}
                <td className="text-center">
                  {player.momentum === 'hot' && '🔥'}
                  {player.momentum === 'cold' && '❄️'}
                  {player.momentum === 'steady' && '●'}
                </td>
                <td className="text-sm">{player.interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Check if we have data
  if (!transformations || transformations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-base-100 rounded-lg shadow-lg p-6"
      >
        <h2 className="text-xl font-bold mb-4">Player Transformation Analysis</h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No player transformation data available</p>
          <p className="text-sm mt-2">Debug: {transformations?.length || 0} transformations found</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-100 rounded-lg shadow-lg p-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold mb-4 md:mb-0">Player Transformation Analysis</h2>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${viewMode === 'scatter' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('scatter')}
          >
            Scatter Plot
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'heatmap' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'categories' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('categories')}
          >
            Categories
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'scatter' && (
          <motion.div
            key="scatter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Scatter Plot */}
            <div className="h-96 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="baseSkill"
                    name="Base Skill"
                    label={{ value: 'Base Skill Rating', position: 'insideBottom', offset: -10 }}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  />
                  <YAxis
                    dataKey="finalRating"
                    name="Final Rating"
                    label={{ value: 'Final Rating', angle: -90, position: 'insideLeft' }}
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  />
                  <ReferenceLine
                    x={0}
                    y={0}
                    stroke="#666"
                    strokeDasharray="3 3"
                    segment={[
                      { x: Math.min(...scatterData.map(d => d.baseSkill)), y: Math.min(...scatterData.map(d => d.baseSkill)) },
                      { x: Math.max(...scatterData.map(d => d.baseSkill)), y: Math.max(...scatterData.map(d => d.baseSkill)) }
                    ]}
                  >
                    <Label value="No Change Line" position="insideTopRight" />
                  </ReferenceLine>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Scatter
                    name="Players"
                    data={scatterData}
                    onClick={(data) => setSelectedPlayer(data.name)}
                  >
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getMomentumColor(entry.momentum)}
                        stroke={selectedPlayer === entry.name ? '#000' : 'none'}
                        strokeWidth={selectedPlayer === entry.name ? 2 : 0}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm dark:text-gray-300">Hot Streak 🔥</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm dark:text-gray-300">Cold Streak ❄️</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-sm dark:text-gray-300">Steady Performance ●</span>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'heatmap' && (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HeatmapView />
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 space-y-2">
              <p>Color intensity indicates relative values within each metric.</p>
              <p>Green = positive change, Red = negative change, Blue = skill values</p>
              <div className="bg-base-200 p-3 rounded-lg">
                <p className="font-semibold mb-1">Understanding Performance Scores (0-1 scale):</p>
                <ul className="space-y-1 ml-4">
                  <li>• <strong>0.5</strong> = Neutral (50% win rate, 0 goal diff)</li>
                  <li>• <strong>&gt;0.5</strong> = Above average performance</li>
                  <li>• <strong>&lt;0.5</strong> = Below average performance</li>
                  <li>• <strong>0.7+</strong> = Excellent performance</li>
                  <li>• <strong>0.3-</strong> = Poor performance</li>
                </ul>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Scores combine win rate (70%) and goal differential (30%) into a single metric.</p>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'categories' && (
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Performance Categories Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Hot Streaks</div>
                <div className="stat-value text-error">{transformations.filter(p => p.momentum === 'hot').length}</div>
                <div className="stat-desc">Players performing above average</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Steady</div>
                <div className="stat-value text-warning">{
                  transformations.filter(p => p.momentum === 'steady').length
                }</div>
                <div className="stat-desc">Consistent performance</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Cold Streaks</div>
                <div className="stat-value text-info">{transformations.filter(p => p.momentum === 'cold').length}</div>
                <div className="stat-desc">Players needing support</div>
              </div>
            </div>

            {/* Detailed Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Major Boosts */}
              {(() => {
                const majorBoosts = transformations.filter(p => p.change > 0.5);
                return majorBoosts.length > 0 && (
                  <div className="bg-success bg-opacity-10 p-4 rounded-lg">
                    <h3 className="font-bold text-success mb-3">Major Rating Boosts</h3>
                    <div className="space-y-2">
                      {majorBoosts.map((player, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-medium">{player.name}</span>
                          <div className="text-right">
                            <span className="text-success font-bold">+{player.change.toFixed(2)}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Performance boost</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Major Drops */}
              {(() => {
                const majorDrops = transformations.filter(p => p.change < -0.5);
                return majorDrops.length > 0 && (
                  <div className="bg-error bg-opacity-10 p-4 rounded-lg">
                    <h3 className="font-bold text-error mb-3">Major Rating Drops</h3>
                    <div className="space-y-2">
                      {majorDrops.map((player, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-medium">{player.name}</span>
                          <div className="text-right">
                            <span className="text-error font-bold">{player.change.toFixed(2)}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Performance penalty</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Player Detail */}
      {selectedPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-base-200 rounded-lg"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Selected: {selectedPlayer}</h3>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setSelectedPlayer(null)}
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {(() => {
              const player = transformations.find(p => p.name === selectedPlayer);
              if (!player) return null;
              return (
                <>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Base Skill:</span> {formatRating(player.baseSkill)}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Final Rating:</span> {formatRating(player.threeLayerRating)}
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Change:</span> 
                    <span className={player.change > 0 ? 'text-success' : player.change < 0 ? 'text-error' : ''}>
                      {player.change > 0 ? '+' : ''}{player.change.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Momentum:</span> {player.momentum}
                    {player.momentum === 'hot' && ' 🔥'}
                    {player.momentum === 'cold' && ' ❄️'}
                    {player.momentum === 'steady' && ' ●'}
                  </div>
                </>
              );
            })()}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};