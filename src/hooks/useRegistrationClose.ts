import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabaseAdmin } from '../utils/supabase';
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
      // Try to acquire a lock using a unique lock record
      const { data, error } = await supabaseAdmin
        .from('registration_locks')
        .insert({
          game_id: gameId,
          locked_at: new Date().toISOString(),
          locked_until: new Date(Date.now() + 30000).toISOString() // 30 second lock
        })
        .select()
        .single();

      return !error && !!data;
    } catch (error) {
      if (error.message.includes('table "registration_locks" does not exist')) {
        console.log('Registration locks table does not exist, skipping lock acquisition');
        return true;
      }
      throw error;
    }
  };

  const releaseLock = async (gameId: string) => {
    try {
      await supabaseAdmin
        .from('registration_locks')
        .delete()
        .eq('game_id', gameId);
    } catch (error) {
      if (error.message.includes('table "registration_locks" does not exist')) {
        console.log('Registration locks table does not exist, skipping lock release');
      } else {
        throw error;
      }
    }
  };

  const handleRegistrationWindowClose = async () => {
    if (!props?.game) return;
    
    setIsProcessingClose(true);
    
    try {
      // Try to acquire lock
      const lockAcquired = await acquireLock(props.game.id);
      if (!lockAcquired) {
        console.log('Another instance is processing registration close');
        return;
      }

      const { id, max_players, random_slots } = props.game;
      
      // Start a transaction for atomic updates
      const { data: gameCheck, error: checkError } = await supabaseAdmin
        .from('games')
        .select('status')
        .eq('id', id)
        .single();

      if (checkError) throw checkError;

      // Double check game is still in 'open' status
      if (gameCheck.status !== 'open') {
        console.log('Game already processed by another instance');
        return;
      }

      // Update game status
      const { error: statusError } = await supabaseAdmin
        .from('games')
        .update({ status: 'players_announced' })
        .eq('id', id)
        .eq('status', 'open'); // Only update if still open

      if (statusError) throw statusError;

      const result = await handlePlayerSelection({
        gameId: id,
        xpSlots: max_players - random_slots,
        randomSlots: random_slots
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to select players');
      }

      // Store selection results
      const { error: selectionError } = await supabaseAdmin
        .from('game_selections')
        .insert({
          game_id: id,
          selected_players: result.selectedPlayers.map(p => p.id),
          reserve_players: result.nonSelectedPlayerIds,
          selection_metadata: {
            merit_selected: result.selectedPlayers.filter(p => p.selection_method === 'merit').map(p => p.id),
            random_selected: result.selectedPlayers.filter(p => p.selection_method === 'random').map(p => p.id),
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (selectionError) throw selectionError;
      
      if (props.onGameUpdated) {
        await props.onGameUpdated();
      }
      
      toast.success('Players have been selected');
      setHasPassedWindowEnd(true);

    } catch (error) {
      console.error('Registration close error:', error);
      toast.error('Failed to close registration');
    } finally {
      // Release lock if we acquired it
      if (props.game) {
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