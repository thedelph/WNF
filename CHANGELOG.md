# Changelog

All notable changes to the WNF project will be documented in this file.

## [Unreleased]

### Enhanced - July 17, 2025
- **Team Balancing Tier Visualization Improvements**:
  - Player names now appear directly under each specific tier when clicked (instead of at the bottom)
  - Multiple tiers can be expanded simultaneously for easier comparison
  - Added "Expand All" and "Collapse All" buttons for tier pyramid view
  - Each tier maintains its own animation state to prevent re-animation issues
  - Smooth Framer Motion animations restored with proper isolation
  - Improved user experience with individual tier control

- **True Snake Draft Implementation**:
  - Fixed tier-based team balancing to use proper snake draft pattern
  - Randomly selects which team picks first (different each time)
  - Teams alternate who picks first in each tier (true snake draft)
  - Prevents same team from always getting highest-rated player
  - Pre-calculates and prevents team size imbalances (e.g., 10v8)
  - Smart adjustments ensure teams differ by at most 1 player
  - Debug log shows random selection and any balance adjustments

### Fixed - June 30, 2025
- **Game IQ Team Balancing Issues**:
  - Fixed Game IQ ratings not being fetched from database in team balancing interface
  - Fixed all players showing Game IQ as "5" instead of actual database values
  - Added Game IQ display to Optimal Team Generator summaries
  - Added Game IQ improvements to Swap Suggestion cards
  - Updated team stats calculations to include avgGameIq and totalGameIq
  - Fixed null value handling throughout team balancing components

### Enhanced - June 30, 2025
- **Team Balancing Algorithm Improvements**:
  - **Unknown Player Distribution**: Players with <10 games are now distributed evenly across teams
    - Added "NEW" badges for players with insufficient game history
    - Team headers show count of new players (e.g., "8 players, 3 new")
    - Prevents all unknowns clustering on one team which disabled win rate/goal differential metrics
  - **Deterministic Results**: Generate Optimal Teams now produces consistent results
    - Replaced random shuffling with deterministic optimization
    - Unknown players distributed based on their Attack/Defense/Game IQ ratings
    - Algorithm tries all possible distributions and selects the mathematically optimal one
  - **Confidence Score**: Added team balance confidence indicator
    - High (green): <25% unknown players
    - Medium (yellow): 25-50% unknown players
    - Low (red): >50% unknown players
    - Helps admins understand reliability of team balance

### Fixed - June 27, 2025
- **Player Rating Decimal Precision**: Fixed issue where average ratings were incorrectly stored as integers
  - Root cause: Bulk update during Game IQ implementation rounded most averages to whole numbers
  - Applied migration to recalculate all average ratings from individual ratings
  - Restored proper decimal precision (e.g., 5.71 instead of 6.0)
  - Affects `attack_rating`, `defense_rating`, and `game_iq` columns in players table

### Added - June 26, 2025
- **Role-Based Access Control (RBAC) System**: Granular permission management for admins
  - 5 default roles: Super Admin, Full Admin, Treasurer, Team Manager, Player Manager
  - 10 available permissions for fine-grained access control
  - Role management UI at `/admin/roles` (super admin only)
  - Backward compatible with existing `is_admin` and `is_super_admin` flags
  - Admin management page shows role badges and permission details

- **View As Feature**: Super admins can emulate other admin permissions
  - "View As" button in admin management page
  - Select any admin to see what they would see in the admin portal
  - Yellow warning banner shows when in "View As" mode
  - Exit button returns to normal permissions
  - Useful for testing and understanding different permission levels

### Added - June 26, 2025
- **Game IQ Rating System**: Third player rating metric alongside Attack and Defense
  - Measures tactical awareness, positioning, and decision-making abilities
  - 0-10 scale displayed as 0-5 stars (matching Attack/Defense ratings)
  - Database columns: `game_iq_rating` in player_ratings table
  - Database columns: `game_iq` and `average_game_iq_rating` in players table
  - Updated trigger function `update_player_average_ratings()` to calculate Game IQ averages
  
