import React from 'react';

interface DebugInfoProps {
  upcomingGame: any;
  isProcessingClose: boolean;
  hasPassedWindowEnd: boolean;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({ 
  upcomingGame, 
  isProcessingClose, 
  hasPassedWindowEnd 
}) => {
  if (process.env.NODE_ENV !== 'development') return null;

  const now = new Date();
  const registrationEnd = upcomingGame ? new Date(upcomingGame.registration_window_end) : null;
  const isAfterEnd = registrationEnd ? now > registrationEnd : false;
  const timeUntilClose = registrationEnd ? registrationEnd.getTime() - now.getTime() : null;

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      <pre className="whitespace-pre-wrap overflow-auto max-h-96">
        {JSON.stringify({
          gameId: upcomingGame?.id,
          gameStatus: upcomingGame?.status,
          registrationEnd: upcomingGame?.registration_window_end,
          currentTime: now.toISOString(),
          isAfterEnd,
          timeUntilClose: timeUntilClose ? `${Math.round(timeUntilClose / 1000)}s` : null,
          isProcessingClose,
          hasPassedWindowEnd,
          totalRegistrations: upcomingGame?.game_registrations?.length,
          selectedCount: upcomingGame?.game_registrations?.filter(
            (r: any) => r.status === 'selected'
          ).length,
          reserveCount: upcomingGame?.game_registrations?.filter(
            (r: any) => r.status === 'reserve'
          ).length,
        }, null, 2)}
      </pre>
    </div>
  );
};

export default DebugInfo; 