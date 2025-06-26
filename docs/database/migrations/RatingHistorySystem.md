# Rating History System

## Overview
Implemented a comprehensive rating history tracking system to show rating changes in the UI.

## Database Structure

### player_ratings_history Table
```sql
CREATE TABLE player_ratings_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rating_id UUID NOT NULL REFERENCES player_ratings(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES players(id),
  rated_player_id UUID NOT NULL REFERENCES players(id),
  attack_rating NUMERIC,
  defense_rating NUMERIC,
  game_iq_rating NUMERIC,
  changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  change_type VARCHAR(10) CHECK (change_type IN ('INSERT', 'UPDATE'))
);
```

### Trigger Function
Automatically logs all rating changes:
- Captures INSERT operations (new ratings)
- Captures UPDATE operations (only when values actually change)
- Stores the new values and timestamp

### Security
- Row Level Security (RLS) enabled
- Two policies implemented:
  - **INSERT**: Allows trigger to insert history records
  - **SELECT**: Only admins can view rating history
- Table owned by postgres to ensure trigger functionality
- Inherits player references for data integrity

## UI Features

### Change Indicators
- **Green arrow up (🟢↑)**: Rating increased with amount shown (e.g., "+2")
- **Red arrow down (🔴↓)**: Rating decreased with amount shown (e.g., "-1")
- **No indicator**: First-time rating or no change

### Recent Activity
- Shows last 10 ratings with change indicators
- User-specific filtering available
- Mobile-responsive design

## Implementation Date
Created: 2025-06-27

## RLS Policy Fix
Initial implementation had RLS policy blocking trigger inserts. Fixed by:
1. Adding "Allow trigger to insert history" policy for INSERT operations
2. Maintaining "Admins can view rating history" policy for SELECT operations
3. Setting table owner to postgres for proper trigger execution

## Future Enhancements
- Track who made changes (for audit purposes)
- Create analytics views for rating trends
- Add cleanup job for old history (>1 year)
- Export rating history reports