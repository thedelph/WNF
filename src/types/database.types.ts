import type { GameStatus, GameOutcome } from './game'
import type { PlayerRarity } from './player'

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          date: string
          status: GameStatus
          max_players: number
          random_slots: number
          registration_window_start: string
          registration_window_end: string
          team_announcement_time: string
          teams_announced: boolean
          sequence_number?: number
          venue_id: string
          pitch_cost: number
          payment_link?: string
          time: string
          game_number?: number
          score_blue?: number
          score_orange?: number
          outcome?: GameOutcome
        }
        Insert: {
          id?: string
          date: string
          status?: GameStatus
          max_players?: number
          random_slots?: number
          registration_window_start: string
          registration_window_end: string
          team_announcement_time: string
          teams_announced?: boolean
          sequence_number?: number
          venue_id: string
          pitch_cost?: number
          payment_link?: string
          time?: string
          game_number?: number
          score_blue?: number
          score_orange?: number
          outcome?: GameOutcome
        }
        Update: Partial<Database['public']['Tables']['games']['Row']>
      }
      players: {
        Row: {
          id: string
          friendly_name: string
          caps: number
          active_bonuses: number
          active_penalties: number
          current_streak: number
          max_streak: number
          win_rate: number
          preferred_position: string | null
          avatar_svg?: string
          total_ratings?: number
          ratings_given?: number
          rarity: PlayerRarity
          has_declined?: boolean
          has_slot_offer?: boolean
        }
        Insert: {
          id?: string
          friendly_name: string
          caps?: number
          active_bonuses?: number
          active_penalties?: number
          current_streak?: number
          max_streak?: number
          win_rate?: number
          preferred_position?: string | null
          avatar_svg?: string
          total_ratings?: number
          ratings_given?: number
          rarity?: PlayerRarity
          has_declined?: boolean
          has_slot_offer?: boolean
        }
        Update: Partial<Database['public']['Tables']['players']['Row']>
      }
      game_registrations: {
        Row: {
          id: string
          game_id: string
          player_id: string
          status: 'confirmed' | 'reserve' | 'dropped_out'
          team?: 'blue' | 'orange'
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          status?: 'confirmed' | 'reserve' | 'dropped_out'
          team?: 'blue' | 'orange'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_registrations']['Row']>
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string
          google_maps_url: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          google_maps_url: string
        }
        Update: Partial<Database['public']['Tables']['venues']['Row']>
      }
      venue_presets: {
        Row: {
          id: string
          name: string
          venue_id: string
          day_of_week: string
          start_time: string
          registration_hours_before: number
          registration_hours_until: number
          team_announcement_hours: number
          pitch_cost: number
        }
        Insert: {
          id?: string
          name: string
          venue_id: string
          day_of_week: string
          start_time: string
          registration_hours_before: number
          registration_hours_until: number
          team_announcement_hours: number
          pitch_cost: number
        }
        Update: Partial<Database['public']['Tables']['venue_presets']['Row']>
      }
      slot_offers: {
        Row: {
          id: string
          game_id: string
          player_id: string
          status: 'pending' | 'accepted' | 'declined'
          offered_at: string
          responded_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          status?: 'pending' | 'accepted' | 'declined'
          offered_at: string
          responded_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['slot_offers']['Row']>
      }
    }
  }
}
