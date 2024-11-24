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
        .update({ paid })
        .match({ game_id: gameId, player_id: playerId });

      if (error) throw error;
      
      toast.success(`Payment ${paid ? 'marked as paid' : 'unmarked'}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleBulkPaymentUpdate = async (paid: boolean) => {
    try {
      const { error } = await supabase
        .from('game_registrations')
        .update({ paid })
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
            exit={{ opacity: 0, y: -20 }}
            className="card bg-base-100 shadow-xl"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={selectedGames.has(game.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedGames);
                    if (e.target.checked) {
                      newSelected.add(game.id);
                    } else {
                      newSelected.delete(game.id);
                    }
                    setSelectedGames(newSelected);
                  }}
                />
                <h3 className="text-lg font-bold">
                  {new Date(game.date).toLocaleDateString()}
                </h3>
                <span className="badge badge-primary">
                  £{game.pitch_cost?.toFixed(2) || '0.00'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Status</th>
                      <th>Paid By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.game_registrations?.map((registration) => (
                      <tr key={registration.id}>
                        <td>{registration.player?.friendly_name}</td>
                        <td>
                          <span className={`badge ${registration.paid ? 'badge-success' : 'badge-error'}`}>
                            {registration.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td>
                          {registration.paid_by_player_id ? 
                            registration.paid_by?.friendly_name : '-'}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => handlePaymentToggle(
                              game.id,
                              registration.player_id,
                              !registration.paid
                            )}
                          >
                            {registration.paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </td>
                      </tr>
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
