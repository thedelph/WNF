import React from 'react';
import toast from 'react-hot-toast';
import { GameStatus, GAME_STATUSES } from '../../../../types/game';

interface GameTimingDetailsProps {
  gamePhase: GameStatus;
  date: string;
  time: string;
  registrationStart: string;
  registrationEnd: string;
  teamAnnouncementTime: string;
  onRegistrationStartChange: (value: string) => void;
  onRegistrationEndChange: (value: string) => void;
  onTeamAnnouncementTimeChange: (value: string) => void;
}

/**
 * Component for handling game timing details like registration windows and team announcement time
 * Shows different fields based on the game phase
 */
export const GameTimingDetails: React.FC<GameTimingDetailsProps> = ({
  gamePhase,
  date,
  time,
  registrationStart,
  registrationEnd,
  teamAnnouncementTime,
  onRegistrationStartChange,
  onRegistrationEndChange,
  onTeamAnnouncementTimeChange,
}) => {
  if (gamePhase === GAME_STATUSES.TEAMS_ANNOUNCED) {
    return null;
  }

  return (
    <>
      {/* Only show registration fields for upcoming games */}
      {gamePhase === GAME_STATUSES.UPCOMING && (
        <>
          <fieldset className="fieldset">
            <legend className="fieldset-legend flex items-center justify-between w-full">
              <span>Registration Window Start</span>
              <button
                type="button"
                className="btn btn-xs"
                onClick={() => onRegistrationStartChange(new Date().toISOString().slice(0, 16))}
              >
                Set to Now
              </button>
            </legend>
            <input
              type="datetime-local"
              value={registrationStart}
              onChange={(e) => onRegistrationStartChange(e.target.value)}
              className="input"
              required
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend flex items-center justify-between w-full">
              <span>Registration Window End</span>
              <button
                type="button"
                className="btn btn-xs"
                onClick={() => {
                  const oneMinuteFromNow = new Date();
                  oneMinuteFromNow.setMinutes(oneMinuteFromNow.getMinutes() + 1);
                  onRegistrationEndChange(oneMinuteFromNow.toISOString().slice(0, 16));
                }}
              >
                1m from now
              </button>
            </legend>
            <input
              type="datetime-local"
              value={registrationEnd}
              onChange={(e) => onRegistrationEndChange(e.target.value)}
              className="input"
              required
            />
          </fieldset>
        </>
      )}

      {/* Show team announcement time for both upcoming and player selection phases */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend flex items-center justify-between w-full">
          <span>Team Announcement Time</span>
          {gamePhase === GAME_STATUSES.UPCOMING && (
            <button
              type="button"
              className="btn btn-xs"
              onClick={() => {
                if (!date || !time) {
                  toast.error('Please set game date and time first');
                  return;
                }
                try {
                  const gameDateTime = new Date(`${date}T${time}`);
                  if (isNaN(gameDateTime.getTime())) {
                    toast.error('Invalid game date or time');
                    return;
                  }
                  const announcementTime = new Date(gameDateTime);
                  announcementTime.setHours(announcementTime.getHours() - 4);
                  onTeamAnnouncementTimeChange(announcementTime.toISOString().slice(0, 16));
                } catch (error) {
                  console.error('Error setting team announcement time:', error);
                  toast.error('Failed to set team announcement time');
                }
              }}
            >
              4H Before Game
            </button>
          )}
        </legend>
        <input
          type="datetime-local"
          value={teamAnnouncementTime}
          onChange={(e) => onTeamAnnouncementTimeChange(e.target.value)}
          className="input"
          required
        />
      </fieldset>
    </>
  );
};

export default GameTimingDetails;
