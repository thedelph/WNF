import React from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { X as XIcon } from 'lucide-react';
import { SlotOffer } from './types';

interface SlotOfferItemProps {
  slotOffer: SlotOffer;
  onDismiss: (id: string) => Promise<void>;
}

/**
 * Component for displaying a slot offer in the admin view
 * Shows the player name, game details, and status of the offer
 */
export const SlotOfferItem: React.FC<SlotOfferItemProps> = ({ slotOffer, onDismiss }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'text-success';
      case 'declined':
        return 'text-error';
      case 'voided':
        return 'text-gray-500';
      default:
        return 'text-warning';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, h:mm a');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex flex-col gap-2 p-4 border-b relative group bg-base-200 rounded-lg"
    >
      <button
        onClick={() => onDismiss(slotOffer.id)}
        className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-base-300 transition-opacity"
        title="Dismiss slot offer"
      >
        <XIcon className="w-4 h-4" />
      </button>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold">{slotOffer.player.friendly_name}</h3>
          <span className={`text-sm font-medium ${getStatusColor(slotOffer.status)}`}>
            {slotOffer.status.charAt(0).toUpperCase() + slotOffer.status.slice(1)}
          </span>
        </div>

        <div className="text-sm">
          <p>
            Game #{slotOffer.game.sequence_number} at {slotOffer.game.venue.name}
          </p>
          <p className="text-gray-500">
            {formatDate(slotOffer.game.date)}
          </p>
        </div>

        <div className="text-xs text-gray-500 mt-1">
          <p>Offered: {formatDate(slotOffer.offered_at)}</p>
          {slotOffer.responded_at && (
            <p>Responded: {formatDate(slotOffer.responded_at)}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
