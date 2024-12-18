import React from 'react';
import { X } from 'lucide-react';
import { 
  dismissAllNotifications, 
  markAllNotificationsAsRead, 
  dismissAllSlotOffers 
} from './NotificationActions';

interface NotificationButtonsProps {
  showAdminView: boolean;
  activeSlotOffers?: any[];
  notifications?: any[];
  playerId: string;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: () => Promise<void>;
  onSlotOffersUpdate: () => Promise<void>;
}

/**
 * Component that renders the notification action buttons
 * Includes "Mark All as Read" and "Dismiss All" functionality for both normal and admin views
 */
export const NotificationButtons: React.FC<NotificationButtonsProps> = ({
  showAdminView,
  activeSlotOffers = [],
  notifications = [],
  playerId,
  isAdmin,
  onClose,
  onUpdate,
  onSlotOffersUpdate,
}) => {
  return (
    <div className="flex items-center gap-2">
      {showAdminView ? (
        activeSlotOffers.length > 0 && (
          <button
            onClick={async () => {
              try {
                await dismissAllSlotOffers();
                await onSlotOffersUpdate();
              } catch (error) {
                console.error('Error dismissing all slot offers:', error);
              }
            }}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Dismiss All
          </button>
        )
      ) : (
        notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  await markAllNotificationsAsRead(playerId, isAdmin);
                  await onUpdate();
                } catch (error) {
                  console.error('Error marking all as read:', error);
                }
              }}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Mark All Read
            </button>
            <button
              onClick={async () => {
                try {
                  await dismissAllNotifications(playerId, isAdmin);
                  await onUpdate();
                } catch (error) {
                  console.error('Error dismissing all notifications:', error);
                }
              }}
              className="text-sm text-red-500 hover:text-red-600"
            >
              Dismiss All
            </button>
          </div>
        )
      )}
      <button onClick={onClose} className="hover:bg-base-300 p-1 rounded-full">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
