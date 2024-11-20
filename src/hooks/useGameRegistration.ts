import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

export const useGameRegistration = (
  gameId: string | undefined,
  playerId: string | undefined,
  onGameUpdated: () => Promise<void>
) => {
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegister = async () => {
    // ... existing handleRegister logic ...
  };

  const handleUnregister = async () => {
    // ... existing handleUnregister logic ...
  };

  return {
    isRegistered,
    handleRegister,
    handleUnregister
  };
}; 