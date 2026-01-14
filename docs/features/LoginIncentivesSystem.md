# Login Incentives System

**Last Updated:** January 14, 2026
**Version:** 1.0

## Overview

The Login Incentives System encourages non-logged-in users to create accounts by:
1. Showing blurred/locked personalized content with login CTAs
2. Highlighting logged-in user's data in stats/leaderboards with a "You" badge
3. Adding registration CTAs on game pages
4. Redirecting users back to their original page after login/signup

## Features

### 1. Locked Content (Blurred Sections)

Non-logged-in users see personalized sections as blurred skeleton placeholders with a login overlay.

**Affected Sections (PlayerProfile page):**
- Your Chemistry - Shows chemistry stats with the viewed player
- Your Rivalry - Shows head-to-head record against the viewed player
- Your Team History - Shows how often you play with/against the viewed player

#### LockedContent Component

**Location:** `src/components/ui/LockedContent.tsx`

```typescript
interface LockedContentProps {
  children: React.ReactNode;      // Skeleton placeholder content
  title?: string;                 // e.g., "Your Chemistry with Player"
  description?: string;           // e.g., "Log in to see how you perform together"
  blurIntensity?: 'sm' | 'md' | 'lg';  // Default: 'md'
}
```

**Usage:**
```tsx
import { LockedContent } from '@/components/ui/LockedContent';
import { PairChemistryCardSkeleton } from '@/components/profile/ProfileSkeletons';

{!user ? (
  <LockedContent
    title="Your Chemistry"
    description={`Log in to see how you perform with ${player.friendly_name}`}
  >
    <PairChemistryCardSkeleton />
  </LockedContent>
) : (
  <PairChemistryCard ... />
)}
```

**Visual Design:**
- Blurred content layer with `blur-md` (configurable)
- Semi-transparent overlay: `bg-base-100/80 backdrop-blur-sm`
- Lock icon with title and description
- Primary "Log in" button and ghost "Sign up" link
- Both links include redirect state for return navigation

#### Skeleton Placeholders

**Location:** `src/components/profile/ProfileSkeletons.tsx`

Three skeleton components that match the structure of actual cards:
- `PairChemistryCardSkeleton` - W/D/L placeholders with animated bars
- `RivalryCardSkeleton` - Head-to-head placeholder layout
- `TeamHistorySkeleton` - Teammate/opponent placeholder layout

---

### 2. User Highlighting ("You" Badge)

Logged-in users see their own entries highlighted across stats and leaderboard pages.

**Visual Indicators:**
- Row highlighting: `bg-primary/10 ring-2 ring-primary/30 ring-inset`
- Card highlighting (mobile): `bg-primary/15 ring-2 ring-primary/40`
- "You" badge: `<span className="badge badge-primary badge-sm">You</span>`

#### Components Updated

| Component | Location | Description |
|-----------|----------|-------------|
| ComprehensiveStatsTable | `src/components/stats/` | Desktop table rows + mobile cards |
| AwardCard | `src/components/stats/` | Award winner highlighting |
| StatsCard | `src/components/stats/` | Win rate leaderboard highlighting |
| HighestXPCard | `src/components/stats/` | XP leaderboard highlighting |
| AwardPodium | `src/components/awards/` | Hall of Fame highlighting |

#### Implementation Pattern

```typescript
import { useUser } from '@/hooks/useUser';

const { player: currentPlayer } = useUser();

// Check if current row/item belongs to logged-in user
const isCurrentUser = player.id === currentPlayer?.id;

// Apply highlighting (only when logged in)
<tr className={isCurrentUser ? 'bg-primary/10 ring-2 ring-primary/30 ring-inset font-medium' : ''}>
  <td>
    {player.friendlyName}
    {isCurrentUser && <span className="badge badge-primary badge-sm ml-2">You</span>}
  </td>
</tr>
```

**Important:** Always check that `currentPlayer` exists before comparing to prevent highlighting all rows when not logged in:

```typescript
// Correct - only highlights when logged in
const isCurrentUser = currentPlayer?.friendly_name
  ? currentPlayer.friendly_name === playerName
  : false;
```

---

### 3. Game Registration CTAs

Non-logged-in users see prominent cards encouraging them to log in to register for games.

**Components Updated:**
- `RegisteredPlayerGrid.tsx` - Shows CTA when viewing open registrations
- `PlayerSelectionResults.tsx` - Shows CTA when viewing selection results

#### CTA Design

```tsx
{!user && (
  <div className="card bg-gradient-to-br from-primary/20 to-secondary/20
                  border border-primary/30 shadow-lg">
    <div className="card-body items-center text-center py-8">
      <FaUserPlus className="text-4xl text-primary mb-2" />
      <h3 className="card-title">Want to play?</h3>
      <p className="text-base-content/70">
        Log in to register your interest for this game
      </p>
      <div className="card-actions mt-4">
        <Link to="/login" state={{ from: location.pathname }} className="btn btn-primary gap-2">
          <FaSignInAlt /> Log in
        </Link>
        <Link to="/register" state={{ from: location.pathname }} className="btn btn-ghost">
          Sign up
        </Link>
      </div>
    </div>
  </div>
)}
```

---

### 4. Redirect-Back Functionality

After login or signup, users are automatically redirected to the page they were viewing.

#### Implementation

**1. Pass location state from CTA links:**
```tsx
import { Link, useLocation } from 'react-router-dom';

const location = useLocation();

<Link to="/login" state={{ from: location.pathname }}>
  Log in
</Link>
```

**2. Retrieve and use redirect path in Login page:**
```tsx
// src/pages/Login.tsx
const location = useLocation();
const from = (location.state as { from?: string })?.from || '/';

// After successful login:
navigate(from, { replace: true });
```

**3. Pass through Register flow:**
```tsx
// src/pages/Register.tsx
const from = (location.state as { from?: string })?.from || '/';

<RegistrationForm redirectTo={from} />

// src/features/auth/hooks/useRegistration.ts
navigate('/login', { state: { from: redirectTo } });
```

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/ui/LockedContent.tsx` | Reusable blur overlay with login CTA |
| `src/components/profile/ProfileSkeletons.tsx` | Skeleton placeholders for locked sections |

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Login.tsx` | Redirect-back functionality |
| `src/pages/Register.tsx` | Redirect-back functionality |
| `src/pages/PlayerProfile.tsx` | LockedContent wrappers for personalized sections |
| `src/features/auth/components/RegistrationForm.tsx` | redirectTo prop support |
| `src/features/auth/hooks/useRegistration.ts` | Redirect state passing |
| `src/components/stats/ComprehensiveStatsTable.tsx` | User highlighting + "You" badge |
| `src/components/stats/AwardCard.tsx` | User highlighting |
| `src/components/stats/StatsCard.tsx` | User highlighting |
| `src/components/stats/HighestXPCard.tsx` | User highlighting |
| `src/components/awards/AwardPodium.tsx` | Hall of Fame highlighting |
| `src/components/game/RegisteredPlayerGrid.tsx` | Login CTA card |
| `src/components/games/PlayerSelectionResults.tsx` | Login CTA card |

---

## Design Decisions

1. **Skeleton placeholders vs blurred real data:** Skeletons were chosen to avoid misleading users with fake data while still showing the shape of what they'd see.

2. **Subtle highlighting vs bold highlighting:** A subtle ring + badge approach was chosen to be noticeable but not overwhelming.

3. **Redirect-back vs always to home:** Redirect-back improves UX by returning users to their context after authentication.

4. **"You" badge placement:** Placed inline with the player name to clearly identify the user's own entry without breaking layout.

---

## Related Documentation

- [Auth Error Logging](/docs/features/AuthErrorLogging.md) - Troubleshooting auth issues
- [Player Chemistry](/docs/features/PlayerChemistry.md) - Chemistry system (locked for non-users)
- [Rivalry System](/docs/features/RivalrySystem.md) - Rivalry system (locked for non-users)
