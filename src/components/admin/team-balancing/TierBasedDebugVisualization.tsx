import React, { useState, useMemo } from 'react';
import { PlayerWithRating } from './tierBasedSnakeDraft';
import { Tooltip } from '../../ui/Tooltip';
import { formatRating } from '../../../utils/ratingFormatters';

interface TierBasedDebugVisualizationProps {
  debugLog: string;
  blueTeam: PlayerWithRating[];
  orangeTeam: PlayerWithRating[];
}

interface ParsedDebugData {
  executiveSummary: {
    totalPlayers: number;
    ratedPlayers: number;
    newPlayers: number;
    tierCount: number;
    tierSizes: string;
    finalBalance: number;
    balanceQuality: string;
    optimizationSwaps: number;
    advantage: string;
  };
  playerTransformations: Array<{
    name: string;
    baseSkill: number;
    threeLayerRating: number;
    change: number;
    performanceCategory: string;
    momentum: 'hot' | 'cold' | 'steady';
  }>;
  tierData: Array<{
    tierNumber: number;
    players: string[];
    skillRange: { min: number; max: number };
  }>;
  snakeDraftPicks: Array<{
    tier: number;
    picks: Array<{ player: string; team: 'blue' | 'orange'; pickNumber: number }>;
  }>;
  balanceBreakdown: {
    metrics: Array<{
      name: string;
      blueValue: number;
      orangeValue: number;
      difference: number;
    }>;
    overallBalance: number;
    description: string;
  };
  optimizationSwaps: Array<{
    bluePlayer: string;
    orangePlayer: string;
    tier: number;
    improvement: number;
  }>;
}

/**
 * Component to visualize the tier-based algorithm debug log
 */