### Fixed - June 26, 2025
- **Game IQ Rating Fixes**:
  - Added Game IQ rating field to Edit Player admin page (`/admin/players/{id}/edit`)
  - Fixed Player Profile to display Game IQ in "Your Current Ratings" section
  - Fixed Admin Ratings page empty table issue - changed filtering from AND to OR logic
  - Added null value handling for all rating fields to prevent runtime errors
  - Added Game IQ filter controls to Admin Ratings filter panel
  - Updated all TypeScript interfaces to include `game_iq_rating` field
  - Fixed Admin Ratings "Ratings by [Player]" not showing Game IQ values - was missing from database query
  - Added `updated_at` column to `player_ratings` table with auto-update trigger to track modification dates

### Enhanced - June 26, 2025
- **Changelog Page Improvements**:
  - Added "Expand All" and "Collapse All" buttons for easier navigation
  - Buttons control both version entries and their internal sections
  - Maintains individual toggle control after using bulk actions
  - Added deep linking support with URL fragments (e.g., `/changelog#1.2.0`)
  - Linked versions auto-expand with all sections visible for easy sharing
  - Smooth scrolling to targeted version on page load
  
- **Rating Display Improvements**:
  - Unrated values now display as "unrated" instead of "0" or "NaN"
  - Created formatting utility functions in `/src/utils/ratingFormatters.ts`
  - Rating buttons show contextual text ("ADD GAME IQ RATING" when only Game IQ is missing)
  - Improved null value handling across all rating displays

- **Ratings Explanation Section**:
  - Added expandable/collapsible explanation component to ratings page
  - Uses Framer Motion for smooth animations (similar to XP Breakdown)
  - Explains Attack, Defense, and Game IQ rating criteria
  - Clarifies that ratings should consider both skill AND position tendency
  - Emphasizes importance of honest ratings without revealing algorithm specifics
  - Created new component: `/src/components/ratings/RatingsExplanation.tsx`
  
### Enhanced - June 26, 2025
- **Admin Players Page Mobile Improvements**:
  - Restructured header controls with mobile-first responsive layout
  - Search bar takes full width on mobile for better usability
  - Added mobile-specific "Select All" button since checkboxes are hidden
  - Responsive table columns - Caps and XP hidden on mobile to save space
  - Stacked layout for player information with inline badges on mobile
  - Improved touch targets with appropriate button sizing (btn-sm/btn-xs)
  - Reduced container padding on mobile for better space utilization
  - Abbreviated button labels on mobile (e.g., "Delete" instead of "Delete Selected")
  
- **Enhanced Team Balancing Algorithm**
  - Now considers 5 metrics with equal 20% weighting each:
    - Attack Rating (20%)
    - Defense Rating (20%) 
    - Game IQ Rating (20%)
    - Win Rate (20%)
    - Goal Differential (20%)
  - Swap recommendations include Game IQ impact
  - Balance score visualization updated to show all 5 metrics

- **UI Updates**
  - Rating modal now shows 3 star ratings (Attack, Defense, Game IQ)
  - Admin tables display Game IQ ratings with sorting/filtering
  - Team stats show Game IQ averages and differences
  - WhatsApp export includes Game IQ with 🧠 emoji
  - Player profiles display Game IQ ratings

### Changed
- Team balance calculations updated from 4 to 5 metrics
- All player rating interfaces updated to include Game IQ
- Documentation updated to reflect new rating system

## [Previous Releases]

### June 18, 2025
- **Academy Tier**: New player rarity for 0 caps and 0 XP (deep teal gradient)
- **Enhanced Team Announcement Phase**: Two-stage pasting process
- **Game Creation Updates**: Removed Attack/Defense from form, pitch cost now £54

### Earlier Updates
- See git history for previous changes