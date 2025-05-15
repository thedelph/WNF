# Goal Differential for Team Balancing

## Overview
Goal differential has been added as a fourth metric in the team balancing algorithm, giving equal weight (25%) to each of:
- Attack rating
- Defense rating
- Recent win rate
- Recent goal differential

## Implementation Details

### Database Functions
- `get_player_recent_goal_differentials`: 
  - Calculates average goal differential for each player's last 10 games
  - Only includes completed games with recorded scores
  - Only includes games with even teams (same number of players on each side)
  - Calculates differential as (goals for - goals against) from the player's team perspective

- `get_player_recent_win_rates`:
  - Updated to only include games with even teams
  - Ensures consistent data between win rates and goal differentials

### Frontend Display
- Added "Recent Goal Differential" to player cards in team balancing view
- Shows as "+/-" value for players with 10+ even team games
- Shows "N/A" for players with fewer than 10 eligible games
- Color-coded in team comparison views (green for improvement)

### Team Balancing Algorithm
- Equal 25% weighting for each metric ensures balanced teams across all factors
- Goal differential provides insight into a player's contribution to positive outcomes
- Only uses data from games with sufficient history (10+ games) and even teams

## Reasoning
Adding goal differential improves team balance by considering:
1. How teams perform when a player is present (beyond just win/loss)
2. The magnitude of wins/losses (blowouts vs. close games)
3. Both offensive and defensive contributions in a direct outcome metric

This creates more balanced and competitive matches with teams that are more evenly matched across all performance dimensions.
