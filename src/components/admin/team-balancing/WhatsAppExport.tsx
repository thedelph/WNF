import React, { useState, useMemo, useEffect } from 'react';
import { FaCopy } from 'react-icons/fa';
import { TeamAssignment } from './types';
import { toast } from 'react-hot-toast';
import { calculateTeamComparison } from './teamBalanceCalcs';
import { suggestFormations, POSITION_DISPLAY_NAMES } from '../../../utils/teamBalancing/formationSuggester';
import { PositionType } from './types';
import { supabase } from '../../../utils/supabase';

interface WhatsAppExportProps {
  blueTeam: TeamAssignment[];
  orangeTeam: TeamAssignment[];
  gameId?: string;
  permanentGKIds?: string[];
}

/**
 * WhatsAppExport component provides functionality to export team selections to WhatsApp
 * Creates a formatted text message with team assignments for sharing
 * @param blueTeam - Array of blue team assignments
 * @param orangeTeam - Array of orange team assignments
 * @param permanentGKIds - Optional array of permanent goalkeeper player IDs
 */
export const WhatsAppExport: React.FC<WhatsAppExportProps> = ({
  blueTeam,
  orangeTeam,
  gameId,
  permanentGKIds
}) => {
  const [includeFormation, setIncludeFormation] = useState(false);
  const [shieldPlayers, setShieldPlayers] = useState<Array<{ friendly_name: string; protected_streak_value: number }>>([]);

  // Fetch shield token users if gameId is provided
  useEffect(() => {
    if (!gameId) return;

    const fetchShieldPlayers = async () => {
      const { data, error } = await supabase
        .from('shield_token_usage')
        .select(`
          players!shield_token_usage_player_id_fkey(
            friendly_name,
            protected_streak_value
          )
        `)
        .eq('game_id', gameId);

      if (error) {
        console.error('Error fetching shield players:', error);
        return;
      }

      if (data) {
        const shieldData = data
          .map((item: any) => ({
            friendly_name: item.players?.friendly_name || '',
            protected_streak_value: item.players?.protected_streak_value || 0
          }))
          .filter(p => p.friendly_name);
        setShieldPlayers(shieldData);
      }
    };

    fetchShieldPlayers();
  }, [gameId]);

  // Calculate formation suggestions when enabled
  const formationSuggestions = useMemo(() => {
    if (!includeFormation || blueTeam.length === 0 || orangeTeam.length === 0) {
      return null;
    }
    return suggestFormations(blueTeam, orangeTeam);
  }, [blueTeam, orangeTeam, includeFormation]);
  
  const generateWhatsAppMessage = () => {
    // Calculate team stats (pass permanentGKIds for correct calculations)
    const stats = calculateTeamComparison(blueTeam, orangeTeam, permanentGKIds);
    
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
    
    // Format team lists with player emojis (mark permanent GKs)
    const blueTeamText = blueTeam
      .map(p => `${p.isPermanentGK ? '🧤' : '👤'} ${p.friendly_name}`)
      .sort()
      .join('\n');

    const orangeTeamText = orangeTeam
      .map(p => `${p.isPermanentGK ? '🧤' : '👤'} ${p.friendly_name}`)
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
    
    // Calculate GK rating difference
    const gkDiff = stats.blue.gk !== undefined && stats.orange.gk !== undefined
      ? Math.abs(stats.blue.gk - stats.orange.gk)
      : 0;

    let message = `📋 Proposed Teams For Next Game

🟠 Orange Team
⚔ Attack: ${stats.orange.attack?.toFixed(1) ?? '0.0'}
🛡 Defense: ${stats.orange.defense?.toFixed(1) ?? '0.0'}
🧠 Game IQ: ${stats.orange.gameIq?.toFixed(1) ?? '0.0'}
🧤 GK: ${stats.orange.gk?.toFixed(1) ?? '0.0'}
🏆 Win Rate: ${Math.round(stats.orange.winRate ?? 0)}%
⚽ Goal Diff: ${stats.orange.goalDifferential ?? 0}

🔵 Blue Team
⚔ Attack: ${stats.blue.attack?.toFixed(1) ?? '0.0'}
🛡 Defense: ${stats.blue.defense?.toFixed(1) ?? '0.0'}
🧠 Game IQ: ${stats.blue.gameIq?.toFixed(1) ?? '0.0'}
🧤 GK: ${stats.blue.gk?.toFixed(1) ?? '0.0'}
🏆 Win Rate: ${Math.round(stats.blue.winRate ?? 0)}%
⚽ Goal Diff: ${stats.blue.goalDifferential ?? 0}

📊 Differences
⚔ Attack Diff: ${stats.attackDiff?.toFixed(1) ?? '0.0'}
🛡 Defense Diff: ${stats.defenseDiff?.toFixed(1) ?? '0.0'}
🧠 Game IQ Diff: ${stats.gameIqDiff?.toFixed(1) ?? '0.0'}
🧤 GK Diff: ${gkDiff.toFixed(1)}
🏆 Win Rate Diff: ${stats.winRateDiff?.toFixed(1) ?? '0.0'}%
${goalDiffDiffText}
⚖ Balance Score: ${stats.currentScore?.toFixed(1) ?? '0.0'}

🟠 Orange Team (${orangeTeam.length}):
${orangeTeamText}

🔵 Blue Team (${blueTeam.length}):
${blueTeamText}`;

    // Add note about permanent GK if any exist
    const hasPermanentGK = blueTeam.some(p => p.isPermanentGK) || orangeTeam.some(p => p.isPermanentGK);
    if (hasPermanentGK) {
      message += '\n\n🧤 = Permanent Goalkeeper for this game';
    }

    // Add shield protection section if there are protected players
    if (shieldPlayers.length > 0) {
      message += '\n\n🛡️ Protected Players (using streak shields):\n';
      shieldPlayers
        .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name))
        .forEach(player => {
          message += `🛡️ ${player.friendly_name} (${player.protected_streak_value} game streak protected)\n`;
        });
    }

    // Add formation suggestions if enabled
    if (includeFormation && formationSuggestions) {
      const formatPositionGroup = (positions: any, positionType: PositionType) => {
        const players = positions[positionType];
        if (!players || players.length === 0) return '';
        const names = players.map((p: any) => {
          // Mark permanent GK with 🧤 emoji
          const emoji = p.player.isPermanentGK ? '🧤 ' : '';
          return `${emoji}${p.player.friendly_name}`;
        }).join(', ');
        return `${POSITION_DISPLAY_NAMES[positionType]}: ${names}`;
      };

      const blueFormationText = ['GK', 'DEF', 'WB', 'W', 'CDM', 'CM', 'CAM', 'ST']
        .map(pos => formatPositionGroup(formationSuggestions.blueFormation.positions, pos as PositionType))
        .filter(text => text !== '')
        .join('\n');

      const orangeFormationText = ['GK', 'DEF', 'WB', 'W', 'CDM', 'CM', 'CAM', 'ST']
        .map(pos => formatPositionGroup(formationSuggestions.orangeFormation.positions, pos as PositionType))
        .filter(text => text !== '')
        .join('\n');

      message += `\n\n📋 Suggested Formations\n\n`;
      message += `🟠 Orange (${formationSuggestions.orangeFormation.formation}):\n${orangeFormationText}\n\n`;
      message += `🔵 Blue (${formationSuggestions.blueFormation.formation}):\n${blueFormationText}`;
    }
    
    return message;
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
    <div className="flex items-center gap-3">
      <button 
        className="btn btn-success btn-sm flex items-center gap-2"
        onClick={handleCopyToClipboard}
      >
        <FaCopy className="text-lg" />
        <span>Copy for WhatsApp</span>
      </button>
      
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={includeFormation}
          onChange={(e) => setIncludeFormation(e.target.checked)}
        />
        <span className="text-sm">Include Formation</span>
      </label>
    </div>
  );
};
