export interface TokenData {
  id: string;
  player_id: string;
  friendly_name: string;
  whatsapp_group_member: string;
  is_eligible: boolean;
  selected_games: Array<{
    id: string;
    date: string;
    display: string;
  }>;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_game_id: string | null;
}
