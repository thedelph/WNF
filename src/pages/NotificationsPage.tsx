import React, { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { useUser } from '../hooks/useUser';
import { motion } from 'framer-motion';
import { UserCog } from 'lucide-react';
import { NotificationButtons } from '../components/notifications/NotificationButtons';
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

      if (!adminRole?.can_manage_games) {
        query = query.eq('player_id', player.id);
      }

      const { data: notificationsData, error } = await query;

      if (error) throw error;

      if (notificationsData) {
        setNotifications(notificationsData);
      }

      // Then, fetch active slot offers if user has admin role
      if (adminRole?.can_manage_games) {
        const { data: slotOffersData, error: slotOffersError } = await supabaseAdmin
          .from('slot_offers')
          .select('*, player:players!slot_offers_player_id_fkey(friendly_name)')
          .is('accepted_at', null)
          .is('rejected_at', null)
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

  // Handle slot offer response
  const handleSlotOffer = async (notificationId: string, gameId: string, accept: boolean) => {
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

  // Fetch admin role
  useEffect(() => {
    const fetchAdminRole = async () => {
      if (!player?.id) return;

      try {
        const { data, error } = await supabase
          .from('admin_roles')
          .select('*')
          .eq('player_id', player.id)
          .single();

        if (error) throw error;
        setAdminRole(data);
      } catch (error) {
        console.error('Error fetching admin role:', error);
      }
    };

    fetchAdminRole();
  }, [player?.id]);

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
  }, [player?.id, adminRole]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {adminRole?.can_manage_games && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAdminView(!showAdminView)}
              className={`btn btn-sm ${showAdminView ? 'btn-primary' : 'btn-ghost'}`}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Admin View
            </button>
          </div>
        )}
      </div>

      {/* Tabs for admin view */}
      {adminRole?.can_manage_games && showAdminView && (
        <div className="tabs tabs-boxed mb-6">
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
      {showAdminView && adminRole?.can_manage_games ? (
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
            <div className="text-center py-8 text-gray-500">
              No new notifications
            </div>
          )}
        </div>
      )}
      {!showAdminView && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Notification History</h2>
          <NotificationHistory playerId={player?.id} />
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
