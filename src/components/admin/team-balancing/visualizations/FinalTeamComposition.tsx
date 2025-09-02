import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ParsedDebugData } from '../../../../utils/teamBalancing/debugLogParser';
import { PlayerWithRating } from '../../team-balancing/tierBasedSnakeDraft';
import { formatRating } from '../../../../utils/ratingFormatters';
import { FormationView } from '../FormationView';
import { suggestFormations } from '../../../../utils/teamBalancing/formationSuggester';
import { TeamAssignment } from '../types';

interface FinalTeamCompositionProps {
  data: ParsedDebugData;
}

export const FinalTeamComposition: React.FC<FinalTeamCompositionProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'stats' | 'tier' | 'formation'>('cards');

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
            />
            <FormationView 
              formation={formationSuggestions.orangeFormation} 
              teamColor="orange"
              showDetails={true}
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
    </motion.div>
  );
};