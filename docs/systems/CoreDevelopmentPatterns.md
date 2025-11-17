# Core Development Patterns

**Last Updated:** 2025-11-17

This document contains critical coding patterns and conventions used throughout the WNF codebase. **Follow these patterns strictly** to ensure consistency and prevent bugs.

---

## 🔧 Rating System Patterns

### Null-Safe Rating Handling

**ALWAYS** handle null/undefined rating values using null-safe operators. Never assume ratings exist.

```typescript
// ✅ CORRECT - Use nullish coalescing
const attack = player.attack ?? 0;
const defense = player.defense ?? 0;
const gameIq = player.game_iq ?? 0;
const gk = player.gk ?? 0;

// ✅ CORRECT - Use optional chaining
const avgAttack = player.average_attack_rating?.toFixed(2);

// ❌ WRONG - Direct access (will throw on null)
const attack = player.attack;
const avgAttack = player.average_attack_rating.toFixed(2);
```

### Rating Display Utilities

Use the centralized formatting utilities for consistent display:

```typescript
import { formatRating, formatStarRating } from '@/utils/ratingFormatters';

// Display numeric ratings (0-10 scale)
formatRating(player.attack) // Returns "7.5" or "unrated"

// Display star ratings (0-5 stars)
formatStarRating(player.defense) // Returns "★★★★☆" or "unrated"
```

### Rating Interfaces

All rating interfaces must include ALL four core metrics:

```typescript
interface PlayerRating {
  attack: number | null;
  defense: number | null;
  gameIq: number | null;
  gk: number | null;
  // ... other fields
}
```

### Contextual Rating Button Text

Rating buttons should show contextual text based on what's missing:

```typescript
// Single metric missing
"ADD GAME IQ RATING"

// Multiple metrics missing
"COMPLETE RATING"

// All metrics exist
"UPDATE RATING"
```

---

## 🗄️ Database Column Naming

### Player Ratings Tables

Be careful with column naming - it differs between tables!

**`players` table** (stores default/manual ratings and averages):
```sql
-- Manual/default values (single value)
game_iq       -- NOT game_iq_rating!
attack        -- NOT attack_rating!
defense       -- NOT defense_rating!
gk            -- NOT gk_rating!

-- Calculated averages (from player_ratings)
average_attack_rating
average_defense_rating
average_game_iq_rating
average_gk_rating
```

**`player_ratings` table** (stores individual rating submissions):
```sql
-- Individual ratings from raters
attack_rating
defense_rating
game_iq_rating  -- NOT game_iq!
gk_rating       -- NOT gk!
```

**Example - EditPlayer.tsx:**
```typescript
// ❌ WRONG - Will cause "column not found" error
await supabase
  .from('players')
  .update({ game_iq_rating: value });

// ✅ CORRECT - Use proper column name
await supabase
  .from('players')
  .update({ game_iq: value });
```

---

## 🎯 Position System Patterns

### Ranked Position System

Positions use a **ranked points system** (gold/silver/bronze):

```typescript
interface PositionRating {
  position: string;
  rank: 1 | 2 | 3;  // 1=🥇 Gold (3pts), 2=🥈 Silver (2pts), 3=🥉 Bronze (1pt)
}

// Points calculation
const maxPointsPerRater = 6; // 3 + 2 + 1
const percentage = (totalPoints / (totalRaters * maxPointsPerRater)) * 100;
```

### Position Constants

Use the centralized position constants:

```typescript
import { POSITIONS, POSITION_CATEGORIES } from '@/constants/positions';

// 12 standard positions
const positions = [
  'GK',           // Goalkeeper
  'LB', 'CB', 'RB',         // Defense
  'LWB', 'RWB',             // Wing Backs
  'LW', 'CM', 'RW',         // Midfield/Wings
  'CAM', 'CDM',             // Attacking/Defensive Mid
  'ST'                      // Striker
];

// Position categories for team balancing
POSITION_CATEGORIES.GOALKEEPER  // ['GK']
POSITION_CATEGORIES.DEFENSE     // ['LB', 'CB', 'RB', 'LWB', 'RWB']
POSITION_CATEGORIES.MIDFIELD    // ['CM', 'CAM', 'CDM']
POSITION_CATEGORIES.ATTACK      // ['LW', 'RW', 'ST']
```

---

## 🔐 Permission & RLS Patterns

### Bypass Permission for Trusted Processes

When calling RPC functions from **trusted system processes** (not user-initiated), use the bypass flag:

```typescript
// ❌ WRONG - Will fail if user lacks admin permissions
await supabase.rpc('update_game_registration', {
  p_registration_id: regId,
  p_updates: { status: 'selected' }
});

// ✅ CORRECT - Bypass for trusted automated processes
await supabase.rpc('update_game_registration', {
  p_registration_id: regId,
  p_updates: { status: 'selected' },
  p_bypass_permission: true  // Only use in server-side/automated code!
});
```

**⚠️ WARNING:** Only use `p_bypass_permission: true` in:
- Database triggers
- Automated system processes (registration close, etc.)
- Server-side functions

**NEVER** use in user-initiated actions!

---

## 📅 Date Handling

### Always Check Current Date

When adding/editing documentation, run `date` command first to ensure accuracy:

```bash
# Run this before documenting changes
date
```

