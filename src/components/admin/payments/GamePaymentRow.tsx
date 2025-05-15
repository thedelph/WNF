import React from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../utils/supabase';
import { GameRegistration } from '../../../types/game';
import PaymentStatusBadge from './PaymentStatusBadge';
import { toast } from 'react-hot-toast';

interface Props {
  registration: GameRegistration;
  gameId: string;
  sequenceNumber?: number;
  paymentLink?: string;
  costPerPerson?: number;
  onUpdate: () => void;
  view?: 'mobile' | 'desktop'; // Add the view prop with mobile or desktop options
}

/**
 * Component that renders a single row in the payment list table
 * Handles displaying player payment status and payment actions
 */
const GamePaymentRow: React.FC<Props> = ({
  registration: reg,
  gameId,
  sequenceNumber,
  paymentLink,
  costPerPerson,
  onUpdate,
  view = 'desktop' // Default to desktop view
}) => {
  const handlePaymentToggle = async (paid: boolean) => {
    try {
      const { error } = await supabase
        .from('game_registrations')
        .update({ 
          paid,
          payment_received_date: paid ? new Date().toISOString() : null
        })
        .match({ game_id: gameId, player_id: reg.player_id });

      if (error) throw error;
      
      if (paid) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            player_id: reg.player_id,
            type: 'payment_confirmed',
            title: 'Payment Confirmed',
            message: `Your payment for game #${sequenceNumber} has been confirmed.`,
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

  const sendPaymentReminder = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          player_id: reg.player_id,
          type: 'payment_reminder',
          title: 'Payment Reminder',
          message: `Reminder: Payment required for game #${sequenceNumber}. Click the Monzo link to pay.`,
          metadata: {
            game_id: gameId,
            payment_link: paymentLink,
            amount: costPerPerson,
            action: 'payment_reminder'
          }
        });

      if (error) throw error;
      toast.success('Payment reminder sent');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send payment reminder');
    }
  };

  // Render table row for desktop view
  if (view === 'desktop') {
    return (
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hover"
      >
        <td>{reg.player?.friendly_name}</td>
        <td>
          {reg.status === 'reserve' || reg.is_reserve ? (
            <span className="badge badge-secondary">Reserve</span>
          ) : reg.status === 'selected' ? (
            <PaymentStatusBadge
              paid={reg.paid}
              paymentRequired={reg.payment_required}
              className="mr-2"
            />
          ) : (
            <span className="badge badge-ghost">Not Selected</span>
          )}
        </td>
        <td>
          {(reg.status === 'reserve' || reg.is_reserve) ? (
            '-'
          ) : reg.status === 'selected' ? (
            reg.payment_received_date 
              ? new Date(reg.payment_received_date).toLocaleDateString()
              : '-'
          ) : (
            '-'
          )}
        </td>
        <td className="space-x-2">
          {reg.status === 'selected' && !reg.is_reserve && (
            <>
              <button
                className={`btn btn-sm ${reg.paid ? 'btn-error' : 'btn-success'}`}
                onClick={() => handlePaymentToggle(!reg.paid)}
              >
                {reg.paid ? 'Mark Unpaid' : 'Mark Paid'}
              </button>
              {!reg.paid && reg.payment_required && (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={sendPaymentReminder}
                >
                  Send Reminder
                </button>
              )}
            </>
          )}
        </td>
      </motion.tr>
    );
  }
  
  // Render card for mobile view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card bg-base-100 border border-base-300 shadow-sm p-3"
    >
      {/* Player name and payment status */}
      <div className="flex justify-between items-start mb-2">
        <div className="font-semibold">{reg.player?.friendly_name}</div>
        {reg.status === 'reserve' || reg.is_reserve ? (
          <span className="badge badge-secondary">Reserve</span>
        ) : reg.status === 'selected' ? (
          <PaymentStatusBadge
            paid={reg.paid}
            paymentRequired={reg.payment_required}
            className="ml-2"
          />
        ) : (
          <span className="badge badge-ghost">Not Selected</span>
        )}
      </div>
      
      {/* Payment date if applicable */}
      {reg.status === 'selected' && !reg.is_reserve && (
        <div className="text-xs opacity-70 mb-3">
          Payment Date: {reg.payment_received_date 
            ? new Date(reg.payment_received_date).toLocaleDateString()
            : 'Not paid'}
        </div>
      )}
      
      {/* Actions */}
      {reg.status === 'selected' && !reg.is_reserve && (
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            className={`btn btn-xs ${reg.paid ? 'btn-error' : 'btn-success'} flex-1`}
            onClick={() => handlePaymentToggle(!reg.paid)}
          >
            {reg.paid ? 'Mark Unpaid' : 'Mark Paid'}
          </button>
          {!reg.paid && reg.payment_required && (
            <button
              className="btn btn-xs btn-ghost flex-1"
              onClick={sendPaymentReminder}
            >
              Send Reminder
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default GamePaymentRow;
