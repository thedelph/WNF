# XP System Documentation

## Overview
The XP (Experience Points) system is designed to reward player participation and consistency in games. It uses a sophisticated weighted calculation that emphasizes recent game participation while maintaining a historical record of player engagement.

## Core Components

### 1. Database Tables
- `player_xp`: Stores current XP values for each player
- `players`: Contains player statistics including caps, bonuses, penalties, and streaks
- `games`: Stores game information and completion status
- `game_registrations`: Tracks player participation in games

### 2. Key Functions

#### calculate_player_xp(player_id UUID)
The primary XP calculation function that determines a player's current XP based on their game history.

##### Base XP Weighting System
Recent games are weighted more heavily in the XP calculation:
| Games Ago    | XP Value |
|--------------|----------|
| Current game | 20 XP    |
| 2-3 games    | 18 XP    |
| 4-5 games    | 16 XP    |
| 6-10 games   | 14 XP    |
| 11-20 games  | 12 XP    |
| 21-30 games  | 10 XP    |
| 31-40 games  | 5 XP     |
| 41+ games    | 0 XP     |

##### Streak Multiplier
- Players receive a 10% bonus for each streak level
- Formula: `1 + (current_streak * 0.1)`
- Example: A streak of 3 results in a 1.3x multiplier

##### Final XP Calculation
```sql
final_xp = ROUND(base_xp * streak_multiplier)
```
- Cannot be negative (minimum of 0)
- Result is rounded to the nearest integer

### 3. Automatic Updates

The XP system automatically recalculates when:
- A player registers for a game (INSERT trigger)
- A game registration is updated (UPDATE trigger)

This is handled by the `handle_game_registration_xp()` trigger function.

### 4. Legacy System
There exists a legacy XP calculation that uses a simpler formula:
```sql
xp = caps × MAX(10 + bonuses - penalties + streak, 1)
```
This version is deprecated and not used by the current trigger system.

## Implementation Details

### Trigger System
```sql
CREATE OR REPLACE FUNCTION handle_game_registration_xp()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM calculate_player_xp(NEW.player_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Database Updates
- XP calculations are stored in the `player_xp` table
- Each update includes a timestamp (`last_calculated`)
- Updates use UPSERT (INSERT ... ON CONFLICT) to ensure data consistency

## Best Practices

1. **XP Calculation**
   - Only completed games are considered in XP calculations
   - Historical games beyond 40 games ago don't contribute to XP
   - Streaks provide multiplicative bonuses to encourage consistent participation

2. **Data Integrity**
   - All XP updates are atomic through database transactions
   - The system maintains a timestamp of the last calculation
   - Negative XP values are impossible due to the GREATEST(0, value) check

3. **Performance**
   - Calculations are triggered only when necessary (game registration events)
   - The weighted system efficiently handles large game histories
   - Indexed queries ensure optimal performance

## Technical Notes

- The system is implemented in PostgreSQL using PL/pgSQL
- All calculations happen server-side in the database
- The trigger system ensures XP is always up-to-date
- The weighting system allows for future adjustments to XP values