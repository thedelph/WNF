import { Player } from './player';
import { Game } from './game';

export type SlotOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface SlotOffer {
  id: string;
  gameId: string;
  playerId: string;
  status: SlotOfferStatus;
  createdAt: Date;
  expiresAt: Date;
  updatedAt: Date;
  player?: Player;
  game?: Game;
}

export interface SlotOfferDBResponse {
  id: string;
  game_id: string;
  player_id: string;
  status: SlotOfferStatus;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export const transformSlotOfferFromDB = (
  offer: SlotOfferDBResponse,
  player?: Player,
  game?: Game
): SlotOffer => ({
  id: offer.id,
  gameId: offer.game_id,
  playerId: offer.player_id,
  status: offer.status,
  createdAt: new Date(offer.created_at),
  expiresAt: new Date(offer.expires_at),
  updatedAt: new Date(offer.updated_at),
  player,
  game
});
