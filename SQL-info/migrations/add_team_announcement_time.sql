-- Add team_announcement_time column to games table
ALTER TABLE games
ADD COLUMN team_announcement_time TIMESTAMP WITH TIME ZONE;

-- Add check constraint to ensure team_announcement_time is after registration_end
ALTER TABLE games
ADD CONSTRAINT check_team_announcement_time 
CHECK (team_announcement_time > registration_end);
