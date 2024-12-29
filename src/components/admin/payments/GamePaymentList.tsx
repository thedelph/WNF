import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../../utils/supabase';
import { Game } from '../../../types/game';
import { toast } from 'react-toastify';
import PaymentStatusBadge from './PaymentStatusBadge';

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

      // If marking as paid, send a confirmation notification
      if (paid) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            player_id: playerId,
            type: 'payment_confirmed',
            title: 'Payment Confirmed',
            message: `Your payment for game #${games.find(g => g.id === gameId)?.sequence_number} has been confirmed.`,
            metadata: {
              game_id: gameId,
              action: 'payment_confirmed'
            }
          });

        if (notifError) {
          console.error('Error sending payment confirmation:', notifError);
        }
      }
      
      toast.success(`Payment ${paid ? 'marked as paid' : 'unmarked'}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment status');
    }
  };

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

      // Only update selected players using admin client
      const { data, error } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          paid: true,
          payment_status: 'admin_verified',
          payment_received_date: now,
          payment_verified_at: now,
          payment_verified_by: adminPlayer.id,  // Use the admin's player ID
          payment_recipient_id: adminPlayer.id  // Use the admin's player ID
        })
        .eq('game_id', gameId)
        .eq('status', 'selected')
        .select();

      console.log('Update response:', { data, error });

      if (error) throw error;

      // Update the local state to reflect the changes
      const updatedGames = games.map(g => {
        if (g.id === gameId) {
          return {
            ...g,
            game_registrations: g.game_registrations?.map(reg => {
              if (reg.status === 'selected') {
                return {
                  ...reg,
                  paid: true,
                  payment_status: 'admin_verified',
                  payment_received_date: now,
                  payment_verified_at: now,
                  payment_verified_by: adminPlayer.id,
                  payment_recipient_id: adminPlayer.id
                };
              }
              return reg;
            })
          };
        }
        return g;
      });

      // Get selected players for notifications
      const selectedRegistrations = game.game_registrations?.filter(reg => 
        reg.status === 'selected'
      );

      // Send confirmation notifications to selected players only using admin client
      const notifications = selectedRegistrations?.map(reg => ({
        player_id: reg.player_id,
        type: 'payment_confirmed',
        title: 'Payment Confirmed',
        message: `Your payment for game #${game.sequence_number} has been confirmed by an admin.`,
        metadata: {
          game_id: gameId,
          action: 'payment_confirmed',
          verified_by: adminPlayer.id
        }
      })) || [];

      if (notifications.length > 0) {
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error sending payment confirmations:', notifError);
        }
      }
      
      toast.success('All selected players marked as paid');
      onUpdate();  // Call this to refresh the data from the server
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
                          <PaymentStatusBadge
                            paid={reg.paid}
                            paymentRequired={reg.payment_required}
                            className="mr-2"
                          />
                        </td>
                        <td>
                          {reg.payment_received_date 
                            ? new Date(reg.payment_received_date).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="space-x-2">
                          <button
                            className={`btn btn-sm ${reg.paid ? 'btn-error' : 'btn-success'}`}
                            onClick={() => handlePaymentToggle(game.id, reg.player_id, !reg.paid)}
                          >
                            {reg.paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                          {!reg.paid && reg.payment_required && (
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('notifications')
                                    .insert({
                                      player_id: reg.player_id,
                                      type: 'payment_reminder',
                                      title: 'Payment Reminder',
                                      message: `Reminder: Payment required for game #${game.sequence_number}. Click the Monzo link to pay.`,
                                      metadata: {
                                        game_id: game.id,
                                        payment_link: game.payment_link,
                                        amount: game.cost_per_person,
                                        action: 'payment_reminder'
                                      }
                                    });

                                  if (error) throw error;
                                  toast.success('Payment reminder sent');
                                } catch (error) {
                                  console.error('Error sending reminder:', error);
                                  toast.error('Failed to send payment reminder');
                                }
                              }}
                            >
                              Send Reminder
                            </button>
                          )}
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
