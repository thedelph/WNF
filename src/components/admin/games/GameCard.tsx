import React from 'react';
import { motion } from 'framer-motion';
import { Game } from '../../../types/game';
import { format } from 'date-fns';
import { FaUser, FaUserClock, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';

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
    const gameDate = new Date(game.date);
    const endTime = new Date(gameDate);
    endTime.setHours(endTime.getHours() + 1);

    // Calculate price per person
    const pricePerPerson = game.pitch_cost ? `(£${(game.pitch_cost / game.max_players).toFixed(2)} pp)` : '';

    const message = `📅${formatWhatsAppDate(game.date)}
⌚${formatWhatsAppTime(game.date)} - ${formatWhatsAppTime(endTime.toISOString())}

📢 WNF #${game.sequence_number || '?'}
📌${game.venue?.name}
${game.venue?.google_maps_url || ''}

⚽${game.max_players} players / ${game.max_players / 2}-a-side ${pricePerPerson}
Register your interest by reacting with a thumbs up
Registration closes ${formatWhatsAppDate(game.registration_window_end)} at ${formatWhatsAppTime(game.registration_window_end)}`;

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
