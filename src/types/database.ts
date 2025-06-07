export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          friendly_name: string;
          caps: number;
          active_bonuses: number;
          active_penalties: number;
          current_streak: number;
          max_streak: number;
          win_rate: number;
          avatar_svg?: string;
          avatar_options?: any;
          preferred_position?: string;
          is_test_user?: boolean;
          is_admin?: boolean;
          is_super_admin?: boolean;
          user_id?: string;
          created_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['players']['Row']>;
      };
      games: {
        Row: {
          id: string;
          date: string;
          status: string;
          max_players: number;
          random_slots: number;
          registration_window_start: string;
          registration_window_end: string;
          team_announcement_time: string;
          teams_announced: boolean;
          sequence_number?: number;
          score_blue?: number;
          score_orange?: number;
          outcome?: 'blue_win' | 'orange_win' | 'draw' | null;
          venue_id?: string;
          created_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['games']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['games']['Row']>;
      };
      venues: {
        Row: {
          id: string;
          name: string;
          address: string;
          google_maps_url?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['venues']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['venues']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          player_id: string;
          type: string;
          message: string;
          metadata?: Record<string, any>;
          created_at: string;
          read_at?: string | null;
        };
      };
      slot_offers: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          status: string;
          offered_at: string;
          responded_at?: string;
          created_at: string;
        };
      };
    };
    Functions: {
      increment_caps: {
        Args: { player_id: string };
        Returns: void;
      };
      create_slot_offers_for_game: {
        Args: {
          p_game_id: string;
          p_admin_id?: string;
          p_dropped_out_player_id?: string;
        };
        Returns: void;
      };
    };
  };
}