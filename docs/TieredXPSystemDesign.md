# Tiered XP System Design Document

## Overview
The tiered XP system allows players to choose their participation frequency (weekly, bi-weekly, or monthly) while maintaining fair XP progression across all tiers. This system has been updated to support more flexible play schedules, ensuring that casual players can also build streaks and earn competitive XP even if they participate on a bi-weekly or monthly basis. This document outlines the implementation plan and technical details.

## Database Schema Changes

### New Tables

```sql
-- Tier definitions
CREATE TABLE tiers (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL CHECK (name IN ('Weekly', 'Bi-Weekly', 'Monthly')),
    required_gap INTEGER NOT NULL CHECK (required_gap >= 1),
    xp_multiplier DECIMAL NOT NULL CHECK (xp_multiplier >= 1.0),
    min_commitment_games INTEGER NOT NULL CHECK (min_commitment_games >= 4)
);

-- Tier assignment history
CREATE TABLE player_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id),
    tier_id INTEGER NOT NULL REFERENCES tiers(id),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (
        end_date IS NULL OR 
        end_date > start_date
    )
);
```

### Players Table Modification

```sql
ALTER TABLE players 
ADD COLUMN current_tier_period_id UUID REFERENCES player_tiers(id);

CREATE INDEX idx_players_current_tier ON players(current_tier_period_id);
```

## Implementation Details

### Tier Management
- Players are assigned to tiers using the `player_tiers` table
- Each tier period is defined by:
  - `start_date`: When the tier period begins
  - `end_date`: When the tier period ends (NULL for active periods)
  - `tier_id`: Reference to the tier configuration
- Tier changes are tracked automatically via database triggers
- When a player changes tiers, the previous tier period is closed with an end_date

### XP Calculation Logic

The XP calculation follows these steps:

1. **Base Points Calculation**
   - Games are ordered by sequence number (most recent first)
   - Base points are assigned based on games_ago:
     - 0 games ago: 20 points
     - 1-2 games ago: 18 points
     - 3-4 games ago: 16 points
     - 5-9 games ago: 14 points
     - 10-19 games ago: 12 points
     - 20-29 games ago: 10 points
     - 30-39 games ago: 5 points
     - 40+ games ago: 0 points

2. **Tier Multipliers**
   - Base points are multiplied by the tier's XP multiplier:
     - Weekly: 1.0x
     - Bi-Weekly: 2.0x
     - Monthly: 4.0x

3. **Modifiers**
   All modifiers are calculated based on the current state and apply to the total XP:
   
   a. **Streak Modifier**
   - +10% per game in the streak
   - Streak is calculated based on consecutive game sequence numbers and tier requirements
   - A streak is broken when there's a gap in sequence numbers that exceeds the tier's required gap
   - Streak rules are determined by the tier in effect at the time of each game:
     - Weekly tier: Gap must be ≤ 1
     - Monthly tier: Gap must be ≤ 4
   - When a player changes tiers:
     - Their streak continues if they meet the required gap for their tier at the time of each game
     - Example: A player with a 6-game streak in Weekly tier can extend it to 7 games after moving to Monthly tier if they play within 4 weeks
     - The streak breaks if any gap exceeds the required gap for the tier at that time
   
   Implementation in `update_player_streaks()`:
   ```sql
   -- Determine required gap based on game date
   SELECT 
       g.sequence_number,
       g.date,
       CASE 
           WHEN g.date >= '2025-01-22 00:00:00+00'::timestamptz THEN 4  -- Monthly tier
           ELSE 1  -- Weekly tier
       END as required_gap,
       LAG(g.sequence_number) OVER (ORDER BY g.sequence_number DESC) - g.sequence_number as gap
   FROM players p
   JOIN game_registrations gr ON gr.player_id = p.id
   JOIN games g ON g.id = gr.game_id
   WHERE gr.status = 'selected'
   AND g.completed = true

   -- Calculate streak by finding first gap that breaks the streak
   SELECT 
       player_id,
       COALESCE((
           SELECT rn - 1
           FROM player_games pg2
           WHERE pg2.player_id = player_games.player_id
           AND (
               -- Break streak if gap > required_gap for that game's tier
               pg2.gap > pg2.required_gap
           )
           ORDER BY pg2.sequence_number DESC
           LIMIT 1
       ), (
           SELECT COUNT(*)
           FROM player_games pg3
           WHERE pg3.player_id = player_games.player_id
       )) as streak
   ```
   
   b. **Reserve Modifier**
   - +5% if the player was on reserve for the most recent game
   
   c. **Registration Modifier**
   - +2.5% per game in the registration streak
   
   d. **Unpaid Modifier**
   - -50% per unpaid game

