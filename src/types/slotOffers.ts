import { Database } from './database';

export type SlotOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface SlotOffer {
  id: string;
  game_id: string;
  player_id: string;
  status: SlotOfferStatus;
  offered_at: string;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SlotOfferWithDetails = SlotOffer & {
  game: Database['public']['Tables']['games']['Row'];
  player: Database['public']['Tables']['players']['Row'];
};
