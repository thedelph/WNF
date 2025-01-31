# Tiered XP System Design Document

## Overview
The tiered XP system allows players to choose their participation frequency (weekly/bi-weekly/monthly) while maintaining fair XP progression across all tiers. This document outlines the implementation plan and technical details.

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
    start_game_sequence INTEGER NOT NULL,
    end_game_sequence INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_sequence_range CHECK (
        end_game_sequence IS NULL OR 
        end_game_sequence > start_game_sequence
    )
);
```

### Players Table Modification

```sql
ALTER TABLE players 
ADD COLUMN current_tier_period_id UUID REFERENCES player_tiers(id);

CREATE INDEX idx_players_current_tier ON players(current_tier_period_id);
```

## XP Calculation Implementation

```sql
CREATE OR REPLACE FUNCTION calculate_player_xp(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_xp INTEGER := 0;
    current_game_sequence INTEGER;
BEGIN
    -- Get latest game sequence number
    SELECT MAX(sequence_number) INTO current_game_sequence FROM games;

    -- Calculate XP per tier period
    WITH tier_windows AS (
        SELECT 
            pt.tier_id,
            pt.start_game_sequence,
            COALESCE(pt.end_game_sequence, current_game_sequence) AS end_game_sequence,
            t.xp_multiplier,
            t.required_gap
        FROM player_tiers pt
        JOIN tiers t ON t.id = pt.tier_id
        WHERE pt.player_id = p_player_id
    ),
    eligible_games AS (
        SELECT 
            g.sequence_number,
            tw.xp_multiplier,
            (current_game_sequence - g.sequence_number) AS games_ago,
            ROW_NUMBER() OVER (
                PARTITION BY tw.tier_id 
                ORDER BY g.sequence_number DESC
            ) AS tier_game_num
        FROM game_registrations gr
        JOIN games g ON g.id = gr.game_id
        JOIN tier_windows tw ON g.sequence_number BETWEEN tw.start_game_sequence AND tw.end_game_sequence
        WHERE gr.player_id = p_player_id
          AND gr.status = 'selected'
          AND g.completed = true
    ),
    weighted_games AS (
        SELECT
            sequence_number,
            CASE
                WHEN games_ago = 0 THEN 20
                WHEN games_ago BETWEEN 1 AND 2 THEN 18
                WHEN games_ago BETWEEN 3 AND 4 THEN 16
                WHEN games_ago BETWEEN 5 AND 9 THEN 14
                WHEN games_ago BETWEEN 10 AND 19 THEN 12
                WHEN games_ago BETWEEN 20 AND 29 THEN 10
                WHEN games_ago BETWEEN 30 AND 39 THEN 5
                ELSE 0
            END * xp_multiplier AS weighted_xp
        FROM eligible_games
        -- Enforce tier cooldown requirement
        WHERE MOD(tier_game_num - 1, required_gap) = 0
    )
    SELECT SUM(weighted_xp) INTO total_xp FROM weighted_games;

    -- Add reserve XP with tier multiplier
    total_xp := total_xp + (
        SELECT COALESCE(SUM(xp_amount), 0)
        FROM reserve_xp_transactions
        WHERE player_id = p_player_id
    );

    RETURN GREATEST(0, total_xp);
END;
$$ LANGUAGE plpgsql;
```

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
    startSequence: number;
    endSequence?: number;
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
                        <span>Games {entry.startSequence}–{entry.endSequence || 'present'}</span>
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
- Streaks are calculated within tier windows
- Missing games outside required gap don't break streak
- Streak multiplier applies to tier-specific XP

### 3. Reserve XP
- Reserve XP multiplied by current tier multiplier
- Reserve appearances count regardless of tier

### 4. Transition Periods
- Clear next eligible game display
- Grace period for tier changes
- No retroactive XP adjustments

## Implementation Progress

1. ✅ Schema design completed
2. ✅ XP calculation function updated
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