import React, { useState } from 'react';
import { TeamAssignment } from './types';
import { findTierBasedTeamBalance, PlayerWithRating, TierBasedResult } from './tierBasedSnakeDraft';
import { TierBasedDebugVisualization } from './TierBasedDebugVisualization';
import { Tooltip } from '../../ui/Tooltip';
import { toast } from 'react-hot-toast';
import { formatRating } from '../../../utils/ratingFormatters';
import { useNavigate } from 'react-router-dom';
import { useTeamBalancingChemistry } from '../../../hooks/useTeamBalancingChemistry';

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
  const [showDetails, setShowDetails] = useState(false);
  const [debugLog, setDebugLog] = useState<string>('');
  const [viewMode, setViewMode] = useState<'summary' | 'visual' | 'debug'>('summary');
  const [isGenerating, setIsGenerating] = useState(false);
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

  const applyTierBasedTeams = () => {
    if (!tierBasedResult) return;
    
    onApplyTeams(
      tierBasedResult.blueTeam.map(p => ({ ...p, team: 'blue' })),
      tierBasedResult.orangeTeam.map(p => ({ ...p, team: 'orange' }))
    );
    
    setTierBasedResult(null);
    toast.success('Applied tier-based team configuration');
  };

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
      <h3 className="text-lg font-bold mb-2">Tier-Based Team Generation</h3>
      <p className="text-sm mb-4">
        Uses a snake draft system with player tiers based on skill ratings and performance history.
      </p>
      
      <div className="flex gap-2 mb-4">
        <Tooltip content="Generate teams using tier-based snake draft algorithm with chemistry balancing">
          <button
            className="btn btn-secondary btn-sm"
            onClick={generateTierBasedTeams}
            disabled={allPlayers.length < 2 || isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading loading-spinner loading-xs mr-2"></span>
                Generating...
              </>
            ) : (
              'Generate Tier-Based Teams'
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
                      <div className="text-xs text-gray-500 mb-1">
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
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-700 mb-2">
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
                        <div className="text-xs text-gray-500 ml-2">
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
                
                <div className="bg-orange-50 p-3 rounded-lg">
                  <h5 className="font-medium text-orange-700 mb-2">
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
                        <div className="text-xs text-gray-500 ml-2">
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
    </div>
  );
};