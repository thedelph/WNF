-- Drop the existing type check constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new type check constraint
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('GAME_SPOT_AVAILABLE', 'slot_offer', 'system_message'));

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
    -- Check if metadata column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'metadata'
    ) THEN
        -- Add metadata column
        ALTER TABLE notifications
        ADD COLUMN metadata JSONB;
    END IF;
END $$;
