import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabaseAdmin } from '../utils/supabase';

interface UseRegistrationOpenProps {
  game?: any;
  onGameUpdated: () => Promise<void>;
}

export const useRegistrationOpen = (props?: UseRegistrationOpenProps) => {
  const [isProcessingOpen, setIsProcessingOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (!props?.game) return;

    const checkRegistrationStatus = () => {
      const now = new Date();
      const registrationStart = new Date(props.game!.registration_window_start);
      
      // Check if we need to open registration
      const shouldOpenRegistration = 
        now >= registrationStart && 
        props.game!.status === 'upcoming' &&
        !isProcessingOpen && 
        !hasOpened;

      console.log('Registration open check:', {
        now: now.toISOString(),
        registrationStart: registrationStart.toISOString(),
        isPastStartTime: now >= registrationStart,
        gameStatus: props.game!.status,
        shouldOpenRegistration,
        isProcessingOpen,
        hasOpened
      });

      if (shouldOpenRegistration) {
        handleRegistrationWindowOpen();
      }
    };

    // Initial check
    checkRegistrationStatus();

    // Set up polling every 10 seconds
    const intervalId = setInterval(checkRegistrationStatus, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [props?.game, isProcessingOpen, hasOpened]);

  const handleRegistrationWindowOpen = async () => {
    if (!props?.game) return;

    setIsProcessingOpen(true);
    
    try {
      const { id } = props.game;
      
      console.log('Opening registration for game:', { id });

      // Update game status to open
      const { error: statusError } = await supabaseAdmin
        .from('games')
        .update({ status: 'open' })
        .eq('id', id);

      if (statusError) throw statusError;
      
      await props.onGameUpdated();
      toast.success('Registration is now open');
      setHasOpened(true);
    } catch (error) {
      console.error('Error opening registration:', error);
      toast.error('Failed to open registration');
    } finally {
      setIsProcessingOpen(false);
    }
  };

  return {
    isProcessingOpen,
    hasOpened,
    handleRegistrationWindowOpen
  };
};
