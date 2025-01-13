# Player Card Component

The Player Card component is a key UI element that displays player information in an interactive, flippable card format. It shows various player statistics, achievements, and status indicators.

## Component Structure

The Player Card system is split into several components for better maintainability:

- `PlayerCard.tsx` - Main container component that handles the card's state and animation
- `PlayerCardFront.tsx` - Front face of the card showing primary player information
- `PlayerCardBack.tsx` - Back face showing detailed player statistics
- `PlayerCardModifiers.tsx` - Displays active modifiers (streaks, penalties, etc.)
- `PlayerCardStats.tsx` - Shows player statistics (win rate, W/D/L, total games)
- `PlayerCardBadges.tsx` - Manages status badges and indicators

## Features

- Interactive flip animation using Framer Motion
- Displays player's friendly name on both sides for better UX
- Shows various statistics and achievements
- Indicates special statuses (random pick, slot offers, etc.)
- WhatsApp group membership indicator
- Visual feedback for streaks and penalties
- Responsive design with hover and tap animations

## Props

See individual component documentation for detailed prop information:
- [PlayerCard Props](./PlayerCardProps.md)
- [PlayerCardModifiers Props](./PlayerCardModifiersProps.md)
- [PlayerCardStats Props](./PlayerCardStatsProps.md)
- [PlayerCardBadges Props](./PlayerCardBadgesProps.md)

## Usage

```tsx
import { PlayerCard } from '../components/player-card/PlayerCard';

<PlayerCard
  id="player-123"
  friendlyName="John Doe"
  xp={1000}
  caps={5}
  // ... other props
/>
```

## Related Components

- [WhatsAppIndicator](./WhatsAppIndicator.md)
- [Tooltip](./Tooltip.md)

## Styling

The component uses Tailwind CSS for styling and includes:
- Gradient backgrounds based on player rarity
- Responsive sizing
- Smooth animations
- Consistent spacing and typography
