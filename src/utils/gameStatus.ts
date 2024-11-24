import { GameStatus, GAME_STATUSES } from '../types/game';

export const canTransitionTo = (currentStatus: GameStatus, newStatus: GameStatus): boolean => {
  const transitions: Record<GameStatus, GameStatus[]> = {
    [GAME_STATUSES.UPCOMING]: [GAME_STATUSES.OPEN],
    [GAME_STATUSES.OPEN]: [GAME_STATUSES.PENDING_TEAMS],
    [GAME_STATUSES.PENDING_TEAMS]: [GAME_STATUSES.PLAYERS_ANNOUNCED],
    [GAME_STATUSES.PLAYERS_ANNOUNCED]: [GAME_STATUSES.TEAMS_ANNOUNCED],
    [GAME_STATUSES.TEAMS_ANNOUNCED]: [GAME_STATUSES.COMPLETED],
    [GAME_STATUSES.COMPLETED]: [],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};

export const getNextStatus = (currentStatus: GameStatus): GameStatus | null => {
  const transitions = {
    [GAME_STATUSES.UPCOMING]: GAME_STATUSES.OPEN,
    [GAME_STATUSES.OPEN]: GAME_STATUSES.PENDING_TEAMS,
    [GAME_STATUSES.PENDING_TEAMS]: GAME_STATUSES.PLAYERS_ANNOUNCED,
    [GAME_STATUSES.PLAYERS_ANNOUNCED]: GAME_STATUSES.TEAMS_ANNOUNCED,
    [GAME_STATUSES.TEAMS_ANNOUNCED]: GAME_STATUSES.COMPLETED,
    [GAME_STATUSES.COMPLETED]: null,
  };

  return transitions[currentStatus];
};

