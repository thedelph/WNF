# Database Patterns & Conventions

**Last Updated:** 2026-02-12

This document outlines database architecture patterns, naming conventions, and best practices used in the WNF project.

---

## 📊 Table Naming Conventions

### Core Tables

**Player Data:**
- `players` - Main player records
- `player_ratings` - Individual rating submissions
- `player_ratings_history` - Rating change audit log
- `player_rating_audit` - Detailed rating audit (debugging)
- `player_derived_attributes` - Playstyle-derived attributes
- `player_position_ratings` - Individual position ratings (ranked 1/2/3)
- `player_position_consensus` - Aggregated position consensus

**Game Management:**
- `games` - Game records
- `game_registrations` - Player registration for games
- `permanent_goalkeepers` - Per-game permanent GK selections

**Token System:**
- `priority_tokens` - Active priority tokens
- `shield_tokens` - Shield token inventory

**Admin & Configuration:**
- `admin_roles` - Admin user permissions
- `roles` - Role definitions
- `role_permissions` - Role-permission mappings
- `feature_flags` - Feature flag configuration
- `feature_flag_audit` - Feature flag change audit

**System Data:**
- `playstyles` - Playstyle definitions
- `streaks` - Player streak tracking

---

## 🔤 Column Naming Patterns

### Rating Columns

**Critical: Different tables use different naming!**

**`players` table** (manual ratings + averages):
```sql
-- Manual/default ratings (single value, editable)
attack           -- NOT attack_rating
defense          -- NOT defense_rating
game_iq          -- NOT game_iq_rating
gk               -- NOT gk_rating

-- Calculated averages (computed from player_ratings)
average_attack_rating
average_defense_rating
average_game_iq_rating
average_gk_rating
```

**`player_ratings` table** (individual submissions):
```sql
-- Individual ratings from raters
attack_rating    -- NOT attack
defense_rating   -- NOT defense
game_iq_rating   -- NOT game_iq
gk_rating        -- NOT gk
```

### Timestamp Columns

Standard timestamp pattern:
```sql
created_at    -- When record was created (auto-populated)
updated_at    -- When record was last modified (auto-populated via trigger)
```

### Foreign Key Naming

```sql
player_id        -- References players(id)
game_id          -- References games(id)
rater_id         -- References players(id) for rating submissions
rated_player_id  -- References players(id) for who was rated
role_id          -- References roles(id)
```

---

## 🔐 Row Level Security (RLS) Patterns

### Standard RLS Policy Structure

All tables with user-accessible data should have RLS enabled:

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Standard patterns:

-- 1. Public read (authenticated users)
CREATE POLICY "Allow authenticated users to read"
ON table_name FOR SELECT
TO authenticated
USING (true);

-- 2. Admin-only modification
CREATE POLICY "Allow admins to modify"
ON table_name FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.player_id = auth.uid()
  )
);

