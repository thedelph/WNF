# Rating Activity Tracking

## Overview
Comprehensive rating activity tracking system that shows recent rating changes with visual indicators and user-specific filtering.

## Features

### Recent Activity Section
Located at the top of the Admin Ratings page, displays:
- Last 10 rating activities across all players
- Visual change indicators for rating updates
- Time since activity (e.g., "2 hours ago")
- Clickable items to jump to player details

### Change Indicators
Visual feedback for rating changes:
- **🟢 ↑ +X**: Green arrow with positive value for increases
- **🔴 ↓ -X**: Red arrow with negative value for decreases
- **No indicator**: First-time rating or no change

Example display:
```
John rated Sarah
ATT: 7.0 🟢↑+2  DEF: 5.0 🔴↓-1  IQ: 6.0
2 hours ago
```

### User-Specific Activity
When in "Ratings Given" tab:
1. Select a rater from the list
2. Recent Activity section updates to show only that rater's activities
3. Title changes to "Recent Activity by [Rater Name]"

## Mobile Responsiveness
- Responsive layout that stacks on mobile devices
- Touch-friendly tap targets
- Abbreviated labels on smaller screens
- Horizontal badges for rating values

## Technical Implementation

### Database Structure
- `player_ratings_history` table tracks all changes
- Automatic trigger logs INSERT and UPDATE operations
- RLS policies ensure security while allowing trigger operations

### Frontend Components
- `RecentActivity.tsx`: Main display component
- `useRecentRatings.ts`: Hook for fetching rating data with history
- Rating change calculations done client-side

### Performance
- Indexed queries for fast lookups
- Limited to 10 most recent items
- Efficient history fetching with single query per rating

## Usage Tips
1. Check recent activity regularly to monitor rating patterns
2. Use user-specific filtering to audit individual rater behavior
3. Click on activities to quickly navigate to full rating details
4. Watch for unusual patterns (e.g., drastic changes)

## Future Enhancements
- Export activity logs
- Activity notifications
- Trend analysis charts
- Batch rating review tools