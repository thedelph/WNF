import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormationSuggestion, PlayerPositionAssignment, PositionType, FormationDebugLog } from './types';
import { POSITION_DISPLAY_NAMES, POSITION_COLORS, ConsolidatedFormationDebugLog } from '../../../utils/teamBalancing/formationSuggester';
import { formatRating } from '../../../utils/ratingFormatters';
import { FormationDebugView } from './FormationDebugView';
import { ConsolidatedDebugView } from './ConsolidatedDebugView';

interface FormationViewProps {
  formation: FormationSuggestion;
  teamColor: 'blue' | 'orange';
  showDetails?: boolean;
  debugLog?: FormationDebugLog;
  consolidatedDebugLog?: ConsolidatedFormationDebugLog;
}

export const FormationView: React.FC<FormationViewProps> = ({
  formation,
  teamColor,
  showDetails = true,
  debugLog,
  consolidatedDebugLog
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [expandedPositions, setExpandedPositions] = useState<Set<PositionType>>(new Set());

  const getTeamColorClass = () => {
    return teamColor === 'blue'
      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
  };

  const getTeamAccentClass = () => {
    return teamColor === 'blue'
      ? 'text-blue-600 dark:text-blue-400 border-blue-400 dark:border-blue-600'
      : 'text-orange-600 dark:text-orange-400 border-orange-400 dark:border-orange-600';
  };

  const renderPlayerCard = (assignment: PlayerPositionAssignment, compact = false) => {
    const isSelected = selectedPlayer === assignment.player.player_id;

    // Check if player has position consensus data
    const playerWithPos = assignment.player as any;
    const hasConsensus = playerWithPos.primaryPosition || (playerWithPos.positions && playerWithPos.positions.length > 0);
    const positionSource = playerWithPos.__positionSource;

    // Check if assigned position matches their consensus
    let consensusMatch = false;
    let consensusLabel = '';
    if (hasConsensus && playerWithPos.primaryPosition) {
      // Map their consensus position to formation position
      const consensusFormationPos = playerWithPos.primaryPosition;
      // Simple check - would need full mapping logic for perfect accuracy
      consensusMatch = assignment.position === consensusFormationPos ||
                      (playerWithPos.positions || []).some((p: any) => p.position === assignment.position);
      consensusLabel = playerWithPos.primaryPosition;
    }

    return (
      <motion.div
        key={assignment.player.player_id}
        className={`
          relative cursor-pointer rounded-lg p-2 border-2 transition-all
          ${isSelected ? 'ring-2 ring-offset-1 ' + (teamColor === 'blue' ? 'ring-blue-400' : 'ring-orange-400') : ''}
          ${POSITION_COLORS[assignment.position]}
          hover:scale-105
        `}
        onClick={() => setSelectedPlayer(isSelected ? null : assignment.player.player_id)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Specialist badge */}
        {assignment.isSpecialist && (
          <span className="absolute -top-2 -right-2 text-xs bg-yellow-400 text-yellow-900 px-1 rounded">
            ⭐
          </span>
        )}

        {/* Position consensus badge */}
        {hasConsensus && !compact && (
          <span className={`absolute -top-2 -left-2 text-xs px-1 rounded ${
            positionSource === 'consensus' ? 'bg-green-500 text-white' :
            positionSource === 'playstyle' ? 'bg-blue-500 text-white' :
            'bg-gray-400 text-white'
          }`} title={`Position source: ${positionSource || 'unknown'}`}>
            {positionSource === 'consensus' ? '👥' : positionSource === 'playstyle' ? '⚽' : '📊'}
          </span>
        )}

        <div className="text-center">
          <div className="font-semibold text-sm truncate">
            {assignment.player.friendly_name}
          </div>

          {/* Show consensus position if different from assignment */}
          {!compact && hasConsensus && consensusLabel && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              Consensus: {consensusLabel}
            </div>
          )}

          {!compact && (
            <div className="text-xs mt-1 space-y-0.5">
              <div className="flex justify-center gap-2">
                <span>ATK: {formatRating(assignment.player.attack_rating)}</span>
                <span>DEF: {formatRating(assignment.player.defense_rating)}</span>
              </div>
              <div>IQ: {formatRating(assignment.player.game_iq_rating)}</div>
              <div className="font-medium text-xs mt-1">
                Score: {assignment.score.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        {/* Show alternative positions on selection */}
        <AnimatePresence>
          {isSelected && assignment.alternativePositions.length > 0 && !compact && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-2 z-10"
            >
              <div className="text-xs font-medium mb-1">Also suitable for:</div>
              <div className="space-y-0.5">
                {assignment.alternativePositions.slice(0, 2).map(alt => (
                  <div key={alt.position} className="text-xs">
                    {POSITION_DISPLAY_NAMES[alt.position]}: {alt.score.toFixed(1)}
                  </div>
                ))}
              </div>
              {hasConsensus && (
                <div className="mt-2 pt-2 border-t dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
                  <div className="font-medium">Position Data Source:</div>
                  <div>
                    {positionSource === 'consensus' && '👥 Peer ratings (position consensus)'}
                    {positionSource === 'playstyle' && '⚽ Playstyle attributes'}
                    {positionSource === 'ratings' && '📊 Core ratings only'}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const togglePosition = (position: PositionType) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(position)) {
      newExpanded.delete(position);
    } else {
      newExpanded.add(position);
    }
    setExpandedPositions(newExpanded);
  };

  const expandAll = () => {
    const allPositions: PositionType[] = ['GK', 'DEF', 'WB', 'W', 'CDM', 'CM', 'CAM', 'ST'];
    setExpandedPositions(new Set(allPositions.filter(pos => formation.positions[pos].length > 0)));
  };

  const collapseAll = () => {
    setExpandedPositions(new Set());
  };

  const renderPositionGroup = (
    position: PositionType,
    players: PlayerPositionAssignment[]
  ) => {
    const isExpanded = expandedPositions.has(position);
    
    return (
      <div key={position} className="mb-4">
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-base-200 p-2 rounded-lg transition-colors"
          onClick={() => togglePosition(position)}
        >
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{POSITION_DISPLAY_NAMES[position]}</h4>
            <span className="badge badge-sm">{players.length}</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.div>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 p-2">
                {players.map(player => renderPlayerCard(player))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderPitchView = () => {
    // Simplified pitch visualization with positions
    const { GK, DEF, WB, W, CDM, CM, CAM, ST } = formation.positions;

    return (
      <div className={`relative bg-gradient-to-b from-green-50 to-green-100 rounded-lg p-6 border-2 ${getTeamColorClass()} min-h-[400px]`}>
        {/* Attack line */}
        {ST.length > 0 && (
          <div className="flex justify-center gap-3 mb-6">
            {ST.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Attacking midfield line */}
        {CAM.length > 0 && (
          <div className="flex justify-center gap-3 mb-6">
            {CAM.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Central midfield line */}
        {CM.length > 0 && (
          <div className="flex justify-center gap-3 mb-6">
            {CM.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Defensive midfield line */}
        {CDM.length > 0 && (
          <div className="flex justify-center gap-3 mb-6">
            {CDM.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Winger line - attacking wide players */}
        {W.length > 0 && (
          <div className="flex justify-between px-4 mb-6">
            {W.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}

        {/* Wingback line - defensive wide players */}
        {WB.length > 0 && (
          <div className="flex justify-between px-4 mb-6">
            {WB.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}

        {/* Defense line */}        {DEF.length > 0 && (
          <div className="flex justify-center gap-3 mb-6">
            {DEF.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}

        {/* Goalkeeper line */}
        {GK.length > 0 && (
          <div className="flex justify-center gap-3">
            {GK.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}

        {/* Position labels on the side */}
        <div className="absolute left-2 top-6 text-xs text-gray-600 dark:text-gray-300 space-y-8 hidden lg:block">
          {ST.length > 0 && <div>ST</div>}
          {CAM.length > 0 && <div>CAM</div>}
          {CM.length > 0 && <div>CM</div>}
          {CDM.length > 0 && <div>CDM</div>}
          {W.length > 0 && <div>W</div>}
          {WB.length > 0 && <div>WB</div>}
          {DEF.length > 0 && <div>DEF</div>}
          {GK.length > 0 && <div>GK</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Formation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className={`text-lg font-bold ${getTeamAccentClass()}`}>
            {teamColor === 'blue' ? 'Blue Team' : 'Orange Team'} - {formation.formation}
          </h3>
          <span className={`badge ${
            formation.confidence === 'high' ? 'badge-success' :
            formation.confidence === 'medium' ? 'badge-warning' : 'badge-error'
          }`}>
            {formation.confidence} confidence
          </span>
        </div>
      </div>

      {/* Pitch visualization */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2">Formation Overview</h4>
        {renderPitchView()}
      </div>

      {/* Detailed position breakdown */}
      {showDetails && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Position Details</h4>
            <div className="flex gap-2">
              <button 
                className="btn btn-xs btn-ghost"
                onClick={expandAll}
              >
                Expand All
              </button>
              <button 
                className="btn btn-xs btn-ghost"
                onClick={collapseAll}
              >
                Collapse All
              </button>
            </div>
          </div>
          {(['ST', 'CAM', 'W', 'CM', 'CDM', 'WB', 'DEF', 'GK'] as PositionType[]).map(position => {
            const players = formation.positions[position];
            if (players.length === 0) return null;
            return renderPositionGroup(position, players);
          })}
        </div>
      )}

      {/* Balance scores */}
      <div className="bg-base-200 rounded-lg p-3">
        <h4 className="font-semibold mb-2">Area Strength</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div>
            <span className="text-xs text-gray-600 dark:text-gray-300">Defense:</span>
            <div className="font-semibold">{formation.balanceScore.defense.toFixed(1)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-600 dark:text-gray-300">Midfield:</span>
            <div className="font-semibold">{formation.balanceScore.midfield.toFixed(1)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-600 dark:text-gray-300">Attack:</span>
            <div className="font-semibold">{formation.balanceScore.attack.toFixed(1)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-600 dark:text-gray-300">Overall:</span>
            <div className="font-semibold">{formation.balanceScore.overall.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Rationale */}
      {formation.rationale.length > 0 && showDetails && (
        <div className="bg-base-100 rounded-lg p-3 border">
          <h4 className="font-semibold mb-2">Assignment Notes</h4>
          <ul className="text-xs space-y-1">
            {formation.rationale.slice(0, 5).map((note, idx) => (
              <li key={idx} className="flex items-start">
                <span className="mr-1">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Debug Log - Show consolidated if available, otherwise show individual */}
      {consolidatedDebugLog && showDetails && (
        <ConsolidatedDebugView debugLog={consolidatedDebugLog} />
      )}
      {!consolidatedDebugLog && debugLog && showDetails && (
        <FormationDebugView debugLog={debugLog} teamColor={teamColor} />
      )}
    </div>
  );
};