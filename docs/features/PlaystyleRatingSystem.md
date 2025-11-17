# Playstyle Rating System Implementation (v2.0)

## Overview
A hybrid playstyle system that combines the best of predefined names with dynamic attribute selection. Players select attributes directly through checkboxes, and the system either shows a predefined playstyle name (like "Hunter", "Engine") or generates a descriptive name for new combinations. This system complements the existing Attack/Defense/Game IQ ratings with 6 derived attributes (Pace, Shooting, Passing, Dribbling, Defending, Physical) for enhanced team balancing and player profiling.

**Status**: Live for all users (as of 2025-09-17)

## System Design

### Core Concepts
- **Checkbox-first approach** - Select attributes directly, get playstyle name
- **Hybrid naming system** - 24 predefined names + dynamic generation for other combinations
- **Independent 1.0 weights** - Each attribute gets full weight (no percentage splitting)
- **63 total combinations** - All possible attribute combinations supported
- **6 derived attributes** calculated from attribute selections
- **Default baseline** of 0 for all attributes (unrated players start at zero)
- **Attributes are averaged** across all ratings a player receives
- **Available to all users** (was beta-restricted until 2025-09-17)

### Playstyle Categories & Definitions

#### Predefined Attacking Styles (8 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Complete Forward | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | Balanced all-round attacker |
| Hunter | 1.0 | 1.0 | 0 | 0 | 0 | 0 | Pace + Shooting |
| Hawk | 1.0 | 1.0 | 0 | 0 | 0 | 1.0 | Pace + Shooting + Physical |
| Marksman | 0 | 1.0 | 0 | 1.0 | 0 | 1.0 | Shooting + Dribbling + Physical |
| Finisher | 0 | 1.0 | 0 | 0 | 0 | 1.0 | Shooting + Physical |
| Sniper | 0 | 1.0 | 0 | 1.0 | 0 | 0 | Shooting + Dribbling |
| Deadeye | 0 | 1.0 | 1.0 | 0 | 0 | 0 | Shooting + Passing |
| Speedster | 1.0 | 0 | 0 | 1.0 | 0 | 0 | Pace + Dribbling |

#### Predefined Midfield Styles (9 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Box-to-Box | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | Balanced all-round midfielder |
| Engine | 1.0 | 0 | 1.0 | 1.0 | 0 | 0 | Pace + Passing + Dribbling |
| Artist | 0 | 0 | 1.0 | 1.0 | 0 | 0 | Passing + Dribbling |
| Architect | 0 | 0 | 1.0 | 0 | 0 | 1.0 | Passing + Physical |
| Powerhouse | 0 | 0 | 1.0 | 0 | 1.0 | 0 | Passing + Defending |
| Maestro | 0 | 1.0 | 1.0 | 1.0 | 0 | 0 | Shooting + Passing + Dribbling |
| Catalyst | 1.0 | 0 | 1.0 | 0 | 0 | 0 | Pace + Passing |
| Locomotive | 1.0 | 0 | 0 | 0 | 0 | 1.0 | Pace + Physical |
| Enforcer | 0 | 0 | 0 | 1.0 | 0 | 1.0 | Dribbling + Physical |

#### Predefined Defensive Styles (7 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Complete Defender | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | Balanced all-round defender |
| Shadow | 1.0 | 0 | 0 | 0 | 1.0 | 0 | Pace + Defending |
| Anchor | 1.0 | 0 | 0 | 0 | 1.0 | 1.0 | Pace + Defending + Physical |
| Gladiator | 0 | 1.0 | 0 | 0 | 1.0 | 0 | Shooting + Defending |
| Guardian | 0 | 0 | 0 | 1.0 | 1.0 | 0 | Dribbling + Defending |
| Sentinel | 0 | 0 | 0 | 0 | 1.0 | 1.0 | Defending + Physical |
| Backbone | 0 | 0 | 1.0 | 0 | 1.0 | 1.0 | Passing + Defending + Physical |

#### Dynamic Playstyles (39 additional combinations)
Any attribute combination not covered by the 24 predefined names gets a dynamically generated name:
- **Single attributes**: "Pace Specialist", "Shooting Specialist", etc.
- **Multiple attributes**: "Pace & Defending", "Shooting & Passing & Physical", etc.
- **All attributes**: "Complete Player" (predefined)

