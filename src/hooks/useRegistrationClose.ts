import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { handlePlayerSelection } from '../utils/playerSelection';

interface UseRegistrationCloseProps {
  game?: any;
  onGameUpdated: () => Promise<void>;
}

export const useRegistrationClose = (props?: UseRegistrationCloseProps) => {
  const [isProcessingClose, setIsProcessingClose] = useState(false);
  const [hasPassedWindowEnd, setHasPassedWindowEnd] = useState(false);

  useEffect(() => {
    if (!props?.game) return;

    const checkRegistrationStatus = () => {
      const now = new Date();
      const registrationEnd = new Date(props.game!.registration_window_end);
      
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
    } catch (error) {
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
    } catch (error) {
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
      
      // Use a transaction to ensure atomic updates
      const { data: result, error: txError } = await supabase.rpc('process_registration_close', {
        p_game_id: id,
        p_max_players: max_players,
        p_random_slots: random_slots
      });

      if (txError) {
        if (txError.message?.includes('permission')) {
          throw new Error('You do not have permission to close registration. Please contact an administrator.');
        }
        throw txError;
      }

      if (props.onGameUpdated) {
        await props.onGameUpdated();
      }

      setHasPassedWindowEnd(true);
      toast.success('Player selection completed successfully');
    } catch (error) {
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
    handleRegistrationWindowClose
  };
};