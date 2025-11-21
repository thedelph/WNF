# Position Preferences Rating System

**Implemented:** 2025-11-12
**Upgraded to Ranked System:** 2025-11-13
**GK Removed:** 2025-11-21
**Last Updated:** 2025-11-21

## Overview

The Position Preferences system allows players to rate each other's best **outfield** positions using a **ranked points system**. Players rank their top 3 positions for each teammate (🥇 Gold, 🥈 Silver, 🥉 Bronze), creating a weighted consensus of where players excel.

**Note:** GK is not included as a position preference due to the rotating goalkeeper system. Everyone takes turns in goal regardless of preference or ability. However, GK ratings (0-10) remain as one of the four core skill metrics (Attack/Defense/Game IQ/GK).

---

## 🏅 Ranked Points System

### How It Works

Players rank **up to 3 positions** in order of excellence:

- **1st Choice (🥇 Gold)** = 3 points
- **2nd Choice (🥈 Silver)** = 2 points
- **3rd Choice (🥉 Bronze)** = 1 point

**Maximum points per rater:** 6 (3 + 2 + 1 if all three ranks filled)

### Percentage Calculation

```typescript
const percentage = (totalPoints / (totalRaters × 6)) × 100;
```

**Example:**
- Player rated by 5 people
- Position: CM
- Rank distribution: 3× Gold (9pts), 1× Silver (2pts), 1× Bronze (1pt)
- Total points: 12
- Percentage: (12 / (5 × 6)) × 100 = **40%**

###Benefits

1. **Forces Critical Thinking** - Must choose top 3, not spam all positions
2. **Naturally Limited** - Can't rate someone excellent everywhere
3. **Weighted Consensus** - Shows strength of preference (Gold > Silver > Bronze)
4. **Fair Representation** - 40% from mostly Gold votes is more meaningful than 40% from all Bronze

---

## 📐 11 Outfield Positions

### Position List

Changed from old LM/RM/WB to more tactically accurate positions:

**Defense:**
- LB - Left Back
- CB - Center Back
- RB - Right Back
- LWB - Left Wing Back *(new - split from WB)*
- RWB - Right Wing Back *(new - split from WB)*

**Midfield:**
- LW - Left Winger *(changed from LM)*
- CM - Central Midfielder
- RW - Right Winger *(changed from RM)*
- CAM - Central Attacking Midfielder
- CDM - Central Defensive Midfielder

**Attack:**
- ST - Striker

### Position Categories (for Team Balancing)

```typescript
export const POSITION_CATEGORIES = {
  DEFENSE: ['LB', 'CB', 'RB', 'LWB', 'RWB'],
  MIDFIELD: ['CM', 'CAM', 'CDM'],
  ATTACK: ['LW', 'RW', 'ST']
};
```

**Rationale for Changes:**
- **LM/RM → LW/RW:** Better reflects wide attacking roles in 9v9
- **WB → LWB/RWB:** Side-specific tactical accuracy matters
- **GK removed:** Rotating goalkeeper system means everyone plays in goal

---

## 🗄️ Database Schema

### `player_position_ratings` Table

```sql
CREATE TABLE player_position_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID REFERENCES players(id),
  rated_player_id UUID REFERENCES players(id),
  position TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rater_id, rated_player_id, rank)  -- One rank per rater per position
);
```

**Key Points:**
- `rank` constrained to 1, 2, or 3 (Gold/Silver/Bronze)
- Unique constraint ensures each rater can only give one rating of each rank to a player

### `player_position_consensus` Table

```sql
CREATE TABLE player_position_consensus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  position TEXT NOT NULL,
  total_raters INTEGER NOT NULL,
  points INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  rank_1_count INTEGER DEFAULT 0,  -- Gold count
  rank_2_count INTEGER DEFAULT 0,  -- Silver count
  rank_3_count INTEGER DEFAULT 0,  -- Bronze count
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, position)
);
```

### Trigger Function

Automatically aggregates position ratings:

```sql
CREATE OR REPLACE FUNCTION update_position_consensus()
RETURNS TRIGGER AS $$
DECLARE
  v_position TEXT;
  v_total_raters INTEGER;
  v_total_points INTEGER;
  v_rank1_count INTEGER;
  v_rank2_count INTEGER;
  v_rank3_count INTEGER;
  v_percentage NUMERIC;
BEGIN
  -- Get all unique positions rated for this player
  FOR v_position IN (
    SELECT DISTINCT position
    FROM player_position_ratings
    WHERE rated_player_id = COALESCE(NEW.rated_player_id, OLD.rated_player_id)
  ) LOOP
    -- Count raters and calculate points
    SELECT
      COUNT(DISTINCT rater_id),
      SUM(CASE rank WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 END),
      COUNT(*) FILTER (WHERE rank = 1),
      COUNT(*) FILTER (WHERE rank = 2),
      COUNT(*) FILTER (WHERE rank = 3)
    INTO
      v_total_raters,
      v_total_points,
      v_rank1_count,
      v_rank2_count,
      v_rank3_count
    FROM player_position_ratings
    WHERE rated_player_id = COALESCE(NEW.rated_player_id, OLD.rated_player_id)
      AND position = v_position;

    -- Calculate percentage (max 6 points per rater)
    v_percentage = (v_total_points::NUMERIC / (v_total_raters * 6)) * 100;

    -- Upsert consensus
    INSERT INTO player_position_consensus (
      player_id, position, total_raters, points, percentage,
      rank_1_count, rank_2_count, rank_3_count
    ) VALUES (
      COALESCE(NEW.rated_player_id, OLD.rated_player_id),
      v_position, v_total_raters, v_total_points, v_percentage,
      v_rank1_count, v_rank2_count, v_rank3_count
    )
    ON CONFLICT (player_id, position)
    DO UPDATE SET
      total_raters = EXCLUDED.total_raters,
      points = EXCLUDED.points,
      percentage = EXCLUDED.percentage,
      rank_1_count = EXCLUDED.rank_1_count,
      rank_2_count = EXCLUDED.rank_2_count,
      rank_3_count = EXCLUDED.rank_3_count,
      updated_at = NOW();
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_position_consensus_trigger
AFTER INSERT OR UPDATE OR DELETE ON player_position_ratings
FOR EACH ROW
EXECUTE FUNCTION update_position_consensus();
```

---

## 🎨 UI Components

### PositionSelector.tsx (`src/components/ratings/PositionSelector.tsx`)

