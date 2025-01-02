import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabaseAdmin } from '../../utils/supabase';
import toast from '../../utils/toast';
import { SlotOffer } from './types';

interface AdminSlotOffersProps {
  slotOffers: SlotOffer[];
  onUpdate: () => Promise<void>;
}

/**
 * AdminSlotOffers component - Displays and manages slot offers for admins
 * Shows detailed information about slot offers and allows admins to take actions on behalf of players
 */
export const AdminSlotOffers: React.FC<AdminSlotOffersProps> = ({ slotOffers, onUpdate }) => {
  // Function to handle admin actions on slot offers
  const handleAdminAction = async (slotOfferId: string, action: 'accept' | 'decline') => {
    try {
      // Call the RPC function to handle the slot offer action
      const { error } = await supabaseAdmin
        .rpc('handle_admin_slot_offer_action', {
          p_slot_offer_id: slotOfferId,
          p_action: action,
          p_admin_id: null // We can add admin tracking later if needed
        });

      if (error) throw error;

      toast.success(`Successfully ${action}ed slot offer on behalf of player`);
      onUpdate();
    } catch (error) {
      console.error('Error handling admin slot offer action:', error);
      toast.error('Failed to process slot offer action');
    }
  };

  // Helper function to format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'MMM d, h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Helper function to get status badge styling
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'badge-warning',
      accepted: 'badge-success',
      declined: 'badge-error',
      voided: 'badge-neutral'
    };

    return badges[status] || badges.pending;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {slotOffers.map((offer) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-base-200 p-4 rounded-lg shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">
                  {offer.player?.friendly_name}
                  <span className={`badge ${getStatusBadge(offer.status)} ml-2`}>
                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                  </span>
                </h3>
                <p className="text-sm text-gray-500">
                  Game #{offer.game?.game_number} - {formatDate(offer.game?.date)}
                </p>
              </div>
              {offer.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAdminAction(offer.id, 'accept')}
                    className="btn btn-success btn-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleAdminAction(offer.id, 'decline')}
                    className="btn btn-error btn-sm"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>

            <div className="text-sm space-y-1 text-gray-600">
              <p>Offered: {formatDate(offer.offered_at)}</p>
              {offer.responded_at && (
                <p>Responded: {formatDate(offer.responded_at)}</p>
              )}
              {offer.accepted_at && (
                <p>Accepted: {formatDate(offer.accepted_at)}</p>
              )}
              {offer.rejected_at && (
                <p>Declined: {formatDate(offer.rejected_at)}</p>
              )}
            </div>
          </motion.div>
        ))}

        {slotOffers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No active slot offers found
          </div>
        )}
      </div>
    </div>
  );
};
