import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../utils/supabase';
import { Game } from '../../../types/game';
import { toast } from 'react-toastify';

interface Props {
  games: Game[];
  loading: boolean;
  showArchived: boolean;
  onUpdate: () => void;
}

const GamePaymentList: React.FC<Props> = ({ games, loading, showArchived, onUpdate }) => {
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());

  const filteredGames = games.filter(game => {
    const allPaid = game.game_registrations?.every(reg => reg.paid) || false;
    return showArchived ? true : !allPaid;
  });

  const handlePaymentToggle = async (gameId: string, playerId: string, paid: boolean) => {
    try {
      const { error } = await supabase
        .from('game_registrations')
        .update({ 
          paid,
          payment_received_date: paid ? new Date().toISOString() : null
        })
        .match({ game_id: gameId, player_id: playerId });

      if (error) throw error;
      
      toast.success(`Payment ${paid ? 'marked as paid' : 'unmarked'}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleMarkAllPaid = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from('game_registrations')
        .update({ 
          paid: true,
          payment_received_date: new Date().toISOString()
        })
        .eq('game_id', gameId);

      if (error) throw error;
      
      toast.success('All players marked as paid');
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
        .in('game_id', Array.from(selectedGames));

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
            <div className="card-body">
              <div className="flex justify-between items-center">
                <h3 className="card-title">
                  {new Date(game.date).toLocaleDateString()} - {game.venue?.name}
                </h3>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleMarkAllPaid(game.id)}
                >
                  Mark All Paid
                </button>
              </div>
              
              <div className="stats shadow mb-4">
                <div className="stat">
                  <div className="stat-title">Total Cost</div>
                  <div className="stat-value text-primary">£{game.pitch_cost}</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Cost Per Player</div>
                  <div className="stat-value text-secondary">
                    £{(game.pitch_cost / (game.game_registrations?.length || 1)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
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
                    {game.game_registrations?.map((reg) => (
                      <motion.tr
                        key={reg.player_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover"
                      >
                        <td>{reg.player.friendly_name}</td>
                        <td>
                          <span className={`badge ${reg.paid ? 'badge-success' : 'badge-error'}`}>
                            {reg.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td>
                          {reg.payment_received_date 
                            ? new Date(reg.payment_received_date).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${reg.paid ? 'btn-error' : 'btn-success'}`}
                            onClick={() => handlePaymentToggle(game.id, reg.player_id, !reg.paid)}
                          >
                            {reg.paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {filteredGames.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-500 mt-8"
        >
          No games found with outstanding payments.
        </motion.p>
      )}
    </div>
  );
};

export default GamePaymentList;
