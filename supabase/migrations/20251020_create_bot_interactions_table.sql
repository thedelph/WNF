-- Track all bot interactions for analytics and debugging
-- Part of WhatsApp Bot Integration (Phase 2)
-- See: docs/features/WhatsAppBotIntegration.md

CREATE TABLE IF NOT EXISTS bot_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  phone_number VARCHAR(20),  -- Store even if player not found (E.164 format)
  interaction_type VARCHAR(50) NOT NULL,  -- 'command', 'reaction', 'message'
  command VARCHAR(100),  -- e.g., '/xp', '/stats', '/tokens'
  message_content TEXT,
  response TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_bot_interactions_player_id ON bot_interactions(player_id);
CREATE INDEX idx_bot_interactions_type ON bot_interactions(interaction_type);
CREATE INDEX idx_bot_interactions_created_at ON bot_interactions(created_at DESC);
CREATE INDEX idx_bot_interactions_command ON bot_interactions(command) WHERE command IS NOT NULL;
CREATE INDEX idx_bot_interactions_phone ON bot_interactions(phone_number) WHERE phone_number IS NOT NULL;

-- Add RLS policies
ALTER TABLE bot_interactions ENABLE ROW LEVEL SECURITY;

-- Admins can view all interactions
CREATE POLICY "Admins can view all bot interactions"
  ON bot_interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN admin_roles ar ON p.id = ar.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Players can view their own interactions
CREATE POLICY "Players can view their own bot interactions"
  ON bot_interactions
  FOR SELECT
  TO authenticated
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Service role can insert interactions
CREATE POLICY "Service role can insert bot interactions"
  ON bot_interactions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE bot_interactions IS 'Audit log of all WhatsApp bot interactions for analytics and debugging';
COMMENT ON COLUMN bot_interactions.interaction_type IS 'Type of interaction: command, reaction, message';
COMMENT ON COLUMN bot_interactions.command IS 'Command used (e.g., /xp, /stats) if interaction_type is command';
COMMENT ON COLUMN bot_interactions.phone_number IS 'WhatsApp phone number in E.164 format (+447...)';
