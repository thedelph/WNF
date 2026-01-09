import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';
import { formatRating } from '../../../../utils/ratingFormatters';
import { POSITION_MAP } from '../../../../constants/positions';
import { Position } from '../../../../types/positions';

interface SnakeDraftSimulatorProps {
  data: ParsedDebugData;
}

export const SnakeDraftSimulator: React.FC<SnakeDraftSimulatorProps> = ({ data }) => {
  const [currentPick, setCurrentPick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000); // milliseconds per pick
  const [viewMode, setViewMode] = useState<'simulator' | 'flow' | 'analysis'>('simulator');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract permanent GKs from team data
  const permanentGKs = {
    blue: data.blueTeam?.filter(p => p.isPermanentGK) || [],
    orange: data.orangeTeam?.filter(p => p.isPermanentGK) || []
  };
  const hasPermanentGKs = permanentGKs.blue.length > 0 || permanentGKs.orange.length > 0;

  // Flatten all picks for simulation
  const allPicks = data.snakeDraftPicks.flatMap(tier =>
    tier.picks.map(pick => ({ ...pick, tier: tier.tier }))
  );

  // Return early if no picks
  if (!data.snakeDraftPicks || data.snakeDraftPicks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-base-100 rounded-lg shadow-lg p-6 text-center"
      >
        <h2 className="text-xl font-bold mb-4">Snake Draft Process</h2>
        <p className="text-gray-500 dark:text-gray-400">No draft data available</p>
      </motion.div>
    );
  }

  useEffect(() => {
    if (isPlaying && currentPick < allPicks.length - 1) {
      intervalRef.current = setTimeout(() => {
        setCurrentPick(prev => prev + 1);
      }, playSpeed);
    } else if (currentPick >= allPicks.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentPick, allPicks.length, playSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentPick(0);
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    if (currentPick < allPicks.length - 1) {
      setCurrentPick(prev => prev + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentPick > 0) {
      setCurrentPick(prev => prev - 1);
    }
  };

  // Helper to get full player data with GK rating
  const getPlayerData = (playerName: string, team: 'blue' | 'orange') => {
    const teamData = team === 'blue' ? data.blueTeam : data.orangeTeam;
    return teamData?.find(p => p.friendly_name === playerName);
  };

  // Get current state of teams
  const getCurrentTeams = () => {
    const blue: typeof allPicks = [];
    const orange: typeof allPicks = [];

    for (let i = 0; i <= currentPick && i < allPicks.length; i++) {
      if (allPicks[i]?.team === 'blue') {
        blue.push(allPicks[i]);
      } else if (allPicks[i]?.team === 'orange') {
        orange.push(allPicks[i]);
      }
    }

    return { blue, orange };
  };

  const { blue: currentBlueTeam, orange: currentOrangeTeam } = getCurrentTeams();

  // Draft simulator view
  const SimulatorView = () => (
    <div className="space-y-6">
      {/* Phase 0: Permanent GK Assignments */}
      {hasPermanentGKs && (
        <div className="mb-6 p-4 bg-base-200 rounded-lg border-2 border-warning">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🥅</span>
            <h3 className="font-bold text-lg">PHASE 0: Permanent Goalkeeper Assignment</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Blue Team</div>
              {permanentGKs.blue.length > 0 ? (
                <div className="space-y-2">
                  {permanentGKs.blue.map(gk => (
                    <div key={gk.player_id} className="flex justify-between items-center">
                      <span className="font-medium">{gk.friendly_name}</span>
                      <span className="text-sm">GK: {formatRating(gk.gk_rating)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-sm">No permanent GK</span>
              )}
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <div className="font-semibold text-orange-700 dark:text-orange-300 mb-2">Orange Team</div>
              {permanentGKs.orange.length > 0 ? (
                <div className="space-y-2">
                  {permanentGKs.orange.map(gk => (
                    <div key={gk.player_id} className="flex justify-between items-center">
                      <span className="font-medium">{gk.friendly_name}</span>
                      <span className="text-sm">GK: {formatRating(gk.gk_rating)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-sm">No permanent GK</span>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 bg-base-100 p-2 rounded">
            ℹ️ Permanent GKs are assigned before the snake draft and remain with their team throughout the game
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleStepBackward}
            disabled={currentPick === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className={`btn btn-sm ${isPlaying ? 'btn-error' : 'btn-primary'}`}
            onClick={handlePlayPause}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleStepForward}
            disabled={currentPick >= allPicks.length - 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Speed:</label>
          <input
            type="range"
            min="200"
            max="2000"
            step="200"
            value={2200 - playSpeed}
            onChange={(e) => setPlaySpeed(2200 - parseInt(e.target.value))}
            className="range range-xs w-24"
          />
        </div>

        <div className="text-sm">
          Pick {currentPick + 1} of {allPicks.length}
        </div>
      </div>

      {/* Current Pick Display */}
      {currentPick < allPicks.length && allPicks[currentPick] && (() => {
        const pick = allPicks[currentPick];
        const playerData = getPlayerData(pick.player, pick.team);
        return (
          <motion.div
            key={currentPick}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-2xl font-bold mb-2">
              Pick #{pick.pickNumber}
            </div>
            <div className={`
              inline-block px-6 py-3 rounded-lg text-lg font-medium
              ${pick.team === 'blue'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-2 border-orange-300 dark:border-orange-700'}
            `}>
              {pick.player} → {pick.team === 'blue' ? 'Blue' : 'Orange'} Team
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Tier {pick.tier} • Rating: {pick.rating?.toFixed(2) || 'N/A'}
              {playerData?.gk_rating && ` • GK: ${formatRating(playerData.gk_rating)}`}
              {(() => {
                const playerWithPos = playerData as any;
                if (playerWithPos?.primaryPosition) {
                  const posConfig = POSITION_MAP[playerWithPos.primaryPosition as Position];
                  if (posConfig) {
                    return ` • ${posConfig.emoji} ${posConfig.code}`;
                  }
                }
                return '';
              })()}
            </div>
          </motion.div>
        );
      })()}

      {/* Draft Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blue Team */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-bold text-blue-700 dark:text-blue-300 mb-3">
            Blue Team ({currentBlueTeam.length} players)
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {currentBlueTeam.map((pick, index) => {
                const playerData = getPlayerData(pick.player, 'blue');
                return (
                  <motion.div
                    key={`${pick.player}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-800 p-2 rounded"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{pick.player}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Tier {pick.tier}
                        </span>
                        {(() => {
                          const playerWithPos = playerData as any;
                          if (playerWithPos?.primaryPosition) {
                            const posConfig = POSITION_MAP[playerWithPos.primaryPosition as Position];
                            if (posConfig) {
                              const categoryColors = {
                                goalkeeper: 'badge-warning',
                                defense: 'badge-info',
                                midfield: 'badge-secondary',
                                attack: 'badge-error'
                              };
                              return (
                                <span className={`badge badge-xs ${categoryColors[posConfig.category]}`}>
                                  {posConfig.emoji} {posConfig.code}
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-sm">
                        Pick #{pick.pickNumber}
                      </div>
                    </div>
                    {playerData?.gk_rating && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        GK: {formatRating(playerData.gk_rating)}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Orange Team */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <h3 className="font-bold text-orange-700 dark:text-orange-300 mb-3">
            Orange Team ({currentOrangeTeam.length} players)
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {currentOrangeTeam.map((pick, index) => {
                const playerData = getPlayerData(pick.player, 'orange');
                return (
                  <motion.div
                    key={`${pick.player}-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-800 p-2 rounded"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{pick.player}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Tier {pick.tier}
                        </span>
                        {(() => {
                          const playerWithPos = playerData as any;
                          if (playerWithPos?.primaryPosition) {
                            const posConfig = POSITION_MAP[playerWithPos.primaryPosition as Position];
                            if (posConfig) {
                              const categoryColors = {
                                goalkeeper: 'badge-warning',
                                defense: 'badge-info',
                                midfield: 'badge-secondary',
                                attack: 'badge-error'
                              };
                              return (
                                <span className={`badge badge-xs ${categoryColors[posConfig.category]}`}>
                                  {posConfig.emoji} {posConfig.code}
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-sm">
                        Pick #{pick.pickNumber}
                      </div>
                    </div>
                    {playerData?.gk_rating && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        GK: {formatRating(playerData.gk_rating)}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-base-300 rounded-full h-2">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentPick + 1) / allPicks.length) * 100}%` }}
        />
      </div>
    </div>
  );

  // Snake flow visualization
  const FlowView = () => (
    <div className="space-y-6">
      {data.snakeDraftPicks.map((tier, tierIndex) => {
        const isReversed = tierIndex % 2 === 1;
        
        return (
          <div key={tier.tier} className="bg-base-200 rounded-lg p-4">
            <h4 className="font-bold mb-3">Tier {tier.tier}</h4>
            
            <div className="relative">
              {/* Direction indicator */}
              <div className={`
                absolute -left-8 top-1/2 -translate-y-1/2 text-2xl text-gray-400
                ${isReversed ? 'rotate-180' : ''}
              `}>
                →
              </div>
              
              {/* Picks */}
              <div className={`
                flex gap-3 overflow-x-auto pb-2
                ${isReversed ? 'flex-row-reverse' : ''}
              `}>
                {tier.picks.map((pick, pickIndex) => (
                  <motion.div
                    key={pick.player}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (tierIndex * 0.1) + (pickIndex * 0.05) }}
                    className={`
                      flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium
                      ${pick.team === 'blue'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-2 border-orange-300 dark:border-orange-700'}
                    `}
                  >
                    <div>{pick.player}</div>
                    <div className="text-xs opacity-75">#{pick.pickNumber}</div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Connection to next tier */}
            {tierIndex < data.snakeDraftPicks.length - 1 && (
              <div className="flex justify-center mt-4">
                <div className="text-gray-400 dark:text-gray-500">↓</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Draft analysis view
  const AnalysisView = () => {
    // Calculate draft value metrics
    const draftMetrics = data.snakeDraftPicks.map(tier => {
      const avgTierRating = tier.picks.reduce((sum, p) => sum + p.rating, 0) / tier.picks.length;
      return tier.picks.map(pick => ({
        ...pick,
        tier: tier.tier,
        value: pick.rating - avgTierRating
      }));
    }).flat();

    const bestPicks = draftMetrics.filter(p => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
    const worstPicks = draftMetrics.filter(p => p.value < 0).sort((a, b) => a.value - b.value).slice(0, 5);

    return (
      <div className="space-y-6">
        {/* Best Value Picks */}
        <div>
          <h3 className="font-bold mb-3 text-success">Best Value Picks</h3>
          <div className="space-y-2">
            {bestPicks.map((pick, index) => (
              <div key={index} className="flex items-center justify-between bg-success bg-opacity-10 p-3 rounded-lg">
                <div>
                  <span className="font-medium">{pick.player}</span>
                  <span className={`ml-2 text-sm ${pick.team === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    ({pick.team})
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-success">
                    +{pick.value.toFixed(2)} above tier avg
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Tier {pick.tier} • Pick #{pick.pickNumber}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Potential Reaches */}
        <div>
          <h3 className="font-bold mb-3 text-warning">Potential Reaches</h3>
          <div className="space-y-2">
            {data.draftAnalysis.potentialReaches.map((reach, index) => (
              <div key={index} className="flex items-center justify-between bg-warning bg-opacity-10 p-3 rounded-lg">
                <div>
                  <span className="font-medium">{reach.player}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-warning">
                    Tier {reach.tier}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {reach.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pick Distribution by Tier */}
        <div>
          <h3 className="font-bold mb-3">Pick Order Analysis</h3>
          <div className="overflow-x-auto">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>First Pick</th>
                  <th>Last Pick</th>
                  <th>Blue Picks</th>
                  <th>Orange Picks</th>
                </tr>
              </thead>
              <tbody>
                {data.snakeDraftPicks.map((tier) => {
                  const bluePicks = tier.picks.filter(p => p.team === 'blue').length;
                  const orangePicks = tier.picks.filter(p => p.team === 'orange').length;
                  return (
                    <tr key={tier.tier}>
                      <td className="font-medium">Tier {tier.tier}</td>
                      <td>{tier.picks[0]?.player || '-'}</td>
                      <td>{tier.picks[tier.picks.length - 1]?.player || '-'}</td>
                      <td className="text-blue-600 dark:text-blue-400">{bluePicks}</td>
                      <td className="text-orange-600 dark:text-orange-400">{orangePicks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
        <h2 className="text-xl font-bold mb-4 md:mb-0">Snake Draft Process</h2>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${viewMode === 'simulator' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('simulator')}
          >
            Simulator
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'flow' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('flow')}
          >
            Flow View
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'analysis' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('analysis')}
          >
            Analysis
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'simulator' && (
          <motion.div
            key="simulator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SimulatorView />
          </motion.div>
        )}

        {viewMode === 'flow' && (
          <motion.div
            key="flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FlowView />
          </motion.div>
        )}

        {viewMode === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnalysisView />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};