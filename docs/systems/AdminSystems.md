# Admin Systems Overview

**Last Updated:** 2025-11-17

This document covers the admin-facing systems in WNF: Role-Based Access Control (RBAC), View As feature, and Feature Flag Management.

---

## 🔐 Role-Based Access Control (RBAC)

**Implemented:** 2025-06-26

### Overview

RBAC provides granular permission control for admin users, allowing fine-tuned access to different system areas.

### Database Schema

**Tables:**
- `roles` - Named role definitions (Super Admin, Full Admin, Treasurer, etc.)
- `role_permissions` - Maps roles to specific permissions
- `admin_roles` - Assigns roles to users (includes `role_id` column)

**Backward Compatibility:**
- Existing `is_admin` and `is_super_admin` flags still work
- New role-based permissions overlay on top

### Default Roles

1. **Super Admin**
   - All permissions
   - Can manage admins and ratings
   - Red badge in UI

2. **Full Admin**
   - All permissions except admin/ratings management
   - Blue badge in UI

3. **Treasurer**
   - Payments only
   - Purple badge with "Treasurer" label

4. **Team Manager**
   - Games and teams only
   - Purple badge with "Team Manager" label

5. **Player Manager**
   - Players and tokens only
   - Purple badge with "Player Manager" label

### Permissions

10 available permissions (defined in `/src/types/permissions.ts`):

```typescript
export const PERMISSIONS = {
  MANAGE_GAMES: 'manage_games',
  MANAGE_PLAYERS: 'manage_players',
  MANAGE_TEAMS: 'manage_teams',
  MANAGE_PAYMENTS: 'manage_payments',
  MANAGE_HISTORY: 'manage_history',
  MANAGE_TOKENS: 'manage_tokens',
  MANAGE_ACCOUNTS: 'manage_accounts',
  MANAGE_SLOTS: 'manage_slots',
  MANAGE_ADMINS: 'manage_admins',      // Super admins only
  MANAGE_RATINGS: 'manage_ratings'      // Super admins only
} as const;
```

### Permission Checking

Use the `useAdmin` hook to check permissions:

```typescript
import { useAdmin } from '@/hooks/useAdmin';
import { PERMISSIONS } from '@/types/permissions';

function PaymentDashboard() {
  const { hasPermission, permissions } = useAdmin();

  // Check single permission
  if (!hasPermission(PERMISSIONS.MANAGE_PAYMENTS)) {
    return <div>Unauthorized</div>;
  }

  // Access all permissions array
  console.log(permissions); // ['manage_games', 'manage_players', ...]

  return <div>Payment Dashboard Content</div>;
}
```

### Admin Portal Integration

The admin portal automatically shows/hides sections based on permissions:

```typescript
// Admin portal navigation
{hasPermission(PERMISSIONS.MANAGE_GAMES) && (
  <Link to="/admin/games">Games</Link>
)}
{hasPermission(PERMISSIONS.MANAGE_PAYMENTS) && (
  <Link to="/admin/payments">Payments</Link>
)}
{hasPermission(PERMISSIONS.MANAGE_ADMINS) && (
  <Link to="/admin/admins">Admin Management</Link>
)}
```

### Admin Fetching Pattern

Admins are fetched using two queries combined in memory:

```typescript
// 1. Fetch all players
const { data: allPlayers } = await supabase
  .from('players')
  .select('*');

// 2. Fetch admin roles (includes both old flags and new role_id)
const { data: adminRoles } = await supabase
  .from('admin_roles')
  .select('*, roles(*, role_permissions(*))');

// 3. Combine to get full admin objects with player data
const admins = adminRoles.map(adminRole => {
  const player = allPlayers.find(p => p.id === adminRole.player_id);
  return { ...player, ...adminRole };
});
```

This pattern handles both:
- Legacy admins (is_admin/is_super_admin flags)
- New role-based admins (role_id with permissions)

---

## 🎭 View As Feature

**Implemented:** 2025-06-26

### Overview

Allows super admins to emulate other admin users' permissions for testing and debugging.

