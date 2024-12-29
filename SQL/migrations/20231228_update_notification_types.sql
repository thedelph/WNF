-- First, drop the existing constraint so we can update rows
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Now update any invalid notification types
DO $$
DECLARE
    invalid_types text[];
BEGIN
    -- Get any types that aren't in our new list
    SELECT ARRAY_AGG(DISTINCT type)
    INTO invalid_types
    FROM notifications
    WHERE type NOT IN (
        'game_created',
        'game_cancelled',
        'team_announced',
        'game_reminder',
        'payment_request',
        'payment_confirmed',
        'registration_confirmed',
        'registration_removed',
        'bonus_earned',
        'penalty_earned',
        'system_announcement',
        'slot_offer'  -- Adding this type since it exists in the data
    );

    -- If we found any invalid types, update them to a valid type
    IF array_length(invalid_types, 1) > 0 THEN
        RAISE NOTICE 'Found invalid notification types: %', invalid_types;
        
        -- Update any invalid types to 'system_announcement'
        UPDATE notifications
        SET type = 'system_announcement'
        WHERE type = ANY(invalid_types);
    END IF;
END $$;

-- Finally, add the new constraint with all valid types
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'game_created',
    'game_cancelled',
    'team_announced',
    'game_reminder',
    'payment_request',
    'payment_confirmed',
    'registration_confirmed',
    'registration_removed',
    'bonus_earned',
    'penalty_earned',
    'system_announcement',
    'slot_offer'  -- Adding this type since it exists in the data
));
