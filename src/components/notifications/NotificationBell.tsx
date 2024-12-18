import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, supabaseAdmin } from '../../utils/supabase';
import { useUser } from '../../hooks/useUser';

// NotificationBell component - Displays a bell icon with unread count in the header
const NotificationBell = () => {
  const { player } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  // Animation variants for the bell icon
  const bellVariants = {
    hover: { scale: 1.1, rotate: [0, 15, -15, 0] },
    tap: { scale: 0.95 }
  };

  // Fetch unread notifications count
  const fetchUnreadCount = async () => {
    if (!player?.id) return;

    try {
      const { count, error } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', player.id)
        .is('read_at', null);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!player?.id) return;

    fetchUnreadCount();

    const notificationsChannel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `player_id=eq.${player.id}`
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [player?.id]);

  return (
    <Link to="/notifications" className="relative">
      <motion.div
        variants={bellVariants}
        whileHover="hover"
        whileTap="tap"
        className="p-2"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {unreadCount}
          </span>
        )}
      </motion.div>
    </Link>
  );
};

export default NotificationBell;
