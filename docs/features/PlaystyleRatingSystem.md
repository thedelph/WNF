# Playstyle Rating System Implementation

## Overview
Adding a playstyle system to complement the existing Attack/Defense/Game IQ ratings. Players can select one playstyle when rating another player, which derives 6 additional attributes (Pace, Shooting, Passing, Dribbling, Defending, Physical) for enhanced team balancing and player profiling.

## System Design

### Core Concepts
- **One playstyle per rating** (not three separate categories)
- **21 total playstyles** across 3 categories (Attacking, Midfield, Defensive)
- **6 derived attributes** calculated from playstyle selections
- **Default baseline** of 0.35 for all attributes (ensures unrated players aren't disadvantaged)
- **Attributes are averaged** across all ratings a player receives

### Playstyle Categories & Definitions

#### Attacking Styles (7 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Complete Forward | 0.35 | 0.35 | 0.35 | 0.35 | 0.35 | 0.35 | Balanced all-round attacker |
| Hunter | 1.0 | 1.0 | 0 | 0 | 0 | 0 | Pace + Shooting |
| Hawk | 0.8 | 0.8 | 0 | 0 | 0 | 0.8 | Pace + Shooting + Physical |
| Marksman | 0 | 0.8 | 0 | 0.8 | 0 | 0.8 | Shooting + Dribbling + Physical |
| Finisher | 0 | 1.0 | 0 | 0 | 0 | 1.0 | Shooting + Physical |
| Sniper | 0 | 1.0 | 0 | 1.0 | 0 | 0 | Shooting + Dribbling |
| Deadeye | 0 | 1.0 | 1.0 | 0 | 0 | 0 | Shooting + Passing |

#### Midfield Styles (7 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Box-to-Box | 0.35 | 0.35 | 0.35 | 0.35 | 0.35 | 0.35 | Balanced all-round midfielder |
| Engine | 0.8 | 0 | 0.8 | 0.8 | 0 | 0 | Pace + Passing + Dribbling |
| Artist | 0 | 0 | 1.0 | 1.0 | 0 | 0 | Passing + Dribbling |
| Architect | 0 | 0 | 1.0 | 0 | 0 | 1.0 | Passing + Physical |
| Powerhouse | 0 | 0 | 1.0 | 0 | 1.0 | 0 | Passing + Defending |
| Maestro | 0 | 0.8 | 0.8 | 0.8 | 0 | 0 | Shooting + Passing + Dribbling |
| Catalyst | 1.0 | 0 | 1.0 | 0 | 0 | 0 | Pace + Passing |

#### Defensive Styles (7 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Complete Defender | 0.35 | 0.35 | 0.35 | 0.35 | 0.35 | 0.35 | Balanced all-round defender |
| Shadow | 1.0 | 0 | 0 | 0 | 1.0 | 0 | Pace + Defending |
| Anchor | 0.8 | 0 | 0 | 0 | 0.8 | 0.8 | Pace + Defending + Physical |
| Gladiator | 0 | 1.0 | 0 | 0 | 1.0 | 0 | Shooting + Defending |
| Guardian | 0 | 0 | 0 | 1.0 | 1.0 | 0 | Dribbling + Defending |
| Sentinel | 0 | 0 | 0 | 0 | 1.0 | 1.0 | Defending + Physical |
| Backbone | 0 | 0 | 0.8 | 0 | 0.8 | 0.8 | Passing + Defending + Physical |

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
     - Shows playstyle description and attribute weights
     - Visual feedback for selected playstyle
   
   - **Ratings Page Integration** (`/src/pages/Ratings.tsx`)
     - Added playstyle selector to rating modal
     - Stores playstyle_id when submitting ratings
     - Loads existing playstyle when editing ratings
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
   - Updated weighting system:
     - Layer 1: Core ratings (Attack/Defense/Game IQ) - 60%
     - Layer 2: Derived attributes - 30%
     - Layer 3: Performance metrics - 10% (7% track record + 3% recent form)
   - Added `derived_attributes` to TeamAssignment interface
   - Updated `useTeamBalancing.ts` to fetch and include derived attributes

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

### 📋 Still To Do

8. **Testing & Production Deployment**
   - Run migration on production Supabase
   - Monitor trigger function performance
   - Gather user feedback on playstyle selections

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
- Rating 1: Maestro (shooting: 0.8, passing: 0.8, dribbling: 0.8)
- Rating 2: Engine (pace: 0.8, passing: 0.8, dribbling: 0.8)
- Rating 3: Sniper (shooting: 1.0, dribbling: 1.0)

Final attributes:
- Pace: (0 + 0.8 + 0) / 3 = 0.27
- Shooting: (0.8 + 0 + 1.0) / 3 = 0.60
- Passing: (0.8 + 0.8 + 0) / 3 = 0.53
- Dribbling: (0.8 + 0.8 + 1.0) / 3 = 0.87
- Defending: 0
- Physical: 0
```

### Integration with Existing System
- **Existing ratings remain primary**: Attack/Defense/Game IQ are skill levels
- **Playstyles are modifiers**: Show HOW players use their skills
- **No double-counting**: Defending attribute doesn't add to Defense rating
- **Fair defaults**: Unrated players get 0.35 for all attributes

## Next Steps to Complete

1. **Install chart library**:
   ```bash
   npm install recharts
   ```

2. **Create RadarChart component**:
   - Build reusable radar chart for player profiles
   - Normalize values (0-3 range to 0-10 for display)
   - Support multiple player overlay

3. **Update team balancing**:
   - Modify balance score calculation
   - Add style diversity checks
   - Prevent teams of all similar playstyles

4. **Test the system**:
   - Run migration: `npx supabase db push`
   - Test rating flow with playstyles
   - Verify attribute calculations
   - Test radar chart visualization

5. **Deploy**:
   - Push migration to production
   - Update documentation
   - Notify users of new feature

## Key Decisions Made

1. **Single playstyle per rating** (not 3) - More intuitive, rate what you see
2. **0.35 default baseline** - Ensures fairness for unrated players
3. **Balanced styles in all categories** - Every category has a "Complete" option
4. **Weights balanced around 2.0-2.4 total** - Specialization slightly rewarded
5. **Attributes as tendencies, not additional skills** - Avoids double-counting

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

## Notes for Continuation

- The foundation is solid - database and basic UI are working
- Main focus should be on visualization (radar charts) and team balancing integration
- Consider adding playstyle analytics (most common styles, style by position, etc.)
- Could extend to show playstyle badges on player cards
- Future: Hybrid styles or position-specific weightings