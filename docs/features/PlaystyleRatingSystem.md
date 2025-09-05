# Playstyle Rating System Implementation

## Overview
Adding a playstyle system to complement the existing Attack/Defense/Game IQ ratings. Players can select one playstyle when rating another player, which derives 6 additional attributes (Pace, Shooting, Passing, Dribbling, Defending, Physical) for enhanced team balancing and player profiling.

## System Design

### Core Concepts
- **One playstyle per rating** (not three separate categories)
- **24 total playstyles** across 3 categories (Attacking, Midfield, Defensive)
- **6 derived attributes** calculated from playstyle selections
- **Default baseline** of 0 for all attributes (unrated players start at zero)
- **Attributes are averaged** across all ratings a player receives
- **Beta tester/Super admin only** feature during initial rollout

### Playstyle Categories & Definitions

#### Attacking Styles (8 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Complete Forward | 0.33 | 0.33 | 0.33 | 0.33 | 0.33 | 0.33 | Balanced all-round attacker |
| Hunter | 1.0 | 1.0 | 0 | 0 | 0 | 0 | Pace + Shooting |
| Hawk | 0.67 | 0.67 | 0 | 0 | 0 | 0.67 | Pace + Shooting + Physical |
| Marksman | 0 | 0.67 | 0 | 0.67 | 0 | 0.67 | Shooting + Dribbling + Physical |
| Finisher | 0 | 1.0 | 0 | 0 | 0 | 1.0 | Shooting + Physical |
| Sniper | 0 | 1.0 | 0 | 1.0 | 0 | 0 | Shooting + Dribbling |
| Deadeye | 0 | 1.0 | 1.0 | 0 | 0 | 0 | Shooting + Passing |
| Speedster | 1.0 | 0 | 0 | 1.0 | 0 | 0 | Pace + Dribbling |

#### Midfield Styles (9 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Box-to-Box | 0.33 | 0.33 | 0.33 | 0.33 | 0.33 | 0.33 | Balanced all-round midfielder |
| Engine | 0.67 | 0 | 0.67 | 0.67 | 0 | 0 | Pace + Passing + Dribbling |
| Artist | 0 | 0 | 1.0 | 1.0 | 0 | 0 | Passing + Dribbling |
| Architect | 0 | 0 | 1.0 | 0 | 0 | 1.0 | Passing + Physical |
| Powerhouse | 0 | 0 | 1.0 | 0 | 1.0 | 0 | Passing + Defending |
| Maestro | 0 | 0.67 | 0.67 | 0.67 | 0 | 0 | Shooting + Passing + Dribbling |
| Catalyst | 1.0 | 0 | 1.0 | 0 | 0 | 0 | Pace + Passing |
| Locomotive | 1.0 | 0 | 0 | 0 | 0 | 1.0 | Pace + Physical |
| Enforcer | 0 | 0 | 0 | 1.0 | 0 | 1.0 | Dribbling + Physical |

#### Defensive Styles (7 total)
| Playstyle | Pace | Shooting | Passing | Dribbling | Defending | Physical | Description |
|-----------|------|----------|---------|-----------|-----------|----------|-------------|
| Complete Defender | 0.33 | 0.33 | 0.33 | 0.33 | 0.33 | 0.33 | Balanced all-round defender |
| Shadow | 1.0 | 0 | 0 | 0 | 1.0 | 0 | Pace + Defending |
| Anchor | 0.67 | 0 | 0 | 0 | 0.67 | 0.67 | Pace + Defending + Physical |
| Gladiator | 0 | 1.0 | 0 | 0 | 1.0 | 0 | Shooting + Defending |
| Guardian | 0 | 0 | 0 | 1.0 | 1.0 | 0 | Dribbling + Defending |
| Sentinel | 0 | 0 | 0 | 0 | 1.0 | 1.0 | Defending + Physical |
| Backbone | 0 | 0 | 0.67 | 0 | 0.67 | 0.67 | Passing + Defending + Physical |

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
     - Beta tester/Super admin restriction - only these users see playstyle selector
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
   - Updated weighting system:
     - Layer 1: Core ratings (Attack/Defense/Game IQ) - 60%
     - Layer 2: Derived attributes - 30%
     - Layer 3: Performance metrics - 10% (7% track record + 3% recent form)
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
- **Beta tester restriction**: Only beta testers and super admins can assign playstyles

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

## Key Decisions Made

1. **Single playstyle per rating** (not 3) - More intuitive, rate what you see
2. **Zero default baseline** - Unrated players start at 0, must earn attributes through ratings
3. **Balanced styles in all categories** - Every category has a "Complete" option
4. **All weights sum to 2.0** - Perfect balance across all playstyles
5. **Attributes as tendencies, not additional skills** - Avoids double-counting
6. **Beta tester restriction** - Limited rollout during initial testing phase
7. **24 total playstyles** - Comprehensive coverage including Speedster, Locomotive, Enforcer

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

## Future Enhancements

- Playstyle analytics dashboard (most common styles, trends over time)
- Playstyle badges on player cards throughout the app
- Position-specific playstyle recommendations
- Hybrid playstyles for players showing multiple tendencies
- Playstyle chemistry analysis for team composition
- Historical playstyle evolution tracking