export const TierBasedDebugVisualization: React.FC<TierBasedDebugVisualizationProps> = ({
  debugLog,
  blueTeam,
  orangeTeam
}) => {
  const [activeView, setActiveView] = useState<'draft' | 'transform' | 'balance' | 'optimization'>('draft');

  // Parse the debug log to extract structured data
  const parsedData = useMemo<ParsedDebugData>(() => {
    const data: ParsedDebugData = {
      executiveSummary: {
        totalPlayers: 0,
        ratedPlayers: 0,
        newPlayers: 0,
        tierCount: 0,
        tierSizes: '',
        finalBalance: 0,
        balanceQuality: '',
        optimizationSwaps: 0,
        advantage: ''
      },
      playerTransformations: [],
      tierData: [],
      snakeDraftPicks: [],
      balanceBreakdown: {
        metrics: [],
        overallBalance: 0,
        description: ''
      },
      optimizationSwaps: []
    };

    // Parse executive summary
    const summaryMatch = debugLog.match(/EXECUTIVE SUMMARY[\s\S]*?Advantage: ([^\n]+)/);
    if (summaryMatch) {
      const summaryText = summaryMatch[0];
      data.executiveSummary.totalPlayers = parseInt(summaryText.match(/Players: (\d+)/)?.[1] || '0');
      data.executiveSummary.ratedPlayers = parseInt(summaryText.match(/\((\d+) rated/)?.[1] || '0');
      data.executiveSummary.newPlayers = parseInt(summaryText.match(/, (\d+) new\)/)?.[1] || '0');
      data.executiveSummary.tierCount = parseInt(summaryText.match(/Tiers: (\d+)/)?.[1] || '0');
      data.executiveSummary.tierSizes = summaryText.match(/\(sizes: ([^)]+)\)/)?.[1] || '';
      data.executiveSummary.finalBalance = parseFloat(summaryText.match(/Final Balance: ([\d.]+)/)?.[1] || '0');
      data.executiveSummary.balanceQuality = summaryText.match(/\((Excellent|Good|Fair|Poor)/)?.[1] || '';
      data.executiveSummary.optimizationSwaps = parseInt(summaryText.match(/Optimization: (\d+) swap/)?.[1] || '0');
      data.executiveSummary.advantage = summaryMatch[1];
    }

    // Parse player transformations from compact summary
    const transformSection = debugLog.match(/COMPACT TRANSFORMATION SUMMARY[\s\S]*?(?=\n\n[A-Z])/);
    if (transformSection) {
      const lines = transformSection[0].split('\n').slice(3); // Skip headers
      lines.forEach(line => {
        const match = line.match(/^(\S+)\s*\|\s*([\d.]+)\s*\|\s*(\S+)\s*\|\s*([+-]?\d+)\s*\|\s*(\S+)\s*\|\s*([+-]?\d+)\s*\|\s*([\d.-]+)(🔥|❄️|●)\s*\|\s*([\d.]+)\s*\|\s*([+-][\d.]+)/);
        if (match) {
          const [, name, baseSkill, , , , , , momentumIcon, threeLayerRating, change] = match;
          data.playerTransformations.push({
            name,
            baseSkill: parseFloat(baseSkill),
            threeLayerRating: parseFloat(threeLayerRating),
            change: parseFloat(change),
            performanceCategory: '', // Will be determined from other data
            momentum: momentumIcon === '🔥' ? 'hot' : momentumIcon === '❄️' ? 'cold' : 'steady'
          });
        }
      });
    }

    // Parse tier data
    const tierSection = debugLog.match(/STEP 3: CREATING TIERS[\s\S]*?(?=STEP 4)/);
    if (tierSection) {
      const tierMatches = tierSection[0].matchAll(/Tier (\d+) \((\d+) players, range: ([\d.]+)-([\d.]+)\):\n((?:  - [^\n]+\n)+)/g);
      for (const match of tierMatches) {
        const [, tierNum, , minSkill, maxSkill, playersList] = match;
        const players = playersList.match(/- ([^(]+) \(/g)?.map(p => p.slice(2, -2).trim()) || [];
        data.tierData.push({
          tierNumber: parseInt(tierNum),
          players,
          skillRange: { min: parseFloat(minSkill), max: parseFloat(maxSkill) }
        });
      }
    }

    // Parse snake draft picks
    const draftSection = debugLog.match(/STEP 4: SNAKE DRAFT PROCESS[\s\S]*?(?=STEP 5)/);
    if (draftSection) {
      const tierDrafts = draftSection[0].matchAll(/Tier (\d+) Draft:[\s\S]*?(?=Tier \d+ Draft:|Current totals:|$)/g);
      let globalPickNumber = 0;
      for (const tierMatch of tierDrafts) {
        const tierNum = parseInt(tierMatch[1]);
        const picks: Array<{ player: string; team: 'blue' | 'orange'; pickNumber: number }> = [];
        
        const pickMatches = tierMatch[0].matchAll(/Pick \d+: ([^→]+) → (Blue|Orange)/g);
        for (const pickMatch of pickMatches) {
          globalPickNumber++;
          picks.push({
            player: pickMatch[1].trim(),
            team: pickMatch[2].toLowerCase() as 'blue' | 'orange',
            pickNumber: globalPickNumber
          });
        }
        
        if (picks.length > 0) {
          data.snakeDraftPicks.push({ tier: tierNum, picks });
        }
      }
    }

    // Parse balance breakdown
    const balanceSection = debugLog.match(/TEAM BALANCE BREAKDOWN[\s\S]*?(?=TEAM STRENGTH|$)/);
    if (balanceSection) {
      const metricMatches = balanceSection[0].matchAll(/(Attack|Defense|Game IQ|Win Rate|Goal Diff):\s+([\d.+-]+%?)\s+([\d.+-]+%?)\s+([\d.]+%?)/g);
      for (const match of metricMatches) {
        const [, metric, blueVal, orangeVal, diff] = match;
        data.balanceBreakdown.metrics.push({
          name: metric,
          blueValue: parseFloat(blueVal.replace('%', '')),
          orangeValue: parseFloat(orangeVal.replace('%', '')),
          difference: parseFloat(diff.replace('%', ''))
        });
      }
      
      const balanceScore = balanceSection[0].match(/Overall Balance Score: ([\d.]+)/);
      if (balanceScore) {
        data.balanceBreakdown.overallBalance = parseFloat(balanceScore[1]);
      }
      
      const balanceDesc = balanceSection[0].match(/Overall Balance Score: [\d.]+ \(([^)]+)\)/);
      if (balanceDesc) {
        data.balanceBreakdown.description = balanceDesc[1];
      }
    }

    // Parse optimization swaps
    const swapSection = debugLog.match(/OPTIMIZATION IMPACT[\s\S]*?Swap Details:([\s\S]*?)(?=\n[A-Z]|$)/);
    if (swapSection) {
      const swapMatches = swapSection[1].matchAll(/\d+\. ([^(]+) \(Blue\) ↔ ([^(]+) \(Orange\)\s*\n\s*Tier: (\d+), Improvement: ([\d.]+)/g);
      for (const match of swapMatches) {
        data.optimizationSwaps.push({
          bluePlayer: match[1].trim(),
          orangePlayer: match[2].trim(),
          tier: parseInt(match[3]),
          improvement: parseFloat(match[4])
        });
      }
    }

    return data;
  }, [debugLog]);

  // Snake Draft Visualization
  const SnakeDraftVisualization = () => {
    const maxTierSize = Math.max(...parsedData.tierData.map(t => t.players.length));
    
    return (
      <div className="bg-base-100 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Snake Draft Flow</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {parsedData.snakeDraftPicks.map((tier, tierIndex) => (
              <div key={tier.tier} className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="font-medium mr-2">Tier {tier.tier}</span>
                  <span className="text-sm text-gray-500">
                    ({parsedData.tierData[tierIndex]?.skillRange.min.toFixed(1)} - {parsedData.tierData[tierIndex]?.skillRange.max.toFixed(1)})
                  </span>
                </div>
                <div className="flex items-center">
                  {/* Snake direction indicator */}
                  {tierIndex > 0 && (
                    <div className="mr-2 text-2xl">
                      {tierIndex % 2 === 0 ? '→' : '←'}
                    </div>
                  )}
                  
                  {/* Player picks */}
                  <div className={`flex gap-2 ${tierIndex % 2 === 1 ? 'flex-row-reverse' : ''}`}>
                    {tier.picks.map((pick, pickIndex) => (
                      <Tooltip key={pickIndex} content={`Pick #${pick.pickNumber}`}>
                        <div
                          className={`
                            px-3 py-2 rounded-lg text-sm font-medium cursor-pointer
                            transition-all hover:scale-105
                            ${pick.team === 'blue' 
                              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                              : 'bg-orange-100 text-orange-700 border-2 border-orange-300'}
                          `}
                        >
                          {pick.player}
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                  
                  {/* Turn indicator for next tier */}
                  {tierIndex < parsedData.snakeDraftPicks.length - 1 && (
                    <div className="ml-4 text-gray-400">
                      {tier.picks.length % 2 === 1 ? '↓' : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
            <span>Blue Team</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
            <span>Orange Team</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-500">→ ← Snake draft direction</span>
          </div>
        </div>
      </div>
    );
  };

  // Player Transformation Visualization
  const PlayerTransformationVisualization = () => {
    const maxRating = Math.max(...parsedData.playerTransformations.map(p => Math.max(p.baseSkill, p.threeLayerRating)));
    const minRating = Math.min(...parsedData.playerTransformations.map(p => Math.min(p.baseSkill, p.threeLayerRating)));
    const ratingRange = maxRating - minRating;
    
    return (
      <div className="bg-base-100 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Player Rating Transformations</h3>
        
        {/* Chart */}
        <div className="mb-6">
          <div className="relative h-80 bg-base-200 rounded-lg p-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
              <span>{maxRating.toFixed(1)}</span>
              <span>{((maxRating + minRating) / 2).toFixed(1)}</span>
              <span>{minRating.toFixed(1)}</span>
            </div>
            
            {/* Chart area */}
            <div className="ml-12 h-full relative">
              {parsedData.playerTransformations.map((player, index) => {
                const baseY = ((maxRating - player.baseSkill) / ratingRange) * 100;
                const finalY = ((maxRating - player.threeLayerRating) / ratingRange) * 100;
                const barWidth = 100 / parsedData.playerTransformations.length;
                const barX = index * barWidth;
                
                return (
                  <div key={player.name} className="absolute" style={{ left: `${barX}%`, width: `${barWidth}%`, height: '100%' }}>
                    {/* Connection line */}
                    <svg className="absolute inset-0" style={{ overflow: 'visible' }}>
                      <line
                        x1="50%"
                        y1={`${baseY}%`}
                        x2="50%"
                        y2={`${finalY}%`}
                        stroke={player.change > 0 ? '#22c55e' : player.change < 0 ? '#ef4444' : '#9ca3af'}
                        strokeWidth="2"
                        strokeDasharray={player.change === 0 ? '2,2' : '0'}
                      />
                    </svg>
                    
                    {/* Base skill point */}
                    <Tooltip content={`Base: ${player.baseSkill.toFixed(2)}`}>
                      <div
                        className="absolute w-3 h-3 bg-gray-400 rounded-full -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform"
                        style={{ left: '50%', top: `${baseY}%` }}
                      />
                    </Tooltip>
                    
                    {/* Final rating point with momentum indicator */}
                    <Tooltip content={`Final: ${player.threeLayerRating.toFixed(2)} (${player.change > 0 ? '+' : ''}${player.change.toFixed(2)})`}>
                      <div
                        className={`
                          absolute w-4 h-4 rounded-full -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform
                          ${player.momentum === 'hot' ? 'bg-red-500' : player.momentum === 'cold' ? 'bg-blue-500' : 'bg-yellow-500'}
                        `}
                        style={{ left: '50%', top: `${finalY}%` }}
                      />
                    </Tooltip>
                    
                    {/* Player name (rotated) */}
                    <div
                      className="absolute text-xs whitespace-nowrap transform -rotate-45 origin-top-left"
                      style={{ left: '50%', bottom: '-20px' }}
                    >
                      {player.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>Base Skill Rating</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span>Final Rating (Steady)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>Hot Streak 🔥</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Cold Streak ❄️</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-8 h-1">
              <line x1="0" y1="0" x2="32" y2="0" stroke="#22c55e" strokeWidth="2" />
            </svg>
            <span>Performance Boost</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-8 h-1">
              <line x1="0" y1="0" x2="32" y2="0" stroke="#ef4444" strokeWidth="2" />
            </svg>
            <span>Performance Penalty</span>
          </div>
        </div>
      </div>
    );
  };

  // Balance Breakdown Visualization
  const BalanceBreakdownVisualization = () => {
    const metrics = parsedData.balanceBreakdown.metrics;
    const maxDiff = Math.max(...metrics.map(m => m.difference));
    
    return (
      <div className="bg-base-100 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Team Balance Analysis</h3>
        
        {/* Overall Score */}
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold">{parsedData.balanceBreakdown.overallBalance.toFixed(3)}</div>
          <div className="text-sm text-gray-500">{parsedData.balanceBreakdown.description}</div>
          <div className="text-xs mt-1">Lower score = Better balance</div>
        </div>
        
        {/* Metrics comparison */}
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{metric.name}</span>
                <span className="text-sm text-gray-500">Diff: {metric.difference.toFixed(2)}</span>
              </div>
              
              {/* Visual comparison bars */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-600">Blue: {metric.blueValue.toFixed(1)}</span>
                  </div>
                  <div className="h-6 bg-blue-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(metric.blueValue / (metric.blueValue + metric.orangeValue)) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-orange-600">Orange: {metric.orangeValue.toFixed(1)}</span>
                  </div>
                  <div className="h-6 bg-orange-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${(metric.orangeValue / (metric.blueValue + metric.orangeValue)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Difference indicator */}
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      metric.difference < 0.5 ? 'bg-green-500' : 
                      metric.difference < 1.0 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}
                    style={{ width: maxDiff > 0 ? `${(metric.difference / maxDiff) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Team advantage summary */}
        <div className="mt-6 p-3 bg-base-200 rounded-lg text-center">
          <div className="font-medium">Overall Advantage</div>
          <div className="text-sm mt-1">{parsedData.executiveSummary.advantage}</div>
        </div>
      </div>
    );
  };

  // Optimization Impact Visualization
  const OptimizationVisualization = () => {
    if (parsedData.optimizationSwaps.length === 0) {
      return (
        <div className="bg-base-100 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-4">Optimization Impact</h3>
          <div className="text-center py-8 text-gray-500">
            No optimization was needed - the initial draft was already well-balanced!
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-base-100 p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Optimization Impact</h3>
        
        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-base-200 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold">{parsedData.optimizationSwaps.length}</div>
            <div className="text-sm">Total Swaps</div>
          </div>
          <div className="bg-base-200 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold">
              {parsedData.optimizationSwaps.reduce((sum, swap) => sum + swap.improvement, 0).toFixed(3)}
            </div>
            <div className="text-sm">Total Improvement</div>
          </div>
          <div className="bg-base-200 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold">{parsedData.executiveSummary.balanceQuality}</div>
            <div className="text-sm">Final Quality</div>
          </div>
        </div>
        
        {/* Swap details */}
        <div className="space-y-3">
          {parsedData.optimizationSwaps.map((swap, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="badge badge-sm">Tier {swap.tier}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-600">{swap.bluePlayer}</span>
                    <span className="text-xl">↔</span>
                    <span className="font-medium text-orange-600">{swap.orangePlayer}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    +{swap.improvement.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-500">improvement</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View selector */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`btn btn-sm ${activeView === 'draft' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveView('draft')}
        >
          Snake Draft
        </button>
        <button
          className={`btn btn-sm ${activeView === 'transform' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveView('transform')}
        >
          Transformations
        </button>
        <button
          className={`btn btn-sm ${activeView === 'balance' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveView('balance')}
        >
          Balance Analysis
        </button>
        <button
          className={`btn btn-sm ${activeView === 'optimization' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveView('optimization')}
        >
          Optimization
        </button>
      </div>
      
      {/* Active visualization */}
      {activeView === 'draft' && <SnakeDraftVisualization />}
      {activeView === 'transform' && <PlayerTransformationVisualization />}
      {activeView === 'balance' && <BalanceBreakdownVisualization />}
      {activeView === 'optimization' && <OptimizationVisualization />}
      
      {/* Executive Summary Card */}
      <div className="bg-base-100 p-4 rounded-lg border">
        <h4 className="font-bold mb-2">Executive Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Players:</span> {parsedData.executiveSummary.totalPlayers}
          </div>
          <div>
            <span className="text-gray-500">Rated:</span> {parsedData.executiveSummary.ratedPlayers}
          </div>
          <div>
            <span className="text-gray-500">New:</span> {parsedData.executiveSummary.newPlayers}
          </div>
          <div>
            <span className="text-gray-500">Tiers:</span> {parsedData.executiveSummary.tierCount}
          </div>
          <div>
            <span className="text-gray-500">Balance:</span> {parsedData.executiveSummary.finalBalance.toFixed(3)}
          </div>
          <div>
            <span className="text-gray-500">Quality:</span> {parsedData.executiveSummary.balanceQuality}
          </div>
          <div>
            <span className="text-gray-500">Swaps:</span> {parsedData.executiveSummary.optimizationSwaps}
          </div>
          <div>
            <span className="text-gray-500">Advantage:</span> {parsedData.executiveSummary.advantage}
          </div>
        </div>
      </div>
    </div>
  );
};