## Implementation Status

### ✅ Completed

1. **Database Schema** (`/supabase/migrations/20250905_add_playstyle_system.sql`)
   - Created `playstyles` table with all 21 playstyle definitions
   - Added `playstyle_id` column to `player_ratings` table
   - Created `player_derived_attributes` table with default values of 0.35
   - Implemented trigger function to auto-calculate averaged attributes
   - Added RLS policies for security
   - Created `player_full_profiles` view for easy access

2. **Frontend Components**
   - **PlaystyleSelector Component** (`/src/components/ratings/PlaystyleSelector.tsx`)
     - Dropdown with grouped playstyles by category
     - Shows playstyle description formatted as "Name: Attributes" (e.g., "Speedster: Pace + Dribbling")
     - Shows percentage distribution totaling 100% (e.g., "PAC: 50%, DRI: 50%")
     - Attribute-based filtering feature - select attributes to find matching playstyles
     - Visual feedback for selected playstyle
     - Mobile responsive with compact abbreviations
   
   - **Ratings Page Integration** (`/src/pages/Ratings.tsx`)
     - Added playstyle selector to rating modal
     - Available to all users - playstyle selector visible in rating modal
     - Stores playstyle_id when submitting ratings
     - Loads existing playstyle when editing ratings
     - Shows playstyle on player rating cards
     - Resets playstyle selection after submission

3. **Admin Radar Chart Visualization** ✅
   - **PlayerRadarChart Component** (`/src/components/charts/PlayerRadarChart.tsx`)
     - Implemented using Recharts (already installed)
     - Supports single player and multi-player comparison (max 4)
     - Mobile-responsive design with custom tooltips
   - **Admin Integration** (`/src/pages/admin/ratings.tsx`)
     - Added "Attributes" tab to admin ratings page
     - Player selection interface for comparing up to 4 players
     - Radar chart comparison visualization

4. **Team Balancing Algorithm Updates** ✅
   - Modified `tierBasedSnakeDraft.ts` to include derived attributes
   - Updated weighting system (rebalanced 2025-09-08):
     - Layer 1: Core ratings (Attack/Defense/Game IQ) - 60%
     - Layer 2: Derived attributes - 20%
     - Layer 3: Performance metrics - 20% (12% track record + 8% recent form)
   - Added `derived_attributes` to TeamAssignment interface
   - Updated `useTeamBalancing.ts` to fetch and include derived attributes
   - Changed default attribute value from 0.35 to 0 for unrated players

5. **Admin Interface Enhancements** ✅
   - **PlaystyleStatistics Component** (`/src/components/admin/ratings/components/PlaystyleStatistics.tsx`)
     - Shows playstyle distribution by category
     - Displays top 5 most common playstyles with percentages
     - Visual progress bars for each playstyle
   - Updated `usePlayerRatings` hook to fetch playstyle information
   - Added playstyle data to Rating interface

6. **Type Definitions** ✅
   - Created TypeScript interfaces in `/src/types/playstyle.ts`
   - Updated existing player interfaces to include derived attributes
   - Added helper functions for normalizing and formatting

7. **Documentation Updates** ✅
   - Updated CLAUDE.md with playstyle feature details
   - This documentation file serves as the user guide
   - Documented team balancing changes

8. **Recent Activity Tracking** ✅
   - Added playstyle changes to admin Recent Activity section
   - Shows when playstyles are added, changed, or removed
   - Visual indicators with category colors

9. **Mobile Responsiveness** ✅
   - All playstyle features optimized for mobile
   - Compact attribute abbreviations on small screens
   - Responsive radar charts and statistics

### ✅ System Complete

All features have been implemented and tested. The playstyle system is fully integrated with:
- Player ratings
- Team balancing
- Admin dashboards
- Mobile interfaces

## Technical Implementation Details

