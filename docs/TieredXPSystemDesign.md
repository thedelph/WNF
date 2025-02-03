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

### XP Calculation
The `calculate_player_xp_tiered_by_date` function implements the following logic:

1. **Base Game XP**: 20 points per eligible game
2. **Reserve Game XP**: 5 points per reserve game
3. **Tier Multipliers** (applies to both base and reserve XP):
   - Weekly (tier 1): 1.0x multiplier
   - Bi-weekly (tier 2): 2.0x multiplier
   - Four-weekly (tier 3): 4.0x multiplier
4. **Eligible Games**:
   - Games are numbered within each tier period
   - A game is eligible if: `MOD(game_number - 1, required_gap) = 0`
   - Example: For four-weekly tier (gap=4), eligible games are #1, #5, #9, etc.

### Example
A player in the four-weekly tier (4x multiplier):
- Selected Game #1: 20 * 4.0 = 80 XP (eligible)
- Selected Game #2: 0 XP (not eligible)
- Selected Game #3: 0 XP (not eligible)
- Selected Game #4: 0 XP (not eligible)
- Selected Game #5: 20 * 4.0 = 80 XP (eligible)
- Reserve games: 5 * 4.0 = 20 XP each

### Database Schema Updates
- Added `start_date` and `end_date` to `player_tiers` table
- Modified triggers to work with dates instead of game sequences
- Each tier defines its `required_gap` for eligible game calculation

### Migration Notes
- Successfully migrated Mike M. as test case from weekly to 4-weekly tier
- Tier change date: January 22, 2025
- First game under new tier earned 80 XP (20 base * 4.0 multiplier)

## XP Calculation Implementation

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

    RETURN GREATEST(0, total_xp);
END;
$$ LANGUAGE plpgsql;
```

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
- 5-game streak bonus (10%): +2
- Total: 22 XP per game

Bi-Weekly Tier Example (2x multiplier):
- Base XP: 40 (20 × 2.0)
- 5-game streak bonus (10%): +4
- Total: 44 XP per game

Four-Weekly Tier Example (4x multiplier):
- Base XP: 80 (20 × 4.0)
- 5-game streak bonus (10%): +8
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