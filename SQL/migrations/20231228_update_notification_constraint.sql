-- Drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;

-- Add the new constraint with all valid types
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
    'slot_offer',
    'admin_slot_offer',
    'game_update',
    'system_message',
    'payment_request',
    'game_reminder',
    'team_selection'
]::text[]));
