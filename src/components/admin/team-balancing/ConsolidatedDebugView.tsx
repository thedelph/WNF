import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConsolidatedFormationDebugLog } from '../../../utils/teamBalancing/formationSuggester';
import { formatRating } from '../../../utils/ratingFormatters';

interface ConsolidatedDebugViewProps {
  debugLog: ConsolidatedFormationDebugLog;
}

export const ConsolidatedDebugView: React.FC<ConsolidatedDebugViewProps> = ({ debugLog }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDebugLogAsText = (): string => {
    const lines: string[] = [];

    lines.push('===== CONSOLIDATED FORMATION DEBUG LOG =====');
    lines.push(`Timestamp: ${debugLog.timestamp}`);
    lines.push(`Total Players: ${debugLog.totalPlayers} (Blue: ${debugLog.blueTeamSize}, Orange: ${debugLog.orangeTeamSize})`);
    lines.push('');

    // League Stats
    lines.push('=== LEAGUE AVERAGES ===');
    lines.push(`Ratings: ATK ${debugLog.leagueStats.ratingAverages.attack.toFixed(2)}, DEF ${debugLog.leagueStats.ratingAverages.defense.toFixed(2)}, IQ ${debugLog.leagueStats.ratingAverages.gameIq.toFixed(2)}`);
    lines.push(`Attributes: PAC ${debugLog.leagueStats.attributeAverages.pace.toFixed(2)}, SHO ${debugLog.leagueStats.attributeAverages.shooting.toFixed(2)}, PAS ${debugLog.leagueStats.attributeAverages.passing.toFixed(2)}, DRI ${debugLog.leagueStats.attributeAverages.dribbling.toFixed(2)}, DEF ${debugLog.leagueStats.attributeAverages.defending.toFixed(2)}, PHY ${debugLog.leagueStats.attributeAverages.physical.toFixed(2)}`);
    lines.push('');

    // Formation Selection
    lines.push('=== FORMATION SELECTION ===');
    lines.push(`BLUE: ${debugLog.formationSelection.blue.formation}`);
    lines.push(`  Reasoning: ${debugLog.formationSelection.blue.reasoning}`);
    lines.push(`  Composition: ${debugLog.formationSelection.blue.teamComposition.attackingPlayers} ATK, ${debugLog.formationSelection.blue.teamComposition.defensivePlayers} DEF, ${debugLog.formationSelection.blue.teamComposition.balancedPlayers} BAL`);
    lines.push(`  Playstyle Coverage: ${debugLog.formationSelection.blue.teamComposition.withPlaystyles}/${debugLog.blueTeamSize}`);
    lines.push('');
    lines.push(`ORANGE: ${debugLog.formationSelection.orange.formation}`);
    lines.push(`  Reasoning: ${debugLog.formationSelection.orange.reasoning}`);
    lines.push(`  Composition: ${debugLog.formationSelection.orange.teamComposition.attackingPlayers} ATK, ${debugLog.formationSelection.orange.teamComposition.defensivePlayers} DEF, ${debugLog.formationSelection.orange.teamComposition.balancedPlayers} BAL`);
    lines.push(`  Playstyle Coverage: ${debugLog.formationSelection.orange.teamComposition.withPlaystyles}/${debugLog.orangeTeamSize}`);
    lines.push('');

    // Player Analysis
    lines.push('=== PLAYER ASSIGNMENTS ===');

    // Blue Team
    lines.push('BLUE TEAM:');
    const bluePlayersByPosition: Record<string, any[]> = {};
    debugLog.playerAnalysis
      .filter(p => p.team === 'blue')
      .forEach(player => {
        if (!bluePlayersByPosition[player.assignedPosition]) {
          bluePlayersByPosition[player.assignedPosition] = [];
        }
        bluePlayersByPosition[player.assignedPosition].push(player);
      });

    Object.entries(bluePlayersByPosition).forEach(([position, players]) => {
      lines.push(`  ${position}:`);
      players.forEach(player => {
        const natural = player.isNaturalPosition ? '✓' : '✗';
        const attrs = player.attributes ?
          `[PAC:${player.attributes.pace.toFixed(1)} SHO:${player.attributes.shooting.toFixed(1)} PAS:${player.attributes.passing.toFixed(1)} DRI:${player.attributes.dribbling.toFixed(1)} DEF:${player.attributes.defending.toFixed(1)} PHY:${player.attributes.physical.toFixed(1)}]` :
          '[No attributes]';
        lines.push(`    ${natural} ${player.playerName} (${player.ratings.attack.toFixed(1)}/${player.ratings.defense.toFixed(1)}/${player.ratings.gameIq.toFixed(1)}) ${attrs}`);
        if (player.detectedPlaystyle) {
          lines.push(`      Style: ${player.detectedPlaystyle} | Score: ${player.positionScores[position].score.toFixed(2)} | ${player.assignmentReason}`);
        } else {
          lines.push(`      Score: ${player.positionScores[position]?.score?.toFixed(2) || 'N/A'} | ${player.assignmentReason}`);
        }
      });
    });
    lines.push('');

    // Orange Team
    lines.push('ORANGE TEAM:');
    const orangePlayersByPosition: Record<string, any[]> = {};
    debugLog.playerAnalysis
      .filter(p => p.team === 'orange')
      .forEach(player => {
        if (!orangePlayersByPosition[player.assignedPosition]) {
          orangePlayersByPosition[player.assignedPosition] = [];
        }
        orangePlayersByPosition[player.assignedPosition].push(player);
      });

    Object.entries(orangePlayersByPosition).forEach(([position, players]) => {
      lines.push(`  ${position}:`);
      players.forEach(player => {
        const natural = player.isNaturalPosition ? '✓' : '✗';
        const attrs = player.attributes ?
          `[PAC:${player.attributes.pace.toFixed(1)} SHO:${player.attributes.shooting.toFixed(1)} PAS:${player.attributes.passing.toFixed(1)} DRI:${player.attributes.dribbling.toFixed(1)} DEF:${player.attributes.defending.toFixed(1)} PHY:${player.attributes.physical.toFixed(1)}]` :
          '[No attributes]';
        lines.push(`    ${natural} ${player.playerName} (${player.ratings.attack.toFixed(1)}/${player.ratings.defense.toFixed(1)}/${player.ratings.gameIq.toFixed(1)}) ${attrs}`);
        if (player.detectedPlaystyle) {
          lines.push(`      Style: ${player.detectedPlaystyle} | Score: ${player.positionScores[position].score.toFixed(2)} | ${player.assignmentReason}`);
        } else {
          lines.push(`      Score: ${player.positionScores[position]?.score?.toFixed(2) || 'N/A'} | ${player.assignmentReason}`);
        }
      });
    });
    lines.push('');

    // Quality Metrics
    lines.push('=== QUALITY METRICS ===');
    lines.push(`BLUE: ${debugLog.qualityMetrics.blue.confidence.toUpperCase()} confidence`);
    lines.push(`  Overall Score: ${debugLog.qualityMetrics.blue.overallScore.toFixed(2)}`);
    lines.push(`  Natural Position Rate: ${(debugLog.qualityMetrics.blue.naturalPositionRate * 100).toFixed(1)}%`);
    lines.push(`  Attribute Coverage: ${(debugLog.qualityMetrics.blue.attributeCoverage * 100).toFixed(1)}%`);
    lines.push(`  Reason: ${debugLog.qualityMetrics.blue.confidenceReason}`);
    lines.push('');
    lines.push(`ORANGE: ${debugLog.qualityMetrics.orange.confidence.toUpperCase()} confidence`);
    lines.push(`  Overall Score: ${debugLog.qualityMetrics.orange.overallScore.toFixed(2)}`);
    lines.push(`  Natural Position Rate: ${(debugLog.qualityMetrics.orange.naturalPositionRate * 100).toFixed(1)}%`);
    lines.push(`  Attribute Coverage: ${(debugLog.qualityMetrics.orange.attributeCoverage * 100).toFixed(1)}%`);
    lines.push(`  Reason: ${debugLog.qualityMetrics.orange.confidenceReason}`);
    lines.push('');

    // Optimization Notes
    if (debugLog.optimizationNotes.length > 0) {
      lines.push('=== OPTIMIZATION NOTES ===');
      debugLog.optimizationNotes.forEach(note => {
        lines.push(`• ${note}`);
      });
      lines.push('');
    }

    lines.push('===== END DEBUG LOG =====');

    return lines.join('\n');
  };

  const fullDebugText = formatDebugLogAsText();

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">Consolidated Formation Debug Log</h4>
        <div className="flex gap-2">
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'} Debug
          </button>
          <button
            className="btn btn-xs btn-primary"
            onClick={() => copyToClipboard(fullDebugText, 'full')}
          >
            {copiedSection === 'full' ? 'Copied!' : 'Copy Full Log'}
          </button>
        </div>
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
            <div className="bg-base-200 rounded-lg p-3 space-y-4 text-xs">
              {/* Summary Section */}
              <div className="bg-base-100 rounded p-2">
                <div className="font-semibold mb-1">Summary</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-blue-600 font-medium">Blue:</span> {debugLog.formationSelection.blue.formation} ({debugLog.qualityMetrics.blue.confidence} confidence)
                  </div>
                  <div>
                    <span className="text-orange-600 font-medium">Orange:</span> {debugLog.formationSelection.orange.formation} ({debugLog.qualityMetrics.orange.confidence} confidence)
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="text-xs">
                    Natural fits: {(debugLog.qualityMetrics.blue.naturalPositionRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs">
                    Natural fits: {(debugLog.qualityMetrics.orange.naturalPositionRate * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Detailed Sections */}
              <div className="space-y-2">
                {/* League Stats */}
                <div className="bg-base-100 rounded p-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('leagueStats')}
                  >
                    <span className="font-semibold">League Averages</span>
                    <span>{expandedSections.has('leagueStats') ? '▼' : '▶'}</span>
                  </div>
                  {expandedSections.has('leagueStats') && (
                    <div className="mt-2 space-y-1">
                      <div>Ratings: ATK {debugLog.leagueStats.ratingAverages.attack.toFixed(2)}, DEF {debugLog.leagueStats.ratingAverages.defense.toFixed(2)}, IQ {debugLog.leagueStats.ratingAverages.gameIq.toFixed(2)}</div>
                      <div>Attributes: PAC {debugLog.leagueStats.attributeAverages.pace.toFixed(2)}, SHO {debugLog.leagueStats.attributeAverages.shooting.toFixed(2)}, PAS {debugLog.leagueStats.attributeAverages.passing.toFixed(2)}</div>
                    </div>
                  )}
                </div>

                {/* Player Details */}
                <div className="bg-base-100 rounded p-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('players')}
                  >
                    <span className="font-semibold">Player Assignments</span>
                    <span>{expandedSections.has('players') ? '▼' : '▶'}</span>
                  </div>
                  {expandedSections.has('players') && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="text-blue-600 font-medium">Blue Team</div>
                          {debugLog.playerAnalysis
                            .filter(p => p.team === 'blue')
                            .sort((a, b) => {
                              const posOrder = ['ST', 'CAM', 'CM', 'CDM', 'W', 'DEF'];
                              return posOrder.indexOf(a.assignedPosition) - posOrder.indexOf(b.assignedPosition);
                            })
                            .map(player => (
                              <div key={player.playerId} className={`text-xs ${player.isNaturalPosition ? 'text-green-600' : ''}`}>
                                {player.assignedPosition}: {player.playerName} {player.isNaturalPosition ? '✓' : ''}
                                {player.detectedPlaystyle && (
                                  <span className="text-gray-500 ml-1">({player.detectedPlaystyle})</span>
                                )}
                              </div>
                            ))}
                        </div>
                        <div className="space-y-1">
                          <div className="text-orange-600 font-medium">Orange Team</div>
                          {debugLog.playerAnalysis
                            .filter(p => p.team === 'orange')
                            .sort((a, b) => {
                              const posOrder = ['ST', 'CAM', 'CM', 'CDM', 'W', 'DEF'];
                              return posOrder.indexOf(a.assignedPosition) - posOrder.indexOf(b.assignedPosition);
                            })
                            .map(player => (
                              <div key={player.playerId} className={`text-xs ${player.isNaturalPosition ? 'text-green-600' : ''}`}>
                                {player.assignedPosition}: {player.playerName} {player.isNaturalPosition ? '✓' : ''}
                                {player.detectedPlaystyle && (
                                  <span className="text-gray-500 ml-1">({player.detectedPlaystyle})</span>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw Text Output */}
                <div className="bg-base-100 rounded p-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection('raw')}
                  >
                    <span className="font-semibold">Raw Debug Output</span>
                    <span>{expandedSections.has('raw') ? '▼' : '▶'}</span>
                  </div>
                  {expandedSections.has('raw') && (
                    <pre className="mt-2 bg-base-200 p-2 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                      {fullDebugText}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};