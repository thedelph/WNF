import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { calculatePlayerXP } from '../utils/playerUtils';
import { shuffleArray } from '../utils/arrayUtils';

interface UseRegistrationCloseProps {
  upcomingGame?: any;
  onGameUpdated: () => Promise<void>;
}

export const useRegistrationClose = (props?: UseRegistrationCloseProps) => {
  const [isProcessingClose, setIsProcessingClose] = useState(false);
  const [hasPassedWindowEnd, setHasPassedWindowEnd] = useState(false);

  const handleRegistrationWindowClose = async () => {
    if (!props?.upcomingGame) {
      console.log('No upcoming game found');
      return;
    }

    if (isProcessingClose) {
      console.log('Already processing close');
      return;
    }

    setIsProcessingClose(true);
    
    try {
      console.log('Starting registration close process...');
      
      // Step 1: Get all registrations with player data
      const { data: registrations, error: regError } = await supabase
        .from('game_registrations')
        .select(`
          id,
          player_id,
          players (
            id,
            friendly_name,
            caps,
            active_bonuses,
            active_penalties,
            current_streak
          )
        `)
        .eq('game_id', props.upcomingGame.id)
        .eq('status', 'registered');

      if (regError) throw regError;

      // Step 2: Reset all registrations to reserve status
      const { error: resetError } = await supabaseAdmin
        .from('game_registrations')
        .update({ 
          status: 'reserve',
          randomly_selected: false,
          team: null
        })
        .eq('game_id', props.upcomingGame.id);

      if (resetError) throw resetError;

      // Step 3: Calculate XP and sort players
      const playersWithXP = registrations
        .map(reg => ({
          id: reg.id,
          playerId: reg.player_id,
          name: reg.players?.friendly_name,
          xp: calculatePlayerXP(reg.players)
        }))
        .sort((a, b) => b.xp - a.xp);

      console.log('Players with XP:', playersWithXP);

      // Step 4: Determine slots
      const maxPlayers = props.upcomingGame.max_players || 18;
      const randomSlots = props.upcomingGame.random_slots || 0;
      const meritSlots = maxPlayers - randomSlots;

      // Step 5: Merit selection
      const meritPlayers = playersWithXP.slice(0, meritSlots);
      
      if (meritPlayers.length > 0) {
        const { error: meritError } = await supabaseAdmin
          .from('game_registrations')
          .update({ 
            status: 'selected',
            randomly_selected: false 
          })
          .in('id', meritPlayers.map(p => p.id))
          .eq('game_id', props.upcomingGame.id);

        if (meritError) throw meritError;
      }

      // Step 6: Random selection
      if (randomSlots > 0) {
        const remainingPlayers = playersWithXP.slice(meritSlots);
        const randomPlayers = shuffleArray(remainingPlayers).slice(0, randomSlots);

        if (randomPlayers.length > 0) {
          const { error: randomError } = await supabaseAdmin
            .from('game_registrations')
            .update({ 
              status: 'selected',
              randomly_selected: true 
            })
            .in('id', randomPlayers.map(p => p.id))
            .eq('game_id', props.upcomingGame.id);

          if (randomError) throw randomError;
        }
      }

      // Step 7: Update game status
      const { error: statusError } = await supabaseAdmin
        .from('games')
        .update({ status: 'teams_announced' })
        .eq('id', props.upcomingGame.id);

      if (statusError) throw statusError;

      await props.onGameUpdated();
      toast.success('Teams have been selected');
      setHasPassedWindowEnd(true);

    } catch (error) {
      console.error('Selection Error:', error);
      toast.error('Failed to close registration');
    } finally {
      setIsProcessingClose(false);
    }
  };

  return {
    isProcessingClose,
    hasPassedWindowEnd,
    handleRegistrationWindowClose
  };
}; 