4. **Final XP Calculation**
   ```
   Final XP = ROUND(Total Base Points × (1 + Sum of All Modifiers))
   ```
   Where:
   - Total Base Points = Sum of (Base Points × Tier Multiplier) for all games
   - Sum of All Modifiers = Streak + Reserve + Registration + Unpaid modifiers

### Example Calculation

For a player in Monthly tier with:
- Total base points across all games = 295.0
- Current streak of 1 game (+10%)
- No reserve bonus
- No registration bonus
- No unpaid penalty
- Total modifier = 1.0 + 0.1 = 1.1

Final XP = ROUND(295.0 × 1.1) = 325

### XP Calculation Implementation

```sql
CREATE OR REPLACE FUNCTION calculate_player_xp_tiered_by_date(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_xp INTEGER := 0;
    current_date DATE;
BEGIN
    -- Get current date
    SELECT CURRENT_DATE INTO current_date;

    -- Calculate XP per tier period
    WITH tier_windows AS (
        SELECT 
            pt.tier_id,
            pt.start_date,
            COALESCE(pt.end_date, current_date) AS end_date,
            t.xp_multiplier,
            t.required_gap
        FROM player_tiers pt
        JOIN tiers t ON t.id = pt.tier_id
        WHERE pt.player_id = p_player_id
    ),
    eligible_games AS (
        SELECT 
            g.game_date,
            tw.xp_multiplier,
            (current_date - g.game_date) AS days_ago,
            ROW_NUMBER() OVER (
                PARTITION BY tw.tier_id 
                ORDER BY g.game_date DESC
            ) AS tier_game_num
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        JOIN tier_windows tw ON g.game_date BETWEEN tw.start_date AND tw.end_date
        WHERE gr.player_id = p_player_id
          AND gr.status = 'selected'
          AND g.completed = true
    ),
    weighted_games AS (
        SELECT
            game_date,
            CASE
                WHEN days_ago = 0 THEN 20
                WHEN days_ago BETWEEN 1 AND 2 THEN 18
                WHEN days_ago BETWEEN 3 AND 4 THEN 16
                WHEN days_ago BETWEEN 5 AND 9 THEN 14
                WHEN days_ago BETWEEN 10 AND 19 THEN 12
                WHEN days_ago BETWEEN 20 AND 29 THEN 10
                WHEN days_ago BETWEEN 30 AND 39 THEN 5
                ELSE 0
            END * xp_multiplier AS weighted_xp
        FROM eligible_games
        -- Enforce tier cooldown requirement
        WHERE MOD(tier_game_num - 1, required_gap) = 0
    )
    SELECT SUM(weighted_xp) INTO total_xp FROM weighted_games;

    -- Add reserve XP with tier multiplier
    total_xp := total_xp + (
        SELECT COALESCE(SUM(xp_amount * t.xp_multiplier), 0)
        FROM reserve_xp_transactions
        JOIN tiers t ON t.id = (
            SELECT tier_id
            FROM player_tiers
            WHERE player_id = p_player_id
            ORDER BY end_date DESC NULLS LAST
            LIMIT 1
        )
        WHERE player_id = p_player_id
    );

    -- Apply modifiers
    total_xp := ROUND(total_xp * (1 + (
        -- Streak modifier
        (SELECT COUNT(*) FROM games WHERE player_id = p_player_id AND game_date > (CURRENT_DATE - INTERVAL '28 days')) * 0.1 +
        -- Reserve modifier
        (SELECT COUNT(*) FROM reserve_xp_transactions WHERE player_id = p_player_id AND game_date > (CURRENT_DATE - INTERVAL '28 days')) * 0.05 +
        -- Registration modifier
        (SELECT COUNT(*) FROM game_registrations WHERE player_id = p_player_id AND game_date > (CURRENT_DATE - INTERVAL '28 days')) * 0.025 +
        -- Unpaid modifier
        -(SELECT COUNT(*) FROM unpaid_games WHERE player_id = p_player_id AND game_date > (CURRENT_DATE - INTERVAL '28 days')) * 0.5
    )));

    RETURN GREATEST(0, total_xp);
END;
$$ LANGUAGE plpgsql;

## Recent Updates

### Streak Calculation Improvements
- Updated streak calculation to use game sequence numbers instead of dates
- This change ensures streaks are maintained even when games are cancelled due to venue closures or holidays
- Implemented in the `update_player_streaks()` function which handles both regular and bench warmer streaks
- Streaks are now properly tracked across all tier types (Weekly, Bi-Weekly, Monthly)

## Next Steps

1. **XP Calculation Review**
   - Review and update the XP calculation function to use the new streak calculation logic
   - Ensure XP multipliers are correctly applied based on player tiers
   - Add comprehensive tests for XP calculations with different streak scenarios

2. **UI Updates**
   - Update the PlayerCard component to display both regular and bench warmer streaks
   - Add tooltips to explain streak calculation logic to players
   - Show visual indicators for streak progress

3. **Documentation**
   - Add API documentation for the updated streak calculation functions
   - Update the XP system explanation document with the new streak logic
   - Create example scenarios showing how streaks are maintained across game cancellations

4. **Testing**
   - Add test cases for streak calculations with various sequence number gaps
   - Verify streak calculations work correctly for all tier types
   - Test edge cases like long streaks and streaks across tier changes

## Streak System

### Streak Rules by Tier

Each tier has specific requirements to maintain a streak:

1. **Weekly Tier (1x multiplier)**
   - Must play at least once every 7 days
   - Example: Playing on consecutive Wednesdays maintains streak
   - A gap of 8 or more days breaks the streak

2. **Bi-Weekly Tier (2x multiplier)**
   - Must play at least once every 14 days
   - Example: Playing every other Wednesday maintains streak
   - A gap of 15 or more days breaks the streak

3. **Four-Weekly Tier (4x multiplier)**
   - Must play at least once every 28 days
   - Example: Playing Jan 1st → Jan 29th → Feb 26th maintains streak
   - A gap of 29 or more days breaks the streak

### Streak Bonuses

Streak bonuses are percentage-based and naturally scale with each tier's XP multiplier:

```
Weekly Tier Example (1x multiplier):
- Base XP: 20
- Streak bonus (10%): +2
- Total: 22 XP per game

