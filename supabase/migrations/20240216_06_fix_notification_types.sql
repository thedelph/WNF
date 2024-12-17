-- Drop existing type if it exists
DROP TYPE IF EXISTS notification_type;

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
    'slot_offer',
    'admin_slot_offer',
    'game_update',
    'system_message'
);

-- Add check constraint to notifications table
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type::text = ANY(enum_range(NULL::notification_type)::text[]));
