-- Create a new enum type with all values
CREATE TYPE notification_type_new AS ENUM (
    'slot_offer',
    'system_message',
    'payment_request',
    'game_reminder',
    'team_selection'
);

-- Update the notifications table to use the new type
ALTER TABLE notifications
    ALTER COLUMN type TYPE notification_type_new 
    USING (type::text::notification_type_new);

-- Drop the old type
DROP TYPE notification_type;

-- Rename the new type to the original name
ALTER TYPE notification_type_new RENAME TO notification_type;

-- Add new columns for better notification organization
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS icon text,
    ADD COLUMN IF NOT EXISTS priority smallint DEFAULT 0;

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
