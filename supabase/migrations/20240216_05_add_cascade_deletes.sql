-- Drop existing foreign key constraint
ALTER TABLE slot_offers
DROP CONSTRAINT IF EXISTS slot_offers_game_id_fkey;

-- Add foreign key constraint with cascade delete
ALTER TABLE slot_offers
ADD CONSTRAINT slot_offers_game_id_fkey
FOREIGN KEY (game_id)
REFERENCES games(id)
ON DELETE CASCADE;

-- Also add cascade delete for game_registrations
ALTER TABLE game_registrations
DROP CONSTRAINT IF EXISTS game_registrations_game_id_fkey;

ALTER TABLE game_registrations
ADD CONSTRAINT game_registrations_game_id_fkey
FOREIGN KEY (game_id)
REFERENCES games(id)
ON DELETE CASCADE;
