-- Drop the existing check constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new check constraint with additional types
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('GAME_SPOT_AVAILABLE', 'slot_offer', 'system_message'));
