import { ReservePlayer } from '../../types/playerSelection';

export interface DropoutResult {
  success: boolean;
  error?: string;
}

export interface SlotOfferCreationParams {
  gameId: string;
  adminId: string;
  droppedOutPlayerId: string;
}

export interface PlayerRegistrationStatus {
  status: string;
}

export interface GameData {
  id: string;
  date: string;
  [key: string]: any;
}
