-- Add check constraint to selection_method column
ALTER TABLE game_registrations
DROP CONSTRAINT IF EXISTS game_registrations_selection_method_check;

ALTER TABLE game_registrations
ADD CONSTRAINT game_registrations_selection_method_check 
CHECK (selection_method IN ('merit', 'random', 'none'));

-- Set values for existing rows
UPDATE game_registrations
SET selection_method = CASE
    WHEN status = 'selected' AND randomly_selected = true THEN 'random'
    WHEN status = 'selected' AND (randomly_selected = false OR randomly_selected IS NULL) THEN 'merit'
    ELSE 'none'
END;

-- Make the column not nullable and set default
ALTER TABLE game_registrations
ALTER COLUMN selection_method SET NOT NULL,
ALTER COLUMN selection_method SET DEFAULT 'none';

-- Drop the old randomly_selected column as it's no longer needed
ALTER TABLE game_registrations
DROP COLUMN IF EXISTS randomly_selected;
