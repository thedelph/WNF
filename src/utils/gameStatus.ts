import { GameStatus, GAME_STATUSES } from '../types/game';

export const canTransitionTo = (currentStatus: GameStatus, newStatus: GameStatus): boolean => {
  const transitions: Record<GameStatus, GameStatus[]> = {
    [GAME_STATUSES.UPCOMING]: [GAME_STATUSES.OPEN],
    [GAME_STATUSES.OPEN]: [GAME_STATUSES.PLAYERS_ANNOUNCED],
    [GAME_STATUSES.PLAYERS_ANNOUNCED]: [GAME_STATUSES.TEAMS_ANNOUNCED],
    [GAME_STATUSES.TEAMS_ANNOUNCED]: [GAME_STATUSES.COMPLETED],
    [GAME_STATUSES.COMPLETED]: [],
    [GAME_STATUSES.CANCELLED]: [],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};

export const getNextStatus = (currentStatus: GameStatus): GameStatus | null => {
  const transitions: Record<GameStatus, GameStatus | null> = {
    [GAME_STATUSES.UPCOMING]: GAME_STATUSES.OPEN,
    [GAME_STATUSES.OPEN]: GAME_STATUSES.PLAYERS_ANNOUNCED,
    [GAME_STATUSES.PLAYERS_ANNOUNCED]: GAME_STATUSES.TEAMS_ANNOUNCED,
    [GAME_STATUSES.TEAMS_ANNOUNCED]: GAME_STATUSES.COMPLETED,
    [GAME_STATUSES.COMPLETED]: null,
    [GAME_STATUSES.CANCELLED]: null,
  };

  return transitions[currentStatus];
};

