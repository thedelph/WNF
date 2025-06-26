# Game IQ Rating Database Migration

## Date: June 26, 2025

## Overview
This migration adds support for a third player rating metric called "Game IQ" to complement the existing Attack and Defense ratings.

## Migration Steps

### 1. Add game_iq_rating to player_ratings table

```sql
-- Add game_iq_rating column to player_ratings table
ALTER TABLE player_ratings 
ADD COLUMN game_iq_rating NUMERIC NULL;

-- Add check constraint for game_iq_rating (0-10 range)
ALTER TABLE player_ratings 
ADD CONSTRAINT player_ratings_game_iq_rating_check 
CHECK (game_iq_rating >= 0 AND game_iq_rating <= 10);
```

### 2. Add Game IQ columns to players table

```sql
-- Add game_iq column to players table (for average rating)
ALTER TABLE players 
ADD COLUMN game_iq NUMERIC NULL;

-- Add average_game_iq_rating column to match existing pattern
ALTER TABLE players 
ADD COLUMN average_game_iq_rating NUMERIC NULL;
```

### 3. Update the trigger function

```sql
-- Update the trigger function to include game_iq calculations
CREATE OR REPLACE FUNCTION public.update_player_average_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT or UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Update the rated player's averages
        UPDATE players
        SET 
            attack_rating = (
                SELECT COALESCE(AVG(attack_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            ),
            defense_rating = (
                SELECT COALESCE(AVG(defense_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            ),
            game_iq = (
                SELECT COALESCE(AVG(game_iq_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            ),
            average_attack_rating = (
                SELECT COALESCE(AVG(attack_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            ),
            average_defense_rating = (
                SELECT COALESCE(AVG(defense_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            ),
            average_game_iq_rating = (
                SELECT COALESCE(AVG(game_iq_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = NEW.rated_player_id
            )
        WHERE id = NEW.rated_player_id;
        
        RETURN NEW;
    -- For DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        -- Update the rated player's averages
        UPDATE players
        SET 
            attack_rating = (
                SELECT COALESCE(AVG(attack_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            ),
            defense_rating = (
                SELECT COALESCE(AVG(defense_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            ),
            game_iq = (
                SELECT COALESCE(AVG(game_iq_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            ),
            average_attack_rating = (
                SELECT COALESCE(AVG(attack_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            ),
            average_defense_rating = (
                SELECT COALESCE(AVG(defense_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            ),
            average_game_iq_rating = (
                SELECT COALESCE(AVG(game_iq_rating), 0)
                FROM player_ratings
                WHERE rated_player_id = OLD.rated_player_id
            )
        WHERE id = OLD.rated_player_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

## Affected Views

The following views will automatically include the new Game IQ columns:
- `player_stats`
- `player_stats_with_xp`
- `balanced_team_assignments`
- `extended_player_stats`

These views use `SELECT *` or include all columns from the players table, so they will automatically include the new game_iq and average_game_iq_rating columns.

## Rollback Script

If needed, here's how to rollback this migration:

```sql
-- Remove columns from players table
ALTER TABLE players DROP COLUMN IF EXISTS game_iq;
ALTER TABLE players DROP COLUMN IF EXISTS average_game_iq_rating;

-- Remove column from player_ratings table
ALTER TABLE player_ratings DROP CONSTRAINT IF EXISTS player_ratings_game_iq_rating_check;
ALTER TABLE player_ratings DROP COLUMN IF EXISTS game_iq_rating;

-- Restore original trigger function (without Game IQ calculations)
-- Note: You'll need to restore the original function definition
```

## Post-Migration Tasks

1. **Set default values for existing players (optional)**:
   ```sql
   -- Set default Game IQ of 5.0 for all players without ratings
   UPDATE players 
   SET game_iq = 5.0, average_game_iq_rating = 5.0 
   WHERE game_iq IS NULL;
   ```

2. **Verify the migration**:
   ```sql
   -- Check that columns exist
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name IN ('players', 'player_ratings') 
   AND column_name LIKE '%game_iq%';
   
   -- Check constraints
   SELECT constraint_name, check_clause 
   FROM information_schema.check_constraints 
   WHERE constraint_name LIKE '%game_iq%';
   ```

## Notes
- Existing ratings remain unchanged
- New ratings will have NULL game_iq until players rate again
- The COALESCE function in the trigger handles NULL values by defaulting to 0
- Frontend will display 0 stars for NULL Game IQ ratings until updated