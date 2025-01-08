# Component Rendering by Game Phase

## Overview
This document explains how different components are rendered in the Game page based on the current phase of the game. The main page (`Game.tsx`) acts as an orchestrator that determines which components to show based on the game's status and timing.

## Game Page Structure
The `Game.tsx` page is the main container that:
1. Fetches and maintains game data
2. Manages game state transitions through hooks:
   - `useRegistrationOpen`
   - `useRegistrationClose`
   - `useTeamAnnouncement`
3. Renders phase-specific components based on game status

## Component Rendering by Phase

### Phase 1: Upcoming Game (`status: 'upcoming'`)
```
Components Rendered:
├── GameHeader
├── GameDetails
└── RegisteredPlayers (view-only)
```
- `GameHeader`: Shows game title, date, and venue
- `GameDetails`: Displays registration window times and other game details
- No registration button is shown as registration hasn't opened yet

### Phase 2: Registration Open (`status: 'open'`)
```
Components Rendered:
├── GameHeader
├── GameDetails
├── GameRegistration (active)
└── RegisteredPlayers (live updates)
```
- `GameRegistration`: Shows register/unregister button
- `RegisteredPlayers`: Live list of registered players
- Registration button visibility controlled by:
  - User authentication status
  - Registration window timing
  - User's current registration status

### Phase 3: Player Selection (`status: 'players_announced'`)
```
Components Rendered:
├── GameHeader
├── GameDetails
├── PlayerSelectionResults
│   ├── Selected Players List
│   └── Reserve Players List
└── RegisteredPlayers (view-only)
```
- `PlayerSelectionResults`: Shows:
  - Confirmed players (merit + random selection)
  - Reserve list
  - Selection method for each player
  - Selection statistics

### Phase 4: Teams Announced (`status: 'teams_announced'`)
```
Components Rendered:
├── GameHeader
├── GameDetails
└── TeamSelectionResults
    ├── Team A List
    └── Team B List
```
- `TeamSelectionResults`: Displays:
  - Balanced teams
  - Player stats per team
  - Team statistics (total attack/defense ratings)

### Phase 5: Game Completed (`status: 'completed'`)
```
Components Rendered:
├── GameHeader
├── GameDetails
├── TeamSelectionResults
└── GameResults
    ├── Final Score
    ├── Player Attendance
    └── Payment Status
```

## Component Conditional Logic

### GameRegistration.tsx
```typescript
Visibility Conditions:
- User is authenticated
- Game status is 'open'
- Current time is within registration window
- Not processing registration state changes
```

### RegisteredPlayers.tsx
```typescript
Modes:
1. View-only: status !== 'open'
2. Interactive: status === 'open'
   - Shows registration time
   - Live updates
```

### PlayerSelectionResults.tsx
```typescript
Visibility Conditions:
- Game status === 'players_announced' || 'teams_announced'
Features:
- Merit vs Random selection display
- XP-based sorting
- WhatsApp status indicators
```

### TeamSelectionResults.tsx
```typescript
Visibility Conditions:
- Game status === 'teams_announced' || 'completed'
Features:
- Team balance statistics
- Player ratings display
- Position preferences
```

## State Management
- Game status transitions are handled automatically by hooks
- Component visibility is controlled by the game status
- Real-time updates through Supabase subscriptions
- Loading states managed for smooth transitions

## Important Notes
1. Components use progressive enhancement
2. All components handle loading and error states
3. Real-time updates ensure data consistency
4. Mobile-responsive layouts
5. Accessibility considerations in all phases
