# XP Leaderboard Fix

## Issue
The XP leaderboard on the Stats page was not displaying historical high scores correctly. Specifically, players who had achieved high XP scores in the past but whose current XP had decreased were not showing their highest ever scores on the leaderboard.

Example: Daniel had achieved 1053 XP on February 20, 2025, but this high score was not appearing in the leaderboard because:
1. The `highest_xp_records_view` was correctly showing each player's highest XP from the `player_xp_snapshots` table
2. However, Daniel's February 20 high score was not present in the snapshots table
3. Only his more recent, lower XP score (450 XP from March 12) was being stored

## Solution
The issue was fixed by:

1. Manually adding Daniel's missing high score record to the `player_xp_snapshots` table:
```sql
INSERT INTO player_xp_snapshots (player_id, xp, rank, rarity, snapshot_date)
VALUES ('17a2a9c2-26b8-4c97-9750-3579c57fe3f5', 1053, 1, 'Legendary', '2025-02-20 00:59:59.999+00');
```

2. Modifying the `take_xp_snapshot` function to preserve historical high scores when taking new snapshots:
```sql
CREATE OR REPLACE FUNCTION take_xp_snapshot()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    last_game_date TIMESTAMPTZ;
    snapshot_timestamp TIMESTAMPTZ;
    snapshot_count INTEGER;
    preserved_count INTEGER := 0;
BEGIN
    -- Get the date of the last completed game
    SELECT date INTO last_game_date 
    FROM games 
    WHERE completed = true 
    ORDER BY date DESC 
    LIMIT 1;
    
    -- If there are no completed games, try getting any game
    IF last_game_date IS NULL THEN
        SELECT date INTO last_game_date 
        FROM games 
        ORDER BY date DESC 
        LIMIT 1;
    END IF;
    
    -- If still no games, use current timestamp
    IF last_game_date IS NULL THEN
        snapshot_timestamp := NOW();
    ELSE
        -- Set snapshot time to 1 hour after the last game
        snapshot_timestamp := last_game_date + INTERVAL '1 hour';
    END IF;
    
    -- First, identify players whose current XP is lower than their historical max
    -- and preserve their historical high scores
    WITH player_max_xp AS (
        SELECT 
            player_id,
            MAX(xp) as max_xp
        FROM 
            player_xp_snapshots
        GROUP BY 
            player_id
    ),
    players_to_preserve AS (
        SELECT 
            pxs.player_id,
            pxs.xp,
            pxs.rank,
            pxs.rarity,
            pxs.snapshot_date
        FROM 
            player_xp_snapshots pxs
        JOIN 
            player_max_xp pmx ON pxs.player_id = pmx.player_id AND pxs.xp = pmx.max_xp
        JOIN 
            player_xp px ON pxs.player_id = px.player_id
        WHERE 
            px.xp < pmx.max_xp
    )
    INSERT INTO player_xp_snapshots (player_id, xp, rank, rarity, snapshot_date)
    SELECT 
        player_id, 
        xp,
        rank,
        rarity,
        snapshot_timestamp
    FROM 
        players_to_preserve;
    
    GET DIAGNOSTICS preserved_count = ROW_COUNT;
    
    -- Now insert current XP data for all players
    INSERT INTO player_xp_snapshots (player_id, xp, rank, rarity, snapshot_date)
    SELECT 
        player_id, 
        xp,
        rank,
        rarity,
        snapshot_timestamp
    FROM 
        player_xp;
    
    -- Count how many records were inserted
    GET DIAGNOSTICS snapshot_count = ROW_COUNT;
    
    -- Return a message indicating the snapshot was taken
    RETURN 'Successfully saved XP snapshot for ' || snapshot_count || ' players with timestamp ' || snapshot_timestamp || 
           '. Preserved ' || preserved_count || ' historical high scores.';
END;
$$;
```

## How It Works
The updated `take_xp_snapshot` function now:

1. Identifies players whose current XP is lower than their historical maximum
2. For those players, it preserves their historical high score by creating a new snapshot with their highest XP value
3. Then it proceeds with the normal snapshot process for all players' current XP

This ensures that when a player's XP decreases (due to penalties or other factors), their historical high score will still be preserved in future snapshots, and they'll continue to appear correctly in the leaderboard.

## Testing
After implementing the fix:
1. Daniel now appears at the top of the leaderboard with 1053 XP (from February 20, 2025)
2. Running the `take_xp_snapshot` function preserved 52 historical high scores while taking snapshots for 55 players

The XP leaderboard now correctly shows each player's highest ever XP score, ensuring that historical achievements are always recognized and displayed.

## Timestamp Issue Fix (March 24, 2025)

### Issue
After implementing the initial fix, a new issue was discovered with the timestamps in the XP leaderboard. Players who had achieved high XP scores in the past but didn't play in recent games were showing incorrect dates for their high scores.

Example: 
- Daniel's high score of 1053 XP was correctly preserved, but was showing as achieved on March 20, 2025, instead of February 20, 2025
- Calvin's high score of 654 XP was showing as achieved on March 20, 2025, instead of March 12, 2025
- Dave's high score of 833 XP was showing as achieved on March 20, 2025, instead of March 12, 2025