### Attribute Calculation Logic
```typescript
// For each player:
// 1. Get all ratings with playstyles
// 2. Sum attribute weights from each playstyle
// 3. Divide by number of ratings
// 4. Store in player_derived_attributes table

Example:
Player rated 3 times:
- Rating 1: Maestro (shooting: 0.67, passing: 0.67, dribbling: 0.67)
- Rating 2: Engine (pace: 0.67, passing: 0.67, dribbling: 0.67)
- Rating 3: Sniper (shooting: 1.0, dribbling: 1.0)

Final attributes:
- Pace: (0 + 0.67 + 0) / 3 = 0.22
- Shooting: (0.67 + 0 + 1.0) / 3 = 0.56
- Passing: (0.67 + 0.67 + 0) / 3 = 0.45
- Dribbling: (0.67 + 0.67 + 1.0) / 3 = 0.78
- Defending: 0
- Physical: 0
```

### Integration with Existing System
- **Existing ratings remain primary**: Attack/Defense/Game IQ are skill levels
- **Playstyles are modifiers**: Show HOW players use their skills
- **No double-counting**: Defending attribute doesn't add to Defense rating
- **Fair defaults**: Unrated players get 0 for all attributes
- **Open to all users**: All players can now assign playstyles when rating

## Attribute-Based Filtering Feature

### How It Works
1. Click "Filter by attributes" above the playstyle dropdown
2. Select which attributes the player has (e.g., Pace, Dribbling)
3. The dropdown filters to show only playstyles containing ALL selected attributes
4. Shows count of matching playstyles (e.g., "Showing 3 playstyles with pace + dribbling")

### Example
Selecting "Pace + Dribbling" shows:
- **Speedster** (exactly those two attributes)
- **Engine** (has both plus Passing)
- **Complete Forward/Box-to-Box** (all-rounders with everything)

This makes it easier to find the right playstyle based on your assessment of the player.

## Version 2.0 Changes (Current)

### Major Updates
1. **Checkbox-first UI** - Select attributes directly, playstyle name is generated
2. **Independent 1.0 weights** - Each attribute gets full weight, no percentage splitting
3. **Hybrid naming** - Keeps 24 predefined names, generates names for 39 new combinations
4. **No versatility penalty** - Players with more attributes get higher totals (fair representation)
5. **Binary key mapping** - Fixed incorrect mappings (e.g., Sentinel vs Enforcer)
6. **Team balancing update** - Normalized for 0-6 attribute range instead of fixed 2.0

### Key Benefits
- **More intuitive** - Check what you see, get appropriate name
- **Fair scoring** - Versatile players no longer penalized
- **Unlimited combinations** - All 63 possible combinations supported
- **Preserves familiarity** - Classic names like "Hunter" and "Engine" retained
- **Future-proof** - Easy to add new predefined names if patterns emerge

## Key Decisions Made

1. **Single rating per player** - More intuitive, rate what you see
2. **Zero default baseline** - Unrated players start at 0, must earn attributes through ratings  
3. **Independent weights** - Each attribute gets 1.0 (not percentage-based)
4. **Hybrid naming** - Best of both worlds (predefined + dynamic)
5. **Attributes as tendencies, not additional skills** - Avoids double-counting
6. **General availability** - Released to all users (was beta-restricted until 2025-09-17)
7. **63 total combinations** - Complete coverage of all possibilities

## Files Modified/Created

### New Files
- `/supabase/migrations/20250905_add_playstyle_system.sql` - Database schema
- `/src/components/ratings/PlaystyleSelector.tsx` - Playstyle dropdown component
- `/src/types/playstyle.ts` - TypeScript interfaces and helpers
- `/src/components/charts/PlayerRadarChart.tsx` - Radar chart visualization
- `/src/components/admin/ratings/components/PlaystyleStatistics.tsx` - Statistics dashboard
- `/docs/features/PlaystyleRatingSystem.md` - This documentation

### Modified Files
- `/src/pages/Ratings.tsx` - Added playstyle selection to rating modal
- `/src/pages/admin/ratings.tsx` - Added attributes tab and statistics
- `/src/components/admin/ratings/types.ts` - Added derived_attributes and playstyle to interfaces
- `/src/components/admin/ratings/hooks/usePlayerRatings.ts` - Fetches derived attributes and playstyles
- `/src/components/admin/team-balancing/types.ts` - Added derived_attributes to TeamAssignment
- `/src/components/admin/team-balancing/tierBasedSnakeDraft.ts` - Integrated attributes into rating calculation
- `/src/components/admin/team-balancing/useTeamBalancing.ts` - Fetches derived attributes for players
- `/CLAUDE.md` - Added playstyle system documentation

