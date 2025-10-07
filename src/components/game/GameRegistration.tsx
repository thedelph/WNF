import React, { useState, useEffect } from 'react';
import { Game } from '../../types/game';
import { LoadingSpinner } from '../LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useGameRegistration } from '../../hooks/useGameRegistration';
import { TokenToggle } from './TokenToggle';
import { ShieldTokenButton } from './ShieldTokenButton';
import { ShieldTokenDisplay } from '../player/ShieldTokenDisplay';
import { useShieldStatus } from '../../hooks/useShieldStatus';
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
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const { isRegistering, handleRegistration } = useGameRegistration({
    gameId: game.id,
    isUserRegistered,
    onRegistrationChange,
    useToken,
    setUseToken
  });

  // Fetch shield status
  const { shieldStatus, loading: shieldLoading, refreshShieldStatus } = useShieldStatus(playerId || undefined);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!session?.user) return;

      const { data: playerProfile } = await supabase
        .from('players')
        .select('id, current_streak')
        .eq('user_id', session.user.id)
        .single();

      if (playerProfile) {
        setPlayerId(playerProfile.id);
        setCurrentStreak(playerProfile.current_streak || 0);
      }
    };

    fetchPlayerData();
  }, [session?.user]);

  // Refresh shield status and game data when shield is used
  const handleShieldUsed = async () => {
    await refreshShieldStatus();
    await onRegistrationChange();
  };

  if (!session?.user || isProcessingOpen || isProcessingClose) {
    return null;
  }

  if (!isRegistrationOpen || isRegistrationClosed) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-6 my-4">
      {/* Priority Token Toggle (existing functionality) */}
      {!isUserRegistered && playerId && !shieldStatus?.shieldActive && (
        <TokenToggle
          playerId={playerId}
          disabled={isRegistering}
          value={useToken}
          onChange={setUseToken}
        />
      )}

      {/* Registration Button */}
      <button
        onClick={handleRegistration}
        disabled={isRegistering || shieldStatus?.shieldActive}
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

      {/* Explainer when shield is active */}
      {shieldStatus?.shieldActive && (
        <div className="alert alert-info max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-sm">
            You're using a shield token for this game. Cancel the shield to register interest instead.
          </span>
        </div>
      )}

      {/* Shield Token Button - Can't Play This Week */}
      {playerId && shieldStatus && (shieldStatus.tokensAvailable > 0 || shieldStatus.shieldActive) && (
        <>
          <div className="divider">OR</div>
          <div className="flex flex-col items-center gap-3">
            {!shieldStatus.shieldActive && (
              <p className="text-sm text-base-content/70 text-center">
                Can't play this week? Protect your streak:
              </p>
            )}
            {shieldStatus.shieldActive && (
              <p className="text-sm text-success text-center font-semibold">
                🛡️ Your streak is protected for this game
              </p>
            )}
            <ShieldTokenButton
              gameId={game.id}
              playerId={playerId}
              tokensAvailable={shieldStatus.tokensAvailable}
              currentStreak={currentStreak}
              isRegistered={isUserRegistered}
              onShieldUsed={handleShieldUsed}
              disabled={isRegistering || (isUserRegistered && !shieldStatus.shieldActive)}
              size="md"
            />
            {isUserRegistered && !shieldStatus.shieldActive && (
              <div className="alert alert-info max-w-md">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-sm">
                  You're registered to play. Unregister first to use a shield token instead.
                </span>
              </div>
            )}

            {/* Shield Token Progress Display - moved here from top */}
            {!shieldLoading && (
              <div className="w-full max-w-xs">
                <ShieldTokenDisplay
                  tokensAvailable={shieldStatus.tokensAvailable}
                  gamesTowardNextToken={shieldStatus.gamesTowardNextToken}
                  gamesUntilNextToken={shieldStatus.gamesUntilNextToken}
                  shieldActive={shieldStatus.shieldActive}
                  frozenStreakValue={shieldStatus.frozenStreakValue}
                  size="sm"
                  showProgress={true}
                  showTooltip={false}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
