-- Add new values to the existing notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'game_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'team_selection';

-- Add new columns for better notification organization
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS title text;

-- Add an icon column for visual indicators
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS icon text;

-- Add a priority column for notification sorting
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS priority smallint DEFAULT 0;

COMMENT ON TYPE notification_type IS 'Types of notifications that can be sent to users';
COMMENT ON COLUMN notifications.title IS 'Optional title for the notification';
COMMENT ON COLUMN notifications.icon IS 'Optional icon identifier for the notification';
COMMENT ON COLUMN notifications.priority IS 'Priority level for the notification (higher numbers = higher priority)';

-- Update existing notifications to have appropriate titles
UPDATE notifications 
SET title = CASE 
    WHEN type = 'slot_offer' THEN 'Game Slot Available'
    WHEN type = 'system_message' THEN 'System Message'
    ELSE NULL
END;