## Formation Integration

### How Playstyles Map to Tactical Positions (Updated Nov 17, 2025)
The 6 derived attributes are the **secondary input** (after position consensus) for the Formation Suggester system, which automatically assigns players to optimal tactical positions.

**Position Detection Priority:**
1. **Position Consensus** (peer ratings) - 40% of score - Primary source when available
2. **Playstyle Attributes** - 40% of score - Documented here, fallback when no consensus
3. **Core Ratings** - 20% of score - Final fallback

Currently 94% of players (17/18) have position consensus data. When consensus is unavailable, the system uses playstyle characteristics as described below.

#### Natural Position Detection
Each playstyle maps to one or more natural positions:

| Playstyle Category | Example Styles | Natural Positions | Key Attributes |
|-------------------|----------------|------------------|----------------|
| **Attacking** | Hunter, Finisher, Marksman | ST (Striker), W (Winger) | Shooting, Pace, Dribbling |
| **Creative** | Maestro, Artist, Deadeye | CAM (Attacking Mid) | Passing, Dribbling, Shooting |
| **Box-to-Box** | Engine, Box-to-Box | CM (Central Mid), W | Pace, Passing, Dribbling |
| **Defensive Mid** | Powerhouse, Locomotive | CDM, CM | Defending, Physical, Passing |
| **Defensive** | Sentinel, Anchor, Shadow | DEF, CDM | Defending, Physical, Pace |

#### Position Suitability Calculation (Updated Nov 17, 2025)

When position consensus is unavailable, each position has weighted attribute requirements:

```typescript
// Example: Striker position weights
ST: {
  shooting: 0.35,    // 35% - Primary requirement
  pace: 0.25,        // 25% - Get in behind defenses
  dribbling: 0.20,   // 20% - Beat defenders 1v1
  physical: 0.10,    // 10% - Hold up play
  passing: 0.05,     // 5%  - Link-up play
  defending: 0.05    // 5%  - Pressing
}
```

**NOTE:** If player has position consensus data (94% of players do), the consensus score contributes 40% and attribute compatibility contributes 40% of the total position score.

#### Formation Selection Based on Team Composition
The system analyzes the collective playstyles to choose formations:
- **Many attacking playstyles** → 3-1-3-1 or 3-1-2-2 (attack-heavy)
- **Many defensive playstyles** → 3-2W-2-1 with CDM emphasis
- **Balanced mix** → 3-4-1 or 3-2W-2-1

#### Dynamic Assignment Algorithm (Updated Nov 17, 2025)

**Priority-Based Position Detection:**
- **Consensus First**: Check position consensus data (if available)
- **Playstyle Fallback**: Use playstyle attributes (if no consensus)
- **Rating Fallback**: Use core ratings (final fallback)

**Assignment Phases:**
1. **Phase 1**: Players with natural positions assigned first using priority-based detection
   - Example (with consensus): "Dom (RW 75%)" → W position
   - Example (no consensus): "Finisher playstyle" → ST position
2. **Phase 2**: Remaining players assigned based on combined scoring (consensus 40% + attributes 40% + ratings 20%)
3. **Phase 3**: Optimization through intelligent position swapping
4. **Critical Fixes**: Players terribly misplaced (score < 2.0) get priority swaps

### Integration Benefits
- **Automatic position detection** - No manual position assignments needed
- **Tactical flexibility** - Formations adapt to available playstyles
- **Optimized team balance** - Players placed where attributes are maximized
- **Visual feedback** - Debug logs show exactly why positions were assigned

### Usage in Team Balancing
After teams are selected via tier-based snake draft:
1. Each team's playstyle composition is analyzed
2. Appropriate formation is selected
3. Players are assigned to positions based on attributes
4. Swaps optimize overall team tactical fit
5. Visual formation display shows final assignments

For detailed documentation on the formation system, see [Formation Suggester Documentation](/docs/features/FormationSuggester.md).

## Future Enhancements

- Playstyle analytics dashboard (most common styles, trends over time)
- Playstyle badges on player cards throughout the app
- Position-specific playstyle recommendations
- Hybrid playstyles for players showing multiple tendencies
- Playstyle chemistry analysis for team composition
- Historical playstyle evolution tracking