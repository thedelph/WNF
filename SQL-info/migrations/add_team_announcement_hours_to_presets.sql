-- Add team_announcement_hours column to venue_presets table
ALTER TABLE venue_presets
ADD COLUMN team_announcement_hours INTEGER NOT NULL DEFAULT 4;

-- Update existing presets to have a default value of 4 hours
UPDATE venue_presets
SET team_announcement_hours = 4
WHERE team_announcement_hours IS NULL;
