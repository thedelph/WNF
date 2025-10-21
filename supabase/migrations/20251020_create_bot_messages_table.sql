-- Track bot-sent messages for future reference and reaction handling
-- Part of WhatsApp Bot Integration (Phase 2)
-- See: docs/features/WhatsAppBotIntegration.md

CREATE TABLE IF NOT EXISTS bot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id VARCHAR(255) NOT NULL UNIQUE,  -- WhatsApp message ID
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  message_type VARCHAR(50) NOT NULL,  -- 'announcement', 'player_selection', 'team_announcement', 'reminder'
  message_content TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_to VARCHAR(50),  -- Group ID or phone number
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create indexes for faster lookups
CREATE INDEX idx_bot_messages_game_id ON bot_messages(game_id);
CREATE INDEX idx_bot_messages_type ON bot_messages(message_type);
CREATE INDEX idx_bot_messages_sent_at ON bot_messages(sent_at DESC);
CREATE INDEX idx_bot_messages_message_id ON bot_messages(message_id);

-- Add RLS policies
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all messages
CREATE POLICY "Admins can view all bot messages"
  ON bot_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN admin_roles ar ON p.id = ar.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Service role can insert messages (via bot service)
CREATE POLICY "Service role can insert bot messages"
  ON bot_messages
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update messages (for error tracking)
CREATE POLICY "Service role can update bot messages"
  ON bot_messages
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE bot_messages IS 'Tracks messages sent by the WhatsApp bot for reaction handling and analytics';
COMMENT ON COLUMN bot_messages.message_id IS 'WhatsApp message ID for linking reactions to specific announcements';
COMMENT ON COLUMN bot_messages.message_type IS 'Type of message: announcement, player_selection, team_announcement, reminder';
