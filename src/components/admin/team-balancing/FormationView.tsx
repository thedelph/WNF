import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormationSuggestion, PlayerPositionAssignment, PositionType, FormationDebugLog } from './types';
import { POSITION_DISPLAY_NAMES, POSITION_COLORS } from '../../../utils/teamBalancing/formationSuggester';
import { formatRating } from '../../../utils/ratingFormatters';
import { FormationDebugView } from './FormationDebugView';

interface FormationViewProps {
  formation: FormationSuggestion;
  teamColor: 'blue' | 'orange';
  showDetails?: boolean;
  debugLog?: FormationDebugLog;
}

export const FormationView: React.FC<FormationViewProps> = ({ 
  formation, 
  teamColor,
  showDetails = true,
  debugLog
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [expandedPositions, setExpandedPositions] = useState<Set<PositionType>>(new Set());

  const getTeamColorClass = () => {
    return teamColor === 'blue' 
      ? 'bg-blue-50 border-blue-300' 
      : 'bg-orange-50 border-orange-300';
  };

  const getTeamAccentClass = () => {
    return teamColor === 'blue' 
      ? 'text-blue-600 border-blue-400' 
      : 'text-orange-600 border-orange-400';
  };

  const renderPlayerCard = (assignment: PlayerPositionAssignment, compact = false) => {
    const isSelected = selectedPlayer === assignment.player.player_id;
    
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
        {assignment.isSpecialist && (
          <span className="absolute -top-2 -right-2 text-xs bg-yellow-400 text-yellow-900 px-1 rounded">
            ⭐
          </span>
        )}
        
        <div className="text-center">
          <div className="font-semibold text-sm truncate">
            {assignment.player.friendly_name}
          </div>
          
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
              className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-10"
            >
              <div className="text-xs font-medium mb-1">Also suitable for:</div>
              <div className="space-y-0.5">
                {assignment.alternativePositions.slice(0, 2).map(alt => (
                  <div key={alt.position} className="text-xs">
                    {POSITION_DISPLAY_NAMES[alt.position]}: {alt.score.toFixed(1)}
                  </div>
                ))}
              </div>
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
    const allPositions: PositionType[] = ['DEF', 'CDM', 'CM', 'CAM', 'ST'];
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
    const { DEF, W, CDM, CM, CAM, ST } = formation.positions;
    
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
        
        {/* Winger line - positioned between defense and midfield */}
        {W.length > 0 && (
          <div className="flex justify-center gap-6 mb-6">
            {W.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Defense line */}
        {DEF.length > 0 && (
          <div className="flex justify-center gap-3">
            {DEF.map(player => (
              <div key={player.player.player_id} className="w-20 sm:w-24">
                {renderPlayerCard(player, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Position labels on the side */}
        <div className="absolute left-2 top-6 text-xs text-gray-600 space-y-12 hidden lg:block">
          {ST.length > 0 && <div>ATK</div>}
          {CAM.length > 0 && <div>CAM</div>}
          {CM.length > 0 && <div>CM</div>}
          {CDM.length > 0 && <div>CDM</div>}
          {W.length > 0 && <div>WING</div>}
          {DEF.length > 0 && <div>DEF</div>}
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
          {(['ST', 'CAM', 'CM', 'CDM', 'W', 'DEF'] as PositionType[]).map(position => {
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
            <span className="text-xs text-gray-600">Defense:</span>
            <div className="font-semibold">{formation.balanceScore.defense.toFixed(1)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-600">Midfield:</span>
            <div className="font-semibold">{formation.balanceScore.midfield.toFixed(1)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-600">Attack:</span>
            <div className="font-semibold">{formation.balanceScore.attack.toFixed(1)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-600">Overall:</span>
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
      
      {/* Debug Log */}
      {debugLog && showDetails && (
        <FormationDebugView debugLog={debugLog} teamColor={teamColor} />
      )}
    </div>
  );
};