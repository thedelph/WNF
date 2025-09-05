# Beta Tester Feature

## Overview

The Beta Tester feature allows administrators to grant early access to new features for selected users. This enables controlled rollout of experimental features and gathering feedback from trusted users before general release.

**Implementation Date:** 2025-09-05

## Architecture

### Database Schema

The feature adds a single column to the `players` table:

```sql
ALTER TABLE players 
ADD COLUMN is_beta_tester BOOLEAN DEFAULT FALSE;
```

An index is created for efficient querying:
```sql
CREATE INDEX idx_players_is_beta_tester ON players(is_beta_tester) 
WHERE is_beta_tester = true;
```

### Components

#### 1. useBetaTester Hook
**Location:** `/src/hooks/useBetaTester.tsx`

Custom React hook that checks if the current authenticated user has beta tester status.

```typescript
interface BetaTesterStatus {
  isBetaTester: boolean
  loading: boolean
  error: Error | null
}
```

**Usage:**
```typescript
const { isBetaTester, loading } = useBetaTester();
```

#### 2. BetaTesterManagement Component
**Location:** `/src/components/admin/utils/BetaTesterManagement.tsx`

Admin interface for managing beta testers with the following features:
- Search and filter players
- Toggle individual beta status
- Bulk selection and operations
- Real-time beta tester count
- Responsive design for mobile and desktop

**Key Features:**
- **Search:** Filter players by name
- **Filter:** Show only beta testers or all players
- **Bulk Operations:** Select multiple players and update their status simultaneously
- **Visual Feedback:** Toast notifications for all operations

#### 3. BetaFeature Wrapper Component
**Location:** `/src/components/BetaFeature.tsx`

Wrapper component for gating features behind beta access.

**Props:**
```typescript
interface BetaFeatureProps {
  children: React.ReactNode       // Content for beta testers
  fallback?: React.ReactNode      // Content for non-beta users
  showMessage?: boolean            // Show "Beta feature" message
  allowAdmins?: boolean            // Allow admin bypass
}
```

## Usage Guide

### For Administrators

#### Managing Beta Testers

1. Navigate to Admin Portal → Account Management
2. Scroll to the "Beta Tester Management" section
3. Use the interface to:
   - **Search:** Type player names to filter the list
   - **Toggle Individual:** Click the toggle switch next to any player
   - **Bulk Update:** Select multiple players using checkboxes, then click "Add to Beta" or "Remove from Beta"
   - **View Count:** The yellow badge shows total active beta testers

#### Best Practices
- Start with a small group of trusted users
- Monitor feedback and bug reports from beta testers
- Gradually expand the beta group as features stabilize
- Remove beta access once features are generally available

### For Developers

#### Gating a Feature

Basic usage with default settings:
```tsx
import BetaFeature from '../components/BetaFeature';

function MyComponent() {
  return (
    <BetaFeature>
      <NewExperimentalFeature />
    </BetaFeature>
  );
}
```

Custom fallback content:
```tsx
<BetaFeature fallback={<div>Coming soon!</div>}>
  <NewFeature />
</BetaFeature>
```

Beta-only (no admin bypass):
```tsx
<BetaFeature allowAdmins={false}>
  <StrictBetaFeature />
</BetaFeature>
```

Hide lock message:
```tsx
<BetaFeature showMessage={false}>
  <SilentBetaFeature />
</BetaFeature>
```

#### Programmatic Access Check

```tsx
import { useBetaTester } from '../hooks/useBetaTester';

function MyComponent() {
  const { isBetaTester, loading } = useBetaTester();
  
  if (loading) return <Spinner />;
  
  if (isBetaTester) {
    // Show beta features
    return <BetaContent />;
  }
  
  // Show regular content
  return <RegularContent />;
}
```

#### Combining with Admin Status

```tsx
import { useBetaTester } from '../hooks/useBetaTester';
import { useAdmin } from '../hooks/useAdmin';

function MyComponent() {
  const { isBetaTester } = useBetaTester();
  const { isAdmin } = useAdmin();
  
  const hasAccess = isBetaTester || isAdmin;
  
  if (hasAccess) {
    return <FeatureContent />;
  }
  
  return <LockedContent />;
}
```

## Visual Indicators

### Player Lists
Beta testers are identified with a yellow "Beta" badge in:
- Admin player management (`/admin/players`)
- Beta tester management interface
- Any custom player lists that include the `is_beta_tester` field

### Beta Features
When using the `BetaFeature` wrapper:
- Beta testers (non-admins) see a small "Beta" badge on the feature
- Non-beta users see a warning message (unless `showMessage={false}`)
- Admins see features without any beta indicators (when `allowAdmins={true}`)

## Security Considerations

1. **Database Level:**
   - Only authenticated users can read beta tester status
   - Only admin operations can modify beta tester status
   - RLS policies enforce these restrictions

2. **Client Side:**
   - Beta status is checked server-side via Supabase
   - Client-side checks are for UI/UX only
   - Never rely solely on client-side beta checks for sensitive features

3. **Best Practices:**
   - Always validate beta access server-side for API calls
   - Use feature flags in addition to beta testing for more control
   - Log beta feature usage for monitoring and debugging

## Migration and Rollback

### Enabling a User as Beta Tester
```sql
UPDATE players 
SET is_beta_tester = true 
WHERE friendly_name = 'John Doe';
```

### Disabling All Beta Testers
```sql
UPDATE players 
SET is_beta_tester = false 
WHERE is_beta_tester = true;
```

### Finding All Beta Testers
```sql
SELECT friendly_name, caps 
FROM players 
WHERE is_beta_tester = true 
ORDER BY friendly_name;
```

## Troubleshooting

### Common Issues

1. **Beta status not updating:**
   - Check browser console for errors
   - Verify user has proper authentication
   - Clear browser cache and refresh

2. **Feature still visible after removing beta access:**
   - Users may need to log out and back in
   - Check if `allowAdmins={true}` is bypassing beta requirement
   - Verify the database update was successful

3. **Bulk operations failing:**
   - Check for RLS policy restrictions
   - Verify admin status of current user
   - Check network connectivity

### Debug Queries

Check a specific user's beta status:
```sql
SELECT id, friendly_name, is_beta_tester, is_admin 
FROM players 
WHERE user_id = '[USER_UUID]';
```

View beta tester statistics:
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_beta_tester = true) as beta_count,
  COUNT(*) as total_players,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_beta_tester = true) / COUNT(*), 2) as beta_percentage
FROM players;
```

## Future Enhancements

Potential improvements for the beta tester system:

1. **Beta Feature Registry:** Central configuration for all beta features
2. **Expiration Dates:** Automatic removal from beta after certain period
3. **Feature-Specific Access:** Grant beta access to specific features only
4. **Feedback Integration:** Built-in feedback mechanism for beta testers
5. **Analytics:** Track beta feature usage and engagement
6. **Invitation System:** Allow beta testers to invite others
7. **A/B Testing:** Integrate with A/B testing framework
8. **Role Levels:** Different beta access levels (alpha, beta, preview)

## Related Documentation

- [Role-Based Access Control](./RoleBasedAccessControl.md) - Admin permission system
- [useAdmin Hook](/src/hooks/useAdmin.tsx) - Admin status checking
- [Account Management](/src/pages/admin/AccountManagement.tsx) - Admin interface