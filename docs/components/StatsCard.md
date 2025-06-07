# StatsCard Component

## Overview
The StatsCard component is a reusable UI element designed to display statistical information in a consistent, visually appealing format. It's primarily used in the Stats page to show player rankings and performance metrics, such as win rates.

## Features

### Core Features
- Displays a titled card with icon and optional description
- Shows a list of ranked players with associated statistics
- Highlights top performers with medal emojis (gold, silver, bronze)
- Supports various color themes through gradient backgrounds
- Includes animations for a polished user experience

### Visual Elements
- **Title Bar**: Displays the card title with an optional icon
- **Medal System**: Uses emoji medals (🥇, 🥈, 🥉) for the top three positions
- **Player List**: Shows player names and their associated statistics
- **Description**: Optional footer text for providing context

## Technical Implementation

### Props Interface
```tsx
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'orange' | 'purple' | 'green' | 'pink' | 'indigo' | 'teal';
  className?: string;
  stats?: any[];
}
```

### Medal Handling
The component determines medal positions based on the values in the stats array:
```tsx
const getMedalIndex = (_: number, currentValue: number, players: any[]) => {
  // Count how many players have a higher value
  const playersWithHigherRate = players.filter(p => p.winRate > currentValue).length;
  // Return that as the medal index - this handles ties correctly
  return playersWithHigherRate;
};
```

### Styling
The component uses tailored gradient backgrounds based on the selected color theme:
```tsx
const gradientColors = {
  blue: 'from-blue-300 via-blue-500 to-blue-700',
  orange: 'from-orange-300 via-orange-500 to-orange-700',
  purple: 'from-purple-300 via-purple-600 to-fuchsia-600',
  green: 'from-emerald-300 via-emerald-500 to-emerald-700',
  pink: 'from-pink-300 via-pink-500 to-pink-700',
  indigo: 'from-indigo-300 via-indigo-500 to-indigo-700',
  teal: 'from-teal-300 via-teal-500 to-teal-700'
};
```

## Usage

### Basic Usage
```tsx
<StatsCard
  title="Best Win Rates"
  value=""
  stats={stats.bestWinRates}
  icon={<Percent className="w-6 h-6" />}
  description="Stats based on games with known outcomes and even teams only"
  color="teal"
/>
```

## Recent Updates

### May 2025 Updates
1. **Updated Medal Display**: Replaced Lucide Medal icons with emoji medals (🥇, 🥈, 🥉) for improved visual consistency with other award cards
2. **Extended Player Display**: Modified to show the top 10 players instead of only those with win rates at or above the bronze medal position
3. **Improved Player List**: Removed position numbers for players outside medal positions for cleaner UI
4. **Enhanced Animation**: Added staggered animations when revealing players in the list

## Component Dependencies
- **Framer Motion**: Used for animations
- **Tailwind CSS**: Used for styling including gradients and responsive design
