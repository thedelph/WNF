# Playstyle Feature Visibility Issue (2025-09-22)

## Problem Summary
The playstyle rating feature is visible to all users but not functional for them. Regular users can see the PlaystyleSelector component when rating players, but their playstyle selections are not being saved to the database. Only beta testers and super admins can actually save playstyle data.

## Investigation Findings

### 1. Database Analysis
Checked recent `player_ratings` entries:
- **Recent ratings (Sept 20, 2025)**: All playstyle-related columns are NULL
  - `playstyle_id`: NULL
  - `has_pace`, `has_shooting`, `has_passing`, `has_dribbling`, `has_defending`, `has_physical`: all NULL
- **Older beta tester ratings (Sept 8, 2025)**: Properly populated with playstyle data
  - Example: Dave's rating of Michael D includes full playstyle data

### 2. Feature Flag Configuration
The `playstyle_ratings` feature flag in the database shows:
- **Status**: Active (`is_active: true`)
- **Enabled for**: `["production", "beta", "super_admin"]`
- **Rollout percentage**: 100%
- **Updated**: 2025-09-17 (when it was supposedly made available to all users)

### 3. Code Analysis

#### PlaystyleSelector Component (`/src/components/ratings/PlaystyleSelector.tsx`)
- The component itself has NO restrictions
- It's a pure UI component that accepts props and renders for anyone

#### Ratings Page (`/src/pages/Ratings.tsx`)
The issue is in the Ratings page where the component is used:

**Line 650-653**: PlaystyleSelector is rendered without any conditional
```tsx
<PlaystyleSelector
  selectedAttributes={selectedAttributes}
  onAttributesChange={setSelectedAttributes}
/>
```

**Lines 414-448**: Saving logic is restricted to beta testers/super admins only
```tsx
if ((currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && selectedAttributes) {
  // Save playstyle data to database
  ratingData.has_pace = selectedAttributes.has_pace || false;
  ratingData.has_shooting = selectedAttributes.has_shooting || false;
  // ... etc
}
```

**Other restricted areas**:
- Lines 555-560: Playstyle sorting options
- Lines 584-590: Playstyle filter options
- Lines 709-740: Playstyle display on player cards

## Root Cause
The code uses hardcoded `is_beta_tester` and `is_super_admin` checks instead of the feature flag system. When the feature was "released to production" on 2025-09-17, only the feature flag was updated, but the code still has the old beta restrictions.

## Solution

### Required Changes to `/src/pages/Ratings.tsx`

#### 1. Add Import
```tsx
import { useFeatureFlag } from '../hooks/useFeatureFlag';
```

#### 2. Add Feature Flag Hook (around line 52)
```tsx
const { isEnabled: playstyleFeatureEnabled } = useFeatureFlag('playstyle_ratings');
```

#### 3. Replace Beta Tester Checks

**Lines 414-448** - Replace:
```tsx
if ((currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && selectedAttributes) {
```
With:
```tsx
if (playstyleFeatureEnabled && selectedAttributes) {
```

**Lines 439** - Replace:
```tsx
} else if ((currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin)) {
```
With:
```tsx
} else if (playstyleFeatureEnabled) {
```

**Lines 555-560** - Replace:
```tsx
{(currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && filterOption !== 'unrated' && (
```
With:
```tsx
{playstyleFeatureEnabled && filterOption !== 'unrated' && (
```

**Lines 584-590** - Replace:
```tsx
{(currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && (
```
With:
```tsx
{playstyleFeatureEnabled && (
```

**Lines 709-740** - Replace:
```tsx
{(currentPlayer?.is_beta_tester || currentPlayer?.is_super_admin) && (() => {
```
With:
```tsx
{playstyleFeatureEnabled && (() => {
```

## Testing After Fix

1. **Test with regular user account**:
   - Login as a non-beta, non-admin user
   - Go to Ratings page
   - Rate a player with playstyle attributes
   - Submit the rating

2. **Verify in database**:
   ```sql
   SELECT
     pr.rated_player_id,
     pr.rater_id,
     pr.attack_rating,
     pr.defense_rating,
     pr.game_iq_rating,
     pr.playstyle_id,
     pr.has_pace,
     pr.has_shooting,
     pr.has_passing,
     pr.has_dribbling,
     pr.has_defending,
     pr.has_physical,
     pr.created_at,
     p.friendly_name as player_name,
     r.friendly_name as rater_name
   FROM player_ratings pr
   JOIN players p ON pr.rated_player_id = p.id
   JOIN players r ON pr.rater_id = r.id
   WHERE pr.created_at > '2025-09-22'
   ORDER BY pr.created_at DESC;
   ```

3. **Check that playstyle columns are populated** (not NULL)

## Additional Notes

### Why This Happened
The feature was initially implemented with beta restrictions using direct `is_beta_tester` checks. When it was time to release to production, the team updated the feature flag configuration but forgot to update the code to actually use the feature flag system instead of the hardcoded checks.

### Related Files
- `/docs/features/PlaystyleRatingSystem.md` - Main documentation states it's "Live for all users (as of 2025-09-17)"
- `/src/hooks/useFeatureFlag.tsx` - The feature flag hook that should be used
- `/src/components/ratings/PlaystyleSelector.tsx` - The UI component (working correctly)
- `/src/pages/Ratings.tsx` - The page with the issue (needs fixes)

### Migration Consideration
Once fixed, you may want to:
1. Notify users that the feature is now working
2. Encourage them to re-submit ratings with playstyles
3. Consider a one-time migration to populate missing playstyle data for recent ratings (though this might not be accurate)

### Timeline
- 2025-09-05: Playstyle system implemented (beta only)
- 2025-09-12: Feature flag system added
- 2025-09-17: Feature supposedly released to all users (feature flag updated)
- 2025-09-20: Users submitting ratings without playstyle data being saved
- 2025-09-22: Issue discovered and documented