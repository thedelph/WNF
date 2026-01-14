import React, { useState } from 'react';
import { TeamAssignment } from './types';
import { findTierBasedTeamBalance, PlayerWithRating, TierBasedResult } from './tierBasedSnakeDraft';
import { TierBasedDebugVisualization } from './TierBasedDebugVisualization';
import { Tooltip } from '../../ui/Tooltip';
import { toast } from 'react-hot-toast';
import { formatRating } from '../../../utils/ratingFormatters';
import { useNavigate } from 'react-router-dom';
import { useTeamBalancingChemistry } from '../../../hooks/useTeamBalancingChemistry';
import {
  generateOptimalTeams,
  resultToTeamAssignments,
  BruteForceTeamResult,
  getCoreRatingsBreakdown,
  getPerformanceBreakdown,
  getFormBreakdown,
  getPositionBreakdown,
  getAttributeBreakdown,
  getChemistryBreakdown,
  getRivalryBreakdown,
  getTrioBreakdown,
} from './bruteForceOptimal';

type AlgorithmType = 'tier-based' | 'brute-force';

interface TierBasedTeamGeneratorProps {
  allPlayers: TeamAssignment[];
  permanentGKIds?: string[];
  onApplyTeams: (blueTeam: TeamAssignment[], orangeTeam: TeamAssignment[]) => void;
  onResultGenerated?: (result: TierBasedResult) => void;
}

/**
 * TierBasedTeamGenerator component
 * Generates teams using the tier-based snake draft algorithm
 */
