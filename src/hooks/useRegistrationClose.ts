import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabaseAdmin } from '../utils/supabase';
import { handlePlayerSelection } from '../utils/playerSelection';

interface UseRegistrationCloseProps {
  upcomingGame?: any;
  onGameUpdated: () => Promise<void>;
}

export const useRegistrationClose = (props?: UseRegistrationCloseProps) => {
  const [isProcessingClose, setIsProcessingClose] = useState(false);
  const [hasPassedWindowEnd, setHasPassedWindowEnd] = useState(false);

  useEffect(() => {
    if (!props?.upcomingGame) return;

    const checkRegistrationStatus = () => {
      const now = new Date();
      const registrationEnd = new Date(props.upcomingGame!.registration_window_end);
      
      // Check if we need to process player selection
      const shouldProcessSelection = 
        now > registrationEnd && 
        props.upcomingGame!.status === 'open' &&  // Add status check
        !isProcessingClose && 
        !hasPassedWindowEnd;

      console.log('Registration close check:', {
        now: now.toISOString(),
        registrationEnd: registrationEnd.toISOString(),
        isPastEndTime: now > registrationEnd,
        gameStatus: props.upcomingGame!.status,
        shouldProcessSelection,
        isProcessingClose,
        hasPassedWindowEnd
      });

      if (shouldProcessSelection) {
        handleRegistrationWindowClose();
      }
    };

    // Initial check
    checkRegistrationStatus();

    // Set up polling every 10 seconds
    const intervalId = setInterval(checkRegistrationStatus, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [props?.upcomingGame, isProcessingClose, hasPassedWindowEnd]);

  const handleRegistrationWindowClose = async () => {
    if (!props?.upcomingGame) return;

    setIsProcessingClose(true);
    
    try {
      const { id, max_players, random_slots } = props.upcomingGame;
      
      console.log('Starting player selection for game:', {
        id,
        maxPlayers: max_players,
        randomSlots: random_slots
      });

      // First update game status
      const { error: statusError } = await supabaseAdmin
        .from('games')
        .update({ status: 'players_announced' })
        .eq('id', id);

      if (statusError) throw statusError;

      const result = await handlePlayerSelection({
        gameId: id,
        maxPlayers: max_players,
        randomSlots: random_slots
      });

      console.log('Player selection completed:', result);

      // Store selection results
      const { error: selectionError } = await supabaseAdmin
        .from('game_selections')
        .insert({
          game_id: id,
          selected_players: result.selectedPlayers,
          reserve_players: result.reservePlayers,
          selection_metadata: result.debug
        });

      if (selectionError) {
        console.error('Error storing selection results:', selectionError);
        throw selectionError;
      }
      
      await props.onGameUpdated();
      toast.success('Teams have been selected');
      setHasPassedWindowEnd(true);

    } catch (error) {
      console.error('Registration close error:', error);
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