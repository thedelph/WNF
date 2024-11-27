import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Game, GameStatus, GAME_STATUSES } from '../../../types/game'
import { format } from 'date-fns'
import { GameRegistrations } from './GameRegistrations'
import { PlayerSelectionResults } from '../../games/PlayerSelectionResults'
import { DebugInfo } from './DebugInfo'
import { FaUser, FaUserClock } from 'react-icons/fa';
import { deleteGame } from '../../../utils/gameUtils';
import { toast } from 'react-hot-toast';

interface Props {
  game: Game
  isRegistrationsOpen: boolean
  selectedGame: Game | null
  onEditClick: (game: Game) => void
  onViewRegistrations: (gameId: string) => void
  onDeleteClick: (gameId: string) => void
  registrations: GameRegistration[]
  players: Array<{ id: string; friendly_name: string }>
  selectedPlayerId: string
  onPlayerSelect: (id: string) => void
  onRegisterPlayer: (gameId: string) => void
  onUnregisterPlayer: (registrationId: string) => void
  onRegistrationClose: (gameId: string) => void
  onResetGameStatus: (gameId: string) => void
}

export const GameCard: React.FC<Props> = ({
  game,
  isRegistrationsOpen,
  selectedGame,
  onEditClick,
  onViewRegistrations,
  onDeleteClick,
  registrations,
  players,
  selectedPlayerId,
  onPlayerSelect,
  onRegisterPlayer,
  onUnregisterPlayer,
  onRegistrationClose,
  onResetGameStatus,
}) => {
  console.log('GameCard Render:', {
    gameId: game.id,
    status: game.status,
    registrationsCount: registrations.length,
    registrationStatuses: registrations.map(r => r.status),
    playerCount: players.length
  })

  const [showRegistrationsModal, setShowRegistrationsModal] = useState(isRegistrationsOpen)

  const handleCloseRegistrations = () => {
    setShowRegistrationsModal(false)
    onRegistrationClose(game.id)
  }

  const getStatusBadgeColor = (status: GameStatus) => {
    switch (status) {
      case GAME_STATUSES.OPEN:
        return 'badge-success';
      case GAME_STATUSES.UPCOMING:
        return 'badge-info';
      case GAME_STATUSES.PENDING_TEAMS:
        return 'badge-warning';
      case GAME_STATUSES.TEAMS_ANNOUNCED:
      case GAME_STATUSES.PLAYERS_ANNOUNCED:
        return 'badge-primary';
      case GAME_STATUSES.COMPLETED:
        return 'badge-secondary';
      default:
        return 'badge-ghost';
    }
  };

  const renderAdminControls = () => {
    if (game.status === 'players_announced' || game.status === 'teams_announced') {
      return (
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to reset this game? This will clear all player selections.')) {
              onResetGameStatus(game.id);
            }
          }}
          className="btn btn-sm btn-warning gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Reset Selection
        </button>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="card bg-base-100 shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="card-title">
              {format(new Date(game.date), 'EEEE, MMMM do yyyy')}
            </h2>
            <p className="text-sm opacity-70">
              {format(new Date(game.date), 'h:mm a')}
            </p>
            <p className="mt-2">
              Venue: {game.venue?.name || 'No venue specified'}
            </p>
            <p>
              Players: {game.registrations_count || 0} / {game.max_players}
            </p>
            <p className="text-sm mt-2">
              Registration window: <br />
              {format(new Date(game.registration_window_start), 'MMM do h:mm a')} - {' '}
              {format(new Date(game.registration_window_end), 'MMM do h:mm a')}
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            {renderAdminControls()}
            <button
              onClick={() => onEditClick(game)}
              className="btn btn-sm btn-ghost"
            >
              Edit
            </button>
            <button
              onClick={() => onViewRegistrations(game.id)}
              className="btn btn-sm btn-primary"
            >
              Registrations
            </button>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
                  const { error } = await deleteGame(game.id);
                  if (error) {
                    toast.error('Failed to delete game');
                  } else {
                    onDeleteClick(game.id);
                    toast.success('Game deleted successfully');
                  }
                }
              }}
              className="btn btn-sm btn-error"
            >
              Delete
            </button>
            {new Date(game.registration_window_end) > new Date() && (
              <button
                onClick={() => onRegistrationClose(game.id)}
                className="btn btn-sm btn-warning"
              >
                Close Registration
              </button>
            )}
          </div>
        </div>

        {showRegistrationsModal && selectedGame?.id === game.id && (
          <GameRegistrations
            registrations={registrations}
            players={players}
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={onPlayerSelect}
            onRegister={onRegisterPlayer}
            onUnregister={onUnregisterPlayer}
            onClose={handleCloseRegistrations}
            gameId={game.id}
          />
        )}

        {game.status !== 'completed' && (
          <div className="mt-4 border-t border-base-300 pt-4">
            <h3 className="text-lg font-semibold mb-2">Registered Players</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {registrations
                .filter(reg => reg.status === 'registered' || reg.status === 'selected')
                .map(reg => {
                  const player = players.find(p => p.id === reg.player_id);
                  return (
                    <div 
                      key={reg.id}
                      className="flex items-center gap-2 p-2 bg-base-200 rounded-lg"
                    >
                      {reg.status === 'selected' ? (
                        <FaUser className="text-success" />
                      ) : (
                        <FaUserClock className="text-info" />
                      )}
                      <span>{player?.friendly_name || 'Unknown Player'}</span>
                      <span className="text-xs opacity-70">
                        ({reg.status})
                      </span>
                    </div>
                  );
              })}
            </div>
            
            {registrations.length === 0 && (
              <p className="text-center text-base-content/70">
                No players registered yet
              </p>
            )}
          </div>
        )}

        {(game.status === 'registration_closed' || game.status === 'teams_announced' || game.status === 'pending_teams') && (
          <div className="mt-4 border-t border-base-300 pt-4">
            <h3 className="text-xl font-bold mb-4">Player Selection Results</h3>
            <PlayerSelectionResults
              selectedPlayers={registrations
                .filter(reg => reg.status === 'selected')
                .map(reg => {
                  const player = players.find(p => p.id === reg.player_id);
                  return {
                    id: reg.player_id,
                    friendly_name: player?.friendly_name || 'Unknown',
                    isRandomlySelected: reg.randomly_selected || false
                  };
                })}
              reservePlayers={registrations
                .filter(reg => reg.status === 'reserve')
                .map(reg => {
                  const player = players.find(p => p.id === reg.player_id);
                  return {
                    id: reg.player_id,
                    friendly_name: player?.friendly_name || 'Unknown'
                  };
                })}
            />
          </div>
        )}

        <DebugInfo 
          game={game}
          registrations={registrations}
          players={players}
        />

        <div className="card-actions justify-end mt-4">
          <button
            className="btn btn-primary"
            onClick={() => onViewRegistrations(game.id)}
          >
            View Registrations
          </button>
        </div>
      </div>
    </motion.div>
  )
}
