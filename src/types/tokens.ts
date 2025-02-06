export interface TokenData {
  id: string;
  player_id: string;
  friendly_name: string;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_game_id: string | null;
}
