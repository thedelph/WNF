import React from 'react';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

export interface TeamAnnouncement {
  gameId: string;
  gameName?: string;
  team?: 'Blue' | 'Orange';
  venue?: string;
  date?: string;
  time?: string;
}

export const subscribeToTeamAnnouncements = (userId: string, onTeamAnnounced: (announcement: TeamAnnouncement) => void) => {
  // Subscribe to game_selections changes for this user
  const subscription = supabase
    .channel('team-announcements')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_selections',
        filter: `player_id=eq.${userId}`
      },
      async (payload) => {
        if (payload.new.team && payload.new.team !== payload.old.team) {
          // Fetch additional game details
          const { data: gameData, error: gameError } = await supabase
            .from('games')
            .select(`
              id,
              date,
              time,
              venue:venues (
                name
              )
            `)
            .eq('id', payload.new.game_id)
            .single();

          if (gameError) {
            console.error('Error fetching game details:', gameError);
            return;
          }

          const announcement: TeamAnnouncement = {
            gameId: payload.new.game_id,
            team: payload.new.team as 'Blue' | 'Orange',
            // Fix TypeScript error by properly accessing the venue name with proper type checking
            venue: gameData.venue && typeof gameData.venue === 'object' ? (gameData.venue as any).name : undefined,
            date: gameData.date,
            time: gameData.time
          };

          onTeamAnnounced(announcement);
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

export const showTeamAnnouncementNotification = (announcement: TeamAnnouncement) => {
  const team = announcement.team;
  const teamColor = team === 'Blue' ? 'text-blue-600' : 'text-orange-600';
  const date = new Date(announcement.date!).toLocaleDateString();
  const message = `Game: ${date} at ${announcement.time}\nVenue: ${announcement.venue}`;

  toast(
    React.createElement('div', { className: 'flex flex-col' },
      React.createElement('span', { className: `font-bold ${teamColor}` }, 'Team Assignment'),
      React.createElement('span', null, `You've been assigned to the ${team} team!`),
      React.createElement('span', null, message)
    ),
    {
      position: "top-right",
      duration: 10000,
    }
  );
};
