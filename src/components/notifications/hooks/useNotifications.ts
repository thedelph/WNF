import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../../utils/supabase';
import { Notification } from '../types';
import toast from '../../../utils/toast';
import { useUser } from '../../../hooks/useUser';

export const useNotifications = () => {
  const { player } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications function
  const fetchNotifications = async () => {
    if (!player?.id) {
      console.log('No player ID available, skipping notifications fetch');
      return;
    }

    try {
      // First, fetch notifications
      let query = supabaseAdmin
        .from('notifications')
        .select(`
          *,
          metadata,
          player:players!notifications_player_id_fkey (
            friendly_name
          )
        `)
        .is('read_at', null)
        .order('created_at', { ascending: false });

      // Only filter by player_id if not an admin
      if (!player.isAdmin) {
        query = query.eq('player_id', player.id);
      }

      const { data: notificationsData, error } = await query;

      if (error) throw error;

      if (notificationsData) {
        // Process notifications and fetch additional data if needed
        const processedData = await Promise.all(notificationsData.map(async (notification) => {
          const metadata = typeof notification.metadata === 'string' 
            ? JSON.parse(notification.metadata) 
            : notification.metadata;

          // For slot offer notifications, fetch the dropped out player's name
          if (metadata?.action === 'slot_offer' && metadata?.dropped_out_player_id) {
            try {
              const { data: playerData } = await supabaseAdmin
                .from('players')
                .select('friendly_name')
                .eq('id', metadata.dropped_out_player_id)
                .single();

              if (playerData) {
                const gameDate = metadata.game_date 
                  ? new Date(metadata.game_date) 
                  : new Date();
                notification.message = `${playerData.friendly_name} has dropped out of the game on ${gameDate.toLocaleDateString()}. Would you like to play?`;

                notification.metadata = {
                  ...metadata,
                  slot_offer_id: metadata.slot_offer_id,
                  game_id: metadata.game_id,
                  action: 'slot_offer',
                  dropped_out_player_id: metadata.dropped_out_player_id
                };
              }
            } catch (error) {
              console.error('Error fetching dropped out player:', error);
            }
          }
          
          return {
            ...notification,
            metadata
          };
        }));

        setNotifications(processedData);
        setUnreadCount(processedData.length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Handler for dismissing a single notification
  const handleDismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      await fetchNotifications();
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast.error('Failed to dismiss notification');
    }
  };

  // Handler for dismissing all notifications
  const handleDismissAllNotifications = async () => {
    try {
      if (!player?.id) return;
      
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq(player.isAdmin ? 'read_at' : 'player_id', player.isAdmin ? null : player.id);

      if (error) throw error;
      
      await fetchNotifications();
      toast.success('All notifications dismissed');
    } catch (error) {
      console.error('Error dismissing all notifications:', error);
      toast.error('Failed to dismiss notifications');
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!player?.id) return;

    const notificationChannel = supabaseAdmin
      .channel('notifications-' + player.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          ...(player.isAdmin ? {} : { filter: `player_id=eq.${player.id}` })
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (player.isAdmin || payload.new.player_id === player.id) {
              setNotifications(prev => [payload.new as Notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            setUnreadCount(prev => Math.max(0, prev - 1));
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => 
              n.id === payload.new.id ? payload.new as Notification : n
            ));
          }
        }
      )
      .subscribe();

    return () => {
      notificationChannel.unsubscribe();
    };
  }, [player?.id]);

  // Initial fetch
  useEffect(() => {
    if (player?.id) {
      fetchNotifications();
    }
  }, [player?.id]);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    handleDismissNotification,
    handleDismissAllNotifications
  };
};
