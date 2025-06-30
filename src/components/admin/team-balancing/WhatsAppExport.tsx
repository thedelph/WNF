import React from 'react';
import { FaCopy } from 'react-icons/fa';
import { TeamAssignment } from './types';
import { toast } from 'react-hot-toast';
import { calculateTeamComparison } from './teamBalanceCalcs';

interface WhatsAppExportProps {
  blueTeam: TeamAssignment[];
  orangeTeam: TeamAssignment[];
}

/**
 * WhatsAppExport component provides functionality to export team selections to WhatsApp
 * Creates a formatted text message with team assignments for sharing
 * @param blueTeam - Array of blue team assignments
 * @param orangeTeam - Array of orange team assignments
 */
export const WhatsAppExport: React.FC<WhatsAppExportProps> = ({ 
  blueTeam, 
  orangeTeam 
}) => {
  const generateWhatsAppMessage = () => {
    // Calculate team stats
    const stats = calculateTeamComparison(blueTeam, orangeTeam);
    
    // Use the goal differential values directly from the team stats
    // These are already calculated correctly in the calculateTeamComparison function
    const blueGoalDiff = stats.blue.goalDifferential;
    const orangeGoalDiff = stats.orange.goalDifferential;
    
    // Debug log to verify goal differentials
    console.log('Goal differentials for WhatsApp message:', { 
      blueGoalDiff, 
      orangeGoalDiff,
      blueTeamStats: stats.blue,
      orangeTeamStats: stats.orange
    });
    
    // Format team lists with player emojis
    const blueTeamText = blueTeam
      .map(p => `👤 ${p.friendly_name}`)
      .sort()
      .join('\n');
      
    const orangeTeamText = orangeTeam
      .map(p => `👤 ${p.friendly_name}`)
      .sort()
      .join('\n');
    
    // Format goal differential difference if data is available
    const goalDiffDiffText = stats.blue.goalDifferential !== undefined && stats.orange.goalDifferential !== undefined
      ? `⚽ Goal Diff: ${Math.abs(stats.blue.goalDifferential - stats.orange.goalDifferential)}`
      : '';
    
    // Log the stats to debug goal differential issues
    console.log('Team stats for WhatsApp message:', {
      blueStats: stats.blue,
      orangeStats: stats.orange,
      calculatedBlueGoalDiff: blueGoalDiff,
      calculatedOrangeGoalDiff: orangeGoalDiff
    });
    
    return `📋 Proposed Teams For Next Game

🟠 Orange Team
⚔ Attack: ${stats.orange.attack?.toFixed(1) ?? '0.0'}
🛡 Defense: ${stats.orange.defense?.toFixed(1) ?? '0.0'}
🧠 Game IQ: ${stats.orange.gameIq?.toFixed(1) ?? '0.0'}
🏆 Win Rate: ${Math.round(stats.orange.winRate ?? 0)}%
⚽ Goal Diff: ${stats.orange.goalDifferential ?? 0}

🔵 Blue Team
⚔ Attack: ${stats.blue.attack?.toFixed(1) ?? '0.0'}
🛡 Defense: ${stats.blue.defense?.toFixed(1) ?? '0.0'}
🧠 Game IQ: ${stats.blue.gameIq?.toFixed(1) ?? '0.0'}
🏆 Win Rate: ${Math.round(stats.blue.winRate ?? 0)}%
⚽ Goal Diff: ${stats.blue.goalDifferential ?? 0}

📊 Differences
⚔ Attack Diff: ${stats.attackDiff?.toFixed(1) ?? '0.0'}
🛡 Defense Diff: ${stats.defenseDiff?.toFixed(1) ?? '0.0'}
🧠 Game IQ Diff: ${stats.gameIqDiff?.toFixed(1) ?? '0.0'}
🏆 Win Rate Diff: ${stats.winRateDiff?.toFixed(1) ?? '0.0'}%
${goalDiffDiffText}
⚖ Balance Score: ${stats.currentScore?.toFixed(1) ?? '0.0'}

🟠 Orange Team (${orangeTeam.length}):
${orangeTeamText}

🔵 Blue Team (${blueTeam.length}):
${blueTeamText}`;
  };

  const handleCopyToClipboard = () => {
    const message = generateWhatsAppMessage();
    
    // Debug: Check for any issues with goal differential values
    const blueGoalDiffMatch = message.match(/Blue Team[\s\S]*?Goal Diff: (-?\d+)/);
    const orangeGoalDiffMatch = message.match(/Orange Team[\s\S]*?Goal Diff: (-?\d+)/);
    console.log('Goal diff in final message:', {
      blueGoalDiffInMessage: blueGoalDiffMatch ? blueGoalDiffMatch[1] : 'not found',
      orangeGoalDiffInMessage: orangeGoalDiffMatch ? orangeGoalDiffMatch[1] : 'not found'
    });
    
    navigator.clipboard.writeText(message)
      .then(() => {
        toast.success('Team information copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy to clipboard');
      });
  };

  return (
    <button 
      className="btn btn-success btn-sm flex items-center gap-2"
      onClick={handleCopyToClipboard}
    >
      <FaCopy className="text-lg" />
      <span>Copy for WhatsApp</span>
    </button>
  );
};
