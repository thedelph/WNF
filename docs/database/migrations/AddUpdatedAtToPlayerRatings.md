# Add updated_at to player_ratings Table Migration

## Date: June 26, 2025

## Overview
This migration adds an `updated_at` column to the `player_ratings` table to track when ratings were last modified, addressing the issue where only the creation date was visible in the admin interface.

## Migration Steps

### 1. Add updated_at column to player_ratings table

```sql
-- Add updated_at column with default value
ALTER TABLE player_ratings 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to set updated_at equal to created_at
UPDATE player_ratings 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Make the column NOT NULL after setting values
ALTER TABLE player_ratings 
ALTER COLUMN updated_at SET NOT NULL;
```

### 2. Create trigger to automatically update updated_at

```sql
-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger on player_ratings table
CREATE TRIGGER update_player_ratings_updated_at 
BEFORE UPDATE ON player_ratings 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
```

## Frontend Updates Required

After applying this migration, update the following files:
1. `/src/components/admin/ratings/types.ts` - Add `updated_at` to Rating interface
2. `/src/components/admin/ratings/components/PlayerRatingsTable.tsx` - Display `updated_at` instead of `created_at`
3. `/src/components/admin/ratings/hooks/usePlayerRatings.ts` - Include `updated_at` in select
4. `/src/components/admin/ratings/hooks/useRaterStats.ts` - Include `updated_at` in select

## Rollback Script

```sql
-- Drop the trigger
DROP TRIGGER IF EXISTS update_player_ratings_updated_at ON player_ratings;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove the column
ALTER TABLE player_ratings DROP COLUMN IF EXISTS updated_at;
```

## Verification

```sql
-- Check that column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'player_ratings' 
AND column_name = 'updated_at';

-- Check that trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'update_player_ratings_updated_at';

-- Test the trigger
UPDATE player_ratings 
SET attack_rating = attack_rating 
WHERE id = (SELECT id FROM player_ratings LIMIT 1);

-- Verify updated_at changed
SELECT id, created_at, updated_at 
FROM player_ratings 
WHERE id = (SELECT id FROM player_ratings LIMIT 1);
```