Bi-Weekly Tier Example (2x multiplier):
- Base XP: 40 (20 × 2.0)
- Streak bonus (10%): +4
- Total: 44 XP per game

Four-Weekly Tier Example (4x multiplier):
- Base XP: 80 (20 × 4.0)
- Streak bonus (10%): +8
- Total: 88 XP per game
```

### Important Notes

1. **Streak Calculation**
   - Streaks are calculated based on the gap between consecutive games
   - The current game must be within the tier's required gap to count
   - Gaps are calculated using actual days, not calendar months

2. **Tier Changes**
   - When changing tiers, streak requirements immediately change to match the new tier
   - Example: Moving from Weekly to Four-weekly tier means you now have 28 days between games

3. **Edge Cases**
   - Playing multiple games within your tier's window counts as normal
   - Only the gap between games matters, not the specific day of the week
   - Streaks break immediately if you exceed your tier's maximum gap

## Streak Calculation

### Overview
Streaks are calculated differently based on a player's tier:

1. **Weekly Tier**
   - Streak counts consecutive games played (based on sequence numbers)
   - A gap of 1 between games maintains the streak (e.g., games 1->2->3)
   - A gap > 1 breaks the streak (e.g., games 1->3 would break it)
   - Streak is the count of games until a gap > 1 is found

2. **Monthly/Bi-weekly Tiers**
   - Each game that is exactly required_gap after ANY previous game increases the streak
   - In-between games don't increase the streak but can be used as base games for future streak games
   - Required gaps:
     - Bi-weekly: Every 2nd game (gap = 2)
     - Monthly: Every 4th game (gap = 4)

### Examples

1. **Weekly Player Example**
   ```
   Games: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
   Gaps:  1, 1, 1, 1, 1, 1, 1, 1, 1,  1,  1,  1,  1,  1
   Streak = 15 (counts until gap > 1)
   ```

2. **Monthly Player Example 1**
   ```
   Games: 1, 5, 6, 9, 10
   #1  -> Streak = 1 (first game)
   #5  -> Streak = 2 (good, exactly 4 after #1)
   #6  -> Streak = 2 (in-between game)
   #9  -> Streak = 3 (good, exactly 4 after #5)
   #10 -> Streak = 3 (in-between game)
   ```

3. **Monthly Player Example 2**
   ```
   Games: 1, 5, 6, 10
   #1  -> Streak = 1 (first game)
   #5  -> Streak = 2 (good, exactly 4 after #1)
   #6  -> Streak = 2 (in-between game)
   #10 -> Streak = 3 (good, exactly 4 after #6!)
   ```

4. **Bi-weekly Player Example 1**
   ```
   Games: 1, 3, 4, 5, 7
   #1  -> Streak = 1 (first game)
   #3  -> Streak = 2 (good, exactly 2 after #1)
   #4  -> Streak = 2 (in-between game)
   #5  -> Streak = 3 (good, exactly 2 after #3)
   #7  -> Streak = 4 (good, exactly 2 after #5)
   ```

5. **Bi-weekly Player Example 2**
   ```
   Games: 1, 2, 3, 6
   #1  -> Streak = 1 (first game)
   #2  -> Streak = 1 (in-between game)
   #3  -> Streak = 2 (good, exactly 2 after #1)
   #6  -> Streak = 0 (breaks streak, gap > 2)
   ```

6. **Bi-weekly Player Example 3**
   ```
   Games: 1, 2, 4, 5, 6, 8
   #1  -> Streak = 1 (first game)
   #2  -> Streak = 1 (in-between game)
   #4  -> Streak = 2 (good, exactly 2 after #2)
   #5  -> Streak = 2 (in-between game)
   #6  -> Streak = 3 (good, exactly 2 after #4)
   #8  -> Streak = 4 (good, exactly 2 after #6)
   ```

### Implementation Notes
- Streaks are updated via the `update_player_streaks()` trigger function
- Function uses sequence numbers to calculate gaps between games
- For Monthly/Bi-weekly tiers, any game can be used as a base for future streak games
- Separate calculations for regular streaks and bench warmer streaks

### Recent Updates
- Changed from date-based to sequence-based calculation
- Updated Monthly/Bi-weekly logic to allow in-between games as valid bases
- Added support for bench warmer streaks using same logic

## Frontend Integration

### Player Card Updates
The PlayerCard component needs to display the player's current tier and any relevant tier-specific information:

```typescript
interface PlayerTier {
    name: string;
    multiplier: number;
    requiredGap: number;
}