export const TierBasedTeamGenerator: React.FC<TierBasedTeamGeneratorProps> = ({
  allPlayers,
  permanentGKIds = [],
  onApplyTeams,
  onResultGenerated
}) => {
  const [tierBasedResult, setTierBasedResult] = useState<TierBasedResult | null>(null);
  const [bruteForceResult, setBruteForceResult] = useState<BruteForceTeamResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [debugLog, setDebugLog] = useState<string>('');
  const [viewMode, setViewMode] = useState<'summary' | 'visual' | 'debug'>('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('brute-force');
  const navigate = useNavigate();

  // Chemistry hook for team balancing
  const { fetchChemistryForPlayers } = useTeamBalancingChemistry();

  const generateTierBasedTeams = async () => {
    if (allPlayers.length < 2) {
      toast.error('Need at least 2 players to generate teams');
      return;
    }

    setIsGenerating(true);

    try {
      // Fetch chemistry data for all players
      toast.loading('Loading chemistry data...');
      const playerIds = allPlayers.map(p => p.player_id);
      const chemistryLookup = await fetchChemistryForPlayers(playerIds);

      toast.dismiss();
      toast.loading('Generating tier-based teams...');

      const result = findTierBasedTeamBalance(allPlayers, {
        permanentGKIds,
        chemistryLookup: chemistryLookup.pairs,
      });

      setTierBasedResult(result);
      setBruteForceResult(null); // Clear other result
      if (result.debugLog) {
        setDebugLog(result.debugLog);
      }
      if (onResultGenerated) {
        onResultGenerated(result);
      }

      toast.dismiss();
      const chemistryInfo = chemistryLookup.pairCount > 0
        ? ` (${chemistryLookup.pairCount} chemistry pairs loaded)`
        : '';
      toast.success(`Generated tier-based team configuration!${chemistryInfo}`);
    } catch (error) {
      toast.dismiss();
      toast.error('Error generating tier-based teams');
      console.error('Error generating tier-based teams:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBruteForceTeams = async () => {
    if (allPlayers.length < 2) {
      toast.error('Need at least 2 players to generate teams');
      return;
    }

    setIsGenerating(true);

    try {
      toast.loading('Generating optimal teams (brute-force)...');
      const playerIds = allPlayers.map(p => p.player_id);

      const result = await generateOptimalTeams(playerIds, {
        permanentGKId: permanentGKIds[0], // Use first permanent GK if any
        debug: true,
      });

      setBruteForceResult(result);
      setTierBasedResult(null); // Clear other result

      // Create a debug log for display with detailed breakdowns
      const stats = result.dataLoadingStats;
      const chemDetails = result.scoreBreakdown.chemistryDetails;

      // Get detailed breakdowns for enhanced debug log
      const coreBreakdown = getCoreRatingsBreakdown(result.blueTeam, result.orangeTeam);
      const perfBreakdown = getPerformanceBreakdown(result.blueTeam, result.orangeTeam);
      const formBreakdown = getFormBreakdown(result.blueTeam, result.orangeTeam);
      const posBreakdown = getPositionBreakdown(result.blueTeam, result.orangeTeam);
      const attrBreakdown = getAttributeBreakdown(result.blueTeam, result.orangeTeam);

      // Get chemistry/rivalry/trio breakdowns if maps are available
      const chemBreakdown = result.chemistryMap
        ? getChemistryBreakdown(result.blueTeam, result.orangeTeam, result.chemistryMap)
        : null;
      const rivalryBreakdown = result.rivalryMap
        ? getRivalryBreakdown(result.blueTeam, result.orangeTeam, result.rivalryMap)
        : null;
      const trioBreakdown = result.trioMap
        ? getTrioBreakdown(result.blueTeam, result.orangeTeam, result.trioMap)
        : null;

      // Helper to format goal differential with +/- sign
      const formatGD = (val: number) => val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);

      const debugLogStr = [
        '=== Brute-Force Optimal Algorithm ===',
        `Combinations evaluated: ${result.combinationsEvaluated.toLocaleString()}`,
        `Compute time: ${result.computeTimeMs.toFixed(0)}ms`,
        `Balance score: ${result.balanceScore.toFixed(4)}`,
        '',
        '=== Data Loading Stats ===',
        `Chemistry pairs loaded: ${stats.chemistryPairsLoaded}`,
        `Rivalry pairs loaded: ${stats.rivalryPairsLoaded ?? 'N/A'}`,
        `Trios loaded: ${stats.triosLoaded ?? 'N/A'}`,
        `Players with win rate: ${stats.playersWithWinRate}/${stats.totalPlayers}`,
        `Players with goal diff: ${stats.playersWithGoalDiff}/${stats.totalPlayers}`,
        `Players with position: ${stats.playersWithPosition}/${stats.totalPlayers}`,
        `Players with attributes: ${stats.playersWithAttributes}/${stats.totalPlayers}`,
        '',
        '=== Team Averages Comparison ===',
        `                Blue     Orange   Gap`,
        `Attack:         ${coreBreakdown.blue.attack.toFixed(2).padStart(5)}    ${coreBreakdown.orange.attack.toFixed(2).padStart(5)}    ${coreBreakdown.gaps.attack.toFixed(2)}`,
        `Defense:        ${coreBreakdown.blue.defense.toFixed(2).padStart(5)}    ${coreBreakdown.orange.defense.toFixed(2).padStart(5)}    ${coreBreakdown.gaps.defense.toFixed(2)}`,
        `Game IQ:        ${coreBreakdown.blue.gameIq.toFixed(2).padStart(5)}    ${coreBreakdown.orange.gameIq.toFixed(2).padStart(5)}    ${coreBreakdown.gaps.gameIq.toFixed(2)}`,
        `GK:             ${coreBreakdown.blue.gk.toFixed(2).padStart(5)}    ${coreBreakdown.orange.gk.toFixed(2).padStart(5)}    ${coreBreakdown.gaps.gk.toFixed(2)}`,
        '',
        '=== Performance Balance (Overall/Career) ===',
        `                Blue     Orange   Gap`,
        `Overall WR:     ${perfBreakdown.blue.overallWinRate.toFixed(1).padStart(5)}%   ${perfBreakdown.orange.overallWinRate.toFixed(1).padStart(5)}%   ${perfBreakdown.gaps.overallWinRate.toFixed(1)}%`,
        `Recent WR:      ${perfBreakdown.blue.recentWinRate.toFixed(1).padStart(5)}%   ${perfBreakdown.orange.recentWinRate.toFixed(1).padStart(5)}%   ${perfBreakdown.gaps.recentWinRate.toFixed(1)}%`,
        `Recent GD:      ${formatGD(perfBreakdown.blue.recentGoalDiff).padStart(6)}   ${formatGD(perfBreakdown.orange.recentGoalDiff).padStart(6)}   ${perfBreakdown.gaps.recentGoalDiff.toFixed(1)}`,
        `Players w/data: ${perfBreakdown.blue.playersWithData}/${result.blueTeam.length}      ${perfBreakdown.orange.playersWithData}/${result.orangeTeam.length}`,
        '',
        '=== Form Analysis (Recent vs Career) ===',
        `                Blue     Orange   Gap`,
        `Avg Form Delta: ${formBreakdown.blue.avgFormDelta >= 0 ? '+' : ''}${formBreakdown.blue.avgFormDelta.toFixed(1).padStart(5)}%  ${formBreakdown.orange.avgFormDelta >= 0 ? '+' : ''}${formBreakdown.orange.avgFormDelta.toFixed(1).padStart(5)}%  ${formBreakdown.gap.toFixed(1)}%`,
        `Hot streaks:    ${formBreakdown.blue.hotStreakCount.toString().padStart(5)}    ${formBreakdown.orange.hotStreakCount.toString().padStart(5)}`,
        `Cold streaks:   ${formBreakdown.blue.coldStreakCount.toString().padStart(5)}    ${formBreakdown.orange.coldStreakCount.toString().padStart(5)}`,
        ...(formBreakdown.mostHotStreak ? [
          `Hottest: ${formBreakdown.mostHotStreak.name} (+${formBreakdown.mostHotStreak.delta.toFixed(0)}%) [${formBreakdown.mostHotStreak.team}]`,
        ] : []),
        ...(formBreakdown.mostColdStreak ? [
          `Coldest: ${formBreakdown.mostColdStreak.name} (${formBreakdown.mostColdStreak.delta.toFixed(0)}%) [${formBreakdown.mostColdStreak.team}]`,
        ] : []),
        '',
        '=== Position Distribution ===',
        `                Blue  Orange  Gap`,
        `Defenders:      ${posBreakdown.blue.DEF.toString().padStart(4)}  ${posBreakdown.orange.DEF.toString().padStart(6)}  ${posBreakdown.gaps.DEF}`,
        `Midfielders:    ${posBreakdown.blue.MID.toString().padStart(4)}  ${posBreakdown.orange.MID.toString().padStart(6)}  ${posBreakdown.gaps.MID}`,
        `Attackers:      ${posBreakdown.blue.ATT.toString().padStart(4)}  ${posBreakdown.orange.ATT.toString().padStart(6)}  ${posBreakdown.gaps.ATT}`,
        `Strikers:       ${posBreakdown.blue.strikers.toString().padStart(4)}  ${posBreakdown.orange.strikers.toString().padStart(6)}  ${posBreakdown.gaps.strikers}`,
        '',
        '=== Attribute Balance ===',
        `                Blue    Orange  Gap`,
        `Pace:           ${attrBreakdown.blue.pace.toFixed(2).padStart(5)}   ${attrBreakdown.orange.pace.toFixed(2).padStart(5)}   ${attrBreakdown.gaps.pace.toFixed(3)}`,
        `Shooting:       ${attrBreakdown.blue.shooting.toFixed(2).padStart(5)}   ${attrBreakdown.orange.shooting.toFixed(2).padStart(5)}   ${attrBreakdown.gaps.shooting.toFixed(3)}`,
        `Passing:        ${attrBreakdown.blue.passing.toFixed(2).padStart(5)}   ${attrBreakdown.orange.passing.toFixed(2).padStart(5)}   ${attrBreakdown.gaps.passing.toFixed(3)}`,
        `Dribbling:      ${attrBreakdown.blue.dribbling.toFixed(2).padStart(5)}   ${attrBreakdown.orange.dribbling.toFixed(2).padStart(5)}   ${attrBreakdown.gaps.dribbling.toFixed(3)}`,
        `Defending:      ${attrBreakdown.blue.defending.toFixed(2).padStart(5)}   ${attrBreakdown.orange.defending.toFixed(2).padStart(5)}   ${attrBreakdown.gaps.defending.toFixed(3)}`,
        `Physical:       ${attrBreakdown.blue.physical.toFixed(2).padStart(5)}   ${attrBreakdown.orange.physical.toFixed(2).padStart(5)}   ${attrBreakdown.gaps.physical.toFixed(3)}`,
        '',
        '=== Chemistry Analysis ===',
        'Pairwise:',
        ...(chemBreakdown ? [
          `  Blue avg: ${chemBreakdown.blueAvgChemistry.toFixed(1)} (${chemBreakdown.bluePairsWithData} pairs)`,
          `  Orange avg: ${chemBreakdown.orangeAvgChemistry.toFixed(1)} (${chemBreakdown.orangePairsWithData} pairs)`,
          `  Gap: ${chemBreakdown.gap.toFixed(1)}`,
        ] : ['  No pairwise chemistry data available']),
        '',
        'Rivalry:',
        ...(rivalryBreakdown ? [
          `  Net Blue advantage: ${rivalryBreakdown.netBlueAdvantage > 0 ? '+' : ''}${rivalryBreakdown.netBlueAdvantage.toFixed(1)}`,
          `  Matchups with data: ${rivalryBreakdown.matchupsWithData}/${rivalryBreakdown.totalMatchups}`,
          ...(rivalryBreakdown.mostLopsidedMatchup ? [
            `  Most lopsided: ${rivalryBreakdown.mostLopsidedMatchup.bluePlayer} vs ${rivalryBreakdown.mostLopsidedMatchup.orangePlayer} (${rivalryBreakdown.mostLopsidedMatchup.blueAdvantage > 0 ? '+' : ''}${rivalryBreakdown.mostLopsidedMatchup.blueAdvantage.toFixed(1)} Blue)`,
          ] : []),
        ] : ['  No rivalry data available']),
        '',
        'Trio:',
        ...(trioBreakdown ? [
          `  Blue avg: ${trioBreakdown.blueAvgTrioScore.toFixed(1)} (${trioBreakdown.blueTriosWithData}/${trioBreakdown.blueTotalTrios} trios)`,
          `  Orange avg: ${trioBreakdown.orangeAvgTrioScore.toFixed(1)} (${trioBreakdown.orangeTriosWithData}/${trioBreakdown.orangeTotalTrios} trios)`,
          `  Gap: ${trioBreakdown.gap.toFixed(1)}`,
          ...(trioBreakdown.topBlueTrio ? [
            `  Top Blue trio: ${trioBreakdown.topBlueTrio.players.join(', ')} (${trioBreakdown.topBlueTrio.score.toFixed(1)})`,
          ] : []),
          ...(trioBreakdown.topOrangeTrio ? [
            `  Top Orange trio: ${trioBreakdown.topOrangeTrio.players.join(', ')} (${trioBreakdown.topOrangeTrio.score.toFixed(1)})`,
          ] : []),
        ] : ['  No trio data available']),
        '',
        '=== Score Breakdown ===',
        `Core Ratings (40%): ${result.scoreBreakdown.coreRatings.toFixed(4)}`,
        `Chemistry (20%): ${result.scoreBreakdown.chemistry.toFixed(4)}`,
        ...(chemDetails ? [
          `  └─ Pairwise (50%): ${chemDetails.pairwise.toFixed(4)}`,
          `  └─ Rivalry (30%): ${chemDetails.rivalry.toFixed(4)}`,
          `  └─ Trio (20%): ${chemDetails.trio.toFixed(4)}`,
        ] : []),
        `Performance/Career (15%): ${result.scoreBreakdown.performance.toFixed(4)}`,
        `Form/Streaks (5%): ${result.scoreBreakdown.form.toFixed(4)}`,
        `Position (10%): ${result.scoreBreakdown.position.toFixed(4)}`,
        `Attributes (10%): ${result.scoreBreakdown.attributes.toFixed(4)}`,
        '',
        '=== Tier Distribution ===',
        `Blue Team: ${result.tierDistribution.blue.top}-${result.tierDistribution.blue.middle}-${result.tierDistribution.blue.bottom} (top-mid-bottom)`,
        `Orange Team: ${result.tierDistribution.orange.top}-${result.tierDistribution.orange.middle}-${result.tierDistribution.orange.bottom} (top-mid-bottom)`,
        '',
        '=== Teams ===',
        'Blue Team:',
        ...result.blueTeam.map(p => {
          const pos = p.primaryPosition ? `[${p.primaryPosition}]` : '';
          const wr = p.recentWinRate !== null ? `WR: ${p.recentWinRate.toFixed(0)}%` : '';
          const gd = p.recentGoalDiff !== null ? `GD: ${p.recentGoalDiff > 0 ? '+' : ''}${p.recentGoalDiff.toFixed(0)}` : '';
          const perf = [wr, gd].filter(Boolean).join(' ');
          return `  - ${p.friendly_name} (ATK: ${p.attack.toFixed(1)}, DEF: ${p.defense.toFixed(1)}, IQ: ${p.gameIq.toFixed(1)}, GK: ${p.gk.toFixed(1)}) ${pos} ${perf}`.trim();
        }),
        '',
        'Orange Team:',
        ...result.orangeTeam.map(p => {
          const pos = p.primaryPosition ? `[${p.primaryPosition}]` : '';
          const wr = p.recentWinRate !== null ? `WR: ${p.recentWinRate.toFixed(0)}%` : '';
          const gd = p.recentGoalDiff !== null ? `GD: ${p.recentGoalDiff > 0 ? '+' : ''}${p.recentGoalDiff.toFixed(0)}` : '';
          const perf = [wr, gd].filter(Boolean).join(' ');
          return `  - ${p.friendly_name} (ATK: ${p.attack.toFixed(1)}, DEF: ${p.defense.toFixed(1)}, IQ: ${p.gameIq.toFixed(1)}, GK: ${p.gk.toFixed(1)}) ${pos} ${perf}`.trim();
        }),
      ].join('\n');

      setDebugLog(debugLogStr);

      toast.dismiss();
      toast.success(`Generated optimal teams! Score: ${result.balanceScore.toFixed(3)} (${result.combinationsEvaluated.toLocaleString()} combinations in ${result.computeTimeMs.toFixed(0)}ms)`);
    } catch (error) {
      toast.dismiss();
      toast.error('Error generating brute-force teams');
      console.error('Error generating brute-force teams:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTeams = () => {
    if (algorithm === 'brute-force') {
      generateBruteForceTeams();
    } else {
      generateTierBasedTeams();
    }
  };

  const applyTierBasedTeams = () => {
    if (!tierBasedResult) return;

    onApplyTeams(
      tierBasedResult.blueTeam.map(p => ({ ...p, team: 'blue' })),
      tierBasedResult.orangeTeam.map(p => ({ ...p, team: 'orange' }))
    );

    setTierBasedResult(null);
    toast.success('Applied tier-based team configuration');
  };

  const applyBruteForceTeams = () => {
    if (!bruteForceResult) return;

    const { blueTeam, orangeTeam } = resultToTeamAssignments(bruteForceResult);
    onApplyTeams(blueTeam, orangeTeam);

    setBruteForceResult(null);
    toast.success('Applied optimal team configuration');
  };

  const applyTeams = () => {
    if (bruteForceResult) {
      applyBruteForceTeams();
    } else if (tierBasedResult) {
      applyTierBasedTeams();
    }
  };

  const hasResult = tierBasedResult || bruteForceResult;

  const getConfidenceColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
    }
  };

  const getConfidenceIcon = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
      case 'medium': return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
      case 'low': return "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
    }
  };

  return (
    <div className="mb-6 bg-base-100 p-4 rounded-lg border">
      <h3 className="text-lg font-bold mb-2">Team Generation</h3>

      {/* Algorithm selector */}
      <div className="mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Algorithm:</span>
          <div className="flex gap-2">
            <Tooltip content="Guaranteed optimal - evaluates all valid combinations">
              <button
                className={`btn btn-sm ${algorithm === 'brute-force' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAlgorithm('brute-force')}
              >
                Brute-Force Optimal
              </button>
            </Tooltip>
            <Tooltip content="Uses simulated annealing with tier-based snake draft">
              <button
                className={`btn btn-sm ${algorithm === 'tier-based' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAlgorithm('tier-based')}
              >
                Tier-Based (Legacy)
              </button>
            </Tooltip>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {algorithm === 'brute-force'
            ? 'Evaluates all combinations with spread constraint (equal players from top/middle/bottom thirds). Guaranteed optimal.'
            : 'Uses snake draft with simulated annealing. May not find global optimum.'}
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <Tooltip content={algorithm === 'brute-force'
          ? 'Generate optimal teams using brute-force algorithm'
          : 'Generate teams using tier-based snake draft algorithm with chemistry balancing'
        }>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleGenerateTeams}
            disabled={allPlayers.length < 2 || isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading loading-spinner loading-xs mr-2"></span>
                Generating...
              </>
            ) : (
              `Generate ${algorithm === 'brute-force' ? 'Optimal' : 'Tier-Based'} Teams`
            )}
          </button>
        </Tooltip>
      </div>
      
      {tierBasedResult && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Tier-Based Configuration</h4>
            <div className="flex gap-2">
              <span className="badge badge-secondary">
                Initial Score: {tierBasedResult.initialScore.toFixed(2)}
              </span>
              {tierBasedResult.wasOptimized && (
                <span className="badge badge-success">
                  Optimized: {tierBasedResult.optimizedScore.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          
          {/* View mode selector */}
          <div className="flex gap-2 mb-4">
            <button 
              className={`btn btn-xs ${viewMode === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('summary')}
            >
              Summary
            </button>
            <button 
              className={`btn btn-xs ${viewMode === 'visual' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('visual')}
            >
              Visual Analysis
            </button>
            <button 
              className={`btn btn-xs ${viewMode === 'debug' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('debug')}
            >
              Debug Log
            </button>
            <Tooltip content="View full-page interactive visualization">
              <button 
                className="btn btn-xs btn-accent"
                onClick={() => navigate('/admin/team-balancing/visualization', {
                  state: {
                    debugLog,
                    blueTeam: tierBasedResult.blueTeam,
                    orangeTeam: tierBasedResult.orangeTeam
                  }
                })}
              >
                Full Visualization →
              </button>
            </Tooltip>
          </div>

          {/* Confidence indicator */}
          <div className={`alert alert-${getConfidenceColor(tierBasedResult.confidenceLevel)} mb-4`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={getConfidenceIcon(tierBasedResult.confidenceLevel)} />
            </svg>
            <span>{tierBasedResult.confidenceMessage}</span>
          </div>

          {/* Conditional content based on view mode */}
          {viewMode === 'summary' && (
            <>
              {/* Tier distribution */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium">Tier Distribution</h5>
                  <button 
                    className="btn btn-xs btn-ghost"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tierBasedResult.tiers.map((tier) => (
                    <div key={tier.tierNumber} className="bg-base-200 p-2 rounded">
                      <div className="font-medium text-sm mb-1">
                        Tier {tier.tierNumber} ({tier.players.length} players)
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Rating: {tier.skillRange.min.toFixed(1)} - {tier.skillRange.max.toFixed(1)}
                      </div>
                      {showDetails && (
                        <ul className="text-xs">
                          {tier.players.map((player: PlayerWithRating) => (
                            <li key={player.player_id} className="truncate">
                              {player.friendly_name} ({player.threeLayerRating.toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Team assignments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                    Blue Team ({tierBasedResult.blueTeam.length} players)
                  </h5>
                  <div className="text-sm mb-2">
                    <div>Avg Attack: {(tierBasedResult.blueTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / tierBasedResult.blueTeam.length).toFixed(1)}</div>
                    <div>Avg Defense: {(tierBasedResult.blueTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / tierBasedResult.blueTeam.length).toFixed(1)}</div>
                    <div>Avg Game IQ: {(tierBasedResult.blueTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / tierBasedResult.blueTeam.length).toFixed(1)}</div>
                  </div>
                  <ul className="text-sm">
                    {tierBasedResult.blueTeam.map((player: PlayerWithRating) => (
                      <li key={player.player_id} className="mb-1">
                        <span className="flex items-center gap-2">
                          {player.friendly_name}
                          <span className="badge badge-xs">Tier {player.tier}</span>
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          <Tooltip content={`Three-layer rating: ${player.threeLayerRating.toFixed(2)}`}>
                            <span>
                              A: {formatRating(player.attack_rating)},
                              D: {formatRating(player.defense_rating)},
                              IQ: {formatRating(player.game_iq_rating)}
                            </span>
                          </Tooltip>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <h5 className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                    Orange Team ({tierBasedResult.orangeTeam.length} players)
                  </h5>
                  <div className="text-sm mb-2">
                    <div>Avg Attack: {(tierBasedResult.orangeTeam.reduce((sum, p) => sum + (p.attack_rating ?? 0), 0) / tierBasedResult.orangeTeam.length).toFixed(1)}</div>
                    <div>Avg Defense: {(tierBasedResult.orangeTeam.reduce((sum, p) => sum + (p.defense_rating ?? 0), 0) / tierBasedResult.orangeTeam.length).toFixed(1)}</div>
                    <div>Avg Game IQ: {(tierBasedResult.orangeTeam.reduce((sum, p) => sum + (p.game_iq_rating ?? 0), 0) / tierBasedResult.orangeTeam.length).toFixed(1)}</div>
                  </div>
                  <ul className="text-sm">
                    {tierBasedResult.orangeTeam.map((player: PlayerWithRating) => (
                      <li key={player.player_id} className="mb-1">
                        <span className="flex items-center gap-2">
                          {player.friendly_name}
                          <span className="badge badge-xs">Tier {player.tier}</span>
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          <Tooltip content={`Three-layer rating: ${player.threeLayerRating.toFixed(2)}`}>
                            <span>
                              A: {formatRating(player.attack_rating)}, 
                              D: {formatRating(player.defense_rating)}, 
                              IQ: {formatRating(player.game_iq_rating)}
                            </span>
                          </Tooltip>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Visual analysis view */}
          {viewMode === 'visual' && debugLog && (
            <TierBasedDebugVisualization 
              debugLog={debugLog}
              blueTeam={tierBasedResult.blueTeam}
              orangeTeam={tierBasedResult.orangeTeam}
            />
          )}

          {/* Debug log view */}
          {viewMode === 'debug' && debugLog && (
            <div className="bg-base-200 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-medium text-sm">Debug Log</h5>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(debugLog)
                      .then(() => toast.success('Debug log copied to clipboard'))
                      .catch(() => toast.error('Failed to copy to clipboard'));
                  }}
                >
                  Copy All
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs max-h-96 overflow-y-auto">
                {debugLog}
              </pre>
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="btn btn-primary btn-sm"
              onClick={applyTierBasedTeams}
            >
              Apply Tier-Based Teams
            </button>
          </div>
        </div>
      )}

      {/* Brute Force Results */}
      {bruteForceResult && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Optimal Team Configuration</h4>
            <div className="flex gap-2">
              <span className="badge badge-success">
                Score: {bruteForceResult.balanceScore.toFixed(4)}
              </span>
              <span className="badge badge-info">
                {bruteForceResult.combinationsEvaluated.toLocaleString()} combos in {bruteForceResult.computeTimeMs.toFixed(0)}ms
              </span>
            </div>
          </div>

          {/* View mode selector */}
          <div className="flex gap-2 mb-4">
            <button
              className={`btn btn-xs ${viewMode === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('summary')}
            >
              Summary
            </button>
            <button
              className={`btn btn-xs ${viewMode === 'debug' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('debug')}
            >
              Debug Log
            </button>
          </div>

          {/* Score breakdown */}
          <div className="alert alert-success mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-bold">Guaranteed Optimal Solution</span>
              <span className="block text-sm">
                Tier distribution: Blue {bruteForceResult.tierDistribution.blue.top}-{bruteForceResult.tierDistribution.blue.middle}-{bruteForceResult.tierDistribution.blue.bottom},
                Orange {bruteForceResult.tierDistribution.orange.top}-{bruteForceResult.tierDistribution.orange.middle}-{bruteForceResult.tierDistribution.orange.bottom}
              </span>
            </div>
          </div>

          {viewMode === 'summary' && (
            <>
              {/* Score breakdown display */}
              <div className="mb-4 p-3 bg-base-200 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Score Breakdown</h5>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium">Core</div>
                    <div className="text-gray-500 dark:text-gray-400">{(bruteForceResult.scoreBreakdown.coreRatings * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">40% weight</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Chemistry</div>
                    <div className="text-gray-500 dark:text-gray-400">{(bruteForceResult.scoreBreakdown.chemistry * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">20% weight</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Performance</div>
                    <div className="text-gray-500 dark:text-gray-400">{(bruteForceResult.scoreBreakdown.performance * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">20% weight</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Position</div>
                    <div className="text-gray-500 dark:text-gray-400">{(bruteForceResult.scoreBreakdown.position * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">10% weight</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Attributes</div>
                    <div className="text-gray-500 dark:text-gray-400">{(bruteForceResult.scoreBreakdown.attributes * 100).toFixed(1)}%</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">10% weight</div>
                  </div>
                </div>
              </div>

              {/* Team assignments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                    Blue Team ({bruteForceResult.blueTeam.length} players)
                  </h5>
                  <div className="text-sm mb-2">
                    <div>Avg Attack: {(bruteForceResult.blueTeam.reduce((sum, p) => sum + p.attack, 0) / bruteForceResult.blueTeam.length).toFixed(1)}</div>
                    <div>Avg Defense: {(bruteForceResult.blueTeam.reduce((sum, p) => sum + p.defense, 0) / bruteForceResult.blueTeam.length).toFixed(1)}</div>
                    <div>Avg Game IQ: {(bruteForceResult.blueTeam.reduce((sum, p) => sum + p.gameIq, 0) / bruteForceResult.blueTeam.length).toFixed(1)}</div>
                  </div>
                  <ul className="text-sm">
                    {bruteForceResult.blueTeam.map((player) => (
                      <li key={player.player_id} className="mb-1">
                        <span className="flex items-center gap-2">
                          {player.friendly_name}
                          {player.primaryPosition && (
                            <span className="badge badge-xs">{player.primaryPosition}</span>
                          )}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          A: {player.attack.toFixed(1)}, D: {player.defense.toFixed(1)}, IQ: {player.gameIq.toFixed(1)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                  <h5 className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                    Orange Team ({bruteForceResult.orangeTeam.length} players)
                  </h5>
                  <div className="text-sm mb-2">
                    <div>Avg Attack: {(bruteForceResult.orangeTeam.reduce((sum, p) => sum + p.attack, 0) / bruteForceResult.orangeTeam.length).toFixed(1)}</div>
                    <div>Avg Defense: {(bruteForceResult.orangeTeam.reduce((sum, p) => sum + p.defense, 0) / bruteForceResult.orangeTeam.length).toFixed(1)}</div>
                    <div>Avg Game IQ: {(bruteForceResult.orangeTeam.reduce((sum, p) => sum + p.gameIq, 0) / bruteForceResult.orangeTeam.length).toFixed(1)}</div>
                  </div>
                  <ul className="text-sm">
                    {bruteForceResult.orangeTeam.map((player) => (
                      <li key={player.player_id} className="mb-1">
                        <span className="flex items-center gap-2">
                          {player.friendly_name}
                          {player.primaryPosition && (
                            <span className="badge badge-xs">{player.primaryPosition}</span>
                          )}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          A: {player.attack.toFixed(1)}, D: {player.defense.toFixed(1)}, IQ: {player.gameIq.toFixed(1)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Debug log view */}
          {viewMode === 'debug' && debugLog && (
            <div className="bg-base-200 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-medium text-sm">Debug Log</h5>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(debugLog)
                      .then(() => toast.success('Debug log copied to clipboard'))
                      .catch(() => toast.error('Failed to copy to clipboard'));
                  }}
                >
                  Copy All
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs max-h-96 overflow-y-auto">
                {debugLog}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              className="btn btn-primary btn-sm"
              onClick={applyBruteForceTeams}
            >
              Apply Optimal Teams
            </button>
          </div>
        </div>
      )}
    </div>
  );
};