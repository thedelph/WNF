import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Game } from '../../../types/game'
import { format } from 'date-fns'
import { GameRegistrations } from './GameRegistrations'
import { PlayerSelectionResults } from '../../games/PlayerSelectionResults'
import { DebugInfo } from './DebugInfo'
import { FaUser, FaUserClock } from 'react-icons/fa';

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
              onClick={() => onDeleteClick(game.id)}
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
