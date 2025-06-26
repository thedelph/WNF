# Game IQ Rating Implementation Plan

## Overview
Adding a third rating metric called **Game IQ** to complement the existing Attack and Defense ratings. This metric will measure tactical awareness, positioning, and decision-making abilities.

## Implementation Status: ✅ COMPLETED (2025-06-26)

### What Was Implemented
- Database has `player_ratings` table with attack_rating, defense_rating, and game_iq_rating (0-10 scale)
- Players can rate others after playing 5+ games together
- Ratings are averaged and stored in the `players` table (game_iq column)
- Frontend shows ratings in multiple places
- Team balancing algorithm updated to include Game IQ with 20% weighting

### Issues Found and Fixed
1. **Edit Player Page** - Missing Game IQ rating field ✅
2. **Player Profile** - "Your Current Ratings" not showing Game IQ ✅
3. **Admin Ratings** - Empty table due to strict filtering logic ✅
4. **Null Value Errors** - Runtime errors when rating values were null ✅
5. **Admin Ratings "Ratings by Player"** - Game IQ not showing (missing from useRaterStats query) ✅
6. **Rating Dates** - Added `updated_at` column with auto-update trigger to track modifications ✅

## Implementation Steps

### 1. Database Changes

#### A. Add Game IQ column to player_ratings table
```sql
-- Add game_iq_rating column to player_ratings table
ALTER TABLE player_ratings 
ADD COLUMN game_iq_rating NUMERIC NULL;

-- Add check constraint for game_iq_rating (0-10 range)
ALTER TABLE player_ratings 
ADD CONSTRAINT player_ratings_game_iq_rating_check 
CHECK (game_iq_rating >= 0 AND game_iq_rating <= 10);
```

#### B. Add Game IQ columns to players table
```sql
-- Add game_iq column to players table (for average rating)
ALTER TABLE players 
ADD COLUMN game_iq NUMERIC NULL;

-- Add average_game_iq_rating column to match existing pattern
ALTER TABLE players 
ADD COLUMN average_game_iq_rating NUMERIC NULL;
```

#### C. Update the trigger function
The `update_player_average_ratings` function needs to be modified to calculate Game IQ averages:
```sql
-- Update the trigger function to include game_iq calculations
CREATE OR REPLACE FUNCTION public.update_player_average_ratings()
-- Add game_iq calculation logic alongside attack and defense
```

#### D. Update database views
These views need to include game_iq:
- `player_stats`
- `player_stats_with_xp`
- `balanced_team_assignments`
- `extended_player_stats`

### 2. Frontend Type Updates

#### A. Update TypeScript interfaces
- **`/src/types/player.ts`**
  - Add `game_iq_rating` to the `my_rating` interface (line 56)
  
- **`/src/components/admin/ratings/types.ts`**
  - Add `game_iq_rating` to the `Rating` interface (line 3-4)
  
- **`/src/components/admin/team-balancing/types.ts`**
  - Add `game_iq_rating` to `TeamAssignment` interface (line 20-21)
  - Add game IQ calculations to `TeamStats` interface (line 3-4)

### 3. Component Updates

#### A. Rating Modal (`/src/components/profile/RatingModal.tsx`)
- Add third StarRating component for Game IQ
- Update ratings state to include `gameIq`
- Modify props interface to include game IQ

#### B. Ratings Page (`/src/pages/Ratings.tsx`)
- Add `game_iq` to ratings state (line 34)
- Add sorting options for game_iq (lines 100+)
- Update submission logic to include game_iq

#### C. Player Rating Component (`/src/components/profile/PlayerRating.tsx`)
- Display current Game IQ rating
- Pass game IQ to RatingModal

#### D. Admin Ratings Components
- **PlayerRatingsTable** - Add Game IQ column
- **PlayersTable** - Show average Game IQ
- **RatersTable** - Include Game IQ in stats
- Update sorting and filtering logic

#### E. Team Balancing Components
All files in `/src/components/admin/team-balancing/`:
- Add Game IQ to team calculations
- Display in team stats
- Include in swap recommendations
- Update balancing algorithms

#### F. Edit Player Admin (`/src/pages/admin/EditPlayer.tsx`)
- Add game_iq_rating field display

### 4. Files That Need Updates

**High Priority:**
1. Database migrations (create in SQL/migrations/)
2. `/src/types/player.ts`
3. `/src/components/profile/RatingModal.tsx`
4. `/src/pages/Ratings.tsx`
5. `/src/components/admin/ratings/types.ts`

**Medium Priority:**
6. `/src/components/admin/ratings/components/PlayerRatingsTable.tsx`
7. `/src/components/admin/ratings/components/PlayersTable.tsx`
8. `/src/components/admin/ratings/components/RatersTable.tsx`
9. `/src/pages/admin/ratings.tsx`

**Lower Priority:**
10. Team balancing components
11. `/src/pages/admin/EditPlayer.tsx`
12. Any other components showing ratings

## Testing Checklist
- [ ] Players can submit all 3 ratings
- [ ] Ratings are saved correctly to database
- [ ] Average Game IQ is calculated properly
- [ ] Admin can view Game IQ ratings
- [ ] Sorting/filtering works for Game IQ
- [ ] Team balancing includes Game IQ
- [ ] No breaking changes to existing ratings

## Notes
- All existing ratings remain unchanged
- New ratings will have NULL game_iq until players rate again
- Consider adding default value of 5.0 for game_iq if needed
- May need to update any API endpoints that fetch ratings