### Access

**Admin Portal → Admin Management → Select Admin Card → "View As" Button**

### Implementation

**Context:** `ViewAsContext` (`/src/context/ViewAsContext.tsx`)

```typescript
interface ViewAsContextType {
  viewingAsUser: Admin | null;
  startViewingAs: (admin: Admin) => void;
  stopViewingAs: () => void;
}

// Usage
const { viewingAsUser, startViewingAs, stopViewingAs } = useViewAs();
```

**Hook Integration:**

The `useAdmin` hook checks for View As overrides:

```typescript
export function useAdmin() {
  const { viewingAsUser } = useViewAs();
  const actualUser = useAuthenticatedUser();

  // If viewing as someone, use their permissions
  const activeUser = viewingAsUser || actualUser;

  return {
    isAdmin: activeUser.is_admin,
    isSuperAdmin: activeUser.is_super_admin,
    permissions: activeUser.permissions,
    hasPermission: (permission) => activeUser.permissions.includes(permission)
  };
}
```

### UI Indicator

**Component:** `ViewAsIndicator` (shows warning banner when active)

```typescript
function ViewAsIndicator() {
  const { viewingAsUser, stopViewingAs } = useViewAs();

  if (!viewingAsUser) return null;

  return (
    <div className="alert alert-warning">
      ⚠️ Viewing as: {viewingAsUser.friendly_name}
      <button onClick={stopViewingAs}>Exit View As Mode</button>
    </div>
  );
}
```

Banner appears at top of admin portal when active.

### Use Cases

- **Testing role permissions** without creating test accounts
- **Debugging permission issues** reported by other admins
- **Training new admins** by showing what they can/cannot see
- **Verifying UI changes** across different permission levels

---

## 🎛️ Feature Flag Management

**Implemented:** 2025-09-12

### Overview

Comprehensive feature flag system for controlled rollouts, A/B testing, and emergency kill switches.

### Database Schema

**Tables:**

**`feature_flags`:**
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,              -- Internal key (e.g., 'playstyle_ratings')
  display_name TEXT NOT NULL,             -- User-friendly name
  description TEXT,
  enabled_for TEXT NOT NULL,              -- 'production' | 'beta' | 'admin' | 'super_admin'
  enabled_user_ids UUID[],                -- Specific user targeting
  rollout_percentage INTEGER DEFAULT 0,   -- 0-100 gradual rollout
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`feature_flag_audit`:**
```sql
CREATE TABLE feature_flag_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID REFERENCES feature_flags(id),
  admin_id UUID REFERENCES players(id),
  action TEXT,                            -- 'created' | 'updated' | 'deleted'
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enabled For Levels

1. **production** - All users
2. **beta** - Beta testers + admins + super admins
3. **admin** - Admins + super admins only
4. **super_admin** - Super admins only

### Feature Flag Hook

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const { isEnabled, isLoading } = useFeatureFlag('playstyle_ratings');

  if (isLoading) return <div>Loading...</div>;
  if (!isEnabled) return <div>Feature not available</div>;

  return <div>Feature content</div>;
}
```

**Hook checks:**
1. Feature flag is active (`is_active = true`)
2. User group matches `enabled_for` level
3. User ID in `enabled_user_ids` (if specified)
4. Rollout percentage (random check per session)

### BetaFeature Component

Backward-compatible wrapper component:

```typescript
// New way (feature flag)
<BetaFeature featureFlag="playstyle_ratings">
  <PlaystyleSelector />
</BetaFeature>

// Old way (still works, checks is_beta_tester column)
<BetaFeature>
  <LegacyBetaFeature />
</BetaFeature>
```

### Admin Interface

**Location:** `/admin/feature-flags`

**Features:**
- Create/edit/delete feature flags
- Toggle active/inactive (instant kill switch)
- Set rollout percentage (0-100 slider)
- Target specific users (multi-select)
- View audit history (who changed what, when)

**UI Components:**
- Feature flag cards with status badges
- Inline editing
- Confirmation dialogs for destructive actions
- Audit log table with change tracking

