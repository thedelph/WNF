import React, { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { useUser } from '../hooks/useUser';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, UserCog } from 'lucide-react';
import { NotificationButtons } from './notifications/NotificationButtons';
import { NotificationItem } from './notifications/NotificationItem';
import { SlotOfferItem } from './notifications/SlotOfferItem';
import { NotificationHistory } from './notifications/NotificationHistory';
import { Notification, SlotOffer, AdminRole } from './notifications/types';
import toast from '../utils/toast';

export const Notifications = () => {
  const { player } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
                // Update the message with player names, avoiding duplication
                const gameDate = metadata.game_date 
                  ? new Date(metadata.game_date) 
                  : new Date();
                notification.message = `${playerData.friendly_name} has dropped out of the game on ${gameDate.toLocaleDateString()}. Would you like to play?`;

                // Ensure slot_offer_id is preserved in metadata
                notification.metadata = {
                  ...metadata,
                  slot_offer_id: metadata.slot_offer_id, // Preserve the slot_offer_id
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

  // Fetch active slot offers for admin view
  const fetchActiveSlotOffers = async () => {
    if (!adminRole?.can_manage_games) return;

    try {
      console.log('Fetching active slot offers...');
      const { data: offers, error } = await supabaseAdmin
        .from('slot_offers')
        .select(`
          id,
          game_id,
          player_id,
          status,
          offered_at,
          responded_at,
          player:players!slot_offers_player_id_fkey (
            id,
            friendly_name
          ),
          game:games!slot_offers_game_id_fkey (
            id,
            date,
            venue:venues (
              name
            )
          )
        `)
        .eq('status', 'pending')
        .order('offered_at', { ascending: false });

      if (error) {
        console.error('Error fetching slot offers:', error);
        throw error;
      }

      console.log('Fetched slot offers:', offers);
      setActiveSlotOffers(offers || []);
    } catch (error) {
      console.error('Error in fetchActiveSlotOffers:', error);
    }
  };

  useEffect(() => {
    if (!player?.id) return;

    // Check admin permissions
    const checkAdminRole = async () => {
      try {
        const { data: adminData, error } = await supabaseAdmin
          .from('admin_permissions')
          .select(`
            id,
            permission,
            admin_role:admin_roles!inner (
              player_id
            )
          `)
          .eq('permission', 'manage_games')
          .eq('admin_role.player_id', player.id)
          .single();

        if (error) {
          setAdminRole(null);
          return;
        }

        setAdminRole(adminData ? { can_manage_games: true } : null);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setAdminRole(null);
      }
    };

    checkAdminRole();

    // Subscribe to notifications
    const notificationChannel = supabaseAdmin
      .channel('notifications-' + player.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          ...(adminRole?.can_manage_games ? {} : { filter: `player_id=eq.${player.id}` })
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (adminRole?.can_manage_games || payload.new.player_id === player.id) {
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

    // Subscribe to slot offers if admin
    const slotOfferChannel = supabaseAdmin
      .channel('slot_offers-' + player.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_offers'
        },
        () => {
          fetchActiveSlotOffers();
        }
      )
      .subscribe();

    return () => {
      notificationChannel.unsubscribe();
      slotOfferChannel.unsubscribe();
    };
  }, [player?.id]);

  useEffect(() => {
    if (player?.id) {
      fetchNotifications();
    }
  }, [adminRole, player?.id]);

  useEffect(() => {
    if (adminRole?.can_manage_games) {
      fetchActiveSlotOffers();
    }
  }, [adminRole]);

  // Handler for slot offer actions (accept/decline)
  const handleSlotOffer = async (notificationId: string, gameId: string, accept: boolean) => {
    try {
      // Get the notification first to get the slot offer ID
      const { data: notification, error: notificationError } = await supabaseAdmin
        .from('notifications')
        .select('metadata')
        .eq('id', notificationId)
        .maybeSingle();

      if (notificationError) throw notificationError;
      if (!notification) {
        throw new Error('Notification not found');
      }

      const metadata = typeof notification.metadata === 'string'
        ? JSON.parse(notification.metadata)
        : notification.metadata;

      if (!metadata?.slot_offer_id) {
        throw new Error('No slot offer ID found in notification');
      }

      // Check if this player is the one who dropped out
      if (metadata.dropped_out_player_id === player?.id) {
        toast.error('You cannot accept a slot offer for a game you dropped out from');
        return;
      }

      // Get the slot offer with status 'pending'
      const { data: slotOffer, error: fetchError } = await supabaseAdmin
        .from('slot_offers')
        .select('*')
        .eq('id', metadata.slot_offer_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!slotOffer) {
        throw new Error('Slot offer not found');
      }

      // Update slot offer status
      const { error: updateError } = await supabaseAdmin
        .from('slot_offers')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', slotOffer.id);

      if (updateError) throw updateError;

      // If accepted, update game registration
      if (accept) {
        // First check if registration exists
        const { data: existingReg, error: checkError } = await supabaseAdmin
          .from('game_registrations')
          .select('id, status')
          .eq('game_id', gameId)
          .eq('player_id', player?.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingReg) {
          // Update existing registration
          const { error: updateRegError } = await supabaseAdmin
            .from('game_registrations')
            .update({ 
              status: 'selected'
            })
            .eq('id', existingReg.id);

          if (updateRegError) throw updateRegError;
        } else {
          // Create new registration
          const { error: createRegError } = await supabaseAdmin
            .from('game_registrations')
            .insert({
              game_id: gameId,
              player_id: player?.id,
              status: 'selected',
              created_at: new Date().toISOString()
            });

          if (createRegError) throw createRegError;
        }
      }

      // Dismiss the notification
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      // Refresh notifications
      await fetchNotifications();
      await fetchActiveSlotOffers();
      
      toast.success(accept ? 'Slot offer accepted!' : 'Slot offer declined');
    } catch (error) {
      console.error('Error handling slot offer:', error);
      toast.error('Failed to process slot offer');
    }
  };

  // Handler for dismissing notifications
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

  // Handler for dismissing slot offers (admin only)
  const handleDismissSlotOffer = async (offerId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('slot_offers')
        .update({
          status: 'voided',
          responded_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) throw error;
      await fetchActiveSlotOffers();
      toast.success('Slot offer dismissed');
    } catch (error) {
      console.error('Error dismissing slot offer:', error);
      toast.error('Failed to dismiss slot offer');
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {adminRole?.can_manage_games && (
          <button
            onClick={() => {
              setShowAdminView(!showAdminView);
              setShowNotifications(true);
            }}
            className={`btn btn-sm ${showAdminView ? 'btn-primary' : 'btn-ghost'}`}
          >
            <UserCog className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="btn btn-sm btn-ghost relative"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-base-200 rounded-lg shadow-lg z-50"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {showAdminView ? 'Active Slot Offers' : 'Notifications'}
                </h3>
                <NotificationButtons
                  showAdminView={showAdminView}
                  activeSlotOffers={activeSlotOffers || []}
                  notifications={notifications || []}
                  playerId={player?.id || ''}
                  isAdmin={!!adminRole?.can_manage_games}
                  onClose={() => setShowNotifications(false)}
                  onUpdate={fetchNotifications}
                  onSlotOffersUpdate={fetchActiveSlotOffers}
                />
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {showAdminView ? (
                  activeSlotOffers?.length ? (
                    activeSlotOffers.map((offer) => (
                      <SlotOfferItem
                        key={offer.id}
                        slotOffer={offer}
                        onDismiss={handleDismissSlotOffer}
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-500">No active slot offers</p>
                  )
                ) : notifications?.length ? (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onDismiss={handleDismissNotification}
                      onSlotOffer={handleSlotOffer}
                    />
                  ))
                ) : (
                  <p className="text-center text-gray-500">No notifications</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
