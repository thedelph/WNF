import React, { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { useUser } from '../hooks/useUser';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Clock, Check, X as XIcon, UserCog } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  player_id: string;
  type: string;
  message: string;
  action_url: string;
  created_at: string;
  read_at: string | null;
  metadata?: {
    game_id?: string;
    slot_offer_id?: string;
  };
}

interface SlotOffer {
  id: string;
  game_id: string;
  player_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  offered_at: string;
  responded_at: string | null;
  player: {
    id: string;
    friendly_name: string;
  };
  game: {
    id: string;
    date: string;
    venue: {
      name: string;
    };
    game_number: number;
  };
}

interface AdminRole {
  can_manage_games: boolean;
}

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

    console.log('Fetching notifications for player:', player.id, 'isAdmin:', !!adminRole?.can_manage_games);
    
    try {
      let query = supabaseAdmin
        .from('notifications')
        .select('*, metadata')
        .is('read_at', null)
        .order('created_at', { ascending: false });

      // Only apply player_id filter for non-admins
      if (!adminRole?.can_manage_games) {
        console.log('Fetching as non-admin, filtering by player_id');
        query = query.eq('player_id', player.id);
      } else {
        console.log('Fetching as admin, no player_id filter');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      console.log('Fetched notifications:', {
        count: data?.length || 0,
        notifications: data,
        isAdmin: !!adminRole?.can_manage_games
      });

      if (data) {
        const processedData = data.map(notification => ({
          ...notification,
          metadata: typeof notification.metadata === 'string' 
            ? JSON.parse(notification.metadata) 
            : notification.metadata
        }));
        setNotifications(processedData);
        setUnreadCount(processedData.length);
      }
    } catch (error) {
      console.error('Unexpected error in fetchNotifications:', error);
    }
  };

  useEffect(() => {
    if (!player?.id) {
      console.log('No player ID available, skipping notifications setup');
      return;
    }

    console.log('Setting up notifications for player:', player.id);

    // Check admin permissions
    const checkAdminRole = async () => {
      console.log('Checking admin permissions for player:', player.id);
      
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
          console.error('Error checking admin role:', error);
          setAdminRole(null);
          return;
        }

        console.log('Admin permission check result:', { adminData, hasPermission: !!adminData });
        setAdminRole(adminData ? { can_manage_games: true } : null);
      } catch (error) {
        console.error('Unexpected error in checkAdminRole:', error);
        setAdminRole(null);
      }
    };

    checkAdminRole();

    // Subscribe to notifications
    console.log('Setting up notification subscription...');
    const notificationChannel = supabaseAdmin
      .channel('notifications-' + player.id)  // Make channel name unique per player
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          ...(adminRole?.can_manage_games ? {} : { filter: `player_id=eq.${player.id}` })
        },
        (payload) => {
          console.log('Notification change received:', {
            eventType: payload.eventType,
            payload,
            currentNotifications: notifications.length,
            isAdmin: !!adminRole?.can_manage_games
          });

          if (payload.eventType === 'INSERT') {
            // For admins, check if they should see this notification
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
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
      });

    // Subscribe to slot offers if admin
    console.log('Setting up slot offers subscription...');
    const slotOfferChannel = supabaseAdmin
      .channel('slot_offers-' + player.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slot_offers'
        },
        (payload) => {
          console.log('Slot offer change received:', payload);
          fetchActiveSlotOffers();
        }
      )
      .subscribe((status) => {
        console.log('Slot offers subscription status:', status);
      });

    return () => {
      console.log('Cleaning up notification subscriptions...');
      notificationChannel.unsubscribe();
      slotOfferChannel.unsubscribe();
    };
  }, [player?.id]);

  useEffect(() => {
    if (player?.id) {
      console.log('Admin role changed, fetching notifications with new role:', adminRole);
      fetchNotifications();
    }
  }, [adminRole, player?.id]);

  useEffect(() => {
    if (adminRole?.can_manage_games) {
      console.log('Admin role changed, fetching slot offers...');
      fetchActiveSlotOffers();
    }
  }, [adminRole]);

  const handleAcceptSpot = async (notificationId: string, gameId: string) => {
    // Update game registration status
    await supabase
      .from('game_registrations')
      .update({ status: 'confirmed' })
      .eq('game_id', gameId)
      .eq('player_id', player?.id);

    // Mark notification as read
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    // Update local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => prev - 1);
  };

  const handleSlotOffer = async (notificationId: string, gameId: string, accept: boolean) => {
    try {
      // Get the slot offer
      const { data: offer } = await supabase
        .from('slot_offers')
        .select('id')
        .eq('game_id', gameId)
        .eq('player_id', player?.id)
        .eq('status', 'pending')
        .single();

      if (!offer) {
        throw new Error('Slot offer not found or already processed');
      }

      await handleSlotOfferResponse(offer.id, accept, notificationId);
    } catch (error) {
      console.error('Error handling slot offer:', error);
      alert('Error processing slot offer. Please try again.');
    }
  };

  const handleSlotOfferResponse = async (offerId: string, accept: boolean, notificationId?: string) => {
    try {
      // Call the slot offer response function
      const { error } = await supabase
        .rpc('handle_slot_offer_response_text', {
          p_offer_id: offerId,
          p_status: accept ? 'accepted' : 'declined'
        });

      if (error) throw error;

      // If this was triggered from a notification, mark it as read
      if (notificationId) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId);

        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => prev - 1);
      }

      // Refresh the slot offers list
      if (adminRole?.can_manage_games) {
        await fetchActiveSlotOffers();
      }

      // Show success message
      alert(accept ? 'Slot accepted successfully!' : 'Slot declined.');
    } catch (error) {
      console.error('Error handling slot offer response:', error);
      alert('Error processing slot offer. Please try again.');
    }
  };

  const handleAdminAction = async (offerId: string, accept: boolean) => {
    if (!adminRole?.can_manage_games) {
      alert('You do not have permission to perform this action');
      return;
    }

    await handleSlotOfferResponse(offerId, accept);
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const renderNotification = (notification: Notification) => {
    if (notification.type === 'slot_offer' && notification.metadata?.game_id) {
      return (
        <div className="flex flex-col gap-2 p-4 border-b relative group">
          <button
            onClick={() => handleDismissNotification(notification.id)}
            className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity"
            title="Dismiss notification"
          >
            <XIcon className="w-4 h-4" />
          </button>
          <p>{notification.message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSlotOffer(notification.id, notification.metadata.game_id!, true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Accept Slot
            </button>
            <button
              onClick={() => handleSlotOffer(notification.id, notification.metadata.game_id!, false)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Decline Slot
            </button>
          </div>
        </div>
      );
    }

    // Default notification rendering
    return (
      <div className="p-4 border-b relative group">
        <button
          onClick={() => handleDismissNotification(notification.id)}
          className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity"
          title="Dismiss notification"
        >
          <XIcon className="w-4 h-4" />
        </button>
        <p>{notification.message}</p>
      </div>
    );
  };

  const renderSlotOffer = (offer: SlotOffer) => {
    const statusColor = {
      pending: 'bg-yellow-500',
      accepted: 'bg-green-500',
      declined: 'bg-red-500'
    }[offer.status];

    return (
      <div key={offer.id} className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-semibold">{offer.player.friendly_name}</span>
            <div className="text-sm text-gray-600">
              Game: WNF #{offer.game.game_number} - {format(new Date(offer.game.date), 'MMM d, h:mm a')}
              {offer.game.venue?.name && (
                <span className="ml-1">@ {offer.game.venue.name}</span>
              )}
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-white text-sm ${statusColor}`}>
            {offer.status}
          </span>
        </div>
        <div className="text-sm text-gray-500 mb-2">
          <div>Offered: {format(new Date(offer.offered_at), 'MMM d, h:mm a')}</div>
          {offer.responded_at && (
            <div>Responded: {format(new Date(offer.responded_at), 'MMM d, h:mm a')}</div>
          )}
        </div>
        {offer.status === 'pending' && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleAdminAction(offer.id, true)}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Accept on Behalf
            </button>
            <button
              onClick={() => handleAdminAction(offer.id, false)}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Decline on Behalf
            </button>
          </div>
        )}
      </div>
    );
  };

  const fetchActiveSlotOffers = async () => {
    console.log('Fetching active slot offers...');
    if (!adminRole?.can_manage_games) {
      console.log('User does not have can_manage_games role, current admin role:', adminRole);
      return;
    }

    try {
      console.log('Starting slot offers fetch with admin role:', adminRole);
      const { data, error } = await supabaseAdmin
        .from('slot_offers')
        .select(`
          id,
          game_id,
          player_id,
          status,
          created_at,
          offered_at,
          responded_at,
          player:players (
            id,
            friendly_name
          ),
          game:games (
            id,
            date,
            venue:venues (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching slot offers:', error);
        return;
      }

      console.log('Raw slot offers data:', data);

      // Process and filter the data
      const now = new Date();
      const processedData = data
        ?.filter(offer => {
          const wasRecentlyResponded = offer.responded_at && 
            new Date(offer.responded_at) > new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          // Show offers that are:
          // 1. Pending, or
          // 2. Any status if responded to in the last 24 hours
          return offer.status === 'pending' || wasRecentlyResponded;
        })
        .map(offer => ({
          ...offer,
          game: {
            ...offer.game,
            game_number: data
              .filter(o => 
                new Date(o.game.date) < new Date(offer.game.date) || 
                (o.game.date === offer.game.date && o.game.id < offer.game.id)
              ).length + 1
          }
        }));

      console.log('Processed slot offers:', {
        total: data?.length || 0,
        filtered: processedData?.length || 0,
        offers: processedData
      });

      if (processedData) {
        setActiveSlotOffers(processedData);
      }
    } catch (error) {
      console.error('Unexpected error in fetchActiveSlotOffers:', error);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed right-4 top-16 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-[100] border border-gray-200 dark:border-gray-700"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4 items-center">
                  <h3 className="text-lg font-semibold">
                    {showAdminView ? 'Slot Offers' : 'Notifications'}
                  </h3>
                  {adminRole?.can_manage_games && (
                    <button
                      onClick={() => setShowAdminView(!showAdminView)}
                      className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <UserCog className="w-4 h-4" />
                      {showAdminView ? 'View Notifications' : 'Admin View'}
                    </button>
                  )}
                </div>
                <button onClick={() => setShowNotifications(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {showAdminView ? (
                <div className="max-h-96 overflow-y-auto">
                  {activeSlotOffers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No active slot offers
                    </p>
                  ) : (
                    activeSlotOffers.map(offer => renderSlotOffer(offer))
                  )}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No new notifications
                    </p>
                  ) : (
                    notifications.map(notification => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {renderNotification(notification)}
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
