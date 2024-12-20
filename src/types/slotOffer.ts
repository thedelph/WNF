import { Database } from './database'
import { Game } from './game'
import { Player } from './player'

export type SlotOfferRow = Database['public']['Tables']['slot_offers']['Row']

export interface SlotOffer {
  id: string
  game_id: string
  player_id: string
  status: 'pending' | 'accepted' | 'declined'
  offered_at: string
  responded_at?: string
  created_at: string
  player: {
    id: string
    friendly_name: string
    has_declined?: boolean
    has_offer?: boolean
  }
  game: {
    id: string
    date: string
    venue: {
      name: string
    }
  }
}

export interface AdminSlotOffersProps {
  onUpdate: () => Promise<void>
  slotOffers: SlotOffer[]
}

export const transformSlotOfferFromDB = (offer: SlotOfferRow): SlotOffer => {
  return {
    id: offer.id,
    game_id: offer.game_id,
    player_id: offer.player_id,
    status: offer.status as 'pending' | 'accepted' | 'declined',
    offered_at: offer.offered_at,
    responded_at: offer.responded_at,
    created_at: offer.created_at,
    player: {
      id: offer.player_id,
      friendly_name: '',  // This needs to be populated from the player table
      has_declined: false,
      has_offer: false
    },
    game: {
      id: offer.game_id,
      date: '',  // This needs to be populated from the game table
      venue: {
        name: ''  // This needs to be populated from the venue table
      }
    }
  }
}
