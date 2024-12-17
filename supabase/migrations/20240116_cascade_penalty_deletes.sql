-- Drop the existing foreign key constraint
ALTER TABLE player_penalties
DROP CONSTRAINT player_penalties_game_id_fkey;

-- Add it back with CASCADE DELETE
ALTER TABLE player_penalties
ADD CONSTRAINT player_penalties_game_id_fkey
FOREIGN KEY (game_id)
REFERENCES games(id)
ON DELETE CASCADE;
