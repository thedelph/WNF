# Goal Differential Feature

## Overview
This feature tracks the goal differential statistics for each player in the WNF system. The goal differential is calculated as the difference between Goals For (goals scored by the player's team) and Goals Against (goals conceded by the player's team) across all their games.

## Implementation Details

### Database
- Utilizes a PostgreSQL function `get_player_goal_differentials` that:
  - Calculates goals for and against for each player from their game history
  - Counts caps accurately using the same method as the `get_player_caps` function
  - Only includes players who have 10+ caps (consistent with other stats displays)
  - Displays accurate caps (games played) for each player regardless of whether scores were recorded
  - Only considers games with known scores when calculating goal statistics
  - Filters by year when provided
  - Returns a sorted list with the best goal differentials first

### Frontend Components
- `useStats.ts` hook enhanced to fetch goal differential data and expose it to the Stats page
- New `GoalDifferentialsCard.tsx` component that:
  - Displays a table with players' Caps, Goals For (GF), Goals Against (GA), and Goal Differential (+/-)
  - Uses indigo gradient background for better contrast with colored text values
  - Shows emoji medals (🥇, 🥈, 🥉) for top performers
  - Includes tooltips to explain what each column means

### Medal Display Standardization
- All award cards now use emoji medals (🥇, 🥈, 🥉) for a consistent appearance:
  - Updated `AwardCard.tsx` and `HighestXPCard.tsx` to use emoji medals
  - Removed the previously used SVG medal icons from Lucide
  - Standardized spacing and alignment across all cards

### Year Selector Enhancements
- Updated `YearSelector.tsx` to only show years with actual data
- Ensures "All Time" option is always available

## Usage
The Goal Differentials stats appear as a card at the top of the Stats page. Users can filter these stats by year using the Year Selector. The card shows four key metrics:

- **Caps**: Total number of games played by the player
- **GF**: Goals For - total goals scored by the player's team
- **GA**: Goals Against - total goals conceded by the player's team
- **+/-**: Goal Differential - the difference between GF and GA

## Notes
- Only players with 10+ caps are included in the goal differential rankings
- Caps count includes all games a player was selected for, even if scores weren't recorded
- Goal statistics only consider games with recorded scores (both score_blue and score_orange are not null)
- The statistics consider the team colors (blue/orange) when calculating for/against
- Only includes completed games with valid team assignments
- Positive goal differentials are displayed in green, negative in red for visual clarity