-- 3. User owns record
CREATE POLICY "Users can modify their own records"
ON table_name FOR UPDATE
TO authenticated
USING (player_id = auth.uid())
WITH CHECK (player_id = auth.uid());
```

### Trigger-Specific RLS

For tables that need trigger INSERT access:

```sql
CREATE POLICY "Allow trigger to insert history"
ON player_ratings_history FOR INSERT
TO authenticated
WITH CHECK (true);  -- Triggers run as authenticated context
```

### Bypass Permission Pattern

RPC functions can bypass RLS for trusted operations:

```sql
CREATE OR REPLACE FUNCTION update_game_registration(
  p_registration_id uuid,
  p_updates jsonb,
  p_bypass_permission boolean DEFAULT false
)
RETURNS void
SECURITY DEFINER  -- Function runs as owner (has full permissions)
AS $$
BEGIN
  -- Check permissions unless bypass flag is set
  IF NOT p_bypass_permission THEN
    -- Verify user is admin
    IF NOT EXISTS (
      SELECT 1 FROM admin_roles WHERE player_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  END IF;

  -- Perform update
  UPDATE game_registrations
  SET ...
  WHERE id = p_registration_id;
END;
$$ LANGUAGE plpgsql;
```

**⚠️ Security Warning:** Always validate `p_bypass_permission` is only used by:
- Database triggers
- Automated system processes
- Server-side functions

Never expose bypass to client-side code!

---

## ⚡ Trigger Functions

### Auto-Update Timestamp Trigger

Standard pattern for `updated_at` columns:

```sql
-- Create reusable function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to table
CREATE TRIGGER update_table_name_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Rating Average Calculation Trigger

Automatically recalculate player rating averages:

```sql
CREATE OR REPLACE FUNCTION update_player_average_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE players
  SET
    average_attack_rating = (
      SELECT AVG(attack_rating)
      FROM player_ratings
      WHERE rated_player_id = NEW.rated_player_id
        AND attack_rating IS NOT NULL
    ),
    average_defense_rating = (
      SELECT AVG(defense_rating)
      FROM player_ratings
      WHERE rated_player_id = NEW.rated_player_id
        AND defense_rating IS NOT NULL
    ),
    average_game_iq_rating = (
      SELECT AVG(game_iq_rating)
      FROM player_ratings
      WHERE rated_player_id = NEW.rated_player_id
        AND game_iq_rating IS NOT NULL
    ),
    average_gk_rating = (
      SELECT AVG(gk_rating)
      FROM player_ratings
      WHERE rated_player_id = NEW.rated_player_id
        AND gk_rating IS NOT NULL
    )
  WHERE id = NEW.rated_player_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_ratings_trigger
AFTER INSERT OR UPDATE OR DELETE ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION update_player_average_ratings();
```

**Key Points:**
- Handles NULL values correctly (excludes from average)
- Maintains decimal precision (uses AVG, not rounding)
- Fires on INSERT, UPDATE, and DELETE

### Audit Logging Trigger

Automatically log changes to rating history:

```sql
CREATE OR REPLACE FUNCTION log_rating_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO player_ratings_history (
      rating_id, rater_id, rated_player_id,
      attack_rating, defense_rating, game_iq_rating, gk_rating,
      position_1st, position_2nd, position_3rd,
      operation, changed_at
    ) VALUES (
      NEW.id, NEW.rater_id, NEW.rated_player_id,
      NEW.attack_rating, NEW.defense_rating, NEW.game_iq_rating, NEW.gk_rating,
      NEW.position_1st, NEW.position_2nd, NEW.position_3rd,
      'INSERT', NOW()
    );
    RETURN NEW;

  -- On UPDATE
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO player_ratings_history (
      rating_id, rater_id, rated_player_id,
      previous_attack_rating, previous_defense_rating,
      previous_game_iq_rating, previous_gk_rating,
      attack_rating, defense_rating, game_iq_rating, gk_rating,
      previous_position_1st, previous_position_2nd, previous_position_3rd,
      position_1st, position_2nd, position_3rd,
      operation, changed_at
    ) VALUES (
      NEW.id, NEW.rater_id, NEW.rated_player_id,
      OLD.attack_rating, OLD.defense_rating,
      OLD.game_iq_rating, OLD.gk_rating,
      NEW.attack_rating, NEW.defense_rating,
      NEW.game_iq_rating, NEW.gk_rating,
      OLD.position_1st, OLD.position_2nd, OLD.position_3rd,
      NEW.position_1st, NEW.position_2nd, NEW.position_3rd,
      'UPDATE', NOW()
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_rating_changes_trigger
AFTER INSERT OR UPDATE ON player_ratings
FOR EACH ROW
EXECUTE FUNCTION log_rating_changes();
```

### Position Consensus Calculation Trigger

Automatically aggregate position ratings:

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

## 🔧 RPC Function Patterns

### Query Helper Functions

Return structured data efficiently:

```sql
CREATE OR REPLACE FUNCTION get_eligible_token_holders_not_in_game(
  p_game_id UUID
)
RETURNS TABLE(
  player_id UUID,
  friendly_name TEXT,
  xp INTEGER,
  token_id UUID
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.friendly_name,
    p.xp,
    pt.id as token_id
  FROM players p
  INNER JOIN priority_tokens pt ON pt.player_id = p.id
  WHERE pt.used = FALSE
    AND pt.game_awarded IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM game_registrations gr
      WHERE gr.game_id = p_game_id
        AND gr.player_id = p.id
    )
    AND check_token_eligibility(p.id, p_game_id) = TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Permission-Aware RPC Functions

```sql
CREATE OR REPLACE FUNCTION update_game_registration(
  p_registration_id UUID,
  p_updates JSONB,
  p_bypass_permission BOOLEAN DEFAULT FALSE
)
RETURNS VOID
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check permissions unless bypassed
  IF NOT p_bypass_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM admin_roles WHERE player_id = auth.uid()
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
  END IF;

  -- Perform update using JSONB
  UPDATE game_registrations
  SET
    status = COALESCE((p_updates->>'status')::text, status),
    notes = COALESCE((p_updates->>'notes')::text, notes),
    updated_at = NOW()
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found: %', p_registration_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Index Strategy

### Essential Indexes

```sql
-- Foreign keys (critical for joins)
CREATE INDEX idx_game_registrations_game_id ON game_registrations(game_id);
CREATE INDEX idx_game_registrations_player_id ON game_registrations(player_id);
CREATE INDEX idx_player_ratings_rater_id ON player_ratings(rater_id);
CREATE INDEX idx_player_ratings_rated_player_id ON player_ratings(rated_player_id);

-- Composite indexes for common queries
CREATE INDEX idx_game_registrations_game_status ON game_registrations(game_id, status);
CREATE INDEX idx_player_position_ratings_player_pos ON player_position_ratings(rated_player_id, position);

-- Partial indexes for filtered queries
CREATE INDEX idx_priority_tokens_unused ON priority_tokens(player_id)
WHERE used = FALSE;

CREATE INDEX idx_games_active ON games(id, date)
WHERE status IN ('registration_open', 'registration_closed', 'players_announced');
```

---

## 🔍 Query Optimization Patterns

### Avoid Query Limit Issues

Supabase has a **1000 row limit** on queries. For large datasets:

**Pattern 1: Batch Fetching**
```typescript
// Split into batches of 10 games
const batches = chunkArray(gameIds, 10);
const results = await Promise.all(
  batches.map(batch =>
    supabase
      .from('game_registrations')
      .select('*')
      .in('game_id', batch)
  )
);
```

**Pattern 2: Sequential Filtering**
```typescript
// First, get last 40 game IDs
const { data: games } = await supabase
  .from('games')
  .select('id')
  .order('date', { ascending: false })
  .limit(40);

// Then fetch registrations for only those games
const gameIds = games.map(g => g.id);
const { data: registrations } = await supabase
  .from('game_registrations')
  .select('*')
  .in('game_id', gameIds);  // Much fewer rows!
```

### Efficient Counting

```sql
-- ❌ SLOW - Fetches all rows then counts in JS
const { data } = await supabase.from('players').select('*');
const count = data.length;

-- ✅ FAST - Database count
const { count } = await supabase
  .from('players')
  .select('*', { count: 'exact', head: true });
```

---

## 🛠️ Migration Best Practices

### Migration File Naming

```
YYYYMMDD_descriptive_name.sql

Examples:
20251112_add_position_ratings.sql
20251112_change_positions_lm_rm_to_lw_rw_v3.sql
20251024_fix_token_eligibility_include_dropouts.sql
```

### Safe Schema Changes

```sql
-- Always check if exists before creating
CREATE TABLE IF NOT EXISTS new_table (...);

-- Add columns with defaults for existing rows
ALTER TABLE players
ADD COLUMN IF NOT EXISTS game_iq DECIMAL(3,2) DEFAULT NULL;

-- Drop safely
DROP TABLE IF EXISTS old_table;
DROP FUNCTION IF EXISTS old_function();

-- Use transactions for multi-step changes
BEGIN;
  -- Multiple related changes
  ALTER TABLE ...;
  CREATE INDEX ...;
  UPDATE ...;
COMMIT;
```

### Data Backups

Before destructive migrations:

```sql
-- Create backup table
CREATE TABLE players_backup AS SELECT * FROM players;

-- Perform migration
ALTER TABLE players ...;

-- Verify success, then drop backup
DROP TABLE players_backup;
```

---

## 🔀 Trigger Ordering Patterns

### Alphabetical Execution Order

PostgreSQL fires triggers in **alphabetical order** within the same timing/orientation group. Use naming prefixes to control execution order:

```sql
-- a_ prefix fires first
CREATE TRIGGER a_process_injury_returns_on_game_complete  -- Fires 1st (sets bonus)
    AFTER UPDATE ON games FOR EACH ROW ...

-- Default names fire after
CREATE TRIGGER update_streaks_on_game_change              -- Fires 2nd (uses bonus)
    AFTER UPDATE ON games FOR EACH ROW ...

-- game_ prefix fires between a_ and u_
CREATE TRIGGER game_streaks_update                        -- Fires 3rd (statement level)
    AFTER UPDATE ON games FOR STATEMENT ...
```

**Real example:** Injury token return processing must set `injury_streak_bonus` before streak triggers recalculate streaks. The `a_` prefix ensures correct ordering.

### Bonus Column Pattern (Surviving Trigger Recalculations)

When a value needs to survive trigger-based recalculations, store it as a **bonus column** rather than writing directly to the target field:

```sql
-- ❌ WRONG - Trigger will immediately overwrite current_streak
UPDATE players SET current_streak = v_return_streak WHERE id = p_player_id;

-- ✅ CORRECT - Store as bonus, triggers add it to natural count
UPDATE players SET injury_streak_bonus = v_return_streak WHERE id = p_player_id;

-- In streak triggers:
SET current_streak = calculate_player_streak(p.id) + COALESCE(p.injury_streak_bonus, 0)
```

**Used by:** Injury Token system (`injury_streak_bonus`)
**Similar pattern:** Shield Token (`protected_streak_value` - computed at XP layer only)

---

## 🔗 Related Documentation

- [Core Development Patterns](CoreDevelopmentPatterns.md) - Coding conventions
- [Database Functions](../DatabaseFunctions.md) - Detailed RPC function docs
- [Token System](../TokenSystem.md) - Token-specific database logic
- [Ratings System Guide](../RatingsSystemGuide.md) - Rating database schema

---

## ✅ Database Change Checklist

Before deploying database changes:

- [ ] Migration file has proper naming (YYYYMMDD_name.sql)
- [ ] All schema changes use IF NOT EXISTS / IF EXISTS
- [ ] RLS policies updated if needed
- [ ] Indexes created for new foreign keys
- [ ] Trigger functions handle NULL values correctly
- [ ] RPC functions have proper SECURITY DEFINER
- [ ] Permission checks in place (or documented bypass usage)
- [ ] Tested with sample data
- [ ] Backup plan for rollback
- [ ] Documentation updated
