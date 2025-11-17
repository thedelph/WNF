# GK Rating Feature

**Implemented:** 2025-10-08
**Team Balancing Integration:** 2025-10-13
**Fixes Applied:** 2025-10-15
**Last Updated:** 2025-11-17

## Overview

The GK (Goalkeeper) Rating is the fourth core rating metric in WNF, measuring goalkeeper-specific abilities on a 0-10 scale (displayed as 0-5 stars).

---

## 📊 What GK Rating Measures

- **Shot-stopping** - Reflexes and save ability
- **Positioning** - Positioning and angle management
- **Distribution** - Passing and kick accuracy
- **Command of Area** - Presence and communication
- **1v1 Ability** - One-on-one situations

---

## 🗄️ Database Schema

### `player_ratings` Table
```sql
gk_rating DECIMAL(3,2)  -- Individual rating submission (0-10)
```

### `players` Table
```sql
gk DECIMAL(3,2)                  -- Manual/default GK rating
average_gk_rating DECIMAL(3,2)   -- Calculated average from player_ratings
```

### Trigger Function

The `update_player_average_ratings()` trigger automatically recalculates GK averages:

```sql
CREATE OR REPLACE FUNCTION update_player_average_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE players
  SET
    average_gk_rating = (
      SELECT AVG(gk_rating)
      FROM player_ratings
      WHERE rated_player_id = NEW.rated_player_id
        AND gk_rating IS NOT NULL
    ),
    -- ... other ratings
  WHERE id = NEW.rated_player_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Key Points:**
- Excludes NULL values from average
- Maintains decimal precision
- Fires on INSERT, UPDATE, and DELETE

---

## 🎯 Team Balancing Integration (2025-10-13)

### Weight Restructuring

**Before GK Rating:**
```typescript
// 3 core skills @ 20% each = 60%
const coreSkills = (attack + defense + gameIq) / 3;
```

**After GK Rating:**
```typescript
// 4 core skills @ 15% each = 60%
const coreSkills = (attack + defense + gameIq + gk) / 4;
```

### Current Weighting Formula

**Total Rating = 60% Core Skills + 20% Attributes + 20% Performance**

**Core Skills (60% total):**
- Attack: 15%
- Defense: 15%
- Game IQ: 15%
- GK: 15%

**Playstyle Attributes (20% total):**
- Pace, Shooting, Passing, Dribbling, Defending, Physical (z-score scaled)

**Performance (20% total):**
- Win Rate: 10%
- Goal Differential: 10%

### Rationale

Changed from 3 to 4 core skills to account for **rotating goalkeeper scenarios** in 9v9 games:
- Players rotate GK position throughout game
- GK ability important even if not "permanent" goalkeeper
- Balanced weighting ensures all skills valued equally

---

## 🥅 Permanent Goalkeeper Feature (2025-10-13)

### Overview

Allows admins to designate injured players (e.g., broken finger) as permanent goalkeepers who stay in net the full game.

### Permanent GK Rating Formula

```typescript
function calculatePermanentGKRating(player: Player): number {
  return (
    player.gk * 0.7 +              // 70% - GK ability (primary factor)
    player.game_iq * 0.2 +         // 20% - Positioning/awareness
    player.performanceScore * 0.1  // 10% - Win rate/goal diff
  );
}
```

### Phase 0 Assignment (Pre-Balancing)

```typescript
function assignPermanentGoalkeepers(
  players: Player[],
  permanentGKIds: string[]
): TeamAssignment[] {
  const permanentGKs = players
    .filter(p => permanentGKIds.includes(p.id))
    .sort((a, b) => calculatePermanentGKRating(b) - calculatePermanentGKRating(a));

  const assignments: TeamAssignment[] = [];
  let currentTeam: Team = 'blue';

  // Distribute evenly (alternating Blue → Orange → Blue → Orange)
  permanentGKs.forEach(gk => {
    assignments.push({
      player: gk,
      team: currentTeam,
      isPermanentGK: true
    });
    currentTeam = currentTeam === 'blue' ? 'orange' : 'blue';
  });

  return assignments;
}
```

**Distribution Logic:**
1. Sort permanent GKs by permanent GK rating (highest first)
2. Assign highest rated GK to Blue
3. Assign next to Orange
4. Continue alternating

**Example:**
- 3 permanent GKs: Chris H (8.5), Tom K (7.2), Mike M (6.8)
- Blue gets: Chris H (8.5), Mike M (6.8)
- Orange gets: Tom K (7.2)

### Optimization Constraints

Permanent GKs are **excluded from all optimization swaps**:

```typescript
function isSwapAcceptable(swap: Swap): boolean {
  // Check 1: Same-tier swap function
  if (swap.player1.isPermanentGK || swap.player2.isPermanentGK) {
    return false;
  }

  // Check 2: Cross-tier swap function
  if (swap.player1.isPermanentGK || swap.player2.isPermanentGK) {
    return false;
  }

  // Check 3: All optimization passes
  if (swap.player1.isPermanentGK || swap.player2.isPermanentGK) {
    return false;
  }

  // ... other checks
  return true;
}
```

Constraints applied in 3 locations:
1. Same-tier swaps
2. Cross-tier swaps
3. Multi-pass optimization

---

## 🛠️ Team Stats Calculation Fix (2025-10-15)

**Problem:** Team stats weren't accounting for permanent GKs correctly.

**Solution:** Different calculation logic for teams with permanent GKs:

```typescript
function calculateTeamStats(
  team: Team,
  permanentGKIds: string[]
): TeamStats {
  const permanentGK = team.players.find(p => permanentGKIds.includes(p.id));

  return {
    // GK Rating: Use permanent GK's rating (not team average)
    gk: permanentGK
      ? permanentGK.gk
      : average(team.players.map(p => p.gk)),

    // Attack/Defense: EXCLUDE permanent GK (they don't play outfield)
    attack: average(
      team.players
        .filter(p => !permanentGKIds.includes(p.id))
        .map(p => p.attack)
    ),
    defense: average(
      team.players
        .filter(p => !permanentGKIds.includes(p.id))
        .map(p => p.defense)
    ),

    // Game IQ: INCLUDE permanent GK (positioning/awareness still valuable)
    gameIq: average(team.players.map(p => p.game_iq)),

    // Performance metrics unchanged
    winRate: average(team.players.map(p => p.win_rate)),
    goalDifferential: average(team.players.map(p => p.goal_differential))
  };
}
```

Also applied to:
- `calculateTeamComparison()` - Team comparison metrics
- `calculateMetricImpact()` - Swap impact analysis

---

## 💾 Database

### `permanent_goalkeepers` Table

```sql
CREATE TABLE permanent_goalkeepers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);
```

### RLS Policies

```sql
-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read permanent goalkeepers"
ON permanent_goalkeepers FOR SELECT
TO authenticated
USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "Allow admins to manage permanent goalkeepers"
ON permanent_goalkeepers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles WHERE player_id = auth.uid()
  )
);
```

**Note:** Page is already admin-protected, so RLS allows all authenticated users.

---

## 🎨 UI Components

### TeamBalancingOverview.tsx

**Permanent GK Selection:**
- Collapsible section with checkbox grid
- Shows all available players
- Selected players highlighted
- Auto-save with toast notifications (300ms debounce)
- Selections persist across page refreshes

```typescript
<div className="collapse collapse-arrow">
  <input type="checkbox" />
  <div className="collapse-title">
    <h3>🥅 Permanent Goalkeepers</h3>
    <p>Select players who will stay in goal (e.g., injured players)</p>
  </div>
  <div className="collapse-content">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {players.map(player => (
        <label key={player.id}>
          <input
            type="checkbox"
            checked={permanentGKIds.includes(player.id)}
            onChange={() => togglePermanentGK(player.id)}
          />
          {player.friendly_name}
        </label>
      ))}
    </div>
  </div>
