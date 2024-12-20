export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          date: string
          status: string
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
          outcome?: 'blue_win' | 'orange_win' | 'draw'
        }
        Insert: Omit<Database['public']['Tables']['games']['Row'], 'id'> & { id?: string }
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
          avatar_svg: string
          dropout_penalties: number
          attack_rating?: number
          defense_rating?: number
          games_played: number
        }
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['players']['Row']>
      }
      registrations: {
        Row: {
          id: string
          game_id: string
          player_id: string
          status: 'registered' | 'selected' | 'reserve' | 'cancelled'
          team?: 'blue' | 'orange' | null
          randomly_selected: boolean
          created_at: string
          paid: boolean
          payment_received_date?: string
        }
        Insert: Omit<Database['public']['Tables']['registrations']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['registrations']['Row']>
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string
          google_maps_url?: string
          is_default?: boolean
        }
        Insert: Omit<Database['public']['Tables']['venues']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['venues']['Row']>
      }
      admin_permissions: {
        Row: {
          id: string
          admin_id: string
          permission: string
        }
        Insert: Omit<Database['public']['Tables']['admin_permissions']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['admin_permissions']['Row']>
      }
      ratings: {
        Row: {
          id: string
          rater_id: string
          rated_player_id: string
          attack_rating: number
          defense_rating: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ratings']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['ratings']['Row']>
      }
    }
  }
}
