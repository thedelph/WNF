export interface Notification {
  id: string;
  player_id: string;
  type: string;
  message: string;
  action_url: string;
  created_at: string;
  read_at: string | null;
  metadata?: {
    game_id?: string;
    slot_offer_id?: string;
  };
}

export interface SlotOffer {
  id: string;
  game_id: string;
  player_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'voided';
  created_at: string;
  offered_at: string;
  responded_at: string | null;
  player: {
    id: string;
    friendly_name: string;
  };
  game: {
    id: string;
    date: string;
    venue: {
      name: string;
    };
    game_number: number;
  };
}
