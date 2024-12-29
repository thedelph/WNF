-- Drop the existing enum type if it exists
DROP TYPE IF EXISTS game_status CASCADE;

-- Create the new enum type with the correct values
CREATE TYPE game_status AS ENUM (
    'open',
    'upcoming',
    'players_announced',
    'teams_announced',
    'completed'
);

DO $$ 
BEGIN
    -- Check if status column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'games' AND column_name = 'status'
    ) THEN
        -- Add a temporary column with the new type
        ALTER TABLE games ADD COLUMN new_status game_status;
        
        -- Update the temporary column based on the old status text
        UPDATE games 
        SET new_status = (
            CASE 
                WHEN status = 'created' THEN 'open'
                WHEN status = 'registration_open' THEN 'upcoming'
                WHEN status = 'pending_completion' THEN 'players_announced'
                ELSE status
            END
        )::game_status;
        
        -- Drop the old status column
        ALTER TABLE games DROP COLUMN status;
        
        -- Rename the new column to status
        ALTER TABLE games RENAME COLUMN new_status TO status;
        
        -- Make status NOT NULL
        ALTER TABLE games ALTER COLUMN status SET NOT NULL;
    ELSE
        -- If status column doesn't exist, create it with the new type
        ALTER TABLE games ADD COLUMN status game_status NOT NULL DEFAULT 'open';
    END IF;
END $$;
