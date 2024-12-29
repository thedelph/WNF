export type NotificationType = 
  | 'slot_offer'
  | 'admin_slot_offer'
  | 'game_update'
  | 'system_message'
  | 'payment_request'
  | 'game_reminder'
  | 'team_selection';

export interface Notification {
  id?: string;
  player_id: string;
  type: NotificationType;
  title?: string;
  message: string;
  action_url?: string;
  created_at?: string;
  read_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  icon?: string;
  priority?: number;
}
