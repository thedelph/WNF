import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';
import { PlayerWithRating } from '../../team-balancing/tierBasedSnakeDraft';
import { formatRating } from '../../../../utils/ratingFormatters';
import { FormationView } from '../FormationView';
import { suggestFormations } from '../../../../utils/teamBalancing/formationSuggester';
import { TeamAssignment } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

interface FinalTeamCompositionProps {
  data: ParsedDebugData;
}

export const FinalTeamComposition: React.FC<FinalTeamCompositionProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'stats' | 'tier' | 'formation' | 'playstyles'>('cards');

  const blueTeam = data.blueTeam || [];
  const orangeTeam = data.orangeTeam || [];

  // Convert PlayerWithRating to TeamAssignment for formation suggestions
  const formationSuggestions = useMemo(() => {
    if (blueTeam.length === 0 || orangeTeam.length === 0) return null;
    
    const convertToTeamAssignment = (players: PlayerWithRating[]): TeamAssignment[] => {
      return players.map(p => ({
        team: p.team,
        player_id: p.player_id,
        friendly_name: p.friendly_name,
        attack_rating: p.attack_rating,
        defense_rating: p.defense_rating,
        game_iq_rating: p.game_iq_rating,
        win_rate: p.win_rate,
        goal_differential: p.goal_differential,
        overall_win_rate: p.overall_win_rate,
        overall_goal_differential: p.overall_goal_differential,
        total_games: p.total_games
      }));
    };
    
    const blueAssignments = convertToTeamAssignment(blueTeam);
    const orangeAssignments = convertToTeamAssignment(orangeTeam);
    
    return suggestFormations(blueAssignments, orangeAssignments);
  }, [blueTeam, orangeTeam]);

  // Calculate team stats
  const getTeamStats = (team: PlayerWithRating[]) => {
    const rated = team.filter(p => (p.total_games || 0) >= 10);
    const newPlayers = team.filter(p => (p.total_games || 0) < 10);
    
    return {
      total: team.length,
      rated: rated.length,
      new: newPlayers.length,
      avgAttack: team.reduce((sum, p) => sum + (p.attack_rating || 0), 0) / team.length,
      avgDefense: team.reduce((sum, p) => sum + (p.defense_rating || 0), 0) / team.length,
      avgGameIQ: team.reduce((sum, p) => sum + (p.game_iq_rating || 0), 0) / team.length,
      avgWinRate: rated.reduce((sum, p) => sum + (p.win_rate || 0), 0) / (rated.length || 1),
      avgGoalDiff: rated.reduce((sum, p) => sum + (p.goal_differential || 0), 0) / (rated.length || 1)
    };
  };

  const blueStats = getTeamStats(blueTeam);
  const orangeStats = getTeamStats(orangeTeam);

  // Get playstyle summary for a player
  const getPlaystyleSummary = (player: PlayerWithRating): string | null => {
    if (!player.derived_attributes) return null;
    
    // Get the top 3 attributes
    const attrs = player.derived_attributes;
    const attrArray = [
      { name: 'Pace', value: attrs.pace },
      { name: 'Shooting', value: attrs.shooting },
      { name: 'Passing', value: attrs.passing },
      { name: 'Dribbling', value: attrs.dribbling },
      { name: 'Defending', value: attrs.defending },
      { name: 'Physical', value: attrs.physical }
    ].sort((a, b) => b.value - a.value);
    
    // Find dominant attributes (top attributes that are significantly higher)
    const topAttr = attrArray[0];
    const dominantAttrs = attrArray.filter(a => a.value >= topAttr.value * 0.8);
    
    if (dominantAttrs.length === 1) {
      return `${dominantAttrs[0].name} Focused`;
    } else if (dominantAttrs.length === 2) {
      return `${dominantAttrs[0].name} + ${dominantAttrs[1].name}`;
    } else if (dominantAttrs.length >= 3) {
      return 'All-Rounder';
    }
    return 'Mixed Style';
  };
  
  // Get attribute display for a player  
  const getAttributeDisplay = (player: PlayerWithRating): string | null => {
    if (!player.derived_attributes) return null;
    const attrs = player.derived_attributes;
    const topAttrs = [
      { name: 'PAC', value: attrs.pace },
      { name: 'SHO', value: attrs.shooting },
      { name: 'PAS', value: attrs.passing },
      { name: 'DRI', value: attrs.dribbling },
      { name: 'DEF', value: attrs.defending },
      { name: 'PHY', value: attrs.physical }
    ].sort((a, b) => b.value - a.value)
     .slice(0, 2)
     .map(a => `${a.name}:${(a.value * 10).toFixed(0)}`);
    return topAttrs.join(' ');
  };

  // Player card component
  const PlayerCard = ({ player, team }: { player: PlayerWithRating; team: 'blue' | 'orange' }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`
        p-3 rounded-lg shadow-md cursor-pointer
        ${team === 'blue' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-orange-50 border-2 border-orange-200'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold truncate">{player.friendly_name}</h4>
        <span className="badge badge-sm">Tier {player.tier}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <div>
          <span className="text-gray-500">ATK:</span> {formatRating(player.attack_rating)}
        </div>
        <div>
          <span className="text-gray-500">DEF:</span> {formatRating(player.defense_rating)}
        </div>
        <div>
          <span className="text-gray-500">IQ:</span> {formatRating(player.game_iq_rating)}
        </div>
      </div>
      {(player.total_games || 0) >= 10 && (
        <div className="mt-2 pt-2 border-t text-xs">
          <div className="flex justify-between">
            <span>Win Rate: {player.win_rate?.toFixed(1)}%</span>
            <span>GD: {player.goal_differential > 0 ? '+' : ''}{player.goal_differential}</span>
          </div>
        </div>
      )}
      {(player.total_games || 0) < 10 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          NEW PLAYER
        </div>
      )}
      {player.derived_attributes && (
        <div className="mt-2 pt-2 border-t text-xs">
          <div className="text-purple-600 font-medium">
            {getPlaystyleSummary(player)}
          </div>
          <div className="text-gray-500">
            {getAttributeDisplay(player)}
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-base-100 rounded-lg shadow-lg p-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold mb-4 md:mb-0">Final Team Composition</h2>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('cards')}
          >
            Player Cards
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('stats')}
          >
            Team Stats
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'tier' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('tier')}
          >
            By Tier
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'formation' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('formation')}
          >
            Formation
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'playstyles' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('playstyles')}
          >
            Playstyles
          </button>
        </div>
      </div>

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blue Team */}
          <div>
            <h3 className="font-bold text-blue-600 mb-4">
              Blue Team ({blueTeam.length} players)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {blueTeam.map((player) => (
                <PlayerCard key={player.player_id} player={player} team="blue" />
              ))}
            </div>
          </div>

          {/* Orange Team */}
          <div>
            <h3 className="font-bold text-orange-600 mb-4">
              Orange Team ({orangeTeam.length} players)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {orangeTeam.map((player) => (
                <PlayerCard key={player.player_id} player={player} team="orange" />
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="space-y-6">
          {/* Team comparison */}
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className="text-blue-600">Blue Team</th>
                  <th className="text-orange-600">Orange Team</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Total Players</td>
                  <td>{blueStats.total}</td>
                  <td>{orangeStats.total}</td>
                  <td>{Math.abs(blueStats.total - orangeStats.total)}</td>
                </tr>
                <tr>
                  <td className="font-medium">Rated Players</td>
                  <td>{blueStats.rated}</td>
                  <td>{orangeStats.rated}</td>
                  <td>{Math.abs(blueStats.rated - orangeStats.rated)}</td>
                </tr>
                <tr>
                  <td className="font-medium">New Players</td>
                  <td>{blueStats.new}</td>
                  <td>{orangeStats.new}</td>
                  <td>{Math.abs(blueStats.new - orangeStats.new)}</td>
                </tr>
                <tr>
                  <td className="font-medium">Avg Attack</td>
                  <td>{blueStats.avgAttack.toFixed(2)}</td>
                  <td>{orangeStats.avgAttack.toFixed(2)}</td>
                  <td>{Math.abs(blueStats.avgAttack - orangeStats.avgAttack).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="font-medium">Avg Defense</td>
                  <td>{blueStats.avgDefense.toFixed(2)}</td>
                  <td>{orangeStats.avgDefense.toFixed(2)}</td>
                  <td>{Math.abs(blueStats.avgDefense - orangeStats.avgDefense).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="font-medium">Avg Game IQ</td>
                  <td>{blueStats.avgGameIQ.toFixed(2)}</td>
                  <td>{orangeStats.avgGameIQ.toFixed(2)}</td>
                  <td>{Math.abs(blueStats.avgGameIQ - orangeStats.avgGameIQ).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="font-medium">Avg Win Rate</td>
                  <td>{blueStats.avgWinRate.toFixed(1)}%</td>
                  <td>{orangeStats.avgWinRate.toFixed(1)}%</td>
                  <td>{Math.abs(blueStats.avgWinRate - orangeStats.avgWinRate).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="font-medium">Avg Goal Diff</td>
                  <td>{blueStats.avgGoalDiff > 0 ? '+' : ''}{blueStats.avgGoalDiff.toFixed(1)}</td>
                  <td>{orangeStats.avgGoalDiff > 0 ? '+' : ''}{orangeStats.avgGoalDiff.toFixed(1)}</td>
                  <td>{Math.abs(blueStats.avgGoalDiff - orangeStats.avgGoalDiff).toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Visual representation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-bold text-blue-600 mb-3">Blue Team Strengths</h4>
              <div className="space-y-2">
                {blueStats.avgAttack > orangeStats.avgAttack && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚔️</span>
                    <span>Superior Attack (+{(blueStats.avgAttack - orangeStats.avgAttack).toFixed(2)})</span>
                  </div>
                )}
                {blueStats.avgDefense > orangeStats.avgDefense && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛡️</span>
                    <span>Superior Defense (+{(blueStats.avgDefense - orangeStats.avgDefense).toFixed(2)})</span>
                  </div>
                )}
                {blueStats.avgGameIQ > orangeStats.avgGameIQ && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <span>Superior Game IQ (+{(blueStats.avgGameIQ - orangeStats.avgGameIQ).toFixed(2)})</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-bold text-orange-600 mb-3">Orange Team Strengths</h4>
              <div className="space-y-2">
                {orangeStats.avgAttack > blueStats.avgAttack && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚔️</span>
                    <span>Superior Attack (+{(orangeStats.avgAttack - blueStats.avgAttack).toFixed(2)})</span>
                  </div>
                )}
                {orangeStats.avgDefense > blueStats.avgDefense && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛡️</span>
                    <span>Superior Defense (+{(orangeStats.avgDefense - blueStats.avgDefense).toFixed(2)})</span>
                  </div>
                )}
                {orangeStats.avgGameIQ > blueStats.avgGameIQ && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <span>Superior Game IQ (+{(orangeStats.avgGameIQ - blueStats.avgGameIQ).toFixed(2)})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'tier' && (
        <div className="space-y-4">
          {data.teamComposition.byTier.map((tier) => (
            <div key={tier.tier} className="bg-base-200 rounded-lg p-4">
              <h4 className="font-bold mb-3">Tier {tier.tier}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-blue-600 mb-2">
                    Blue Team ({tier.blueCount} players)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {blueTeam
                      .filter(p => p.tier === tier.tier)
                      .map(player => (
                        <div key={player.player_id} className="badge badge-lg badge-primary">
                          {player.friendly_name}
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-orange-600 mb-2">
                    Orange Team ({tier.orangeCount} players)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {orangeTeam
                      .filter(p => p.tier === tier.tier)
                      .map(player => (
                        <div key={player.player_id} className="badge badge-lg" style={{ backgroundColor: '#fed7aa', color: '#c2410c' }}>
                          {player.friendly_name}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'formation' && formationSuggestions && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormationView 
              formation={formationSuggestions.blueFormation} 
              teamColor="blue"
              showDetails={true}
              debugLog={formationSuggestions.debugLog?.blue}
            />
            <FormationView 
              formation={formationSuggestions.orangeFormation} 
              teamColor="orange"
              showDetails={true}
              debugLog={formationSuggestions.debugLog?.orange}
            />
          </div>
          
          {formationSuggestions.formationNotes.length > 0 && (
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Formation Notes</h4>
              <ul className="text-sm space-y-1">
                {formationSuggestions.formationNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {viewMode === 'formation' && !formationSuggestions && (
        <div className="text-center py-8 text-gray-500">
          No formation suggestions available. Teams may be empty or have insufficient data.
        </div>
      )}

      {viewMode === 'playstyles' && (
        <div className="space-y-6">
          {/* Playstyle Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blue Team Playstyles */}
            <div>
              <h3 className="font-bold text-blue-600 mb-4">
                Blue Team Playstyles
              </h3>
              <div className="space-y-2">
                {(() => {
                  const playstyleCount = new Map<string, { count: number; players: string[] }>();
                  blueTeam.forEach(player => {
                    const styleSummary = getPlaystyleSummary(player) || 'No Playstyle Data';
                    if (!playstyleCount.has(styleSummary)) {
                      playstyleCount.set(styleSummary, { count: 0, players: [] });
                    }
                    const data = playstyleCount.get(styleSummary)!;
                    data.count++;
                    data.players.push(player.friendly_name);
                  });
                  
                  return Array.from(playstyleCount.entries())
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([name, data]) => (
                      <div key={name} className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{name}</span>
                            <span className="ml-2 badge badge-sm">{data.count}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {data.players.join(', ')}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>

            {/* Orange Team Playstyles */}
            <div>
              <h3 className="font-bold text-orange-600 mb-4">
                Orange Team Playstyles
              </h3>
              <div className="space-y-2">
                {(() => {
                  const playstyleCount = new Map<string, { count: number; players: string[] }>();
                  orangeTeam.forEach(player => {
                    const styleSummary = getPlaystyleSummary(player) || 'No Playstyle Data';
                    if (!playstyleCount.has(styleSummary)) {
                      playstyleCount.set(styleSummary, { count: 0, players: [] });
                    }
                    const data = playstyleCount.get(styleSummary)!;
                    data.count++;
                    data.players.push(player.friendly_name);
                  });
                  
                  return Array.from(playstyleCount.entries())
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([name, data]) => (
                      <div key={name} className="bg-orange-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{name}</span>
                            <span className="ml-2 badge badge-sm">{data.count}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {data.players.join(', ')}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>

          {/* Attribute Comparison */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-4">Average Team Attributes</h4>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th className="text-blue-600">Blue Team</th>
                    <th className="text-orange-600">Orange Team</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const blueAttrs = { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0 };
                    const orangeAttrs = { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0 };
                    let blueCount = 0, orangeCount = 0;
                    
                    blueTeam.forEach(p => {
                      if (p.derived_attributes) {
                        blueAttrs.pace += p.derived_attributes.pace;
                        blueAttrs.shooting += p.derived_attributes.shooting;
                        blueAttrs.passing += p.derived_attributes.passing;
                        blueAttrs.dribbling += p.derived_attributes.dribbling;
                        blueAttrs.defending += p.derived_attributes.defending;
                        blueAttrs.physical += p.derived_attributes.physical;
                        blueCount++;
                      }
                    });
                    
                    orangeTeam.forEach(p => {
                      if (p.derived_attributes) {
                        orangeAttrs.pace += p.derived_attributes.pace;
                        orangeAttrs.shooting += p.derived_attributes.shooting;
                        orangeAttrs.passing += p.derived_attributes.passing;
                        orangeAttrs.dribbling += p.derived_attributes.dribbling;
                        orangeAttrs.defending += p.derived_attributes.defending;
                        orangeAttrs.physical += p.derived_attributes.physical;
                        orangeCount++;
                      }
                    });
                    
                    if (blueCount > 0) {
                      Object.keys(blueAttrs).forEach(k => blueAttrs[k as keyof typeof blueAttrs] /= blueCount);
                    }
                    if (orangeCount > 0) {
                      Object.keys(orangeAttrs).forEach(k => orangeAttrs[k as keyof typeof orangeAttrs] /= orangeCount);
                    }
                    
                    return ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'].map(attr => {
                      const key = attr as keyof typeof blueAttrs;
                      const blueVal = blueAttrs[key] * 10;
                      const orangeVal = orangeAttrs[key] * 10;
                      const diff = Math.abs(blueVal - orangeVal);
                      
                      return (
                        <tr key={attr}>
                          <td className="font-medium capitalize">{attr}</td>
                          <td>{blueVal.toFixed(1)}</td>
                          <td>{orangeVal.toFixed(1)}</td>
                          <td className={diff > 0.5 ? 'text-warning' : ''}>{diff.toFixed(1)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              * Attributes are derived from player playstyles (0-10 scale)
            </div>
          </div>

          {/* Radar Chart Visualization */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-4">Team Attribute Profiles</h4>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  const blueAttrs = { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0 };
                  const orangeAttrs = { pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0 };
                  let blueCount = 0, orangeCount = 0;
                  
                  blueTeam.forEach(p => {
                    if (p.derived_attributes) {
                      blueAttrs.pace += p.derived_attributes.pace;
                      blueAttrs.shooting += p.derived_attributes.shooting;
                      blueAttrs.passing += p.derived_attributes.passing;
                      blueAttrs.dribbling += p.derived_attributes.dribbling;
                      blueAttrs.defending += p.derived_attributes.defending;
                      blueAttrs.physical += p.derived_attributes.physical;
                      blueCount++;
                    }
                  });
                  
                  orangeTeam.forEach(p => {
                    if (p.derived_attributes) {
                      orangeAttrs.pace += p.derived_attributes.pace;
                      orangeAttrs.shooting += p.derived_attributes.shooting;
                      orangeAttrs.passing += p.derived_attributes.passing;
                      orangeAttrs.dribbling += p.derived_attributes.dribbling;
                      orangeAttrs.defending += p.derived_attributes.defending;
                      orangeAttrs.physical += p.derived_attributes.physical;
                      orangeCount++;
                    }
                  });
                  
                  if (blueCount > 0) {
                    Object.keys(blueAttrs).forEach(k => blueAttrs[k as keyof typeof blueAttrs] /= blueCount);
                  }
                  if (orangeCount > 0) {
                    Object.keys(orangeAttrs).forEach(k => orangeAttrs[k as keyof typeof orangeAttrs] /= orangeCount);
                  }
                  
                  const chartData = [
                    { attribute: 'Pace', blue: blueAttrs.pace * 10, orange: orangeAttrs.pace * 10 },
                    { attribute: 'Shooting', blue: blueAttrs.shooting * 10, orange: orangeAttrs.shooting * 10 },
                    { attribute: 'Passing', blue: blueAttrs.passing * 10, orange: orangeAttrs.passing * 10 },
                    { attribute: 'Dribbling', blue: blueAttrs.dribbling * 10, orange: orangeAttrs.dribbling * 10 },
                    { attribute: 'Defending', blue: blueAttrs.defending * 10, orange: orangeAttrs.defending * 10 },
                    { attribute: 'Physical', blue: blueAttrs.physical * 10, orange: orangeAttrs.physical * 10 }
                  ];
                  
                  // Calculate dynamic domain
                  const allValues = chartData.flatMap(d => [d.blue, d.orange]).filter(v => v > 0);
                  if (allValues.length === 0) {
                    return (
                      <RadarChart data={chartData}>
                        <text x="50%" y="50%" textAnchor="middle" className="fill-gray-500">
                          No attribute data available
                        </text>
                      </RadarChart>
                    );
                  }
                  
                  const minValue = Math.min(...allValues);
                  const maxValue = Math.max(...allValues);
                  const range = maxValue - minValue;
                  const padding = Math.max(0.5, range * 0.1); // At least 0.5 padding, or 10% of range
                  const domainMin = Math.max(0, minValue - padding);
                  const domainMax = Math.min(10, maxValue + padding);
                  
                  return (
                    <RadarChart data={chartData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis 
                        dataKey="attribute"
                        tick={{ fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[domainMin, domainMax]} 
                        tickCount={Math.min(6, Math.ceil((domainMax - domainMin) / 0.5) + 1)}
                        tick={{ fontSize: 10 }}
                      />
                      <Radar
                        name="Blue Team"
                        dataKey="blue"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Orange Team"
                        dataKey="orange"
                        stroke="#fb923c"
                        fill="#fb923c"
                        fillOpacity={0.3}
                      />
                      <Legend />
                    </RadarChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Radar chart shows averaged team attributes with dynamic scaling
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};