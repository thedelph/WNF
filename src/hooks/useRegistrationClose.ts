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

    // Set up polling every 10 seconds
    const intervalId = setInterval(checkRegistrationStatus, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [props?.game, isProcessingClose, hasPassedWindowEnd]);

  const handleRegistrationWindowClose = async () => {
    if (!props?.game) return;

    setIsProcessingClose(true);
    
    try {
      const { id, max_players, random_slots } = props.game;
      
      // First update game status
      const { error: statusError } = await supabaseAdmin
        .from('games')
        .update({ status: 'players_announced' })
        .eq('id', id);

      if (statusError) throw statusError;

      const result = await handlePlayerSelection({
        gameId: id,
        xpSlots: max_players - random_slots, // Calculate merit slots
        randomSlots: random_slots
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to select players');
      }

      // Store selection results - transform player objects to arrays of IDs
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
        });

      if (selectionError) throw selectionError;
      
      if (props.onGameUpdated) {
        await props.onGameUpdated();
      }
      
      toast.success('Players have been selected');
      setHasPassedWindowEnd(true);

    } catch (error) {
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