</div>
```

### TeamStats.tsx

**GK Metrics Display:**
- Shows GK rating alongside other core skills
- 6-metric breakdown: Attack, Defense, Game IQ, GK, Win Rate, Goal Diff
- Visual indicators for permanent GKs

### TeamList.tsx

**Player Cards:**
- Shows GK rating for each player
- Permanent GK badge: 🥅

```typescript
<div className="player-card">
  <div>{player.friendly_name}</div>
  <div>GK: {formatRating(player.gk)}</div>
  {isPermanentGK && <span className="badge">🥅 Permanent GK</span>}
</div>
```

### FinalTeamComposition.tsx

**Player Cards:**
- GK rating displayed alongside other ratings
- Permanent GK indicator

### WhatsApp Export Fix (2025-10-15)

**Shows 🧤 emoji next to permanent GK names:**

```typescript
function generateWhatsAppMessage(team: Team, permanentGKIds: string[]): string {
  return team.players.map(player => {
    const name = player.friendly_name;
    const isPermanentGK = permanentGKIds.includes(player.id);

    return isPermanentGK ? `🧤 ${name}` : name;
  }).join('\n');
}
```

**Uses correct stats (excludes permanent GK from Attack/Defense averages):**

```typescript
const stats = calculateTeamStats(team, permanentGKIds);

// Attack/Defense averages exclude permanent GK
// GK rating uses permanent GK's actual rating
```

---

## 🎭 Debug Logging

### Phase 0 Section

Debug log shows permanent GK distribution:

```
=== PHASE 0: PERMANENT GOALKEEPER DISTRIBUTION ===
Permanent GKs: 2
- Chris H (8.5) → Blue
- Tom K (7.2) → Orange

Remaining players for balancing: 16
```

---

## 🖥️ Code Patterns

### Null-Safe Rating Handling

```typescript
// ✅ CORRECT
const gk = player.gk ?? 0;
const avgGK = player.average_gk_rating ?? 0;

// ❌ WRONG
const gk = player.gk || 0;  // Fails for gk = 0 (valid rating!)
```

### Column Naming

```typescript
// ❌ WRONG - Will cause "column not found" error
await supabase
  .from('players')
  .update({ gk_rating: value });  // Wrong column name!

// ✅ CORRECT - Proper column name
await supabase
  .from('players')
  .update({ gk: value });  // Correct for players table
```

**Remember:**
- `players` table: `gk` (manual rating), `average_gk_rating` (calculated average)
- `player_ratings` table: `gk_rating` (individual submission)

---

## 🔗 Related Documentation

- [Team Balancing Evolution](../algorithms/TeamBalancingEvolution.md) - Algorithm history
- [Core Development Patterns](../systems/CoreDevelopmentPatterns.md) - Rating patterns
- [Ratings System Guide](../RatingsSystemGuide.md) - All rating systems
- [Database Patterns](../systems/DatabasePatterns.md) - Trigger functions

---

## ✅ GK Rating Checklist

When working with GK ratings:

- [ ] Used null-safe operators (`??`, `?.`)
- [ ] Correct column names (`gk` vs `gk_rating`)
- [ ] Used `formatRating()` utility for display
- [ ] Included GK in all four core metrics
- [ ] Permanent GKs excluded from optimization (if applicable)
- [ ] Team stats calculated correctly (permanent GK logic)
- [ ] UI shows GK rating alongside Attack/Defense/Game IQ
- [ ] Debug logging shows GK metrics
