# Reserve Status Visualization Feature

**Date**: 2025-10-09
**Status**: Implemented

## Overview

Enhanced the "Last 40 Games" player card statistic to visualize not just games played, but also games where a player registered as a reserve but wasn't selected. This provides better visibility into player commitment and availability patterns.

## Visual Design

### Participation Wheel

A circular wheel with 40 segments surrounds the games count, with each segment representing one game in chronological order (clockwise from top, index 0 = oldest game, 39 = most recent).

**Segment Colors:**
- **Played (selected)**: Full rarity color at 100% opacity
  - Legendary: Amber (#f59e0b)
  - World Class: Purple (#a855f7)
  - Professional: Blue (#3b82f6)
  - Semi Pro: Emerald (#10b981)
  - Amateur: Slate (#94a3b8)
  - Academy: Teal (#0d9488)
  - Retired: Gray (#6b7280)
- **Reserve**: White at 100% opacity (`rgba(255, 255, 255, 1)`)
- **Didn't Register**: Dim white at 10% opacity (`rgba(255, 255, 255, 0.1)`)

### Number Display

The center of the wheel shows the participation count:

**When no reserve games:**
```
37
```

**When reserve games exist:**
```
37/5
```
- Main number (37) = games played, displayed at `text-2xl` bold
- Reserve count (/5) = reserve appearances, displayed at `text-xs` with 70% opacity

### Label Display

The label adapts based on whether the player has any reserve appearances:

**When no reserve games:**
```
Last 40 Games
Played
```

**When reserve games exist:**
```
Last 40 Games
Played/Reserve
```

The label uses a two-line stacked layout with center alignment.

## Data Structure

### Type Definition

```typescript
gameParticipation?: Array<'selected' | 'reserve' | null>
```

An array of exactly 40 elements where:
- `'selected'` = player was selected and played
- `'reserve'` = player registered but wasn't selected
- `null` = player didn't register

Array indices map to game sequence (0 = oldest of last 40, 39 = most recent).

### Database Query

```typescript
// Fetch registrations for last 40 games only (avoids 1000-row limit)
const { data: latestGameData } = await supabase
  .from('games')
  .select('id, sequence_number')
  .eq('completed', true)
  .eq('is_historical', true)
  .order('sequence_number', { ascending: false })
  .limit(40);

const last40GameIds = (latestGameData || []).map(g => g.id);

// Fetch both 'selected' and 'reserve' statuses
const { data: gameRegistrationsData } = await supabase
  .from('game_registrations')
  .select(`
    player_id,
    game_id,
    status,
    games!inner (
      sequence_number,
      is_historical,
      completed
    )
  `)
  .in('game_id', last40GameIds)
  .in('status', ['selected', 'reserve']);
```

## Components

### GameParticipationWheel

**Location**: `src/components/player-card/GameParticipationWheel.tsx`

**Props:**
```typescript
interface GameParticipationWheelProps {
  participation: Array<'selected' | 'reserve' | null>;
  rarity?: Rarity;
  size?: number;
  activeColor?: string;
  reserveColor?: string;
  inactiveColor?: string;
}
```

**Features:**
- SVG-based rendering for sharp, scalable graphics
- 40 individual path segments with 0.015 radian gaps
- Automatic rarity-based coloring
- Smooth transitions on state changes (300ms duration)

### PlayerCardFront

**Location**: `src/components/player-card/PlayerCardFront.tsx`

**Changes:**
- Replaced single number with dynamic number/label display
- Added conditional reserve count display
- Adaptive label based on reserve presence
- Integrated GameParticipationWheel component

## Implementation Files

### Data Layer
- `src/hooks/usePlayerGrid.ts` - Fetches participation data with 3 states
- `src/hooks/useGameRegistrationStats.ts` - Similar query updates

### Components
- `src/components/player-card/GameParticipationWheel.tsx` - Wheel visualization
- `src/components/player-card/PlayerCardFront.tsx` - Integration and display
- `src/components/player-card/PlayerCard.tsx` - Prop passing
- `src/components/player-card/grid/PlayerGridLayout.tsx` - Grid integration
- `src/components/games/PlayerList.tsx` - List integration

### Types
- `src/components/player-card/PlayerCardTypes.ts` - Type definitions
- `src/utils/rarityColors.ts` - Color mapping utility

## Benefits

1. **Commitment Visibility**: Quickly see when players registered but weren't selected
2. **Availability Patterns**: Identify players who frequently register but miss out
3. **Selection History**: Visual timeline of participation over last 40 games
4. **Rarity Integration**: Colors automatically match card rarity tier
5. **Space Efficient**: Communicates complex data without cluttering the card

## User Experience

The reserve visualization makes it immediately clear:
- How often a player participates (colored + white segments)
- Whether they typically get selected (more colored vs white)
- Their recent activity pattern (visual sequence around wheel)
- Exact counts (number display: "37/5" = 37 played, 5 reserve)

The conditional display (only showing reserve info when relevant) keeps the card clean for players who always get selected.

## Technical Notes

### Query Optimization

The implementation uses sequential queries to avoid Supabase's 1000-row limit:
1. First, fetch last 40 game IDs (~40 rows)
2. Then, fetch registrations for only those games (~718 rows)

This replaced the previous approach of fetching all registrations and filtering client-side (which hit the 1,000-row limit at ~63 games).

### Performance

- SVG rendering is hardware-accelerated
- Color calculations happen once per render
- Conditional rendering minimizes DOM updates
- Array filtering is O(n) where n=40 (constant time)

### Backward Compatibility

All components maintain default values:
```typescript
gameParticipation = new Array(40).fill(null)
```

This ensures existing code continues to work without modifications.
