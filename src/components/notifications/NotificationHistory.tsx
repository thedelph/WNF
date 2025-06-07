import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabaseAdmin } from '../../utils/supabase';
import toast from '../../utils/toast';

interface NotificationHistoryProps {
  playerId: string | undefined;
}

/**
 * Component that displays notification history for admins
 * Shows when notifications were sent, who they were sent to, and actions taken
 */
export const NotificationHistory: React.FC<NotificationHistoryProps> = ({ playerId }) => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    created_at: string;
    message: string;
    player: {
      friendly_name: string;
    };
    metadata: {
      action?: string;
      game_id?: string;
      dropped_out_player_id?: string;
      response?: 'accepted' | 'declined';
    };
  }>>([]);

  // Fetch notification history
  useEffect(() => {
    const fetchNotificationHistory = async () => {
      if (!playerId) return;

      try {
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .select(`
            *,
            metadata,
            player:players!notifications_player_id_fkey (
              friendly_name
            )
          `)
          .eq('player_id', playerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (error) {
        console.error('Error fetching notification history:', error);
        toast.error('Failed to fetch notification history');
      }
    };

    fetchNotificationHistory();
  }, [playerId]);

  const getStatusDisplay = (notification: typeof notifications[0]) => {
    const isSlotOffer = notification.metadata?.action === 'slot_offer';
    const status = notification.metadata?.response || (isSlotOffer ? 'pending' : 'sent');
    
    const statusColor = {
      pending: 'text-yellow-500',
      accepted: 'text-green-500',
      declined: 'text-red-500',
      sent: 'text-gray-500'
    }[status] || 'text-gray-500';

    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <span className={statusColor}>
        {displayStatus}
      </span>
    );
  };

  const getNotificationType = (notification: typeof notifications[0]) => {
    const action = notification.metadata?.action;
    if (!action) return 'Notification';
    
    return action.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Notification History</h3>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Recipient</th>
              <th>Message</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.id} className="hover">
                <td className="whitespace-nowrap">
                  {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                </td>
                <td>{notification.player.friendly_name}</td>
                <td className="max-w-md truncate">{notification.message}</td>
                <td>{getNotificationType(notification)}</td>
                <td>{getStatusDisplay(notification)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
