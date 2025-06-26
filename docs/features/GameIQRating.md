# Game IQ Rating Feature

## Overview
The Game IQ Rating is a third player rating metric that complements the existing Attack and Defense ratings. It measures a player's tactical awareness, positioning, and decision-making abilities on the pitch.

## Implementation Date
June 26, 2025

## Database Schema

### player_ratings table
- Added column: `game_iq_rating NUMERIC` (0-10 scale)
- Check constraint: `player_ratings_game_iq_rating_check` (0 ≤ game_iq_rating ≤ 10)

### players table
- Added column: `game_iq NUMERIC` (average Game IQ rating)
- Added column: `average_game_iq_rating NUMERIC` (mirrors the existing pattern)

### Trigger Function
Updated `update_player_average_ratings()` to calculate Game IQ averages alongside Attack and Defense.

## Frontend Implementation

### Rating System
- Players can rate others on three metrics: Attack, Defense, and Game IQ
- Each uses the same 0-10 scale (displayed as 0-5 stars with half-star increments)
- Minimum 5 games played together requirement remains unchanged

### Team Balancing
The team balancing algorithm now considers 5 metrics with equal weighting:
- Attack Rating (20%)
- Defense Rating (20%)
- Game IQ Rating (20%)
- Win Rate (20%)
- Goal Differential (20%)

### UI Components Updated

#### Player Rating Components
- `RatingModal`: Added third StarRating for Game IQ
- `Ratings` page: Handles Game IQ in state, submission, and sorting
- `PlayerProfile`: Displays Game IQ ratings

#### Admin Components
- `PlayerRatingsTable`: Shows Game IQ column
- `PlayersTable`: Displays average Game IQ
- `RatersTable`: Includes Game IQ in average calculations
- Sorting and filtering support for Game IQ ratings

#### Team Balancing Components
- `TeamStats`: Displays Game IQ averages and differences
- `SwapRecommendations`: Considers Game IQ in swap calculations
- `WhatsAppExport`: Includes Game IQ in team announcements (🧠 emoji)
- Balance score visualization updated to show 5 metrics

## Technical Details

### TypeScript Types
Updated interfaces in:
- `/src/types/player.ts`: Added `game_iq_rating` to rating interfaces
- `/src/components/admin/ratings/types.ts`: Updated Rating and Player interfaces
- `/src/components/admin/team-balancing/types.ts`: Added `game_iq_rating` to TeamAssignment

### Calculation Logic
- `teamBalancing.ts`: Updated to include Game IQ with 20% weighting
- `teamBalanceCalcs.ts`: Calculates Game IQ averages and differences
- `teamBalanceUtils.ts`: Swap recommendations consider Game IQ impact

## Default Values
- New players start with a Game IQ rating of 5.0 (same as Attack/Defense)
- Existing players will have NULL Game IQ until rated
- The trigger function uses COALESCE to handle NULL values

## Implementation Issues & Fixes (2025-06-26)

### Issues Found
1. **Edit Player Page** - Missing Game IQ rating input field
2. **Player Profile** - "Your Current Ratings" section not displaying Game IQ
3. **Admin Ratings Page** - Empty table due to AND logic filtering (required ALL ratings > 0)
4. **Runtime Errors** - `Cannot read properties of null (reading 'toFixed')`

### Fixes Applied
1. **EditPlayer.tsx** - Added `game_iq_rating` field to Player type and form
2. **PlayerRating.tsx** - Updated to display Game IQ in current ratings
3. **usePlayerRatings.ts** - Changed filtering from AND to OR logic (`.or('attack_rating.gt.0,defense_rating.gt.0,game_iq.gt.0')`)
4. **Null Value Handling** - Added nullish coalescing (`??`) and optional chaining (`?.`) throughout:
   - `PlayersTable.tsx`: `player.game_iq?.toFixed(1) || '0.0'`
   - `usePlayerFiltering.ts`: `(player.game_iq ?? 0) >= filterConfig.minGameIq`

### Important Technical Notes
- Always use null-safe operators when accessing rating values
- Admin ratings page shows players with at least ONE non-zero rating
- FilterConfig must include `minGameIq` and `maxGameIq` properties
- Rating interfaces must include `gameIq` alongside `attack` and `defense`

## Display Improvements (2025-06-26)

### Unrated Value Handling
- Created utility functions in `/src/utils/ratingFormatters.ts`:
  - `formatRating()` - Shows "unrated" for null/undefined values
  - `formatStarRating()` - Converts rating to star display or "unrated"
  - `getRatingButtonText()` - Returns contextual button text
  - `getMissingRatings()` - Checks which ratings are missing

### Button Text Logic
- "RATE PLAYER" - No ratings exist
- "ADD GAME IQ RATING" - Only Game IQ is missing
- "COMPLETE RATING" - Multiple ratings are missing  
- "UPDATE RATING" - All ratings exist

### Components Updated for "Unrated" Display
- `Ratings.tsx` - Uses formatStarRating for all rating displays
- `PlayerRating.tsx` - Shows "unrated" for missing ratings
- `PlayersTable.tsx` - Admin tables show "unrated" instead of "0.0"
- `RatersTable.tsx` - Handles null averages gracefully
- `SwapRecommendations.tsx` - Player comparisons show "unrated"

## Admin Ratings Page Fix (2025-06-26)

### Issue
Game IQ ratings were not displaying in the admin ratings page when viewing "Ratings by [Player]" even though they were being saved to the database.

### Root Cause
The `useRaterStats` hook was missing `game_iq_rating` from its database query, causing the field to be undefined in the fetched data.

### Fix Applied
1. Updated `/src/components/admin/ratings/hooks/useRaterStats.ts` to include `game_iq_rating` in the select query
2. Added `updated_at` column to `player_ratings` table with auto-update trigger
3. Updated all relevant components to display `updated_at` when available

### Database Changes
- Added `updated_at` column: `ALTER TABLE player_ratings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- Created trigger function: `update_updated_at_column()` 
- Created trigger: `update_player_ratings_updated_at` to automatically update the timestamp on row updates

### Components Updated for updated_at
- `PlayerRatingsTable.tsx` - Shows `updated_at || created_at`
- `types.ts` - Added optional `updated_at` field to Rating interface
- `usePlayerRatings.ts` - Includes `updated_at` in query
- `useRaterStats.ts` - Includes both `game_iq_rating` and `updated_at` in query

## Testing Checklist
- [x] Database migrations applied successfully
- [x] Players can submit all 3 ratings
- [x] Ratings are saved correctly to database
- [x] Average Game IQ is calculated properly
- [x] Admin can view Game IQ ratings
- [x] Sorting/filtering works for Game IQ
- [x] Team balancing includes Game IQ
- [x] WhatsApp export shows Game IQ
- [x] No breaking changes to existing ratings
- [x] Null values handled gracefully
- [x] Edit Player page includes Game IQ field
- [x] Player profiles show all 3 ratings
- [x] Unrated values display as "unrated" not "0" or "NaN"
- [x] Rating buttons show contextual text
- [x] Missing Game IQ ratings are clearly indicated
- [x] Admin ratings page shows Game IQ properly
- [x] Ratings show last updated date instead of creation date