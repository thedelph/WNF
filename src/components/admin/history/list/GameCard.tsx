'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BiUser } from 'react-icons/bi'
import { FiEdit, FiTrash2 } from 'react-icons/fi'
import { FaCalendar, FaClock, FaMapMarkerAlt, FaExclamationTriangle, FaUsers } from 'react-icons/fa'
import { FileText } from 'lucide-react'
import { supabaseAdmin } from '../../../../utils/supabase'
import { toast } from 'react-hot-toast'
import { Game } from '../../../../types/game'
import EditGameModal from './EditGameModal'
import { PostMatchReport } from '../../../game/PostMatchReport'
import { formatDate, formatTime } from '../../../../utils/dateUtils'

interface Props {
  game: Game
  onGameDeleted: () => void
}

const GameCard: React.FC<Props> = ({ game, onGameDeleted }) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPlayers, setShowPlayers] = useState(false)

  useEffect(() => {
    if (showPlayers) {
      console.log('Game registrations:', game.game_registrations)
      console.log('Sample registration:', game.game_registrations?.[0])
    }
  }, [showPlayers, game.game_registrations])

  /**
   * Handles game deletion using a phased approach to avoid transaction conflicts
   */
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this historical game?')) {
      return
    }

    // For debugging - log the game we're trying to delete
    console.log('Attempting to delete game:', { 
      id: game.id, 
      sequence: game.sequence_number,
      date: game.date
    });

    setIsDeleting(true)
    try {
      // PHASE 1: Clear foreign key references first
      // This SQL approach is more direct and avoids trigger conflicts
      const deleteChildren = [
        // Return any tokens used for this game
        supabaseAdmin.rpc('return_game_tokens', { game_id: game.id }),
        // Delete all direct references to the game
        supabaseAdmin.from('game_registrations').delete().eq('game_id', game.id),
        supabaseAdmin.from('game_selections').delete().eq('game_id', game.id),
        supabaseAdmin.from('balanced_team_assignments').delete().eq('game_id', game.id),
        supabaseAdmin.from('player_penalties').delete().eq('game_id', game.id),
        supabaseAdmin.from('registration_locks').delete().eq('game_id', game.id)
      ];
      
      // Wait for all FK references to be deleted
      await Promise.all(deleteChildren);
      console.log('All game child records deleted');
      
      // PHASE 2: Delete the game itself using direct SQL while disabling triggers
      // This temporarily disables problematic triggers during deletion to avoid timeouts
      const { data: deleteResult, error: deleteGameError } = await supabaseAdmin
        .rpc('delete_game_without_triggers', { game_id: game.id });
        
      // Check if the deletion was successful
      if (deleteResult !== true) {
        console.log('Game deletion failed:', { deleteResult });
        throw new Error('Game deletion failed');
      }
        
      if (deleteGameError) {
        console.log('Error deleting game:', deleteGameError);
        throw deleteGameError;
      }
      
      console.log('Game deleted successfully');
      
      // PHASE 3: Refresh materialized views
      // Do this in a completely separate transaction
      const { error: refreshError } = await supabaseAdmin
        .rpc('refresh_token_status_view');
        
      if (refreshError) {
        console.log('Error refreshing views (non-critical):', refreshError);
        // Don't throw this error - view refresh is not critical
      }
      
      // Show success message and refresh UI
      toast.success('Game #' + game.sequence_number + ' deleted successfully');
      onGameDeleted();
    } catch (error: unknown) {
      console.error('Error deleting game:', error);
      let errorMessage = 'Unknown error';
      
      // Type guard for error with message property
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
      }
      
      toast.error('Failed to delete game: ' + errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }

  const isTeamsUneven = (registrations: any[]) => {
    const blueTeam = registrations.filter(reg => reg.team === 'blue')
    const orangeTeam = registrations.filter(reg => reg.team === 'orange')
    return blueTeam.length !== orangeTeam.length
  }

  const getTeamPlayers = (registrations: any[], team: string) => {
    return registrations.filter(reg => reg.team === team)
  }

  const getGameOutcomeDisplay = () => {
    // If we have exact scores, show them with the stats component
    if (game.score_blue !== null && game.score_orange !== null) {
      return (
        <div className="stats shadow bg-base-100">
          <div className="stat place-items-center">
            <div className="stat-title text-blue-500 dark:text-blue-400">Blue Team</div>
            <div className="stat-value text-blue-500 dark:text-blue-400">{game.score_blue}</div>
            {game.outcome === 'blue_win' && (
              <div className="stat-desc">
                <div className="badge badge-primary badge-sm">Winner</div>
              </div>
            )}
          </div>
          <div className="stat place-items-center">
            <div className="stat-title text-orange-500 dark:text-orange-400">Orange Team</div>
            <div className="stat-value text-orange-500 dark:text-orange-400">{game.score_orange}</div>
            {game.outcome === 'orange_win' && (
              <div className="stat-desc">
                <div className="badge badge-warning badge-sm">Winner</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // If we only know the outcome but not the exact score
    if (game.outcome) {
      switch (game.outcome) {
        case 'blue_win':
          return (
            <div className="alert bg-blue-500/10 border-blue-500">
              <div className="flex items-center gap-2">
                <div className="badge badge-primary">Winner</div>
                <span className="font-semibold">Blue Team Victory</span>
                <span className="text-sm opacity-70">(Score not recorded)</span>
              </div>
            </div>
          );
        case 'orange_win':
          return (
            <div className="alert bg-orange-500/10 border-orange-500">
              <div className="flex items-center gap-2">
                <div className="badge badge-warning">Winner</div>
                <span className="font-semibold">Orange Team Victory</span>
                <span className="text-sm opacity-70">(Score not recorded)</span>
              </div>
            </div>
          );
        case 'draw':
          return (
            <div className="alert bg-neutral/10 border-neutral">
              <div className="flex items-center gap-2">
                <div className="badge badge-neutral">Draw</div>
                <span className="font-semibold">Match Drawn</span>
                <span className="text-sm opacity-70">(Score not recorded)</span>
              </div>
            </div>
          );
        default:
          return null;
      }
    }

    // If we don't have scores or outcome
    return (
      <div className="alert alert-warning">
        <FaExclamationTriangle />
        <span>Result not recorded</span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="card bg-base-200 shadow-lg hover:shadow-xl transition-all"
    >
      <div className="card-body p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-3">
            {/* WNF Number and Status Indicators */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="card-title text-primary">
                WNF #{game.sequence_number || '?'}
              </h3>
              {/* Missing Score Indicator - only show if we have an outcome but no scores */}
              {game.outcome && (game.score_blue === null || game.score_orange === null) && (
                <div className="badge badge-ghost gap-1">
                  <FaExclamationTriangle className="w-3 h-3" />
                  Score Not Recorded
                </div>
              )}
              {/* Missing Result Indicator - only show if we have no outcome and no scores */}
              {!game.outcome && (game.score_blue === null || game.score_orange === null) && (
                <div className="badge badge-warning gap-1">
                  <FaExclamationTriangle className="w-3 h-3" />
                  Result Missing
                </div>
              )}
              {/* Uneven Teams Indicator */}
              {game.game_registrations && isTeamsUneven(game.game_registrations) && (
                <div className="badge badge-error gap-1">
                  <FaUsers className="w-3 h-3" />
                  Uneven Teams
                </div>
              )}
            </div>

            {/* Date and Time */}
            <p className="text-base-content/80">
              {formatDate(game.date)} at {formatTime(game.date)}
            </p>
            
            {/* Venue Information */}
            <div className="flex items-center gap-2 text-base-content/70">
              <FaMapMarkerAlt className="shrink-0" />
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{game.venue?.name || 'Venue TBD'}</span>
                {game.venue?.address && (
                  <span className="text-sm">({game.venue.address})</span>
                )}
                {game.venue?.google_maps_url && (
                  <a 
                    href={game.venue.google_maps_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link link-primary text-sm"
                  >
                    View Map
                  </a>
                )}
              </div>
            </div>

            {/* Score/Outcome Display */}
            {getGameOutcomeDisplay()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="btn btn-ghost btn-sm text-primary"
              title="View Match Report"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="btn btn-ghost btn-sm"
              title="Edit Game"
            >
              <FiEdit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-ghost btn-sm text-error"
              disabled={isDeleting}
              title="Delete Game"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Players List (Expandable) */}
        <div className="mt-4">
          <button
            onClick={() => setShowPlayers(!showPlayers)}
            className="btn btn-sm btn-outline w-full gap-2"
          >
            <BiUser />
            {showPlayers ? 'Hide Players' : 'Show Players'}
          </button>
        </div>

        <AnimatePresence>
          {showPlayers && game.game_registrations && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Blue Team */}
                <div className="card bg-blue-500/10">
                  <div className="card-body p-3">
                    <h4 className="card-title text-sm text-blue-500 dark:text-blue-400">Blue Team</h4>
                    <ul className="list-none">
                      {getTeamPlayers(game.game_registrations, 'blue').map(reg => (
                        <li key={reg.id} className="text-sm">
                          {reg.players?.friendly_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {/* Orange Team */}
                <div className="card bg-orange-500/10">
                  <div className="card-body p-3">
                    <h4 className="card-title text-sm text-orange-500 dark:text-orange-400">Orange Team</h4>
                    <ul className="list-none">
                      {getTeamPlayers(game.game_registrations, 'orange').map(reg => (
                        <li key={reg.id} className="text-sm">
                          {reg.players?.friendly_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditGameModal
          game={game}
          onClose={() => setShowEditModal(false)}
          onGameUpdated={onGameDeleted}
        />
      )}

      {/* Post-Match Report Modal */}
      <PostMatchReport
        gameId={game.id}
        sequenceNumber={game.sequence_number}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </motion.div>
  )
}

export default GameCard