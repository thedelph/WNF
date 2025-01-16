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

  const handleWhatsAppShare = async () => {
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

    // Calculate price per person if pitch cost is available
    const pricePerPerson = game.pitch_cost ? `(£${(game.pitch_cost / game.max_players).toFixed(2)} pp)` : '';

    // Base message that's common across all statuses
    let message = `📅 ${formatWhatsAppDate(game.date)}
⏰ ${formatWhatsAppTime(game.date)} - ${formatWhatsAppTime(endTime.toISOString())}
🎮 WNF #${game.sequence_number || '?'}
📍 ${game.venue?.name}
📍 ${game.venue?.google_maps_url || ''}
🔗 Game Details: https://wnf.app/games
⚽ ${game.max_players} players / ${game.max_players / 2}-a-side ${pricePerPerson}`;

    // Add status-specific messages
    switch (game.status) {
      case GAME_STATUSES.OPEN:
        message += `\n\n🎮 Registration is OPEN!\nRegister your interest by reacting with a thumbs up\nRegistration closes ${formatWhatsAppDate(game.registration_window_end)} at ${formatWhatsAppTime(game.registration_window_end)}`;
        break;

      case GAME_STATUSES.PLAYERS_ANNOUNCED:
        // Add selected players section (merit-based)
        const meritSelected = game.game_registrations?.filter(reg => reg.status === 'selected' && reg.selection_method === 'merit');
        if (meritSelected?.length > 0) {
          message += '\n\n✅ Selected Players:\n';
          meritSelected
            .sort((a, b) => (playerXpMap.get(b.player.id) || 0) - (playerXpMap.get(a.player.id) || 0))
            .forEach(reg => {
              const xp = playerXpMap.get(reg.player.id) || 0;
              message += `\n${reg.player.friendly_name} (${xp} XP)`;
            });
        }

        // Add randomly selected players section
        const randomlySelected = game.game_registrations?.filter(reg => reg.status === 'selected' && reg.selection_method === 'random');
        if (randomlySelected?.length > 0) {
          message += '\n\n🎲 Randomly Selected:\n';
          randomlySelected
            .sort((a, b) => (playerXpMap.get(b.player.id) || 0) - (playerXpMap.get(a.player.id) || 0))
            .forEach(reg => {
              const xp = playerXpMap.get(reg.player.id) || 0;
              message += `\n${reg.player.friendly_name} (${xp} XP)`;
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
        break;

      case GAME_STATUSES.TEAMS_ANNOUNCED:
        message += '\n\n▶️ Starting teams for tonight:\n';
        
        // Get all selected players
        const selectedPlayers = game.game_registrations?.filter(reg => reg.status === 'selected') || [];
        
        // Sort players by team and then by name
        const orangeTeam = selectedPlayers
          .filter(reg => reg.team === 'orange')
          .map(reg => reg.player.friendly_name)
          .sort();
          
        const blueTeam = selectedPlayers
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
        message += `\n\nRegistration closes ${formatWhatsAppDate(game.registration_window_end)} at ${formatWhatsAppTime(game.registration_window_end)}`;
    }

    try {
      await navigator.clipboard.writeText(message);
      toast.success('WhatsApp message copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy message:', err);
      toast.error('Failed to copy message to clipboard');
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