interface PlayerCardProps {
    // ... existing props
    currentTier: PlayerTier;
    nextEligibleGame?: number;
}

// Add to PlayerCard.tsx
const TierBadge: React.FC<{ tier: PlayerTier }> = ({ tier }) => (
    <div className="badge badge-secondary">
        <span>{tier.name}</span>
        <span className="text-xs ml-1">×{tier.multiplier}</span>
    </div>
);
```

### Profile Page Updates
The player profile page needs to show tier history and allow tier selection:

```typescript
interface TierHistoryEntry {
    id: string;
    tierName: string;
    startDate: Date;
    endDate?: Date;
    createdAt: Date;
}

// Add to PlayerProfile.tsx
const TierHistory: React.FC<{ history: TierHistoryEntry[] }> = ({ history }) => (
    <div className="card bg-base-200">
        <div className="card-body">
            <h3 className="card-title">Tier History</h3>
            <div className="space-y-2">
                {history.map(entry => (
                    <div key={entry.id} className="flex justify-between">
                        <span>{entry.tierName}</span>
                        <span>{entry.startDate}–{entry.endDate || 'present'}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
```

## Edge Cases & Solutions

### 1. Tier Switching
- Players can change tiers but must commit to minimum duration
- Historical XP remains unchanged
- New tier applies from next eligible game

### 2. Streak Calculation
- Streaks are calculated within designated tier windows. For weekly tiers, a gap of 1 game is required, while for bi-weekly and monthly tiers, the system enforces a gap of 2 and 4 games respectively (as defined by the 'required_gap' in the tiers table).
- Missing games outside the required gap for a given tier do not break the streak, allowing casual players to maintain their bonuses over a longer period.

### 3. Reserve XP
- Reserve XP multiplied by current tier multiplier
- Reserve appearances count regardless of tier

### 4. Transition Periods
- Clear next eligible game display
- Grace period for tier changes
- No retroactive XP adjustments

## Implementation Progress

1. ⏳ Schema design completed
2. ⏳ XP calculation function updated
3. ⏳ Frontend component updates pending
4. ⏳ Migration script pending
5. ⏳ Testing suite pending

## Next Steps

1. Create migration script for existing players
2. Update frontend components
3. Add tier selection UI
4. Implement tier change validation
5. Add tier-specific XP breakdown display

## Technical Considerations

1. **Performance**
   - Indexed tier lookups
   - Efficient period calculations
   - Cached tier status

2. **Data Integrity**
   - Atomic tier changes
   - Validated transitions
   - Historical preservation

3. **User Experience**
   - Clear tier status display
   - Intuitive selection process
   - Transparent XP calculations

## Migration Plan

1. Create new tables
2. Set default tiers
3. Backfill tier history
4. Update XP calculations
5. Deploy frontend changes

## Testing Strategy

1. Unit tests for XP calculation
2. Integration tests for tier changes
3. UI tests for tier selection
4. Migration dry-runs
5. Performance benchmarks

## Implementation Progress as of 2025-02-03

- Transitioned from game sequence numbers to date-based tier periods by adding `start_date` and `end_date` columns in the `player_tiers` table.
- Updated SQL functions, notably `calculate_player_xp_tiered_by_date`, to compute XP based on game dates instead of sequence numbers.
- Implemented logic to join games using date ranges and assigned a row number per tier period to determine eligibility using the formula `MOD(game_number - 1, required_gap) = 0`. For a 4-week schedule, this means a player receives XP on game #1, #5, #9, etc.
- Adjusted the `required_gap` logic so that with a gap of 4 the next eligible game after game #1 is game #5.
- Initial tests using player Mike M (UUID: 5c0e1219-9355-4078-b76d-a63ec320969c) are returning 0 XP, which suggests that further tuning or debugging of the weighting and game selection logic is needed.
- Next steps include further debugging to ensure that the weighted XP calculation works as intended, refining the weighting parameters, and integrating these changes into the frontend UI components.