export interface TokenData {
  id: string;
  player_id: string;
  friendly_name: string;
  whatsapp_group_member: string;
  is_eligible: boolean;
  reason?: string; // Reason for ineligibility
  selected_games: Array<{
    id: string;
    date: string;
    display: string;
    sequence_number?: number; // For checking consecutive games
  }>;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_game_id: string | null;
}