This prevents incorrect timestamps in documentation and changelogs.

---

## 🎨 UI/UX Patterns

### Mobile Responsiveness

Follow these patterns for responsive design:

**Hidden columns on small screens:**
```typescript
<th className="hidden lg:table-cell">Caps</th>
<th className="hidden lg:table-cell">XP</th>
```

**Mobile-optimized button labels:**
```typescript
<span className="hidden sm:inline">Select All</span>
<span className="sm:hidden">All</span>
```

**Responsive grid layouts:**
```typescript
// 1 col mobile, 2 col medium, 3 col large, 4 col xl
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
```

### DaisyUI Collapse Issues

When using dynamic content with DaisyUI collapse, prefer **custom implementations** with state control:

```typescript
// ❌ WRONG - DaisyUI collapse with dynamic content has rendering issues
<div className="collapse">
  {dynamicContent}
</div>

// ✅ CORRECT - Custom implementation with state
const [isOpen, setIsOpen] = useState(false);
<div onClick={() => setIsOpen(!isOpen)}>
  {isOpen && dynamicContent}
</div>
```

---

## 🔢 Game Participation Indexing

### Critical: Index Order for Participation Arrays

When building game participation arrays, **index 0 = oldest game, index 39 = most recent**.

```typescript
// ❌ WRONG - Reversed order
participation[index] = status;

// ✅ CORRECT - Proper chronological order
participation[39 - index] = status;
```

This ensures the GameParticipationWheel displays segments chronologically (oldest → newest clockwise).

**Affected components:**
- `usePlayerGrid.ts`
- `useGameRegistrationStats.ts`
- `PlayerSelectionResults.tsx`
- `TeamSelectionResults.tsx`

---

## 🎲 Team Balancing Patterns

### Position Balance Constraints

Team balancing enforces **HARD CONSTRAINTS** on position balance:

```typescript
// Maximum gap allowed in any position category
const MAX_POSITION_GAP = 3;

// Categories that must be balanced
const categories = [
  'Goalkeeper',  // GK
  'Defense',     // LB, CB, RB, LWB, RWB
  'Midfield',    // CM, CAM, CDM
  'Attack'       // LW, RW, ST
];
```

### Performance Adjustment Caps

Performance penalties are capped to prevent excessive rating reductions:

```typescript
const MAX_PERFORMANCE_ADJUSTMENT = 0.15; // ±15% of base rating

// Example: Player with 7.0 base rating
// Worst case: 7.0 * (1 - 0.15) = 5.95 (-15%)
// Best case: 7.0 * (1 + 0.15) = 8.05 (+15%)
```

---

## 🛠️ Common Gotchas

### 1. OR Logic in Rating Filters

The admin ratings page uses **OR logic** for filtering:

```typescript
// Shows players with AT LEAST ONE non-zero rating
// Not ALL ratings non-zero
const hasAnyRating = attack > 0 || defense > 0 || gameIq > 0 || gk > 0;
```

### 2. Algorithm Details Vagueness

When documenting team balancing in **user-facing content**, keep algorithm details vague:

```typescript
// ✅ CORRECT - Vague user-facing description
"The algorithm considers multiple factors beyond just ratings"

// ❌ WRONG - Too specific (allows gaming the system)
"The algorithm uses 60% core skills (Attack/Defense/Game IQ/GK),
 20% playstyle attributes, and 20% performance metrics"
```

### 3. Supabase Query Limits

Be aware of Supabase's **1000 row limit**:

```typescript
// ❌ WRONG - May hit 1000 row limit
const { data } = await supabase
  .from('game_registrations')
  .select('*');

// ✅ CORRECT - Batch fetching or filtering
// Method 1: Fetch in batches
const batches = chunkArray(gameIds, 10);
const results = await Promise.all(
  batches.map(batch => supabase.from('...').in('game_id', batch))
);

// Method 2: Pre-filter on server
const { data } = await supabase
  .from('game_registrations')
  .select('*')
  .in('game_id', last40GameIds); // Limit to relevant games
```

---

## 🔗 Related Documentation

- [Database Patterns](DatabasePatterns.md) - RLS policies, triggers, RPC functions
- [Ratings System Guide](../RatingsSystemGuide.md) - Comprehensive rating system docs
- [Team Balancing Evolution](../algorithms/TeamBalancingEvolution.md) - Algorithm history
- [Position Preferences](../features/PositionPreferences.md) - Ranked position system

---

## ✅ Pre-Commit Checklist

Before committing changes involving:

**Ratings:**
- [ ] Used null-safe operators (`??`, `?.`)
- [ ] Correct column names for table (game_iq vs game_iq_rating)
- [ ] Used `formatRating()` / `formatStarRating()` utilities
- [ ] All four metrics included (Attack/Defense/Game IQ/GK)

**Positions:**
- [ ] Used centralized position constants
- [ ] Implemented ranked system (gold/silver/bronze)
- [ ] Position balance constraints enforced

**Database:**
- [ ] RLS policies respected
- [ ] `p_bypass_permission` only in trusted processes
- [ ] Query limits considered (batch if needed)

**UI:**
- [ ] Mobile responsive (hidden columns, abbreviated labels)
- [ ] Custom collapse implementation for dynamic content

**Game Participation:**
- [ ] Correct index order (index 0 = oldest, 39 = newest)
