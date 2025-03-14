import React from 'react';
import { motion } from 'framer-motion';
import { Game, GAME_STATUSES } from '../../../types/game';
import { format } from 'date-fns';
import { FaUser, FaUserClock, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { supabase } from '../../../utils/supabase';

interface Props {
  game: Game;
  onEditClick: (game: Game) => void;
  onViewRegistrations: (gameId: string) => void;
  onDeleteClick: (gameId: string) => void;
}

export const GameCard: React.FC<Props> = ({
  game,
  onEditClick,
  onViewRegistrations,
  onDeleteClick,
}) => {
  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP p');
  };

  const formatWhatsAppDate = (date: string) => {
    return format(new Date(date), 'EEEE do MMMM');
  };

  const formatWhatsAppTime = (date: string) => {
    return format(new Date(date), 'h:mmaaa').toLowerCase();
  };

  /**
   * Handles the WhatsApp share functionality.
   * 
   * This function:
   * 1. Fetches WhatsApp group members from the players table
   * 2. Queries token status data from the public_player_token_status view
   * 3. Determines which players are eligible for tokens based on eligibility criteria:
   *    - Player must have played in at least one of the last 10 games
   *    - Player must NOT have been selected in any of the last 3 games
   *    - Player must NOT have any outstanding payments
   * 4. Formats a WhatsApp message including:
   *    - Game details (date, time, location)
   *    - List of eligible players who can use tokens
   *    - Game status-specific information
   * 
   * Note: The WhatsApp message shows players who are ELIGIBLE to USE tokens,
   * not players who already have active tokens. Eligibility is determined by 
   * the public_player_token_status view.
   */
  const handleWhatsAppShare = async () => {
    try {
      console.log('Starting WhatsApp share process');
      
      // First, get all WhatsApp group members 
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, friendly_name, whatsapp_group_member')
        .in('whatsapp_group_member', ['Yes', 'Proxy'])
        .order('friendly_name');

      if (playersError) {
        console.error('Error fetching players:', playersError);
        toast.error('Failed to get player data');
        return;
      }
      console.log(`Fetched ${players?.length} WhatsApp group members`);

      // Query the public_player_token_status view which contains eligibility data
      // This view handles all the complex eligibility logic including:
      // - Recent game participation
      // - Not being selected in recent games
      // - No outstanding payments
      console.log('Querying public_player_token_status view');
      const { data: tokenStatusData, error: tokenStatusError } = await supabase
        .from('public_player_token_status')
        .select('*');

      if (tokenStatusError) {
        console.error('Error fetching token status data:', tokenStatusError);
        toast.error('Failed to get token status data');
      } else {
        console.log(`Successfully fetched ${tokenStatusData?.length} token status records`);
      }

      // Find the players who are eligible for tokens, regardless of whether they have an active token already
      // For the WhatsApp message, we only care about eligibility status, not whether they currently have an active token
      const eligiblePlayers = players
        .filter(player => {
          // Find the corresponding token status for this player
          const playerTokenStatus = tokenStatusData?.find(ts => ts.player_id === player.id);
          
          if (!playerTokenStatus) {
            console.log(`No token status found for player ${player.friendly_name}`);
            return false;
          }

          // For WhatsApp message, we just care if they're eligible according to the view
          const isEligible = playerTokenStatus.is_eligible;
          
          console.log(`Player ${player.friendly_name}: Eligible=${isEligible}`);
          
          return isEligible;
        })
        .map(player => ({
          id: player.id,
          friendly_name: player.friendly_name
        }));

      console.log('Eligible players for tokens:', eligiblePlayers);

      // Get player XP data from Supabase
      const { data: playerXpData, error: xpError } = await supabase
        .from('player_xp')
        .select('player_id, xp')
        .in('player_id', game.game_registrations?.map(reg => reg.player.id) || []);

      if (xpError) {
        console.error('Error fetching player XP:', xpError);
        toast.error('Failed to get player XP data');
        return;
      }

      // Create a map of player IDs to XP
      const playerXpMap = new Map(
        playerXpData?.map(({ player_id, xp }) => [player_id, xp]) || []
      );

      const gameDate = new Date(game.date);
      const endTime = new Date(gameDate);
      endTime.setHours(endTime.getHours() + 1);

      // Format the registration end date
      const regEndDate = formatWhatsAppDate(game.registration_window_end);
      const regEndTime = formatWhatsAppTime(game.registration_window_end);

      // Base message with the new format
      let message = `📅 ${formatWhatsAppDate(game.date)}
⏰ ${formatWhatsAppTime(game.date)} - ${formatWhatsAppTime(endTime.toISOString())}
🎮 WNF #${game.sequence_number || '?'}
📍 ${game.venue?.name}
📍 ${game.venue?.google_maps_url || ''}
🔗 Game Details: https://wnf.app/games
⚽ ${game.max_players} players / ${game.max_players / 2}-a-side`;

      // Add status-specific messages
      switch (game.status) {
        case GAME_STATUSES.UPCOMING:
        case GAME_STATUSES.OPEN:
          message += `\n\n🎮 Registration is OPEN!
Register your interest by reacting with a thumbs up 👍

Reply to this message with names of any reserves outside of this group that want to play.`;

          // Add token information if there are eligible players with active tokens
          const showTokenSection = true; // Always show even if no eligible players
          
          if (showTokenSection) {
            message += '\n\nThe following players, react with 🪙 if you want to guarantee a spot this week (but you likely won\'t get a spot next week):\n';
            
            if (eligiblePlayers.length > 0) {
              // Sort players alphabetically by name
              [...eligiblePlayers]
                .sort((a, b) => a.friendly_name.localeCompare(b.friendly_name))
                .forEach(player => {
                  message += `\n🪙 ${player.friendly_name}`;
                });
            } else {
              // If no eligible players found in the database, use placeholder names
              message += '\n🪙 <eligible player 1>';
              message += '\n🪙 <eligible player 2>';
            }
          }

          message += `\n\nRegistration closes ${regEndDate} at ${regEndTime}`;
          break;

        case GAME_STATUSES.PLAYERS_ANNOUNCED:
          // Get all selected players (both merit and random)
          const selectedPlayers = game.game_registrations?.filter(reg => reg.status === 'selected');
          if (selectedPlayers?.length > 0) {
            message += '\n\n✅ Selected Players:\n';
            selectedPlayers
              .sort((a, b) => (playerXpMap.get(b.player.id) || 0) - (playerXpMap.get(a.player.id) || 0))
              .forEach(reg => {
                const xp = playerXpMap.get(reg.player.id) || 0;
                const isRandom = reg.selection_method === 'random';
                message += `\n${isRandom ? '🎲' : ''}${reg.player.friendly_name} (${xp} XP)`;
              });
          }

          // Add reserve players section
          const reservePlayers = game.game_registrations?.filter(reg => reg.status === 'reserve');
          if (reservePlayers?.length > 0) {
            message += '\n\n🔄 Reserves (by XP):\n';
            reservePlayers
              .sort((a, b) => (playerXpMap.get(b.player.id) || 0) - (playerXpMap.get(a.player.id) || 0))
              .forEach(reg => {
                const xp = playerXpMap.get(reg.player.id) || 0;
                message += `\n${reg.player.friendly_name} (${xp} XP)`;
              });
          }

          // Add dropped out players section
          const droppedOut = game.game_registrations?.filter(reg => reg.status === 'dropped_out');
          if (droppedOut?.length > 0) {
            message += '\n\n❌ Dropped Out:\n';
            droppedOut
              .sort((a, b) => (playerXpMap.get(b.player.id) || 0) - (playerXpMap.get(a.player.id) || 0))
              .forEach(reg => {
                const xp = playerXpMap.get(reg.player.id) || 0;
                message += `\n${reg.player.friendly_name} (${xp} XP)`;
              });
          }

          // Add drop-out message
          message += '\n\nAnyone needs to drop out (inc reserves) please let me know 👍';
          break;

        case GAME_STATUSES.TEAMS_ANNOUNCED:
          message += '\n\n▶️ Starting teams for tonight:\n';
          
          // Get all selected players
          const selectedPlayersTeams = game.game_registrations?.filter(reg => reg.status === 'selected') || [];
          
          // Sort players by team and then by name
          const orangeTeam = selectedPlayersTeams
            .filter(reg => reg.team === 'orange')
            .map(reg => reg.player.friendly_name)
            .sort();
            
          const blueTeam = selectedPlayersTeams
            .filter(reg => reg.team === 'blue')
            .map(reg => reg.player.friendly_name)
            .sort();
          
          // Add orange team
          message += '\n🟠 Orange';
          orangeTeam.forEach(name => {
            message += `\n${name}`;
          });
          
          // Add blue team
          message += '\n\n🔵 Blue';
          blueTeam.forEach(name => {
            message += `\n${name}`;
          });
          break;

        case GAME_STATUSES.COMPLETED:
          message += '\n\n🏆 Game Complete!\nCheck the app to see the results and your updated stats.';
          break;

        case GAME_STATUSES.CANCELLED:
          message += '\n\n❌ Game Cancelled\nPlease check the app for more information.';
          break;

        default:
          message += `\n\nRegistration closes ${regEndDate} at ${regEndTime}`;
      }

      try {
        await navigator.clipboard.writeText(message);
        toast.success('WhatsApp message copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy message:', err);
        toast.error('Failed to copy message to clipboard');
      }
    } catch (err) {
      console.error('Error sharing on WhatsApp:', err);
      toast.error('Failed to share on WhatsApp');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card bg-base-200 shadow-xl"
    >
      <div className="card-body">
        <h2 className="card-title">
          {game.venue?.name || 'No venue'} - {formatDate(game.date)}
        </h2>
        
        <div className="mt-2 space-y-2">
          <p>Status: <span className="badge badge-primary">{game.status}</span></p>
          <p>Registration: {formatDate(game.registration_window_start)} - {formatDate(game.registration_window_end)}</p>
          <p>Team Announcement: {formatDate(game.team_announcement_time)}</p>
          <p>Players: {Number(game.registrations_count)} / {game.max_players}</p>
          {game.pitch_cost > 0 && (
            <p>Pitch Cost: £{game.pitch_cost}</p>
          )}
        </div>

        <div className="card-actions justify-end mt-4">
          <button
            className="btn btn-sm btn-success"
            aria-label="Share on WhatsApp"
            onClick={handleWhatsAppShare}
          >
            <FaWhatsapp className="text-lg" />
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => onViewRegistrations(game.id)}
          >
            View Registrations
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onEditClick(game)}
          >
            Edit
          </button>
          <button
            className="btn btn-sm btn-error"
            onClick={() => onDeleteClick(game.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
};
