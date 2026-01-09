import React, { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { useUser } from '../hooks/useUser';
import { motion } from 'framer-motion';
import { UserCog } from 'lucide-react';
import { NotificationItem } from '../components/notifications/NotificationItem';
import { SlotOfferItem } from '../components/notifications/SlotOfferItem';
import { NotificationHistory } from '../components/notifications/NotificationHistory';
import { AdminSlotOffers } from '../components/notifications/AdminSlotOffers';
import { Notification, SlotOffer, AdminRole } from '../components/notifications/types';
import toast from '../utils/toast';

// NotificationsPage component - A dedicated page for managing notifications
const NotificationsPage = () => {
  const { player } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [activeSlotOffers, setActiveSlotOffers] = useState<SlotOffer[]>([]);
  const [showAdminView, setShowAdminView] = useState(false);

  // Fetch notifications function
  const fetchNotifications = async () => {
    if (!player?.id) return;

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

      if (!player.isAdmin || !showAdminView) {
        query = query.eq('player_id', player.id);
      }

      const { data: notificationsData, error } = await query;

      if (error) throw error;

      if (notificationsData) {
        setNotifications(notificationsData);
      }

      // Then, fetch active slot offers if user has admin role
      if (player.isAdmin) {
        const { data: slotOffersData, error: slotOffersError } = await supabaseAdmin
          .from('slot_offers')
          .select('*, player:players!slot_offers_player_id_fkey(friendly_name)')
          .eq('status', 'pending')
          .not('status', 'in', '("expired","voided")')
          .order('created_at', { ascending: false });

        if (slotOffersError) throw slotOffersError;

        if (slotOffersData) {
          setActiveSlotOffers(slotOffersData);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    }
  };

  // Handle dismissing a notification
  const handleDismiss = async (notificationId: string) => {
    if (!player?.id) return;

    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error dismissing notification:', error);
      toast.error('Failed to dismiss notification');
    }
  };

  // Handle dismissing all notifications
  const handleDismissAll = async () => {
    if (!player?.id) return;

    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq(player.isAdmin && showAdminView ? 'read_at' : 'player_id', player.isAdmin && showAdminView ? null : player.id);

      if (error) throw error;
      await fetchNotifications();
      toast.success('All notifications dismissed');
    } catch (error) {
      console.error('Error dismissing all notifications:', error);
      toast.error('Failed to dismiss notifications');
    }
  };

  // Handle slot offer response
  const handleSlotOffer = async (notificationId: string, gameId: string, accept: boolean) => {
    if (!player?.id) return;

    try {
      // First, update the notification
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .update({
          read_at: new Date().toISOString(),
          metadata: {
            action: 'slot_offer',
            game_id: gameId,
            response: accept ? 'accepted' : 'declined'
          }
        })
        .eq('id', notificationId);

      if (notificationError) throw notificationError;

      // Then, update the slot offer
      const updateField = accept ? 'accepted_at' : 'rejected_at';
      const { error: slotOfferError } = await supabaseAdmin
        .from('slot_offers')
        .update({ [updateField]: new Date().toISOString() })
        .eq('game_id', gameId)
        .eq('player_id', player?.id);

      if (slotOfferError) throw slotOfferError;

      toast.success(`Successfully ${accept ? 'accepted' : 'declined'} slot offer`);
      fetchNotifications();
    } catch (error) {
      console.error('Error handling slot offer:', error);
      toast.error('Failed to process slot offer');
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!player?.id) return;

    // Set up real-time subscriptions
    const channels = [
      // Notifications channel
      supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            ...(player.isAdmin && showAdminView ? {} : { filter: `player_id=eq.${player.id}` })
          },
          () => {
            fetchNotifications();
          }
        ),

      // Slot offers channel
      supabase
        .channel('slot-offers-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'slot_offers',
          },
          () => {
            fetchNotifications();
          }
        )
    ];

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe());

    // Initial fetch
    fetchNotifications();

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [player?.id, showAdminView]);

  if (!player) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex items-center gap-4">
          {player?.isAdmin && (
            <button
              onClick={() => setShowAdminView(!showAdminView)}
              className={`btn btn-sm ${showAdminView ? 'btn-primary' : 'btn-ghost'}`}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Admin View
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="btn btn-sm btn-ghost"
            >
              Dismiss All
            </button>
          )}
        </div>
      </div>

      {/* Tabs for admin view */}
      {player.isAdmin && showAdminView && (
        <div className="tabs tabs-box mb-6">
          <button
            className={`tab ${!showAdminView ? 'tab-active' : ''}`}
            onClick={() => setShowAdminView(false)}
          >
            My Notifications
          </button>
          <button
            className={`tab ${showAdminView ? 'tab-active' : ''}`}
            onClick={() => setShowAdminView(true)}
          >
            Slot Offers
          </button>
        </div>
      )}

      {/* Show either admin view or regular notifications */}
      {showAdminView && player.isAdmin ? (
        <AdminSlotOffers
          slotOffers={activeSlotOffers}
          onUpdate={fetchNotifications}
        />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={handleDismiss}
              onSlotOffer={handleSlotOffer}
            />
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No new notifications
            </div>
          )}
        </div>
      )}
      {!showAdminView && (
        <div className="mt-8">
          <NotificationHistory playerId={player?.id} />
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
