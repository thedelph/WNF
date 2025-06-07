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
│   └── TeamAnnouncementTimer (if team_announcement_time is set)
└── RegisteredPlayers (view-only)
```
- `GameHeader`: Shows game title, date, and venue
- `GameDetails`: Displays registration window times, team announcement time, and other game details
- `TeamAnnouncementTimer`: Countdown to team announcement (visible when team_announcement_time is set)
- No registration button is shown as registration hasn't opened yet

### Phase 2: Registration Open (`status: 'open'`)
```
Components Rendered:
├── GameHeader
├── GameDetails
│   └── TeamAnnouncementTimer (if team_announcement_time is set)
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
│   └── TeamAnnouncementTimer (displays "Teams will be announced soon" if within 1 hour)
├── PlayerSelectionResults
│   ├── Selected Players List
│   └── Reserve Players List
└── RegisteredPlayers (view-only)
```
- `GameHeader`: Shows game title, date, and venue
- `GameDetails`: Displays registration window times and other game details
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

## Admin Components

#### EditGameModal
```
Component Structure:
├── EditGameModalForm
│   ├── Game Date Input
│   ├── Start Time Input
│   ├── Registration Window Inputs
│   ├── Team Announcement Time Input
│   ├── Venue Selection
│   ├── Max Players Input
│   └── Random Slots Input
└── Action Buttons
    ├── Close Registration
    └── Save Changes
```
- Allows admins to modify game details including team announcement time
- Uses Radix UI tooltips for field explanations
- Validates time constraints between registration, announcement, and game times

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
Data Flow:
1. Fetches player data through game_registrations:
   - Gets selected and reserve players with their team assignments
   - Includes player details (friendly_name, avatar_svg, etc.)
2. Retrieves selection metadata from game_selections table
3. Combines data for display:
   - Team assignments
   - Player details
   - Selection metadata
Features:
- Team balance statistics
- Player ratings display
- Position preferences
- Supports both card and list view modes
Database Relationships:
- game_registrations -> players (for player details)
- game_selections (for metadata)
```

## Concurrency and Error Handling

### Distributed Locking System
The application implements a robust distributed locking system to handle concurrent operations during critical game state transitions:

#### Registration Close Process (`useRegistrationClose`)
```
Lock Implementation:
├── Table: registration_locks
│   ├── game_id (unique)
│   ├── locked_at (timestamp)
│   └── locked_until (timestamp)
Features:
├── Lock Duration: 30 seconds with automatic expiration
├── Status Verification: Double-checks game status before updates
└── Error Recovery: Automatic retry with exponential backoff
```
- **Lock Acquisition**: Atomic operation using Supabase's RLS policies
- **Lock Release**: Automatic via TTL or manual in finally block
- **Error Recovery**: Automatic retry with exponential backoff
- **State Management**: Uses React refs to prevent parallel executions

#### Team Announcement Process (`useTeamAnnouncement`)
```
Lock Implementation:
├── Table: team_announcement_locks
│   ├── game_id (unique)
│   ├── locked_at (timestamp)
│   └── locked_until (timestamp)
Features:
├── Stored Procedure: update_team_assignments
├── Transaction Safety: All team updates in single transaction
└── Error Handling: Maximum 3 retries with increasing delays
```
- **Atomic Updates**: Uses stored procedure `update_team_assignments`
- **Transaction Handling**: All team updates occur in a single transaction
- **Error Recovery**: Maximum of 3 retries with increasing delays
- **Race Condition Prevention**: Status verification before updates

### Performance Optimizations

#### Thundering Herd Prevention
- Random polling offsets (±2 seconds) to prevent synchronized client requests
- Progressive backoff for failed attempts
- Staggered lock release times

#### State Management
- React refs for processing flags to prevent re-renders
- Memoization of expensive computations
- Optimistic UI updates with rollback capability

### Error Handling Strategy
```
Error Recovery Flow:
├── Immediate Retry: For transient errors (network issues)
├── Exponential Backoff: For resource contention
└── Graceful Degradation: Falls back to read-only mode
```
- **Error Classification**: Distinguishes between transient and permanent errors
- **Automatic Recovery**: Implements retry mechanisms with backoff
- **User Feedback**: Toast notifications for operation status
- **Logging**: Detailed error logging for debugging

### Monitoring and Debugging
- Lock acquisition/release events are logged
- Error states tracked with error counts
- Performance metrics for lock durations
- Detailed transaction logs for debugging

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
