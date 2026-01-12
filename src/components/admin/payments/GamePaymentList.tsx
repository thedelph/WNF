import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../../utils/supabase';
import { Game } from '../../../types/game';
import { toast } from 'react-hot-toast';
import GamePaymentRow from './GamePaymentRow';
import GamePaymentStats from './GamePaymentStats';

interface Props {
  games: Game[];
  loading: boolean;
  showArchived: boolean;
  onUpdate: () => void;
}

/**
 * Component that displays a list of games with their payment information
 * Allows admins to manage payments and send reminders
 */
const GamePaymentList: React.FC<Props> = ({ games, loading, showArchived, onUpdate }) => {
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());

  // Filter games based on archive status and payment status
  const filteredGames = games.filter(game => {
    // Only show past games
    if (new Date(game.date) > new Date()) return false;

    // Check if all selected non-reserve players have paid
    const allPaid = game.game_registrations?.every(reg => 
      !reg.payment_required || reg.paid
    ) || false;

    // Show if archived is enabled or if there are unpaid players
    return showArchived || !allPaid;
  });

  const handleMarkAllPaid = async (gameId: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const now = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No admin user found');

      // Get the admin player record
      const { data: adminPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!adminPlayer) throw new Error('Admin player record not found');

      // Only update selected players
      const { error } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          paid: true,
          payment_status: 'admin_verified',
          payment_received_date: now,
          payment_verified_at: now,
          payment_verified_by: adminPlayer.id,
          payment_recipient_id: adminPlayer.id
        })
        .eq('game_id', gameId)
        .eq('status', 'selected');

      if (error) throw error;
      
      toast.success('All selected players marked as paid');
      onUpdate();
    } catch (error) {
      console.error('Error updating payments:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleBulkPaymentUpdate = async (paid: boolean) => {
    try {
      const { error } = await supabase
        .from('game_registrations')
        .update({ 
          paid,
          payment_received_date: paid ? new Date().toISOString() : null
        })
        .in('game_id', Array.from(selectedGames))
        .eq('status', 'selected');

      if (error) throw error;
      
      toast.success(`Bulk payment update successful`);
      setSelectedGames(new Set());
      onUpdate();
    } catch (error) {
      console.error('Error updating payments:', error);
      toast.error('Failed to update payments');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedGames.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 mb-4"
        >
          <button
            className="btn btn-primary"
            onClick={() => handleBulkPaymentUpdate(true)}
          >
            Mark Selected as Paid
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setSelectedGames(new Set())}
          >
            Clear Selection
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {filteredGames.map((game) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-base-100 shadow-xl"
          >
            <div className="card-body p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
                <h3 className="card-title text-base sm:text-lg break-words">
                  {new Date(game.date).toLocaleDateString()} - {game.venue?.name}
                </h3>
                <button
                  className="btn btn-primary btn-sm w-full sm:w-auto"
                  onClick={() => handleMarkAllPaid(game.id)}
                >
                  Mark All Paid
                </button>
              </div>
              
              <GamePaymentStats game={game} />

              {/* Check if there are registrations to display */}
              {(!game.game_registrations || game.game_registrations.length === 0) ? (
                <div className="text-center py-4 text-base-content/50">
                  No players found for this game. This may be a data loading issue.
                </div>
              ) : (
                <>
                  {/* Desktop table view */}
                  <div className="hidden sm:block overflow-x-auto mt-4">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Payment Status</th>
                          <th>Payment Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.game_registrations.map((reg) => (
                          <GamePaymentRow
                            key={reg.player_id}
                            registration={reg}
                            gameId={game.id}
                            sequenceNumber={game.sequence_number}
                            paymentLink={game.payment_link}
                            costPerPerson={game.cost_per_person}
                            onUpdate={onUpdate}
                            view="desktop"
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile card view */}
                  <div className="sm:hidden mt-3 space-y-3">
                    {game.game_registrations.map((reg) => (
                      <GamePaymentRow
                        key={reg.player_id}
                        registration={reg}
                        gameId={game.id}
                        sequenceNumber={game.sequence_number}
                        paymentLink={game.payment_link}
                        costPerPerson={game.cost_per_person}
                        onUpdate={onUpdate}
                        view="mobile"
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {filteredGames.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-base-content/50 mt-8"
        >
          No games found with outstanding payments.
        </motion.p>
      )}
    </div>
  );
};

export default GamePaymentList;
