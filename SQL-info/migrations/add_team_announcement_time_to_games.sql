-- Add team_announcement_time column to games table
ALTER TABLE games
ADD COLUMN team_announcement_time TIMESTAMP WITH TIME ZONE;

-- Add teams_announced column to games table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'games' AND column_name = 'teams_announced') THEN
        ALTER TABLE games
        ADD COLUMN teams_announced BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update existing games to have a default team announcement time (4 hours before game start)
UPDATE games
SET team_announcement_time = date - INTERVAL '4 hours'
WHERE team_announcement_time IS NULL;
