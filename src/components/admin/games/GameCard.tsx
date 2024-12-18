import React from 'react';
import { motion } from 'framer-motion';
import { Game } from '../../../types/game';
import { format } from 'date-fns';
import { FaUser, FaUserClock } from 'react-icons/fa';

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
