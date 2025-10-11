import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { utcToUkTime } from '../utils/dateUtils';
import { handlePlayerSelection } from '../utils/playerSelection';

interface UseRegistrationCloseProps {
  game?: any;
  onGameUpdated: () => Promise<void>;
}

/**
 * Hook to handle registration window closing
 * Uses timezone-aware date handling for proper time comparison
 */
export const useRegistrationClose = (props?: UseRegistrationCloseProps) => {
  const [isProcessingClose, setIsProcessingClose] = useState(false);
  const [hasPassedWindowEnd, setHasPassedWindowEnd] = useState(false);
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);

  useEffect(() => {
    if (!props?.game) return;

    const checkRegistrationStatus = () => {
      const now = new Date();
      // Convert UTC timestamp to UK timezone for proper comparison
      const registrationEnd = utcToUkTime(new Date(props.game!.registration_window_end));
      
      // Update registration closed state
      setIsRegistrationClosed(now > registrationEnd);
      
      // Check if we need to process player selection
      const shouldProcessSelection = 
        now > registrationEnd && 
        props.game!.status === 'open' &&  
        !isProcessingClose && 
        !hasPassedWindowEnd;

      if (shouldProcessSelection) {
        handleRegistrationWindowClose();
      }
    };

    // Initial check
    checkRegistrationStatus();

    // Set up polling every 10 seconds with random offset to prevent thundering herd
    const randomOffset = Math.random() * 5000; // Random delay between 0-5 seconds
    const intervalId = setInterval(checkRegistrationStatus, 10000 + randomOffset);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [props?.game, isProcessingClose, hasPassedWindowEnd]);

  const acquireLock = async (gameId: string): Promise<boolean> => {
    try {
      // Get the current user ID using the regular supabase client
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user:', userError);
        return false;
      }
      
      if (!user) {
        console.error('No authenticated user found. Please ensure you are logged in.');
        return false;
      }

      // Try to acquire a lock using a unique lock record
      const { data, error } = await supabaseAdmin.rpc('acquire_registration_lock', {
        p_game_id: gameId,
        p_lock_duration: 30, // seconds
        p_user_id: user.id
      });

      if (error) {
        // Check for specific error cases
        if (error.message?.includes('Another instance is processing registration close')) {
          console.log('Registration close is already being processed by another instance');
        } else if (error.message?.includes('permission denied')) {
          console.error('Permission denied. You may not have the required permissions.');
        } else {
          console.error('Error acquiring lock:', error.message || error);
        }
        return false;
      }

      if (!data?.acquired) {
        console.log('Could not acquire lock - another process may be running');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  };

  const releaseLock = async (gameId: string) => {
    try {
      // Get the current user ID
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      if (!user) return;

      await supabaseAdmin.rpc('release_registration_lock', {
        p_game_id: gameId,
        p_user_id: user.id
      });
    } catch (error: any) {
      console.error('Error releasing lock:', error);
    }
  };

  const handleRegistrationWindowClose = async () => {
    if (!props?.game) return;
    
    setIsProcessingClose(true);
    let lockAcquired = false;
    
    try {
      // Get current user and check role
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error('Failed to get user information');
      }
      
      if (!user) {
        throw new Error('You must be logged in to perform this action');
      }

      // Try to acquire lock
      lockAcquired = await acquireLock(props.game.id);
      if (!lockAcquired) {
        console.log('Another instance is processing registration close');
        return;
      }

      const { id, max_players, random_slots } = props.game;

      // Calculate merit slots (max_players minus random_slots)
      const meritSlots = max_players - random_slots;

      // Execute player selection FIRST (before changing status)
      console.log(`Starting player selection for game ${id}: ${meritSlots} merit slots + ${random_slots} random slots`);
      const selectionResult = await handlePlayerSelection({
        gameId: id,
        xpSlots: meritSlots,
        randomSlots: random_slots,
      });

      if (!selectionResult.success) {
        throw new Error(selectionResult.error || 'Player selection failed');
      }

      console.log(`Player selection completed successfully: ${selectionResult.selectedPlayers.length} players selected`);

      // Only update game status AFTER player selection succeeds
      const { error: statusError } = await supabaseAdmin
        .from('games')
        .update({ status: 'players_announced' })
        .eq('id', id)
        .eq('status', 'open'); // Only update if still open (prevents race conditions)

      if (statusError) {
        throw new Error(`Failed to update game status: ${statusError.message}`);
      }

      console.log(`Game status updated to players_announced`);

      // Process shield streak protection after player selection
      try {
        await supabaseAdmin.rpc('process_shield_streak_protection', {
          p_game_id: id
        });
      } catch (shieldError: any) {
        // Log shield processing errors but don't fail the entire process
        console.error('Error processing shield protection:', shieldError);
      }

      if (props.onGameUpdated) {
        await props.onGameUpdated();
      }

      setHasPassedWindowEnd(true);
      toast.success('Player selection completed successfully');
    } catch (error: any) {
      console.error('Registration close error:', error);
      const errorMessage = error.message || 'An unknown error occurred';
      toast.error(`Failed to process registration close: ${errorMessage}`);
      throw error;
    } finally {
      if (lockAcquired) {
        await releaseLock(props.game.id);
      }
      setIsProcessingClose(false);
    }
  };

  return {
    isProcessingClose,
    hasPassedWindowEnd,
    isRegistrationClosed,
    handleRegistrationWindowClose
  };
};