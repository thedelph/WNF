import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormationDebugLog } from './types';

interface FormationDebugViewProps {
  debugLog: FormationDebugLog;
  teamColor: 'blue' | 'orange';
}

export const FormationDebugView: React.FC<FormationDebugViewProps> = ({ debugLog, teamColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatDebugLog = (): string => {
    const lines: string[] = [];
    
    lines.push(`${'='.repeat(60)}`);
    lines.push(`FORMATION SUGGESTION DEBUG LOG - ${teamColor.toUpperCase()} TEAM`);
    lines.push(`Generated: ${new Date(debugLog.timestamp).toLocaleString()}`);
    lines.push(`Team Size: ${debugLog.teamSize} players`);
    lines.push(`${'='.repeat(60)}\n`);
    
    // Player Classifications
    lines.push('PLAYER CLASSIFICATIONS:');
    lines.push('-'.repeat(40));
    debugLog.playerClassifications.forEach((classification) => {
      const { playerName, type, ratings, reason } = classification;
      lines.push(`${playerName}:`);
      lines.push(`  Type: ${type}`);
      lines.push(`  Ratings: ATK ${ratings.attack.toFixed(1)}, DEF ${ratings.defense.toFixed(1)}, IQ ${ratings.gameIq.toFixed(1)} (Overall: ${ratings.overall.toFixed(1)})`);
      lines.push(`  Reason: ${reason}`);
    });
    lines.push('');
    
    // Dynamic Thresholds
    lines.push('DYNAMIC THRESHOLDS:');
    lines.push('-'.repeat(40));
    lines.push(`Attack:`);
    lines.push(`  Mean: ${debugLog.thresholds.attack.mean.toFixed(2)}`);
    lines.push(`  Percentiles: P25=${debugLog.thresholds.attack.p25.toFixed(1)}, P50=${debugLog.thresholds.attack.p50.toFixed(1)}, P75=${debugLog.thresholds.attack.p75.toFixed(1)}, P90=${debugLog.thresholds.attack.p90.toFixed(1)}`);
    lines.push(`Defense:`);
    lines.push(`  Mean: ${debugLog.thresholds.defense.mean.toFixed(2)}`);
    lines.push(`  Percentiles: P25=${debugLog.thresholds.defense.p25.toFixed(1)}, P50=${debugLog.thresholds.defense.p50.toFixed(1)}, P75=${debugLog.thresholds.defense.p75.toFixed(1)}, P90=${debugLog.thresholds.defense.p90.toFixed(1)}`);
    lines.push(`Game IQ:`);
    lines.push(`  Mean: ${debugLog.thresholds.gameIq.mean.toFixed(2)}`);
    lines.push(`  Percentiles: P25=${debugLog.thresholds.gameIq.p25.toFixed(1)}, P50=${debugLog.thresholds.gameIq.p50.toFixed(1)}, P75=${debugLog.thresholds.gameIq.p75.toFixed(1)}, P90=${debugLog.thresholds.gameIq.p90.toFixed(1)}`);
    lines.push(`Overall:`);
    lines.push(`  Mean: ${debugLog.thresholds.overall.mean.toFixed(2)}`);
    lines.push(`  Percentiles: P25=${debugLog.thresholds.overall.p25.toFixed(1)}, P50=${debugLog.thresholds.overall.p50.toFixed(1)}, P75=${debugLog.thresholds.overall.p75.toFixed(1)}, P90=${debugLog.thresholds.overall.p90.toFixed(1)}`);
    lines.push('');
    
    // Position Suitability Matrix (top entries)
    lines.push('POSITION SUITABILITY MATRIX (Top 30 by priority):');
    lines.push('-'.repeat(40));
    const sortedMatrix = [...debugLog.positionMatrix]
      .sort((a, b) => b.priority - a.priority || b.adjustedScore - a.adjustedScore)
      .slice(0, 30);
    
    sortedMatrix.forEach((entry) => {
      const suitable = entry.suitable ? '✓' : '✗';
      lines.push(`${entry.player} → ${entry.position}:`);
      lines.push(`  Priority: ${entry.priority}, Base Score: ${entry.baseScore.toFixed(1)}, Adjusted: ${entry.adjustedScore.toFixed(1)} ${suitable}`);
      if (entry.suitabilityReason) {
        lines.push(`  Note: ${entry.suitabilityReason}`);
      }
    });
    lines.push('');
    
    // Assignment Order
    lines.push('ASSIGNMENT ORDER:');
    lines.push('-'.repeat(40));
    debugLog.assignments.forEach((assignment) => {
      lines.push(`${assignment.order}. ${assignment.player} → ${assignment.position}`);
      lines.push(`   Priority: ${assignment.priority}, Score: ${assignment.score.toFixed(1)}`);
      lines.push(`   Reason: ${assignment.reason}`);
    });
    lines.push('');
    
    // Optimizations
    if (debugLog.optimizations.length > 0) {
      lines.push('OPTIMIZATIONS:');
      lines.push('-'.repeat(40));
      debugLog.optimizations.forEach((opt) => {
        lines.push(`${opt.type}:`);
        lines.push(`  Swapped ${opt.from.player} (${opt.from.position}) ↔ ${opt.to.player} (${opt.to.position})`);
        lines.push(`  Reason: ${opt.reason}`);
      });
      lines.push('');
    }
    
    // Final Balance
    lines.push('FINAL BALANCE:');
    lines.push('-'.repeat(40));
    lines.push(`Defense: ${debugLog.finalBalance.defense.toFixed(2)}`);
    lines.push(`Midfield: ${debugLog.finalBalance.midfield.toFixed(2)}`);
    lines.push(`Attack: ${debugLog.finalBalance.attack.toFixed(2)}`);
    lines.push(`Overall: ${debugLog.finalBalance.overall.toFixed(2)}`);
    lines.push('');
    
    lines.push(`CONFIDENCE: ${debugLog.confidence.toUpperCase()}`);
    lines.push(`Reason: ${debugLog.confidenceReason}`);
    lines.push(`${'='.repeat(60)}`);
    
    return lines.join('\n');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatDebugLog());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const teamColorClass = teamColor === 'blue' ? 'border-blue-300' : 'border-orange-300';
  const teamAccentClass = teamColor === 'blue' ? 'text-blue-600' : 'text-orange-600';

  return (
    <div className={`border rounded-lg p-4 mt-4 ${teamColorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 font-semibold hover:opacity-80"
        >
          <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▶
          </motion.span>
          <span className={teamAccentClass}>Debug Log</span>
          <span className="badge badge-sm">
            {debugLog.assignments.length} assignments
          </span>
        </button>
        
        <button
          onClick={copyToClipboard}
          className="btn btn-sm btn-ghost"
        >
          {copied ? '✓ Copied!' : '📋 Copy Log'}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-base-200 rounded-lg p-3 mt-3 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {formatDebugLog()}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};