-- First create an enum type for game status
DO $$ BEGIN
    CREATE TYPE game_status AS ENUM (
        'created',
        'registration_open',
        'teams_announced',
        'pending_completion',
        'completed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;

-- Convert status column to use the enum type
ALTER TABLE games 
    ALTER COLUMN status TYPE game_status 
    USING status::game_status;

-- Add NOT NULL constraint if it doesn't exist
ALTER TABLE games 
    ALTER COLUMN status SET NOT NULL;
