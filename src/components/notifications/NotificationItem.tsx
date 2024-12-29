import React from 'react';
import { X as XIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Notification } from './types';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => Promise<void>;
  onSlotOffer: (notificationId: string, gameId: string, accept: boolean) => Promise<void>;
}

/**
 * Component for rendering a single notification item
 * Handles both regular notifications and slot offer notifications
 */
export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  onSlotOffer,
}) => {
  const isSlotOffer = notification.type === 'slot_offer';
  const metadata = typeof notification.metadata === 'string'
    ? JSON.parse(notification.metadata)
    : notification.metadata;

  const handleSlotOfferAction = async (accept: boolean) => {
    try {
      if (!metadata?.game_id) {
        throw new Error('No game ID found in notification metadata');
      }
      await onSlotOffer(notification.id, metadata.game_id, accept);
    } catch (error) {
      console.error('Error handling slot offer action:', error);
      alert('Failed to process slot offer. Please try again.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex flex-col gap-2 p-4 border-b relative group bg-base-200 rounded-lg"
    >
      <button
        onClick={() => onDismiss(notification.id)}
        className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-base-300 transition-opacity"
        title="Dismiss notification"
      >
        <XIcon className="w-4 h-4" />
      </button>

      <div className="flex flex-col gap-1">
        <p className="text-sm">{notification.message}</p>
        <span className="text-xs text-gray-500">
          {format(new Date(notification.created_at), 'MMM d, h:mm a')}
        </span>
      </div>

      {isSlotOffer && metadata?.game_id && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => handleSlotOfferAction(true)}
            className="btn btn-sm btn-success flex-1"
          >
            Accept
          </button>
          <button
            onClick={() => handleSlotOfferAction(false)}
            className="btn btn-sm btn-error flex-1"
          >
            Decline
          </button>
        </div>
      )}

      {notification.type === 'payment_request' && notification.action_url && (
        <div className="flex gap-2 mt-2">
          <a
            href={notification.action_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-primary flex-1"
          >
            Pay Now
          </a>
        </div>
      )}
    </motion.div>
  );
};
