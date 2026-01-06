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
import { DropoutConfirmModal } from './DropoutConfirmModal';
import { FaUserMinus } from 'react-icons/fa';

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
  const [playerName, setPlayerName] = useState<string>('');
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [showDropoutModal, setShowDropoutModal] = useState(false);

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
        .select('id, current_streak, friendly_name')
        .eq('user_id', session.user.id)
        .single();

      if (playerProfile) {
        setPlayerId(playerProfile.id);
        setCurrentStreak(playerProfile.current_streak || 0);
        setPlayerName(playerProfile.friendly_name || '');

        // Get registration status for this game
        const { data: registration } = await supabase
          .from('game_registrations')
          .select('status')
          .eq('game_id', game.id)
          .eq('player_id', playerProfile.id)
          .single();

        setRegistrationStatus(registration?.status || null);
      }
    };

    fetchPlayerData();
  }, [session?.user, game.id]);

  // Refresh shield status and game data when shield is used
  const handleShieldUsed = async () => {
    await refreshShieldStatus();
    await onRegistrationChange();
  };

  if (!session?.user || isProcessingOpen || isProcessingClose) {
    return null;
  }

  // After registration closes, show dropout controls for registered/selected players
  const canDropout = isRegistrationClosed &&
    playerId &&
    (registrationStatus === 'registered' || registrationStatus === 'selected') &&
    !game.completed;

  // Show dropout UI when registration is closed but player can drop out
  if (isRegistrationClosed && canDropout) {
    return (
      <div className="flex flex-col items-center gap-4 my-4">
        <div className="alert alert-warning max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Registration is closed</p>
            <p className="text-sm">You are {registrationStatus === 'selected' ? 'selected to play' : 'registered'} for this game.</p>
          </div>
        </div>

        <button
          onClick={() => setShowDropoutModal(true)}
          className="btn btn-error gap-2"
        >
          <FaUserMinus className="w-4 h-4" />
          I Can't Make It - Drop Out
        </button>

        {/* Shield info hint */}
        {shieldStatus && shieldStatus.tokensAvailable > 0 && (
          <p className="text-sm text-base-content/70 text-center max-w-sm">
            You have {shieldStatus.tokensAvailable} shield token{shieldStatus.tokensAvailable !== 1 ? 's' : ''} available to protect your streak if you need to drop out.
          </p>
        )}

        {/* Dropout Confirmation Modal */}
        {playerId && (
          <DropoutConfirmModal
            isOpen={showDropoutModal}
            onClose={() => setShowDropoutModal(false)}
            playerId={playerId}
            playerName={playerName}
            gameId={game.id}
            currentStreak={currentStreak}
            shieldTokensAvailable={shieldStatus?.tokensAvailable || 0}
            onDropoutComplete={async () => {
              await onRegistrationChange();
              // Refresh registration status
              const { data: registration } = await supabase
                .from('game_registrations')
                .select('status')
                .eq('game_id', game.id)
                .eq('player_id', playerId)
                .single();
              setRegistrationStatus(registration?.status || null);
            }}
          />
        )}
      </div>
    );
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
