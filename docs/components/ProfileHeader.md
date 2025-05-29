# ProfileHeader Component

## Overview
The `ProfileHeader` component displays a user's profile information in a visually appealing header section. It shows the player's avatar, name, XP, rarity badge, and rank. It also provides a "Change Password" button that allows users to initiate the password change process.

## Component Structure

```tsx
export default function ProfileHeader({ 
  profile, 
  onEditClick,
  onAvatarEditClick,
  onPasswordResetClick
}: ProfileHeaderProps)
```

### Props
- `profile`: ExtendedPlayerData containing the player's information
- `onEditClick`: Function to handle editing the player's profile information
- `onAvatarEditClick`: Function to handle editing the player's avatar
- `onPasswordResetClick`: Function to handle initiating the password reset process

## Features

### Responsive Design
The component is designed to display optimally on both mobile and desktop viewports:
- On mobile: Profile information is centered for better readability
- On desktop: Information is left-aligned following standard UI patterns

### Avatar Display
- Displays the player's avatar image if available
- Provides a fallback with the first letter of the player's name if no avatar is set
- Shows an edit overlay when hovering over the avatar
- Connected to the avatar editing functionality via the `onAvatarEditClick` prop

### Player Information
- Displays the player's friendly name prominently
- Shows the player's XP in a badge format
- Displays the player's rarity tier as a color-coded badge
- Shows the player's rank with a shield icon

### Password Change Button
The component includes a "CHANGE PASSWORD" button in two locations for optimal UX:

#### Desktop Version (sm and larger screens)
```tsx
<div className="hidden sm:block absolute top-4 right-4">
  <Tooltip content="Change your password">
    <button 
      onClick={onPasswordResetClick}
      className="btn btn-outline btn-xs h-8 px-2"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg /* lock icon */></svg>
      <span>CHANGE PASSWORD</span>
    </button>
  </Tooltip>
</div>
```

#### Mobile Version (screens smaller than sm)
```tsx
<div className="sm:hidden mt-2 flex justify-center">
  <Tooltip content="Change your password">
    <button 
      onClick={onPasswordResetClick}
      className="btn btn-outline btn-xs gap-1 px-2"
      style={{ height: '26px', display: 'inline-flex', alignItems: 'center' }}
    >
      <svg /* lock icon */></svg>
      <span>CHANGE PASSWORD</span>
    </button>
  </Tooltip>
</div>
```

### Animations
The component uses Framer Motion for entrance animations, giving the header a polished appearance when it loads:
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3 }}
  className="bg-base-200 rounded-box p-8 shadow-lg mb-6 relative"
>
```

## Technical Implementation

### Rarity Badge Colorization
The component uses a helper function `getRarityBadgeClass` to determine the appropriate badge color based on the player's rarity tier:

```tsx
const getRarityBadgeClass = (rarity: string): string => {
  switch (rarity) {
    case 'Legendary':
      return 'badge-warning'; // Gold/yellow for top 2%
    case 'World Class':
      return 'badge-secondary'; // Purple for top 7%
    case 'Professional':
      return 'badge-accent'; // Teal/green for top 20%
    case 'Semi Pro':
      return 'badge-info'; // Blue for top 40%
    case 'Amateur':
      return 'badge-neutral'; // Gray for any XP > 0
    case 'Retired':
      return 'badge-ghost'; // Transparent for 0 XP
    default:
      return 'badge-ghost';
  }
};
```

### Responsive Layout
The component uses Tailwind CSS breakpoint classes to create different layouts for mobile and desktop views:
- `text-center sm:text-left` - Centers text on mobile, left-aligns on desktop
- `items-center sm:items-start` - Centers items on mobile, starts from left on desktop
- `justify-center sm:justify-start` - Centers content on mobile, left-aligns on desktop
- `flex-col sm:flex-row` - Stacks vertically on mobile, horizontally on desktop

### Password Change Integration
The component delegates the actual password change functionality to parent components via the `onPasswordResetClick` prop. This maintains separation of concerns:
- The header contains only the button to initiate the process
- The actual password change UI and logic are handled elsewhere

## Usage Example

```tsx
// In Profile.tsx
import ProfileHeader from '../components/profile/ProfileHeader'

// Component state
const [showPasswordReset, setShowPasswordReset] = useState(false)

// Render ProfileHeader
<ProfileHeader
  profile={profile}
  onEditClick={() => setShowEditModal(true)}
  onAvatarEditClick={() => setShowAvatarCreator(true)}
  onPasswordResetClick={() => setShowPasswordReset(true)}
/>

// Password change section appears when showPasswordReset is true
```

## Accessibility Considerations
- The password change button includes a tooltip to clarify its purpose
- The button is sized appropriately for easy clicking/tapping
- The button includes both an icon and text for clear identification
- Contrast ratios meet accessibility standards for readability