**Features:**
- Three dropdown selectors (1st/2nd/3rd choice)
- Gold/Silver/Bronze badge styling
- Duplicate prevention (can't select same position twice)
- Grouped by category (Goalkeeper/Defense/Midfield/Attack)
- Clear all button

```typescript
<div className="position-selector">
  <h3>Position Preferences</h3>
  <p>Select up to 3 positions where this player excels (in order)</p>

  {/* 1st Choice - Gold */}
  <div className="rank-selector">
    <span className="badge badge-warning">🥇 Gold (3pts)</span>
    <select value={position1st} onChange={(e) => setPosition1st(e.target.value)}>
      <option value="">Select 1st choice...</option>
      <optgroup label="Goalkeeper">
        <option value="GK">GK - Goalkeeper</option>
      </optgroup>
      <optgroup label="Defense">
        <option value="LB">LB - Left Back</option>
        {/* ... */}
      </optgroup>
      {/* ... */}
    </select>
  </div>

  {/* 2nd Choice - Silver */}
  <div className="rank-selector">
    <span className="badge badge-neutral">🥈 Silver (2pts)</span>
    <select value={position2nd} onChange={(e) => setPosition2nd(e.target.value)}>
      {/* ... */}
    </select>
  </div>

  {/* 3rd Choice - Bronze */}
  <div className="rank-selector">
    <span className="badge badge-error">🥉 Bronze (1pt)</span>
    <select value={position3rd} onChange={(e) => setPosition3rd(e.target.value)}>
      {/* ... */}
    </select>
  </div>

  <button onClick={clearAll}>Clear All</button>
</div>
```

**Badge Colors:**
- Gold: `#FCD34D` (yellow/gold)
- Silver: `#9CA3AF` (gray)
- Bronze: `#EA580C` (orange/copper)

### User-Facing Display (Ratings.tsx)

Shows "You rated as:" with ranked badges:

```typescript
<div className="your-rating">
  <p>You rated {player.friendly_name} as:</p>
  <div className="positions">
    {position1st && (
      <span className="badge badge-warning">
        🥇 {position1st}
      </span>
    )}
    {position2nd && (
      <span className="badge badge-neutral">
        🥈 {position2nd}
      </span>
    )}
    {position3rd && (
      <span className="badge badge-error">
        🥉 {position3rd}
      </span>
    )}
  </div>
</div>
```

### Admin Display

Shows consensus-based aggregation with **5-rater minimum threshold**:

```typescript
<div className="position-consensus">
  {player.position_consensus
    ?.filter(pos => pos.total_raters >= 5)
    .filter(pos => pos.percentage >= 25)  // Show if ≥25%
    .map(pos => (
      <div key={pos.position} className="consensus-badge">
        <span>{pos.position}</span>
        <span>{pos.percentage.toFixed(0)}%</span>
        <span className="tooltip">
          {pos.rank_1_count}× 🥇, {pos.rank_2_count}× 🥈, {pos.rank_3_count}× 🥉
          ({pos.total_raters} raters, {pos.points}pts)
        </span>
      </div>
    ))}
</div>
```

---

## 🎯 Team Balancing Integration

### Hard Constraint

**Maximum position category gap: 3 players**

```typescript
const MAX_POSITION_GAP = 3;

function evaluateSwapPositionImpact(swap: Swap): boolean {
  const newAssignments = applySwap(currentAssignments, swap);

  const bluePositions = countPositionsByCategory(newAssignments.blue);
  const orangePositions = countPositionsByCategory(newAssignments.orange);

  for (const category of Object.keys(POSITION_CATEGORIES)) {
    const gap = Math.abs(bluePositions[category] - orangePositions[category]);

    if (gap >= MAX_POSITION_GAP) {
      debugLog(`❌ Position imbalance: ${category} gap would be ${gap}`);
      return false;
    }
  }

  return true;
}
```

### Integration in Swap Logic

Checked in `isSwapAcceptable()` function:

```typescript
function isSwapAcceptable(swap: Swap): boolean {
  // ... existing checks (tier distribution, attribute balance, etc.)

  // Position balance check (HARD CONSTRAINT)
  if (!evaluateSwapPositionImpact(swap)) {
    return false;
  }

  return true;
}
```

**Prevents swaps that create position imbalance** even if they improve overall rating balance.

**Example:**
- Blue has 8 midfielders, Orange has 4
- Swap would make it 9 vs 3 (gap of 6) → **REJECTED**
- Even if swap improves Attack/Defense balance

---

## 📋 Migrations

### Migration History

1. **`20251112_add_position_ratings.sql`**
   - Initial schema (GK, LB, CB, RB, LM, RM, WB, CM, CAM, CDM, ST)

2. **`20251112_change_positions_lm_rm_to_lw_rw_v3.sql`**
   - Changed LM/RM → LW/RW

3. **`20251112_split_wb_into_lwb_rwb.sql`**
   - Split WB → LWB/RWB

4. **`20251112_ranked_position_system.sql`**
   - Upgraded to ranked system (Gold/Silver/Bronze)
   - **Cleared all existing position data** (fresh start)

5. **`20251121_remove_gk_from_position_preferences.sql`**
   - Removed GK from position preferences system
   - Deleted 6 GK rating entries and 4 GK consensus entries
   - Promoted ranks where needed (e.g., GK 1st + CM 2nd → CM 1st)
   - Updated CHECK constraints to exclude GK from valid positions
   - **GK rating metric (0-10) remains unchanged**

---

## 📊 Consensus Thresholds

### Display Rules

**Primary Positions (≥50%):**
- Shown prominently in player cards
- Used for team balancing filters
- Blue badge styling

**Secondary Positions (25-49%):**
- Shown in detailed views
- Yellow badge styling
- Helpful context

**Tertiary Positions (<25%):**
- Generally hidden (not enough consensus)
- Available in admin/debug views

**Minimum Raters:**
- **5 raters required** for position to be considered valid
- Prevents single-rater bias

---

## 🔗 Related Documentation

- [Admin Ratings Integration](AdminRatingsIntegration.md) - Position features in admin interface
- [Position Heatmap](../components/PositionHeatmap.md) - League-wide position visualization
- [Team Balancing Evolution](../algorithms/TeamBalancingEvolution.md) - Position balance constraints
- [Ratings System Guide](../RatingsSystemGuide.md) - All rating systems
- [Position Balancing Integration](../PositionBalancingIntegration.md) - Technical integration details

---

## ✅ Position Rating Checklist

When working with position ratings:

- [ ] Used centralized position constants (`POSITIONS`, `POSITION_CATEGORIES`)
- [ ] Implemented ranked system (Gold/Silver/Bronze badges)
- [ ] Duplicate prevention (can't select same position twice)
- [ ] Grouped selectors by category for better UX (Defense/Midfield/Attack)
- [ ] Consensus requires ≥5 raters
- [ ] Position balance constraints enforced in team balancing
- [ ] Proper badge colors (Gold #FCD34D, Silver #9CA3AF, Bronze #EA580C)
- [ ] Tooltips show rank breakdown (e.g., "3× 🥇, 2× 🥈, 1× 🥉")
- [ ] GK NOT included in position preferences (rotating keeper system)
- [ ] GK rating metric (0-10) still included in core skills
