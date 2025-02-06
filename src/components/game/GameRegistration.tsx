import React, { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { LoadingSpinner } from '../LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useGameRegistration } from '../../hooks/useGameRegistration';
import { TokenToggle } from './TokenToggle';
import { supabase } from '../../utils/supabase';

interface GameRegistrationProps {
  game: Game;
  isRegistrationOpen: boolean;
  isRegistrationClosed: boolean;
  isUserRegistered: boolean;
  isProcessingOpen: boolean;
  isProcessingClose: boolean;
  onRegistrationChange: () => Promise<void>;
  useToken: boolean;
  setUseToken: (value: boolean) => void;
}

export const GameRegistration: React.FC<GameRegistrationProps> = ({
  game,
  isRegistrationOpen,
  isRegistrationClosed,
  isUserRegistered,
  isProcessingOpen,
  isProcessingClose,
  onRegistrationChange,
  useToken,
  setUseToken
}) => {
  const { session } = useAuth();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const { isRegistering, handleRegistration } = useGameRegistration({
    gameId: game.id,
    isUserRegistered,
    onRegistrationChange,
    useToken,
    setUseToken
  });

  useEffect(() => {
    const fetchPlayerId = async () => {
      if (!session?.user) return;
      
      const { data: playerProfile } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      
      if (playerProfile) {
        setPlayerId(playerProfile.id);
      }
    };

    fetchPlayerId();
  }, [session?.user]);

  if (!session?.user || isProcessingOpen || isProcessingClose) {
    return null;
  }

  if (!isRegistrationOpen || isRegistrationClosed) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 my-4">
      {!isUserRegistered && playerId && (
        <TokenToggle
          playerId={playerId}
          disabled={isRegistering}
          value={useToken}
          onChange={setUseToken}
        />
      )}
      <button
        onClick={handleRegistration}
        disabled={isRegistering}
        className={`btn w-48 ${
          isUserRegistered ? 'btn-error' : 'btn-success'
        } ${isRegistering ? 'loading' : ''}`}
      >
        {isRegistering ? (
          'Processing...'
        ) : isUserRegistered ? (
          <span className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Unregister Interest
          </span>
        ) : (
          'Register Interest'
        )}
      </button>
    </div>
  );
};