### Example Feature Flags

```typescript
// Playstyle ratings system
{
  name: 'playstyle_ratings',
  display_name: 'Playstyle Rating System',
  description: '24 playstyles with derived attributes',
  enabled_for: 'production',  // Live for all
  is_active: true
}

// Experimental formation suggester
{
  name: 'ai_formation_suggester',
  display_name: 'AI Formation Suggester',
  description: 'AI-powered tactical formation recommendations',
  enabled_for: 'beta',
  rollout_percentage: 25,  // 25% of beta testers
  is_active: true
}

// Admin-only debug tools
{
  name: 'debug_tools',
  display_name: 'Debug Tools',
  description: 'Advanced debugging and diagnostic tools',
  enabled_for: 'super_admin',
  is_active: true
}
```

### Benefits

1. **Gradual Rollouts** - Start with beta, expand to 10%, 50%, 100%
2. **Emergency Kill Switches** - Disable instantly without code deploy
3. **User Targeting** - Test with specific users before wider release
4. **A/B Testing** - Rollout percentage enables experimentation
5. **No Code Changes** - Enable/disable features via admin panel
6. **Audit Trail** - Full history of who changed what

### Migration from Beta Tester System

Old beta tester system (column `is_beta_tester` on `players`):
```typescript
// Old approach
if (user.is_beta_tester) {
  // Show feature
}
```

New feature flag system:
```typescript
// New approach (backward compatible)
const { isEnabled } = useFeatureFlag('feature_name');
if (isEnabled) {
  // Show feature
}
```

BetaFeature component accepts both:
```typescript
<BetaFeature featureFlag="new_feature">  {/* New way */}
<BetaFeature>                            {/* Old way - checks is_beta_tester */}
```

---

## 🎨 UI Patterns

### Admin Card Badges

**Role Indicators:**

```typescript
// Super Admin - Red
<div className="badge badge-error">Super Admin</div>

// Full Admin - Blue
<div className="badge badge-primary">Full Admin</div>

// Role-Based - Purple with role name
<div className="badge badge-secondary">{roleName}</div>
```

### Permission View Components

Use custom expandable sections (not DaisyUI collapse) for dynamic content:

```typescript
function ViewPermissions({ permissions }: { permissions: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        View Permissions ({permissions.length})
        <ChevronIcon className={isExpanded ? 'rotate-180' : ''} />
      </button>

      {isExpanded && (
        <ul>
          {permissions.map(p => (
            <li key={p}>{formatPermission(p)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Why not DaisyUI collapse?**
- Rendering issues with dynamic content
- Custom implementation provides better control
- Smoother animations

### Responsive Admin Grids

```typescript
// Admin management grid: 1 col mobile, 2 med, 3 large, 4 xl
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {admins.map(admin => <AdminCard key={admin.id} admin={admin} />)}
</div>
```

---

## 🔗 Related Documentation

- [Role-Based Access Control](../features/RoleBasedAccessControl.md) - Detailed RBAC implementation
- [Beta Tester Feature](../features/BetaTesterFeature.md) - Legacy beta system
- [Database Patterns](DatabasePatterns.md) - RLS policies for admin tables
- [Core Development Patterns](CoreDevelopmentPatterns.md) - General coding patterns

---

## ✅ Admin System Checklist

When working with admin features:

**RBAC:**
- [ ] Used `useAdmin()` hook for permission checks
- [ ] Checked specific permission (not just `isAdmin`)
- [ ] Handled both legacy flags and new role system
- [ ] UI sections conditionally rendered based on permissions

**View As:**
- [ ] Super admin access only
- [ ] ViewAsIndicator shown when active
- [ ] Exit button clearly visible
- [ ] All permission checks respect View As context

**Feature Flags:**
- [ ] Feature flag created in database
- [ ] Used `useFeatureFlag()` hook properly
- [ ] Handled loading state
- [ ] Fallback content for disabled feature
- [ ] Appropriate `enabled_for` level set
- [ ] Audit logging working