The issue was that the `take_xp_snapshot` function was preserving historical high scores but using the current snapshot timestamp instead of the original timestamp when the high score was achieved.

### Solution
The issue was fixed by:

1. Manually updating the timestamps for affected players:
```sql
-- Fix Daniel's timestamp
UPDATE player_xp_snapshots
SET snapshot_date = '2025-02-20 00:59:59.999+00'
WHERE player_id = '17a2a9c2-26b8-4c97-9750-3579c57fe3f5'
AND xp = 1053;

-- Fix Calvin's timestamp
UPDATE player_xp_snapshots
SET snapshot_date = '2025-03-12 22:00:00+00'
WHERE player_id = '84c631df-a046-41e9-a10c-4a77561e6c08'
AND xp = 654
AND snapshot_date = '2025-03-20 00:59:59.999+00';

-- Fix Dave's timestamp
UPDATE player_xp_snapshots
SET snapshot_date = '2025-03-12 22:00:00+00'
WHERE player_id = '40a27806-c64d-4786-8886-fb535b529b83'
AND xp = 833
AND snapshot_date = '2025-03-20 00:59:59.999+00';
```

2. Further modifying the `take_xp_snapshot` function to preserve the original timestamps when preserving historical high scores:
```sql
CREATE OR REPLACE FUNCTION take_xp_snapshot()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    last_game_date TIMESTAMPTZ;
    snapshot_timestamp TIMESTAMPTZ;
    snapshot_count INTEGER;
    preserved_count INTEGER := 0;
BEGIN
    -- Get the date of the last completed game
    SELECT date INTO last_game_date 
    FROM games 
    WHERE completed = true 
    ORDER BY date DESC 
    LIMIT 1;
    
    -- If there are no completed games, try getting any game
    IF last_game_date IS NULL THEN
        SELECT date INTO last_game_date 
        FROM games 
        ORDER BY date DESC 
        LIMIT 1;
    END IF;
    
    -- If still no games, use current timestamp
    IF last_game_date IS NULL THEN
        snapshot_timestamp := NOW();
    ELSE
        -- Set snapshot time to 1 hour after the last game
        snapshot_timestamp := last_game_date + INTERVAL '1 hour';
    END IF;
    
    -- First, identify players whose current XP is lower than their historical max
    -- and preserve their historical high scores WITH THEIR ORIGINAL TIMESTAMPS
    WITH player_max_xp AS (
        SELECT 
            player_id,
            MAX(xp) as max_xp
        FROM 
            player_xp_snapshots
        GROUP BY 
            player_id
    ),
    player_max_xp_record AS (
        SELECT DISTINCT ON (pxs.player_id)
            pxs.player_id,
            pxs.xp,
            pxs.rank,
            pxs.rarity,
            pxs.snapshot_date
        FROM 
            player_xp_snapshots pxs
        JOIN 
            player_max_xp pmx ON pxs.player_id = pmx.player_id AND pxs.xp = pmx.max_xp
        ORDER BY 
            pxs.player_id, pxs.snapshot_date ASC
    ),
    players_to_preserve AS (
        SELECT 
            pmxr.player_id,
            pmxr.xp,
            pmxr.rank,
            pmxr.rarity,
            pmxr.snapshot_date  -- Keep the original snapshot date
        FROM 
            player_max_xp_record pmxr
        JOIN 
            player_xp px ON pmxr.player_id = px.player_id
        WHERE 
            px.xp < pmxr.max_xp
    )
    INSERT INTO player_xp_snapshots (player_id, xp, rank, rarity, snapshot_date)
    SELECT 
        player_id, 
        xp,
        rank,
        rarity,
        snapshot_date  -- Use the original snapshot date, not the current one
    FROM 
        players_to_preserve;
    
    GET DIAGNOSTICS preserved_count = ROW_COUNT;
    
    -- Now insert current XP data for all players
    INSERT INTO player_xp_snapshots (player_id, xp, rank, rarity, snapshot_date)
    SELECT 
        player_id, 
        xp,
        rank,
        rarity,
        snapshot_timestamp
    FROM 
        player_xp;
    
    -- Count how many records were inserted
    GET DIAGNOSTICS snapshot_count = ROW_COUNT;
    
    -- Return a message indicating the snapshot was taken
    RETURN 'Successfully saved XP snapshot for ' || snapshot_count || ' players with timestamp ' || snapshot_timestamp || 
           '. Preserved ' || preserved_count || ' historical high scores with their original timestamps.';
END;
$$;
```

### How It Works
The updated `take_xp_snapshot` function now:

1. Identifies players whose current XP is lower than their historical maximum
2. For those players, it finds the earliest record with their maximum XP (the original achievement date)
3. It preserves their historical high score using the original snapshot date, not the current timestamp
4. Then it proceeds with the normal snapshot process for all players' current XP

This ensures that when a player's XP decreases and their historical high score is preserved, the leaderboard will show the correct date when they originally achieved that high score, not the date when the snapshot was taken.

### Testing
After implementing the fix:
1. Daniel now correctly appears with 1053 XP from February 20, 2025
2. Calvin now correctly appears with 654 XP from March 12, 2025
3. Dave now correctly appears with 833 XP from March 12, 2025

The XP leaderboard now correctly shows both each player's highest ever XP score and the correct date when they achieved it.
